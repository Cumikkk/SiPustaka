/**
 * ====================================================================
 * SiPustaka - Sistem Informasi Perpustakaan Sekolah
 * Backend Google Apps Script (V8 Engine)
 * ====================================================================
 */

// Konfigurasi ID Spreadsheet & Google Drive Folder
const SPREADSHEET_ID = '1BJVNzX9wWw3rHnHlN8GkR3-KK_6kfjqBXOldbU3_TEg';
const UPLOAD_FOLDER_ID = '1XIJJx-OVC7JPZ4eOWUaT_fDJXMQJhOi5';

/**
 * Endpoint Utama Web App
 */
function doGet(e) {
  try {
    setupDatabase();
  } catch (err) {
    Logger.log("Setup Database Info: " + err.toString());
  }

  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('SiPustaka - Sistem Informasi Perpustakaan Sekolah')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper untuk include file HTML pendukung (CSS/JS)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Membuka Spreadsheet Database
 */
function getDb() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Inisialisasi struktur Sheet jika belum ada (Tanpa Data Dummy)
 */
function setupDatabase() {
  const ss = getDb();

  // 1. Sheet Admin
  let sheetAdmin = ss.getSheetByName('admin');
  if (!sheetAdmin) {
    sheetAdmin = ss.insertSheet('admin');
    sheetAdmin.appendRow(['id_admin', 'nama_lengkap', 'email', 'username', 'password']);
  }

  // 2. Sheet Anggota
  let sheetAnggota = ss.getSheetByName('siswa') || ss.getSheetByName('anggota');
  if (!sheetAnggota) {
    sheetAnggota = ss.insertSheet('anggota');
    sheetAnggota.appendRow(['nis', 'nama_lengkap', 'kelas', 'email', 'password', 'status']);
  }

  // 3. Sheet Buku
  let sheetBuku = ss.getSheetByName('buku');
  if (!sheetBuku) {
    sheetBuku = ss.insertSheet('buku');
    sheetBuku.appendRow(['id_buku', 'isbn', 'judul_buku', 'penulis', 'penerbit', 'tahun_terbit', 'kategori', 'stok_buku', 'url_sampul', 'url_file_buku']);
  }

  // 4. Sheet Transaksi
  let sheetTransaksi = ss.getSheetByName('transaksi');
  if (!sheetTransaksi) {
    sheetTransaksi = ss.insertSheet('transaksi');
    sheetTransaksi.appendRow(['id_transaksi', 'nis', 'id_buku', 'tgl_pinjam', 'tgl_jatuh_tempo', 'status', 'tgl_dikembalikan']);
  }

  // 5. Sheet Pengaturan
  let sheetPengaturan = ss.getSheetByName('pengaturan');
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet('pengaturan');
    sheetPengaturan.appendRow(['kunci', 'nilai']);
  }
}

function getFlexibleSheet(ss, sheetName) {
  if (!ss) ss = getDb();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet && (sheetName === 'anggota' || sheetName === 'siswa')) {
    sheet = ss.getSheetByName('siswa') || ss.getSheetByName('anggota');
  }
  return sheet;
}

/**
 * Convert sheet data to array of objects
 */
function getSheetData(sheetName) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const data = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      const rawKey = String(header || '').trim();
      const lowerKey = rawKey.toLowerCase();
      item[rawKey] = val;
      if (lowerKey !== rawKey) {
        item[lowerKey] = val;
      }
    });
    data.push(item);
  }
  return data;
}

/**
 * Mengambil data pengaturan kontak dinamis dari Sheet `pengaturan` (100% Murni Database Google Sheets)
 */
function getPengaturanKontak() {
  const data = getSheetData('pengaturan');
  const result = {};

  data.forEach(item => {
    if (item.kunci && item.nilai) {
      result[item.kunci] = item.nilai;
    }
  });

  return result;
}

// ==========================================

function applyColumnAlignments(sheetName, startRow, numRows) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const alignmentsMap = {
      'admin': ['center', 'left', 'left', 'center', 'center'],
      'anggota': ['center', 'left', 'center', 'left', 'center', 'center'],
      'buku': ['center', 'center', 'left', 'left', 'left', 'center', 'left', 'center', 'center', 'left'],
      'transaksi': ['center', 'center', 'center', 'center', 'center', 'center', 'center']
    };

    const alignArray = alignmentsMap[sheetName];
    if (!alignArray) return;

    // Apply alignments fast in 1 batch call
    alignArray.forEach((align, colIdx) => {
      sheet.getRange(startRow, colIdx + 1, numRows, 1).setHorizontalAlignment(align);
    });
  } catch (err) {
    Logger.log("Alignment notice: " + err.toString());
  }
}

// ==========================================
// API PEMINJAMAN SAYA KHUSUS SISWA
// ==========================================
