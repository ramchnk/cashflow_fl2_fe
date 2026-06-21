import { NextResponse } from 'next/server';
import https from 'https';
import crypto from 'crypto';
import querystring from 'querystring';

// Enforce standard Node.js runtime instead of Edge
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';

function encryptPassword(password: string): string {
  const secretKey = "12345678901234567890123456789012";
  const key = Buffer.from(secretKey, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  let encrypted = cipher.update(password, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

class CookieJar {
  private cookies: Cookie[] = [];

  updateCookies(requestUrl: string, cookieHeaders?: string[]) {
    if (!cookieHeaders) return;
    const reqHost = new URL(requestUrl).hostname;
    cookieHeaders.forEach(cookieStr => {
      const parts = cookieStr.split(';').map(p => p.trim());
      const nameValue = parts[0].split('=');
      const name = nameValue[0].trim();
      const value = nameValue.slice(1).join('=').trim();
      const cookie: Cookie = {
        name,
        value,
        domain: reqHost,
        path: '/'
      };
      for (let i = 1; i < parts.length; i++) {
        const pair = parts[i].split('=');
        const key = pair[0].trim().toLowerCase();
        const val = pair[1] ? pair[1].trim() : '';
        if (key === 'domain') {
          cookie.domain = val.startsWith('.') ? val.substring(1) : val;
        }
      }
      this.cookies = this.cookies.filter(c => !(c.name === cookie.name && c.domain === cookie.domain));
      this.cookies.push(cookie);
    });
  }

  getCookieHeader(targetUrl: string): string {
    const targetUrlObj = new URL(targetUrl);
    const targetHost = targetUrlObj.hostname;
    return this.cookies
      .filter(cookie => {
        if (cookie.domain === targetHost) return true;
        if (targetHost.endsWith('.' + cookie.domain)) return true;
        return false;
      })
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }
}

class ProperSession {
  public jar = new CookieJar();

  request(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ statusCode?: number; headers: Record<string, any>; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const headers: Record<string, string> = {
        ...options.headers,
        'Cookie': this.jar.getCookieHeader(url),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  }
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
          indentOrderId
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
          amount
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
  const session = new ProperSession();
  let credentialsSent = false;
  
  try {
    const { username, password, targetDate } = await req.json();

    if (!username || !password) {
      return jsonWithCors({ success: false, error: 'Username and Password are required.' }, { status: 400 });
    }

    // Step 1: GET cpe.tasmace2e.in to obtain VerificationToken
    const pageRes = await session.request('https://cpe.tasmace2e.in/?i=B3Fq8HJw0D');
    const tokenMatch = pageRes.body.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
    if (!tokenMatch) {
      return jsonWithCors({ success: false, error: 'Failed to retrieve Verification Token from TASMAC site.' }, { status: 502 });
    }
    const verificationToken = tokenMatch[1];

    // Step 2: POST login to cpe.tasmace2e.in
    const postData = querystring.stringify({
      __RequestVerificationToken: verificationToken,
      username: username,
      Password: encryptPassword(password),
      returnUrl: '',
      Attempts: '0',
      prevUser: '',
      encryptionid: 'B3Fq8HJw0D'
    });

    credentialsSent = true;
    const loginRes = await session.request('https://cpe.tasmace2e.in/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://cpe.tasmace2e.in/?i=B3Fq8HJw0D'
      },
      body: postData
    });

    if (loginRes.statusCode !== 302) {
      // Check if error message exists on the page
      const errorMsgMatch = loginRes.body.match(/class="text-danger"[^>]*>([\s\S]*?)<\/span>/i);
      const errorMsg = errorMsgMatch ? cleanHtmlText(errorMsgMatch[1]) : 'Invalid Username or Password.';
      return jsonWithCors({ success: false, error: errorMsg }, { status: 401 });
    }

    // Step 3: Landing Index
    await session.request('https://cpe.tasmace2e.in/Home/LandingIndex');

    // Step 4: SSO cross-subdomain redirect
    const ssoRes = await session.request('https://excise.tasmace2e.in/FL2FL3/ViewDepotAllocation');
    if (ssoRes.statusCode === 302) {
      const loc = ssoRes.headers['location'];
      const nextUrl = loc.startsWith('http') ? loc : 'https://excise.tasmace2e.in' + loc;
      await session.request(nextUrl);
    } else if (ssoRes.statusCode !== 200) {
      return jsonWithCors({ success: false, error: 'Excise SSO cross-subdomain handoff failed.' }, { status: 502 });
    }

    // Step 5: GET Stock Transfer Index
    const stockTransferRes = await session.request('https://excise.tasmace2e.in/StockTransfer/Index/1');
    if (stockTransferRes.statusCode !== 200) {
      return jsonWithCors({ success: false, error: 'Failed to access Stock Transfer page.' }, { status: 502 });
    }

    // Step 6: Parse Index Table
    const indents = parseIndexTable(stockTransferRes.body);
    if (indents.length === 0) {
      return jsonWithCors({ success: false, error: 'No recent indents found in TASMAC account.' }, { status: 404 });
    }

    // Target the latest indent or filter by date
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

    // Step 7: GET View Indent details page
    const viewRes = await session.request(`https://excise.tasmace2e.in/StockTransfer/View?indentOrderId=${targetIndent.indentOrderId}&backId=1`);
    if (viewRes.statusCode !== 200) {
      return jsonWithCors({ success: false, error: `Failed to retrieve details for indent ${targetIndent.indentNo}.` }, { status: 502 });
    }

    // Step 8: Parse details and generate TSV
    const { items, netAmount } = parseViewTable(viewRes.body);
    if (items.length === 0) {
      return jsonWithCors({ success: false, error: `No items found inside indent ${targetIndent.indentNo}.` }, { status: 502 });
    }

    // Columns format: Sr.No \t Brand Name \t Pack Size \t Rate \t Qty \t Added Value \t Amount
    const tsvLines = items.map(item => 
      `${item.srNo}\t${item.brandName}\t${item.packSize}\t${item.rate}\t${item.qty}\t${item.addedValue}\t${item.amount}`
    );
    
    // Add header
    tsvLines.unshift("Sr.No\tBrand Name\tPack Size\tRate\tQty\tAdded Value\tAmount");
    const tsvData = tsvLines.join('\n');

    return jsonWithCors({
      success: true,
      data: {
        tsv: tsvData,
        indentNo: targetIndent.indentNo,
        indentDate: targetIndent.indentDate, // format: "DD/MM/YYYY" or whatever string is parsed
        netAmount: netAmount
      }
    });

  } catch (error: any) {
    console.error('Error during TASMAC data fetch:', error);
    return jsonWithCors({ success: false, error: error.message || 'An error occurred during fetch.' }, { status: 500 });
  } finally {
    // Crucial clean logout to prevent 15 min lockouts
    if (credentialsSent) {
      try {
        await Promise.all([
          session.request('https://excise.tasmace2e.in/Account/LogOut'),
          session.request('https://cpe.tasmace2e.in/Account/LogOut')
        ]);
      } catch (logoutError) {
        console.error('Failed to logout of TASMAC:', logoutError);
      }
    }
  }
}
