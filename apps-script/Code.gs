/**
 * CCI Sales Dashboard API
 * Bound/deployed as a Google Apps Script web app. Uses the supplied spreadsheet
 * as the sole source and scans its tabs for summary, outlet, channel, daily,
 * and menu tables.
 */
const SPREADSHEET_ID = '1u1SYr0T2EHK0jx2cpqFgihmQihtKy_lUpiz3NNVcO6A';
const CHANNELS = ['DINE IN', 'TAKE AWAY', 'ESB ORDER', 'ESB DELIVERY', 'GOFOOD', 'GRABFOOD', 'SHOPEFOOD'];

function doGet() {
  try {
    const payload = buildDashboardData_();
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error.message || error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildDashboardData_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tabs = ss.getSheets();
  const allRows = [];
  tabs.forEach(sheet => {
    const values = sheet.getDataRange().getValues();
    values.forEach(row => allRows.push({ sheet: sheet.getName(), row }));
  });

  const result = { ok: true, fetchedAt: new Date().toISOString(), period: '', total: 0, targetCenter: 0, outlets: [], channels: {}, daily: [], menu: [] };
  allRows.forEach(({ row }) => {
    const label = norm_(row[0]);
    if (label === 'BULAN LAPORAN') result.period = String(row[1] || '');
    if (label === 'OMSET TEREALISASI (SEMUA OUTLET)') result.total = number_(row[1]);
    if (label === 'TARGET BULANAN OUTLET PUSAT') result.targetCenter = number_(row[1]);
    const channel = CHANNELS.find(name => name === label);
    if (channel) result.channels[channel] = number_(row[1]);
  });

  tabs.forEach(sheet => {
    const values = sheet.getDataRange().getValues();
    for (let r = 0; r < values.length; r++) {
      const header = values[r].map(norm_);
      const outletCol = header.indexOf('OUTLET');
      const typeCol = header.indexOf('JENIS');
      const salesCol = header.indexOf('OMSET');
      if (outletCol >= 0 && typeCol >= 0 && salesCol >= 0) {
        for (let i = r + 1; i < values.length; i++) {
          const row = values[i];
          const type = norm_(row[typeCol]);
          if (!['PUSAT', 'MITRA'].includes(type)) continue;
          const name = String(row[outletCol] || '').trim();
          if (!name) continue;
          result.outlets.push({ name, type, sales: number_(row[salesCol]), days: number_(row[typeCol + 2]) });
        }
      }

      const dateCol = header.indexOf('TANGGAL');
      const dailyTotalCol = header.indexOf('TOTAL OMSET');
      const centerCol = header.indexOf('PUSAT');
      const partnerCol = header.indexOf('MITRA');
      if (dateCol >= 0 && dailyTotalCol >= 0 && centerCol >= 0 && partnerCol >= 0) {
        for (let i = r + 1; i < values.length; i++) {
          const row = values[i];
          const date = dateValue_(row[dateCol]);
          if (!date) continue;
          result.daily.push({ date, total: number_(row[dailyTotalCol]), center: number_(row[centerCol]), partner: number_(row[partnerCol]) });
        }
      }

      const menuCol = findHeader_(header, ['MENU', 'NAMA MENU', 'PRODUK', 'NAMA PRODUK']);
      const qtyCol = findHeader_(header, ['QTY', 'JUMLAH TERJUAL', 'KUANTITAS']);
      const valueCol = findHeader_(header, ['VALUE', 'OMSET', 'TOTAL OMSET', 'NILAI OMSET']);
      if (menuCol >= 0 && qtyCol >= 0 && valueCol >= 0) {
        for (let i = r + 1; i < values.length; i++) {
          const row = values[i];
          const name = String(row[menuCol] || '').trim();
          if (!name || /^TOTAL$/i.test(name)) break;
          result.menu.push({ name, qty: number_(row[qtyCol]), value: number_(row[valueCol]) });
        }
      }
    }
  });

  // Deduplicate repeated outlet/menu tables, keeping the latest occurrence.
  result.outlets = dedupeBy_(result.outlets, item => `${item.type}|${item.name}`);
  result.menu = dedupeBy_(result.menu, item => item.name);
  result.daily = dedupeBy_(result.daily, item => item.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!result.total) result.total = result.outlets.reduce((sum, item) => sum + item.sales, 0);
  if (!Object.keys(result.channels).length) CHANNELS.forEach(channel => result.channels[channel] = 0);
  return result;
}

function findHeader_(row, candidates) {
  return row.findIndex(value => candidates.includes(value));
}
function norm_(value) { return String(value == null ? '' : value).trim().toUpperCase().replace(/\s+/g, ' '); }
function number_(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value instanceof Date || value == null || value === '') return 0;
  const n = Number(String(value).replace(/Rp\.?/ig, '').replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function dateValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value || '').trim();
  let match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const months = { jan:0, januari:0, feb:1, februari:1, mar:2, maret:2, apr:3, april:3, mei:4, jun:5, juni:5, jul:6, juli:6, agu:7, agustus:7, sep:8, september:8, okt:9, oktober:9, nov:10, november:10, des:11, desember:11 };
    const month = months[match[2].toLowerCase()];
    if (month !== undefined) return new Date(Date.UTC(+match[3], month, +match[1])).toISOString().slice(0, 10);
  }
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])).toISOString().slice(0, 10) : '';
}
function dedupeBy_(items, keyFn) {
  const map = new Map();
  items.forEach(item => map.set(keyFn(item), item));
  return Array.from(map.values());
}
