import { NextResponse } from 'next/server';
import https from 'https';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';

interface IndentItem {
  srNo: string;
  brandName: string;
  packSize: string;
  rate: string;
  qty: string;
  addedValue: string;
  amount: string;
}

interface ParsedIndent {
  indentOrderId: number;
  success: boolean;
  indentDate: string;
  licensee: string;
  indentNumber: string;
  depot: string;
  licenseNo: string;
  netAmount: string;
  itemCount: number;
  items: IndentItem[];
  error?: string;
  statusCode?: number;
}

function cleanHtmlText(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIndentHtml(html: string, indentOrderId: number): ParsedIndent {
  // Licensee Name: <h6><span><b>Licensee's Name &nbsp;&nbsp;&nbsp; : </b> Ambica Empire</span>
  let licensee = '';
  const licenseeMatch = html.match(/Licensee(?:'s)?\s*Name[\s\S]*?:\s*<\/b>\s*([^<]+)/i);
  if (licenseeMatch) {
    licensee = cleanHtmlText(licenseeMatch[1]);
  }

  // Indent Date: <span><b>Indent Date</b> &nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;21-10-2026</span>
  let indentDate = '';
  const dateMatch =
    html.match(/Indent\s*Date[\s\S]*?:\s*&nbsp;\s*([^<]+)/i) ||
    html.match(/Indent\s*Date[\s\S]*?:\s*<\/b>?\s*&nbsp;\s*([^<]+)/i) ||
    html.match(/Indent\s*Date[\s\S]*?:\s*([0-9\-\/]+)/i);
  if (dateMatch) {
    indentDate = cleanHtmlText(dateMatch[1]);
  }

  // Indent Number: <span><b>Indent Number</b> &nbsp;:&nbsp;&nbsp;FLIND261021215714416</span>
  let indentNumber = '';
  const numberMatch =
    html.match(/Indent\s*Number[\s\S]*?:\s*&nbsp;\s*([^<]+)/i) ||
    html.match(/Indent\s*Number[\s\S]*?:\s*([A-Za-z0-9]+)/i);
  if (numberMatch) {
    indentNumber = cleanHtmlText(numberMatch[1]);
  }

  // Depot
  let depot = '';
  const depotMatch = html.match(/Depot[\s\S]*?:\s*<\/b>\s*([^<]+)/i);
  if (depotMatch) {
    depot = cleanHtmlText(depotMatch[1]);
  }

  // License No
  let licenseNo = '';
  const licenseNoMatch = html.match(/License\s*No[\s\S]*?:\s*<\/b>\s*([^<]+)/i);
  if (licenseNoMatch) {
    licenseNo = cleanHtmlText(licenseNoMatch[1]);
  }

  const isSuccess = !!(licensee || indentDate || indentNumber || depot);

  // If no indent details found, check why
  if (!isSuccess) {
    let errorReason = 'No indent data found in page';
    if (html.includes('AuthErrorPage') || html.includes('PermissionErrorPage')) {
      errorReason = 'Session Expired or Permission Denied';
    } else if (html.includes('id="loginForm"') || (html.includes('login') && html.includes('type="password"'))) {
      errorReason = 'Redirected to Login (Session Expired)';
    }

    return {
      indentOrderId,
      success: false,
      indentDate: '',
      licensee: '',
      indentNumber: '',
      depot: '',
      licenseNo: '',
      netAmount: '',
      itemCount: 0,
      items: [],
      error: errorReason,
    };
  }

  // Net Amount
  let netAmount = '';
  const netAmountMatch = html.match(/Net\s*Amount\s*:\s*([\s\S]*?)<\/th>/i);
  if (netAmountMatch) {
    const numbers = [...netAmountMatch[1].matchAll(/([\d,]+\.\d{2})/g)];
    if (numbers.length > 0) {
      netAmount = numbers[numbers.length - 1][1];
    }
  }
  if (!netAmount) {
    const allRupees = [...html.matchAll(/bx-rupee"><\/i>\s*([\d,]+\.?\d*)/g)];
    if (allRupees.length > 0) {
      netAmount = allRupees[allRupees.length - 1][1];
    }
  }

  // Items in tbody
  const items: IndentItem[] = [];
  const tbodyMatch =
    html.match(/<tbody[^>]*id=["']products-list["'][^>]*>([\s\S]*?)<\/tbody>/i) ||
    html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (tbodyMatch) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tbodyMatch[1])) !== null) {
      const colRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cols: string[] = [];
      let colMatch;
      while ((colMatch = colRegex.exec(rowMatch[1])) !== null) {
        cols.push(cleanHtmlText(colMatch[1]));
      }
      if (cols.length >= 7 && /^\d+$/.test(cols[0])) {
        items.push({
          srNo: cols[0],
          brandName: cols[1],
          packSize: cols[2],
          rate: cols[3],
          qty: cols[4],
          addedValue: cols[5],
          amount: cols[6],
        });
      }
    }
  }

  return {
    indentOrderId,
    success: true,
    indentDate,
    licensee,
    indentNumber,
    depot,
    licenseNo,
    netAmount,
    itemCount: items.length,
    items,
  };
}

function fetchIndentFromTasmac(
  indentOrderId: number,
  cookie: string
): Promise<{ statusCode?: number; location?: string; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://excise.tasmace2e.in/StockTransfer/View?indentOrderId=${indentOrderId}&backId=1`,
      {
        method: 'GET',
        headers: {
          'cookie': cookie,
          'User-Agent': 'PostmanRuntime/7.51.1',
          'Accept': '*/*',
          'Cache-Control': 'no-cache',
          'Host': 'excise.tasmace2e.in',
          'Connection': 'keep-alive',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            location: res.headers.location,
            body,
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(12000, () => {
      req.destroy(new Error('Request to TASMAC timed out (12s).'));
    });

    req.end();
  });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: new Headers(CORS_HEADERS),
  });
}

export async function POST(req: Request) {
  try {
    const { cookie, orderIds, singleOrderId } = await req.json();

    if (!cookie || typeof cookie !== 'string' || !cookie.trim()) {
      return NextResponse.json(
        { success: false, error: 'Cookie header is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let cleanedCookie = cookie.trim();
    if (cleanedCookie.toLowerCase().startsWith('cookie:')) {
      cleanedCookie = cleanedCookie.substring(7).trim();
    }
    // Strip newlines that break HTTP headers
    cleanedCookie = cleanedCookie.replace(/[\r\n]+/g, ' ').trim();

    // Determine target list of IDs
    let ids: number[] = [];
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      ids = orderIds.map((id) => Number(id)).filter((id) => !isNaN(id));
    } else if (singleOrderId) {
      const num = Number(singleOrderId);
      if (!isNaN(num)) ids = [num];
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one valid indentOrderId is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Limit batch size to 25 per request to prevent server timeouts
    const maxBatch = 25;
    const currentBatch = ids.slice(0, maxBatch);

    const results: ParsedIndent[] = [];
    let sessionExpired = false;

    for (const orderId of currentBatch) {
      try {
        const response = await fetchIndentFromTasmac(orderId, cleanedCookie);
        console.log(`[TASMAC Scanner] Order #${orderId} -> HTTP ${response.statusCode}, Length: ${response.body.length}, Location: ${response.location || 'none'}`);

        // Check if 302 redirect
        if (response.statusCode === 302) {
          const loc = response.location || '';
          if (loc.includes('AuthErrorPage') || loc.includes('PermissionErrorPage') || loc.includes('Login')) {
            sessionExpired = true;
            results.push({
              indentOrderId: orderId,
              success: false,
              indentDate: '',
              licensee: '',
              indentNumber: '',
              depot: '',
              licenseNo: '',
              netAmount: '',
              itemCount: 0,
              items: [],
              statusCode: 302,
              error: 'Session Expired or Permission Denied',
            });
            break; // Stop remaining in this batch if session is completely dead
          } else {
            results.push({
              indentOrderId: orderId,
              success: false,
              indentDate: '',
              licensee: '',
              indentNumber: '',
              depot: '',
              licenseNo: '',
              netAmount: '',
              itemCount: 0,
              items: [],
              statusCode: 302,
              error: `Redirected to ${loc}`,
            });
          }
          continue;
        }

        if (response.statusCode !== 200) {
          results.push({
            indentOrderId: orderId,
            success: false,
            indentDate: '',
            licensee: '',
            indentNumber: '',
            depot: '',
            licenseNo: '',
            netAmount: '',
            itemCount: 0,
            items: [],
            statusCode: response.statusCode,
            error: `TASMAC HTTP ${response.statusCode}`,
          });
          continue;
        }

        const parsed = parseIndentHtml(response.body, orderId);
        parsed.statusCode = response.statusCode;
        if (parsed.error && parsed.error.includes('Session Expired')) {
          sessionExpired = true;
          results.push(parsed);
          break;
        }
        results.push(parsed);
      } catch (err: any) {
        results.push({
          indentOrderId: orderId,
          success: false,
          indentDate: '',
          licensee: '',
          indentNumber: '',
          depot: '',
          licenseNo: '',
          netAmount: '',
          itemCount: 0,
          items: [],
          error: err.message || 'Network error connecting to TASMAC',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        sessionExpired,
        results,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('TASMAC scanner API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
