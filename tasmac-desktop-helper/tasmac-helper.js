const http = require('http');
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

function encryptPassword(password) {
  const secretKey = "12345678901234567890123456789012";
  const key = Buffer.from(secretKey, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  let encrypted = cipher.update(password, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

class CookieJar {
  constructor() {
    this.cookies = [];
  }

  updateCookies(requestUrl, cookieHeaders) {
    if (!cookieHeaders) return;
    const reqHost = new URL(requestUrl).hostname;
    cookieHeaders.forEach(cookieStr => {
      const parts = cookieStr.split(';').map(p => p.trim());
      const nameValue = parts[0].split('=');
      const name = nameValue[0].trim();
      const value = nameValue.slice(1).join('=').trim();
      const cookie = {
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

  getCookieHeader(targetUrl) {
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
  constructor() {
    this.jar = new CookieJar();
  }

  request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const headers = {
        ...options.headers,
        'Cookie': this.jar.getCookieHeader(url),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      const reqOptions = {
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

function cleanHtmlText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseIndexTable(html) {
  const indents = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return indents;
  const tbody = tbodyMatch[1];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const rowContent = rowMatch[1];
    const colRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cols = [];
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

function parseViewTable(html) {
  const items = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return { items, netAmount: 0 };
  const tbody = tbodyMatch[1];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const rowContent = rowMatch[1];
    const colRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cols = [];
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

// Server Config
const PORT = process.env.PORT || 9002;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const server = http.createServer((req, res) => {
  // Preflight check
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health / Friendly status page
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, {
      ...CORS_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>TASMAC Desktop Helper</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); text-align: center; max-width: 450px; }
          h1 { color: #38bdf8; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.6; }
          .badge { background: #10b981; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; display: inline-block; margin-bottom: 1.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">RUNNING</div>
          <h1>TASMAC Desktop Helper</h1>
          <p>The helper server is running successfully on port <strong>${PORT}</strong>.</p>
          <p>You can leave this window open in the background. Your Vercel web app can now fetch TASMAC data through your machine.</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Scraper Endpoint
  if (req.method === 'POST' && req.url === '/api/fetch-tasmac') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      let credentialsSent = false;
      const session = new ProperSession();

      try {
        const payload = JSON.parse(body);
        const { username, password, targetDate } = payload;

        if (!username || !password) {
          res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Username and Password are required.' }));
          return;
        }

        // Step 1: GET VerificationToken
        const pageRes = await session.request('https://cpe.tasmace2e.in/?i=B3Fq8HJw0D');
        const tokenMatch = pageRes.body.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        if (!tokenMatch) {
          res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to retrieve Verification Token from TASMAC site.' }));
          return;
        }
        const verificationToken = tokenMatch[1];

        // Step 2: POST Login credentials
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
          const errorMsgMatch = loginRes.body.match(/class="text-danger"[^>]*>([\s\S]*?)<\/span>/i);
          const errorMsg = errorMsgMatch ? cleanHtmlText(errorMsgMatch[1]) : 'Invalid Username or Password.';
          res.writeHead(401, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMsg }));
          return;
        }

        // Step 3: Landing Index
        await session.request('https://cpe.tasmace2e.in/Home/LandingIndex');

        // Step 4: SSO handoff redirect
        const ssoRes = await session.request('https://excise.tasmace2e.in/FL2FL3/ViewDepotAllocation');
        if (ssoRes.statusCode === 302) {
          const loc = ssoRes.headers['location'];
          const nextUrl = loc.startsWith('http') ? loc : 'https://excise.tasmace2e.in' + loc;
          await session.request(nextUrl);
        } else if (ssoRes.statusCode !== 200) {
          res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Excise SSO cross-subdomain handoff failed.' }));
          return;
        }

        // Step 5: GET Stock Transfer page
        const stockTransferRes = await session.request('https://excise.tasmace2e.in/StockTransfer/Index/1');
        if (stockTransferRes.statusCode !== 200) {
          res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to access Stock Transfer page.' }));
          return;
        }

        // Step 6: Parse Index Table
        const indents = parseIndexTable(stockTransferRes.body);
        if (indents.length === 0) {
          res.writeHead(404, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No recent indents found in TASMAC account.' }));
          return;
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
              res.writeHead(404, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `No indent found on date ${formattedTargetDate}. Available dates on page 1: ${availableDates}`
              }));
              return;
            }
          }
        }

        // Step 7: GET View Indent details
        const viewRes = await session.request(`https://excise.tasmace2e.in/StockTransfer/View?indentOrderId=${targetIndent.indentOrderId}&backId=1`);
        if (viewRes.statusCode !== 200) {
          res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: `Failed to retrieve details for indent ${targetIndent.indentNo}.` }));
          return;
        }

        // Step 8: Parse details and generate TSV
        const { items, netAmount } = parseViewTable(viewRes.body);
        if (items.length === 0) {
          res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: `No items found inside indent ${targetIndent.indentNo}.` }));
          return;
        }

        const tsvLines = items.map(item => 
          `${item.srNo}\t${item.brandName}\t${item.packSize}\t${item.rate}\t${item.qty}\t${item.addedValue}\t${item.amount}`
        );
        tsvLines.unshift("Sr.No\tBrand Name\tPack Size\tRate\tQty\tAdded Value\tAmount");
        const tsvData = tsvLines.join('\n');

        // Logout
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

        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            tsv: tsvData,
            indentNo: targetIndent.indentNo,
            indentDate: targetIndent.indentDate,
            netAmount: netAmount
          }
        }));

      } catch (error) {
        console.error('Error during fetch:', error);
        
        // Try logging out even in error state if logged in
        if (credentialsSent) {
          try {
            await Promise.all([
              session.request('https://excise.tasmace2e.in/Account/LogOut'),
              session.request('https://cpe.tasmace2e.in/Account/LogOut')
            ]);
          } catch (e) {}
        }

        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message || 'An error occurred during fetch.' }));
      }
    });
    return;
  }

  // Not Found
  res.writeHead(404, { ...CORS_HEADERS, 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`TASMAC Desktop Helper is listening on port ${PORT}`);
});
