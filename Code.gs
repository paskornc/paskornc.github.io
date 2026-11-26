/**
 * Backend (Google Apps Script) สำหรับเว็บ "บันทึกตัดอัดก้อนชีวมวล"
 *
 * วิธีติดตั้งโดยย่อ (ละเอียดใน README.md):
 *   1. เปิด Google Sheets ใหม่ 1 ไฟล์ (ใช้เป็นฐานข้อมูล)
 *   2. เมนู Extensions > Apps Script แล้ววางโค้ดไฟล์นี้ทับ Code.gs
 *   3. รันฟังก์ชัน setup หนึ่งครั้ง (อนุญาตสิทธิ์) เพื่อสร้างชีตและหัวคอลัมน์
 *   4. Deploy > New deployment > Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *      คัดลอก URL ที่ลงท้ายด้วย /exec ไปใส่ใน index.html (ตัวแปร API_URL)
 *
 * หมายเหตุ: ถ้าตั้ง TOKEN ด้านล่าง ต้องใส่ค่าเดียวกันใน index.html (API_TOKEN)
 * ห้ามลบ/สลับหัวคอลัมน์ในชีต เพราะโค้ดจับคู่คอลัมน์จากชื่อหัวตาราง
 */

var TOKEN = '';

var BALE_SHEET = 'bale_records';
var CHOP_SHEET = 'chop_records';
var PELLET_SHEET = 'pellet_records';
var SETTINGS_SHEET = 'settings';

/* [หัวคอลัมน์, ชื่อฟิลด์, ชนิดข้อมูล] — ชนิด: text | num | bool */
var BALE_COLS = [
  ['วันที่', 'date', 'text'],
  ['เวลา', 'time', 'text'],
  ['แปลง', 'plot', 'text'],
  ['รหัสแปลง', 'parcel', 'text'],
  ['ละติจูด', 'lat', 'num'],
  ['ลองจิจูด', 'lng', 'num'],
  ['จำนวนไร่', 'rai', 'num'],
  ['จำนวนก้อน', 'bales', 'num'],
  ['น้ำหนักเฉลี่ย/ก้อน (กก.)', 'weight', 'num'],
  ['ความชื้น (%)', 'moist', 'num'],
  ['น้ำมันที่ใช้ (ลิตร)', 'fuel', 'num'],
  ['ผู้เก็บข้อมูล', 'collector', 'text'],
  ['เก็บเกี่ยวเสร็จสิ้น', 'done', 'bool'],
  ['หมายเหตุ', 'note', 'text'],
  ['สร้างเมื่อ', 'createdAt', 'num'],
  ['id', 'id', 'text']
];

var CHOP_COLS = [
  ['วันที่', 'date', 'text'],
  ['เวลา', 'time', 'text'],
  ['ตะกร้าที่สับ', 'baskets', 'num'],
  ['ความชื้น (%)', 'moist', 'num'],
  ['เลขมิเตอร์ไฟ', 'meter', 'num'],
  ['จำนวนคนงาน', 'workers', 'num'],
  ['สร้างเมื่อ', 'createdAt', 'num'],
  ['id', 'id', 'text']
];

var PELLET_COLS = [
  ['วันที่', 'date', 'text'],
  ['เวลา', 'time', 'text'],
  ['ตะกร้าอัดเม็ด', 'baskets', 'num'],
  ['เลขมิเตอร์ไฟ (สิ้นสุดวัน)', 'meter', 'num'],
  ['ความชื้น (%)', 'moist', 'num'],
  ['ผู้เก็บข้อมูล', 'collector', 'text'],
  ['หมายเหตุ', 'note', 'text'],
  ['สร้างเมื่อ', 'createdAt', 'num'],
  ['id', 'id', 'text']
];

var SETTINGS_COLS = [
  ['key', 'key', 'text'],
  ['value', 'value', 'text']
];

/* ---------- helpers ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet_(name, cols) {
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    var labels = cols.map(function (c) { return c[0]; });
    sh.getRange(1, 1, 1, labels.length).setValues([labels]).setFontWeight('bold');
    sh.setFrozenRows(1);
    cols.forEach(function (c, i) {
      if (c[2] === 'text') sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  }
  return sh;
}

/* จับคู่ชื่อฟิลด์กับตำแหน่งคอลัมน์จากหัวตาราง */
function headerIndex_(sh, cols) {
  var width = Math.max(sh.getLastColumn(), cols.length, 1);
  var headers = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  var map = {};
  cols.forEach(function (c) {
    var i = headers.indexOf(c[0]);
    if (i < 0) throw new Error('ไม่พบหัวคอลัมน์ "' + c[0] + '" ในชีต ' + sh.getName() + ' — ห้ามลบหรือเปลี่ยนหัวคอลัมน์');
    map[c[1]] = i;
  });
  return map;
}

function normCell_(key, type, v) {
  if (type === 'num') return (v === '' || v === null || v === undefined) ? null : Number(v);
  if (type === 'bool') return v === true || String(v).toLowerCase() === 'true' || String(v) === 'ใช่';
  if (v instanceof Date) {
    var tz = ss_().getSpreadsheetTimeZone();
    return Utilities.formatDate(v, tz, key === 'time' ? 'HH:mm' : 'yyyy-MM-dd');
  }
  return (v === null || v === undefined) ? '' : String(v);
}

