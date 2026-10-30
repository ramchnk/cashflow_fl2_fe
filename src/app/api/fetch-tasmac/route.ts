import { NextResponse } from 'next/server';
import https from 'https';
import crypto from 'crypto';
import querystring from 'querystring';

// Enforce standard Node.js runtime instead of Edge
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';

const SESSION_SECRET = process.env.TASMAC_SESSION_SECRET || 'tasmac-super-secret-key-32-chars!!';
const CIPHER_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest();

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

class CookieJar {
  public cookies: Cookie[] = [];

  updateCookies(requestUrl: string, cookieHeaders?: string[]) {
    if (!cookieHeaders) return;
    const reqHost = new URL(requestUrl).hostname;
    cookieHeaders.forEach(cookieStr => {
      const parts = cookieStr.split(';').map(p => p.trim());
      const nameValue = parts[0].split('=');
      const name = nameValue[0].trim();
      const value = nameValue.slice(1).join('=').trim();
      let domain = reqHost;
      let path = '/';
      for (let i = 1; i < parts.length; i++) {
        const pair = parts[i].split('=');
        const key = pair[0].trim().toLowerCase();
        const val = pair[1] ? pair[1].trim() : '';
        if (key === 'domain') {
          domain = val.startsWith('.') ? val.substring(1) : val;
        } else if (key === 'path') {
          path = val;
        }
      }
      this.cookies = this.cookies.filter(c => !(c.name === name && c.domain === domain));
      this.cookies.push({ name, value, domain, path });
    });
  }

  getCookieHeader(targetUrl: string): string {
    const targetUrlObj = new URL(targetUrl);
    const targetHost = targetUrlObj.hostname;
    return this.cookies
      .filter(cookie => {
        if (cookie.domain === targetHost) return true;
        if (targetHost.endsWith('.' + cookie.domain)) return true;
        if (cookie.domain.startsWith('.') && targetHost.endsWith(cookie.domain.substring(1))) return true;
        if (cookie.domain.includes('tasmace2e.in') && targetHost.includes('tasmace2e.in')) {
          if (
            cookie.name.includes('AspNetCore') ||
            cookie.name.includes('Session') ||
            cookie.name.includes('KEYCLOAK') ||
            cookie.name.includes('AUTH')
          ) {
            return true;
          }
        }
        return false;
      })
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  exportCookies(): Cookie[] {
    return [...this.cookies];
  }

  importCookies(cookies: Cookie[]) {
    this.cookies = [...cookies];
  }

  importRawCookieHeader(headerStr: string, defaultDomain: string) {
    if (!headerStr) return;
    const items = headerStr.split(';');
    for (const item of items) {
      const [k, ...v] = item.trim().split('=');
      if (k) {
        const name = k.trim();
        const value = v.join('=').trim();
        this.cookies = this.cookies.filter(c => !(c.name === name && c.domain === defaultDomain));
        this.cookies.push({ name, value, domain: defaultDomain, path: '/' });
      }
    }
  }
}

class ProperSession {
  public jar = new CookieJar();

  request(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      maxRedirects?: number;
    } = {}
  ): Promise<{ statusCode?: number; headers: Record<string, any>; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers,
        'Cookie': this.jar.getCookieHeader(url),
      };

      const reqOptions: https.RequestOptions = {
        method: options.method || 'GET',
        headers,
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
      };