function readRows_(name, cols) {
  var sh = ensureSheet_(name, cols);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var map = headerIndex_(sh, cols);
  var width = Math.max(sh.getLastColumn(), cols.length);
  var values = sh.getRange(2, 1, last - 1, width).getValues();
  var out = [];
  values.forEach(function (row) {
    var o = {}, empty = true;
    cols.forEach(function (c) {
      o[c[1]] = normCell_(c[1], c[2], row[map[c[1]]]);
      if (o[c[1]] !== '' && o[c[1]] !== null) empty = false;
    });
    if (!empty) out.push(o);
  });
  return out;
}

function appendRow_(name, cols, rec) {
  var sh = ensureSheet_(name, cols);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var map = headerIndex_(sh, cols);
    var width = Math.max(sh.getLastColumn(), cols.length);
    var id = String(rec.id || Utilities.getUuid());
    var row = [];
    for (var k = 0; k < width; k++) row.push('');
    cols.forEach(function (c) {
      var v = c[1] === 'id' ? id : rec[c[1]];
      var i = map[c[1]];
      if (c[2] === 'num') row[i] = (v === null || v === undefined || v === '') ? '' : Number(v);
      else if (c[2] === 'bool') row[i] = !!v;
      else row[i] = (v === null || v === undefined) ? '' : String(v);
    });
    sh.appendRow(row);
    return id;
  } finally {
    lock.releaseLock();
  }
}

function deleteRow_(name, cols, id) {
  var sh = ensureSheet_(name, cols);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last = sh.getLastRow();
    if (last < 2) return false;
    var map = headerIndex_(sh, cols);
    var ids = sh.getRange(2, map.id + 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(id)) {
        sh.deleteRow(i + 2);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

function getSetting_(key) {
  var sh = ensureSheet_(SETTINGS_SHEET, SETTINGS_COLS);
  var last = sh.getLastRow();
  if (last < 2) return '';
  var map = headerIndex_(sh, SETTINGS_COLS);
  var values = sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), SETTINGS_COLS.length)).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][map.key]) === String(key)) return String(values[i][map.value] || '');
  }
  return '';
}

function setSetting_(key, value) {
  var sh = ensureSheet_(SETTINGS_SHEET, SETTINGS_COLS);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var map = headerIndex_(sh, SETTINGS_COLS);
    var width = Math.max(sh.getLastColumn(), SETTINGS_COLS.length);
    var last = sh.getLastRow();
    if (last >= 2) {
      var values = sh.getRange(2, 1, last - 1, width).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][map.key]) === String(key)) {
          sh.getRange(i + 2, map.value + 1).setValue(value);
          return;
        }
      }
    }
    var row = [];
    for (var k = 0; k < width; k++) row.push('');
    row[map.key] = key;
    row[map.value] = value;
    sh.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- web app endpoints ---------- */

/** สร้างชีตทั้งหมดและหัวคอลัมน์ (รันมือหนึ่งครั้งหลังวางโค้ด) */
function setup() {
  ensureSheet_(BALE_SHEET, BALE_COLS);
  ensureSheet_(CHOP_SHEET, CHOP_COLS);
  ensureSheet_(PELLET_SHEET, PELLET_COLS);
  ensureSheet_(SETTINGS_SHEET, SETTINGS_COLS);
  Logger.log('สร้างชีตเรียบร้อย: ' + [BALE_SHEET, CHOP_SHEET, PELLET_SHEET, SETTINGS_SHEET].join(', '));
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'ping') return json_({ ok: true, time: new Date().toISOString() });
    if (action !== 'list') throw new Error('ไม่รู้จัก action: ' + action);
    return json_({
      ok: true,
      bale: readRows_(BALE_SHEET, BALE_COLS),
      chop: readRows_(CHOP_SHEET, CHOP_COLS),
      pellet: readRows_(PELLET_SHEET, PELLET_COLS),
      mapUrl: getSetting_('mapUrl')
    });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    var body = raw.trim() ? JSON.parse(raw) : {};
    if (TOKEN && String(body.token || '') !== TOKEN) throw new Error('token ไม่ถูกต้อง');
    var action = body.action;
    if (action === 'addBale') return json_({ ok: true, id: appendRow_(BALE_SHEET, BALE_COLS, body.rec || {}) });
    if (action === 'addChop') return json_({ ok: true, id: appendRow_(CHOP_SHEET, CHOP_COLS, body.rec || {}) });
    if (action === 'addPellet') return json_({ ok: true, id: appendRow_(PELLET_SHEET, PELLET_COLS, body.rec || {}) });
    if (action === 'delete') {
      var type = String(body.type || '');
      var ok;
      if (type === 'bale') ok = deleteRow_(BALE_SHEET, BALE_COLS, body.id);
      else if (type === 'chop') ok = deleteRow_(CHOP_SHEET, CHOP_COLS, body.id);
      else if (type === 'pellet') ok = deleteRow_(PELLET_SHEET, PELLET_COLS, body.id);
      else throw new Error('type ไม่ถูกต้อง: ' + type);
      return json_({ ok: true, deleted: ok });
    }
    if (action === 'setMapUrl') {
      setSetting_('mapUrl', String(body.url || ''));
      return json_({ ok: true });
    }
    throw new Error('ไม่รู้จัก action: ' + action);
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}