      const req = https.request(reqOptions, (res) => {
        const setCookieHeaders = res.headers['set-cookie'];
        this.jar.updateCookies(url, setCookieHeaders);
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  }
}

function encryptSessionState(data: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CIPHER_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptSessionState(str: string): any {
  const [ivHex, tagHex, encryptedHex] = str.split(':');
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Malformed session token');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', CIPHER_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

function cleanHtmlText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

interface Indent {
  indentDate: string;
  indentNo: string;
  qty: string;
  amount: string;
  indentOrderId: string;
}

function parseIndexTable(html: string): Indent[] {
  const indents: Indent[] = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return indents;
  const tbody = tbodyMatch[1];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const rowContent = rowMatch[1];
    const colRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cols: string[] = [];
    let colMatch;
    while ((colMatch = colRegex.exec(rowContent)) !== null) {
      cols.push(colMatch[1]);
    }

    if (cols.length >= 7) {
      const indentDate = cleanHtmlText(cols[0]);
      const indentNo = cleanHtmlText(cols[1]);
      const qty = cleanHtmlText(cols[2]);
      const amount = cleanHtmlText(cols[3]);
      const orderIdMatch = rowContent.match(/indentOrderId=(\d+)/);
      const indentOrderId = orderIdMatch ? orderIdMatch[1] : null;

      if (indentOrderId) {
        indents.push({
          indentDate,
          indentNo,
          qty,
          amount,
          indentOrderId,
        });
      }
    }
  }
  return indents;
}

interface IndentItem {
  srNo: string;
  brandName: string;
  packSize: string;
  rate: string;
  qty: string;
  addedValue: string;
  amount: string;
}

function parseViewTable(html: string): { items: IndentItem[]; netAmount: number } {
  const items: IndentItem[] = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return { items, netAmount: 0 };
  const tbody = tbodyMatch[1];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const rowContent = rowMatch[1];
    const colRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cols: string[] = [];
    let colMatch;
    while ((colMatch = colRegex.exec(rowContent)) !== null) {
      cols.push(colMatch[1]);
    }

    if (cols.length >= 7) {
      const srNo = cleanHtmlText(cols[0]);
      const brandName = cleanHtmlText(cols[1]);
      const packSize = cleanHtmlText(cols[2]);
      const rate = cleanHtmlText(cols[3]);
      const qty = cleanHtmlText(cols[4]);
      const addedValue = cleanHtmlText(cols[5]);
      const amount = cleanHtmlText(cols[6]);

      if (/^\d+$/.test(srNo)) {
        items.push({
          srNo,
          brandName,
          packSize,
          rate,
          qty,
          addedValue,
          amount,
        });
      }
    }
  }

  let netAmount = 0;
  const netAmountMatch = html.match(/Net Amount\s*:\s*₹?\s*([\d,]+\.?\d*)/i);
  if (netAmountMatch) {
    netAmount = parseFloat(netAmountMatch[1].replace(/,/g, ''));
  } else {
    const grandTotalMatch = html.match(/Grand Total\s*:\s*₹?\s*([\d,]+\.?\d*)/i);
    if (grandTotalMatch) {
      netAmount = parseFloat(grandTotalMatch[1].replace(/,/g, ''));
    }
  }

  return { items, netAmount };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonWithCors(data: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: new Headers(CORS_HEADERS),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || (body.otp && body.sessionToken ? 'verify-otp' : body.cookie ? 'fetch-by-cookie' : body.identifier ? 'send-otp' : 'unknown');

    // ── ACTION: SEND OTP ──
    if (action === 'send-otp') {
      const identifier = (body.identifier || body.username || '').trim();
      if (!identifier) {
        return jsonWithCors(
          { success: false, error: 'Mobile number or TASMAC username is required.' },
          { status: 400 }
        );
      }

      const session = new ProperSession();

      // Step 1: Request CPE home to initiate OIDC authorization
      const cpeRes = await session.request('https://cpe.tasmace2e.in/');
      let kcUrl = cpeRes.headers.location;
      if (!kcUrl && cpeRes.statusCode === 200) {
        // Maybe already has redirect or link
        const metaMatch = cpeRes.body.match(/url=([^"'>]+)/i);
        if (metaMatch) kcUrl = metaMatch[1];
      }

      if (!kcUrl) {
        return jsonWithCors(
          { success: false, error: 'Failed to connect to TASMAC login service.' },
          { status: 502 }
        );
      }

      // Step 2: Fetch Keycloak login page
      const kcRes = await session.request(kcUrl);
      const actionMatch = kcRes.body.match(/<form[^>]+action="([^"]+)"/i);
      if (!actionMatch) {
        return jsonWithCors(
          { success: false, error: 'Unable to locate TASMAC login form.' },
          { status: 502 }
        );
      }
      const actionUrl = actionMatch[1].replace(/&amp;/g, '&');

      // Extract hidden inputs from form
      const hiddenInputs: Record<string, string> = {};
      const hiddenRegex = /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
      let hMatch;
      while ((hMatch = hiddenRegex.exec(kcRes.body)) !== null) {
        hiddenInputs[hMatch[1]] = hMatch[2];
      }

      // Step 3: POST identifier to Keycloak form
      const postData = querystring.stringify({
        ...hiddenInputs,
        identifier,
      });

      const sendOtpRes = await session.request(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': kcUrl,
        },
        body: postData,
      });

      // Check for error in response
      const errSpanMatch = sendOtpRes.body.match(/<span id="input-error-identifier"[^>]*>([\s\S]*?)<\/span>/i);
      if (errSpanMatch) {
        const errorText = cleanHtmlText(errSpanMatch[1]);
        return jsonWithCors({ success: false, error: errorText || 'Invalid mobile number or username.' }, { status: 400 });
      }

      // Check if OTP input form was rendered
      const otpFormMatch = sendOtpRes.body.match(/<form[^>]+id="kc-sms-otp-verify-form"[^>]+action="([^"]+)"/i)
        || sendOtpRes.body.match(/<form[^>]+action="([^"]+)"/i);
      
      const hasOtpInput = sendOtpRes.body.includes('name="otp"') || sendOtpRes.body.includes('data-tm-otp') || sendOtpRes.body.includes('tm-otp-input');

      if (!otpFormMatch || !hasOtpInput) {
        // Check if there is another error message
        const genericErr = sendOtpRes.body.match(/class="[^"]*alert[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const errMsg = genericErr ? cleanHtmlText(genericErr[1]) : 'Failed to trigger OTP. Please check your credentials.';
        return jsonWithCors({ success: false, error: errMsg }, { status: 400 });
      }

      const otpActionUrl = otpFormMatch[1].replace(/&amp;/g, '&');

      // Extract hidden inputs for the verify form
      const otpHiddenInputs: Record<string, string> = {};
      let otpHMatch;
      while ((otpHMatch = hiddenRegex.exec(sendOtpRes.body)) !== null) {
        otpHiddenInputs[otpHMatch[1]] = otpHMatch[2];
      }

      // Encrypt session state to pass to frontend
      const sessionState = {
        cookies: session.jar.exportCookies(),
        otpActionUrl,
        otpHiddenInputs,
        otpInputName: 'otp',
        identifier,
        createdAt: Date.now(),
      };

      const sessionToken = encryptSessionState(sessionState);

      return jsonWithCors({
        success: true,
        message: 'OTP sent successfully to registered mobile number.',
        sessionToken,
      });
    }

    // ── ACTION: VERIFY OTP AND FETCH INDENT ──
    if (action === 'verify-otp') {
      const { sessionToken, otp, targetDate } = body;

      if (!sessionToken || !otp) {
        return jsonWithCors(
          { success: false, error: 'OTP and session token are required.' },
          { status: 400 }
        );
      }

      let state: any;
      try {
        state = decryptSessionState(sessionToken);
      } catch (e) {
        return jsonWithCors(
          { success: false, error: 'Invalid or corrupted session. Please request a new OTP.' },
          { status: 400 }
        );
      }

      if (Date.now() - state.createdAt > 10 * 60 * 1000) {
        return jsonWithCors(
          { success: false, error: 'OTP session expired. Please request a new OTP.' },
          { status: 400 }
        );
      }

      const session = new ProperSession();
      session.jar.importCookies(state.cookies);

      // Submit OTP to Keycloak
      const verifyPostData = querystring.stringify({
        ...(state.otpHiddenInputs || {}),
        [state.otpInputName || 'otp']: otp.trim(),
      });

      let currentRes = await session.request(state.otpActionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': state.otpActionUrl,
        },
        body: verifyPostData,
      });

      // Check if invalid OTP error returned
      const otpErrMatch = currentRes.body.match(/<span id="input-error-otp"[^>]*>([\s\S]*?)<\/span>/i);
      if (otpErrMatch) {
        return jsonWithCors(
          { success: false, error: cleanHtmlText(otpErrMatch[1]) || 'Invalid OTP. Please check and try again.' },
          { status: 400 }
        );
      }

      if (currentRes.body.includes('Invalid OTP') || currentRes.body.includes('input-error-otp')) {
        return jsonWithCors(
          { success: false, error: 'Invalid OTP entered. Please try again.' },
          { status: 400 }
        );
      }

      // Follow redirects and auto-submitting forms (OIDC form_post) until fully logged in
      let currentUrl = state.otpActionUrl;
      const MAX_HOPS = 12;
      let hops = 0;

      while (hops < MAX_HOPS) {
        hops++;

        // 1. Check HTTP Redirects (301, 302, 303, 307, 308)
        if (
          currentRes.statusCode &&
          [301, 302, 303, 307, 308].includes(currentRes.statusCode) &&
          currentRes.headers.location
        ) {
          const loc = currentRes.headers.location;
          currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).href;
          currentRes = await session.request(currentUrl);
          continue;
        }

        // 2. Check for OpenID Connect form_post (<form method="post" action="...signin-oidc...">)
        if (
          currentRes.body.includes('signin-oidc') ||
          (currentRes.body.includes('name="code"') && currentRes.body.includes('name="state"'))
        ) {
          const formActionMatch = currentRes.body.match(/<form[^>]+action="([^"]+)"/i);
          const postUrl = formActionMatch ? formActionMatch[1] : 'https://cpe.tasmace2e.in/signin-oidc';
          const fullPostUrl = postUrl.startsWith('http') ? postUrl : new URL(postUrl, currentUrl).href;

          const formData: Record<string, string> = {};
          const inputRegex = /<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
          let inMatch;
          while ((inMatch = inputRegex.exec(currentRes.body)) !== null) {
            formData[inMatch[1]] = inMatch[2];
          }

          if (!formData['code']) {
            const inputRegexAlt = /<input[^>]+value="([^"]*)"[^>]+name="([^"]+)"/gi;
            while ((inMatch = inputRegexAlt.exec(currentRes.body)) !== null) {
              formData[inMatch[2]] = inMatch[1];
            }
          }

          const prevUrl = currentUrl;
          currentUrl = fullPostUrl;
          currentRes = await session.request(fullPostUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': prevUrl,
            },
            body: querystring.stringify(formData),
          });
          continue;
        }

        break;
      }

      // CPE Landing Index
      await session.request('https://cpe.tasmace2e.in/Home/LandingIndex');

      // Excise SSO cross-subdomain handoff
      let ssoRes = await session.request('https://excise.tasmace2e.in/FL2FL3/ViewDepotAllocation');
      if (ssoRes.statusCode && [301, 302, 303, 307].includes(ssoRes.statusCode) && ssoRes.headers['location']) {
        const loc = ssoRes.headers['location'];
        const nextUrl = loc.startsWith('http') ? loc : new URL(loc, 'https://excise.tasmace2e.in').href;
        ssoRes = await session.request(nextUrl);
      }

      // Stock Transfer Index
      let stockTransferRes = await session.request('https://excise.tasmace2e.in/StockTransfer/Index/1');
      if (
        stockTransferRes.statusCode &&
        [301, 302, 303, 307].includes(stockTransferRes.statusCode) &&
        stockTransferRes.headers['location']
      ) {
        const loc = stockTransferRes.headers['location'];
        const nextUrl = loc.startsWith('http') ? loc : new URL(loc, 'https://excise.tasmace2e.in').href;
        stockTransferRes = await session.request(nextUrl);
      }

      if (stockTransferRes.statusCode !== 200) {
        if (stockTransferRes.body.includes('PermissionErrorPage') || stockTransferRes.body.includes('AuthErrorPage')) {
          return jsonWithCors(
            { success: false, error: 'TASMAC session not authenticated. Please request a new OTP.' },
            { status: 401 }
          );
        }
        return jsonWithCors(
          { success: false, error: 'Failed to access Stock Transfer page on TASMAC.' },
          { status: 502 }
        );
      }

      const indents = parseIndexTable(stockTransferRes.body);
      if (indents.length === 0) {
        if (stockTransferRes.body.includes('PermissionErrorPage') || stockTransferRes.body.includes('AuthErrorPage')) {
          return jsonWithCors(
            { success: false, error: 'TASMAC permission error. Please verify the OTP or account access.' },
            { status: 403 }
          );
        }
        return jsonWithCors(
          { success: false, error: 'No recent indents found in TASMAC account.' },
          { status: 404 }
        );
      }

      let targetIndent = indents[0];
      if (targetDate) {
        const dateParts = targetDate.split('-'); // YYYY-MM-DD -> [YYYY, MM, DD]
        if (dateParts.length === 3) {
          const formattedTargetDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY
          const matched = indents.find(ind => ind.indentDate.replace(/\//g, '-') === formattedTargetDate);
          if (matched) {
            targetIndent = matched;
          } else {
            const availableDates = Array.from(new Set(indents.map(i => i.indentDate))).join(', ');
            return jsonWithCors({
              success: false,
              error: `No indent found on date ${formattedTargetDate}. Available dates on page 1: ${availableDates}`
            }, { status: 404 });
          }
        }
      }

      // View Indent details
      const viewRes = await session.request(`https://excise.tasmace2e.in/StockTransfer/View?indentOrderId=${targetIndent.indentOrderId}&backId=1`);
      if (viewRes.statusCode !== 200) {
        return jsonWithCors(
          { success: false, error: `Failed to retrieve details for indent ${targetIndent.indentNo}.` },
          { status: 502 }
        );
      }

      const { items, netAmount } = parseViewTable(viewRes.body);
      if (items.length === 0) {
        return jsonWithCors(
          { success: false, error: `No items found inside indent ${targetIndent.indentNo}.` },
          { status: 404 }
        );
      }

      const tsvLines = items.map(item =>
        `${item.srNo}\t${item.brandName}\t${item.packSize}\t${item.rate}\t${item.qty}\t${item.addedValue}\t${item.amount}`
      );
      tsvLines.unshift("Sr.No\tBrand Name\tPack Size\tRate\tQty\tAdded Value\tAmount");
      const tsvData = tsvLines.join('\n');

      const savedCookie = session.jar.getCookieHeader('https://excise.tasmace2e.in/');

      return jsonWithCors({
        success: true,
        data: {
          tsv: tsvData,
          indentNo: targetIndent.indentNo,
          indentDate: targetIndent.indentDate,
          netAmount: netAmount,
        },
        sessionCookie: savedCookie,
      });
    }

    // ── ACTION: FETCH BY DIRECT SESSION COOKIE ──
    if (action === 'fetch-by-cookie' || body.cookie) {
      const { cookie, targetDate } = body;
      if (!cookie || !cookie.trim()) {
        return jsonWithCors({ success: false, error: 'TASMAC cookie header is required.' }, { status: 400 });
      }

      const session = new ProperSession();
      session.jar.importRawCookieHeader(cookie.trim(), 'excise.tasmace2e.in');

      const stockTransferRes = await session.request('https://excise.tasmace2e.in/StockTransfer/Index/1');
      if (stockTransferRes.statusCode === 302 || stockTransferRes.body.includes('id="loginForm"') || stockTransferRes.body.includes('PermissionErrorPage')) {
        return jsonWithCors({ success: false, error: 'TASMAC session expired. Please log in again.' }, { status: 401 });
      }

      const indents = parseIndexTable(stockTransferRes.body);
      if (indents.length === 0) {
        return jsonWithCors({ success: false, error: 'No indents found or cookie does not have access.' }, { status: 404 });
      }

      let targetIndent = indents[0];
      if (targetDate) {
        const dateParts = targetDate.split('-');
        if (dateParts.length === 3) {
          const formattedTargetDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          const matched = indents.find(ind => ind.indentDate.replace(/\//g, '-') === formattedTargetDate);
          if (matched) {
            targetIndent = matched;
          } else {
            const availableDates = Array.from(new Set(indents.map(i => i.indentDate))).join(', ');
            return jsonWithCors({
              success: false,
              error: `No indent found on date ${formattedTargetDate}. Available dates on page 1: ${availableDates}`
            }, { status: 404 });
          }
        }
      }

      const viewRes = await session.request(`https://excise.tasmace2e.in/StockTransfer/View?indentOrderId=${targetIndent.indentOrderId}&backId=1`);
      if (viewRes.statusCode !== 200) {
        return jsonWithCors({ success: false, error: `Failed to retrieve indent ${targetIndent.indentNo}.` }, { status: 502 });
      }

      const { items, netAmount } = parseViewTable(viewRes.body);
      if (items.length === 0) {
        return jsonWithCors({ success: false, error: `No items found inside indent ${targetIndent.indentNo}.` }, { status: 404 });
      }

      const tsvLines = items.map(item =>
        `${item.srNo}\t${item.brandName}\t${item.packSize}\t${item.rate}\t${item.qty}\t${item.addedValue}\t${item.amount}`
      );
      tsvLines.unshift("Sr.No\tBrand Name\tPack Size\tRate\tQty\tAdded Value\tAmount");
      const tsvData = tsvLines.join('\n');

      return jsonWithCors({
        success: true,
        data: {
          tsv: tsvData,
          indentNo: targetIndent.indentNo,
          indentDate: targetIndent.indentDate,
          netAmount: netAmount,
        },
      });
    }

    // Legacy password fallback notice
    if (body.username && body.password) {
      return jsonWithCors({
        success: false,
        error: 'TASMAC has replaced password logins with Phone Number OTP verification. Please use Send OTP.',
      }, { status: 400 });
    }

    return jsonWithCors({ success: false, error: 'Invalid request action.' }, { status: 400 });

  } catch (error: any) {
    console.error('Error during TASMAC data fetch:', error);
    return jsonWithCors({ success: false, error: error.message || 'An error occurred during fetch.' }, { status: 500 });
  }
}
