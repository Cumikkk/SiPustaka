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
// API PUBLIC & KATALOG
// ==========================================

function getKatalogBuku(searchQuery, kategori) {
  const allBuku = getSheetData('buku');
  const transaksi = getSheetData('transaksi');
  const activeBorrowMap = {};

  transaksi.forEach(t => {
    if (String(t.status || '').toLowerCase() === 'dipinjam') {
      const bId = String(t.id_buku || '');
      activeBorrowMap[bId] = (activeBorrowMap[bId] || 0) + 1;
    }
  });

  return allBuku.filter(buku => {
    const matchesSearch = !searchQuery || 
      String(buku.judul_buku).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.penulis).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.isbn).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesKategori = !kategori || kategori === 'semua' || 
      String(buku.kategori).toLowerCase() === kategori.toLowerCase();

    return matchesSearch && matchesKategori;
  }).map(buku => {
    const bId = String(buku.id_buku || '');
    const baseStok = Number(buku.stok_buku !== undefined ? buku.stok_buku : (buku.stok_aktual !== undefined ? buku.stok_aktual : 0));
    const activeCount = activeBorrowMap[bId] || 0;
    const sisaStok = Math.max(0, baseStok - activeCount);
    
    const bCopy = {};
    for (let key in buku) { bCopy[key] = buku[key]; }
    bCopy.stok_buku = sisaStok;
    return bCopy;
  });
}

function getKategoriList() {
  const allBuku = getSheetData('buku');
  const setKategori = new Set();
  allBuku.forEach(b => {
    if (b.kategori) setKategori.add(String(b.kategori).trim().toLowerCase());
  });
  return Array.from(setKategori);
}

// ==========================================
// API AUTENTIKASI UNIFIED & RESET OTP UNIVERSAL
// ==========================================

function loginUserUnified(credential, password) {
  const cred = String(credential || '').trim();
  const pass = String(password || '').trim();

  // 1. Cek Admin terlebih dahulu (Username atau Email)
  const admins = getSheetData('admin');
  const adminUser = admins.find(a => 
    (String(a.username || '').trim().toLowerCase() === cred.toLowerCase() || String(a.email || '').trim().toLowerCase() === cred.toLowerCase()) && 
    String(a.password || '').trim() === pass
  );

  if (adminUser) {
    return {
      success: true,
      role: 'admin',
      userData: {
        id_admin: adminUser.id_admin,
        nama_lengkap: adminUser.nama_lengkap,
        email: adminUser.email,
        username: adminUser.username,
        role_title: 'Petugas / Admin'
      }
    };
  }

    // 2. Jika bukan Admin, Cek Siswa / Anggota (Strict: Username atau Email Saja)
  const anggota = getSheetData('siswa');
  const siswaUser = anggota.find(a => {
    const userClean = String(a.username || '').trim().toLowerCase();
    const emailClean = String(a.email || '').trim().toLowerCase();
    const isUserMatch = userClean !== '' && userClean === cred.toLowerCase();
    const isEmailMatch = emailClean !== '' && emailClean === cred.toLowerCase();
    
    return (isUserMatch || isEmailMatch) && String(a.password || '').trim() === pass;
  });

  if (siswaUser) {
    if (String(siswaUser.status || 'aktif').toLowerCase() !== 'aktif') {
      return { success: false, message: 'Akun Siswa Anda sedang dinonaktifkan oleh petugas perpustakaan.' };
    }
    return {
      success: true,
      role: 'siswa',
      userData: {
        nis: siswaUser.nis,
        nama_lengkap: siswaUser.nama_lengkap,
        kelas: siswaUser.kelas,
        email: siswaUser.email,
        role_title: 'Siswa (Kelas ' + (siswaUser.kelas || '-') + ')'
      }
    };
  }

  return { success: false, message: 'Username / Email atau Kata Sandi salah!' };
}

function requestOtpUniversal(email) {
  const cleanEmail = String(email).trim().toLowerCase();
  
  const admins = getSheetData('admin');
  let user = admins.find(a => String(a.email).trim().toLowerCase() === cleanEmail);
  let roleType = 'admin';

  if (!user) {
    const anggota = getSheetData('anggota');
    user = anggota.find(a => String(a.email).trim().toLowerCase() === cleanEmail);
    roleType = 'siswa';
  }

  if (!user) {
    return { success: false, message: 'Email tidak terdaftar dalam sistem perpustakaan!' };
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const props = PropertiesService.getScriptProperties();
  const otpData = JSON.stringify({
    email: cleanEmail,
    roleType: roleType,
    otp: otpCode,
    expiry: new Date().getTime() + (10 * 60 * 1000)
  });
  props.setProperty('OTP_' + cleanEmail, otpData);

  try {
    const namaUser = user.nama_lengkap || user.username || 'Pengguna SiPustaka';
    MailApp.sendEmail({
      to: cleanEmail,
      subject: '[SiPustaka] Kode OTP Reset Password Akun',
      htmlBody: `
        <div style="font-family: 'Poppins', Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 82, 204, 0.08); border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #0052cc 0%, #003da6 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">📘 SiPustaka</div>
            <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Sistem Informasi Perpustakaan Sekolah</div>
          </div>
          <div style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Permintaan Reset Kata Sandi</h2>
            <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">Halo <b>${namaUser}</b>,</p>
            <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">Kami menerima permintaan untuk mengatur ulang kata sandi akun SiPustaka Anda. Gunakan kode OTP 6-digit di bawah ini untuk verifikasi:</p>
            
            <div style="background-color: #eef3ff; border: 2px dashed #0052cc; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #0052cc; letter-spacing: 1.5px; margin-bottom: 6px;">KODE OTP VERIFIKASI ANDA</div>
              <div style="font-size: 36px; font-weight: 800; color: #0052cc; letter-spacing: 12px; font-family: monospace;">${otpCode}</div>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px;">
              <div style="margin-bottom: 6px;">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="#92400e" style="vertical-align: -2px; margin-right: 6px;"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                Kode ini berlaku selama <b>10 menit</b>.
              </div>
              <div>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="#92400e" style="vertical-align: -2px; margin-right: 6px;"><path d="M8 1a2 2 0 0 0-2 2v4H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V3a2 2 0 0 0-2-2zm-1 6V3a1 1 0 0 1 2 0v4H7z"/></svg>
                Mohon tidak memberikan kode OTP ini kepada siapa pun demi keamanan akun Anda.
              </div>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini dengan aman.</p>
          </div>
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
            &copy; 2026 SiPustaka &bull; KKN Kelompok 18 UNUSIDA. All rights reserved.
          </div>
        </div>
      `
    });
    return { success: true, message: 'Kode OTP telah dikirim ke email ' + cleanEmail };
  } catch (e) {
    return { success: false, message: 'Gagal mengirim email: ' + e.toString() };
  }
}

function resetPasswordUniversal(email, otpInput, newPassword) {
  const cleanEmail = String(email).trim().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const rawData = props.getProperty('OTP_' + cleanEmail);

  if (!rawData) {
    return { success: false, message: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' };
  }

  const otpObj = JSON.parse(rawData);
  if (new Date().getTime() > otpObj.expiry) {
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: false, message: 'Kode OTP sudah kadaluarsa.' };
  }

  if (String(otpObj.otp).trim() !== String(otpInput).trim()) {
    return { success: false, message: 'Kode OTP yang Anda masukkan salah!' };
  }

  const ss = getDb();
  let updated = false;

  if (otpObj.roleType === 'admin') {
    const sheetAdmin = ss.getSheetByName('admin');
    if (sheetAdmin) {
      const values = sheetAdmin.getDataRange().getValues();
      const headers = values[0].map(h => String(h).trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const passIdx = headers.indexOf('password');
      for (let i = 1; i < values.length; i++) {
        if (emailIdx !== -1 && String(values[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
          if (passIdx !== -1) {
            sheetAdmin.getRange(i + 1, passIdx + 1).setValue(newPassword);
            updated = true;
          }
          break;
        }
      }
    }
  } else {
    const sheetSiswa = getFlexibleSheet(ss, 'siswa');
    if (sheetSiswa) {
      const values = sheetSiswa.getDataRange().getValues();
      const headers = values[0].map(h => String(h).trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const passIdx = headers.indexOf('password');
      for (let i = 1; i < values.length; i++) {
        if (emailIdx !== -1 && String(values[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
          if (passIdx !== -1) {
            sheetSiswa.getRange(i + 1, passIdx + 1).setValue(newPassword);
            updated = true;
          }
          break;
        }
      }
    }
  }

  if (updated) {
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: true, message: 'Password berhasil diubah! Silakan login dengan password baru.' };
  }

  return { success: false, message: 'Gagal memperbarui password di database.' };
}

// ==========================================
// API AREA SISWA & ADMIN
// ==========================================

function getAdminDashboardData() {
  const buku = getSheetData('buku');
  const anggota = getSheetData('siswa');
  const transaksi = getSheetData('transaksi');

  const mapBukuObj = {};
  buku.forEach(b => mapBukuObj[b.id_buku] = b);
  const mapAnggotaObj = {};
  anggota.forEach(a => {
    if (a.nis) mapAnggotaObj[String(a.nis).trim()] = a;
    if (a.id_anggota) mapAnggotaObj[String(a.id_anggota).trim()] = a;
  });

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  function parseLocalYMD(str) {
    if (!str) return new Date();
    if (str instanceof Date) {
      return new Date(str.getFullYear(), str.getMonth(), str.getDate());
    }
    const parts = String(str).split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(str);
  }

  const todayDate = parseLocalYMD(todayStr);

  let totalPeminjamanAktif = 0;
  let totalTerlambat = 0;

  const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function formatIndoDate(dateStr) {
    if (!dateStr) return '-';
    const dObj = parseLocalYMD(dateStr);
    return `${dObj.getDate()} ${monthsIndo[dObj.getMonth()]}`;
  }

  const formattedTransaksi = transaksi.map(t => {
    const tNis = String(t.nis || t.nis_anggota || t.id_anggota || '').trim();
    const bInfo = mapBukuObj[t.id_buku] || {};
    const aInfo = mapAnggotaObj[tNis] || {};

    let statusText = 'Dipinjam';
    let subText = '-';
    let badgeClass = 'bg-primary text-white';

    if (t.status === 'dipinjam') {
      totalPeminjamanAktif++;
      const dueDate = parseLocalYMD(t.tgl_jatuh_tempo);
      
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays < 0) {
        totalTerlambat++;
        statusText = 'Terlambat';
        subText = `${Math.abs(diffDays)} Hari`;
        badgeClass = 'bg-danger text-white';
      } else if (diffDays === 0) {
        statusText = 'Jatuh Tempo';
        subText = 'Hari Ini';
        badgeClass = 'bg-warning text-dark';
      } else {
        statusText = 'Dipinjam';
        subText = `Sisa ${diffDays} Hari`;
        badgeClass = 'bg-primary text-white';
      }
    } else {
      statusText = 'Dikembalikan';
      subText = 'Selesai';
      badgeClass = 'bg-secondary text-white';
    }

    const statusBadge = { text: statusText, class: badgeClass, subText: subText };

    return {
      ...t,
      nama_buku: bInfo.judul_buku || t.id_buku,
      kategori_buku: bInfo.kategori || 'Umum',
      nama_anggota: aInfo.nama_lengkap || tNis || 'Siswa',
      kelas_anggota: aInfo.kelas ? `Kelas ${aInfo.kelas}` : 'Siswa',
      tgl_pinjam_indo: formatIndoDate(t.tgl_pinjam),
      tgl_jatuh_tempo_indo: formatIndoDate(t.tgl_jatuh_tempo),
      periode_pinjam: `${formatIndoDate(t.tgl_pinjam)} - ${formatIndoDate(t.tgl_jatuh_tempo)}`,
      isTerlambat: t.status === 'dipinjam' && String(t.tgl_jatuh_tempo).split('T')[0] < todayStr,
      statusBadge,
      subText
    };
  });

  const activeOnly = formattedTransaksi.filter(t => t.status === 'dipinjam');

  activeOnly.sort((a, b) => {
    if (a.isTerlambat && !b.isTerlambat) return -1;
    if (!a.isTerlambat && b.isTerlambat) return 1;
    return new Date(a.tgl_jatuh_tempo) - new Date(b.tgl_jatuh_tempo);
  });

  const peminjamanTerbaru = activeOnly.slice(0, 5);

  const countKategori = {};
  let totalBukuKategori = 0;

  buku.forEach(b => {
    let kat = String(b.kategori || 'Lainnya').trim();
    if (!kat) kat = 'Lainnya';
    kat = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
    countKategori[kat] = (countKategori[kat] || 0) + 1;
    totalBukuKategori++;
  });

  const paletteColors = ['#0052cc', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
  let colorIdx = 0;

  const kategoriStats = Object.keys(countKategori).map(kat => {
    const count = countKategori[kat];
    const pct = totalBukuKategori > 0 ? Math.round((count / totalBukuKategori) * 100) : 0;
    const color = paletteColors[colorIdx % paletteColors.length];
    colorIdx++;

    return {
      label: kat,
      count: count,
      percentage: pct,
      color: color
    };
  });

  let totalStokFisik = 0;
  buku.forEach(b => totalStokFisik += Number(b.stok_buku || b.stok_aktual || 0));

  const siswaOnly = anggota.filter(a => {
    const roleStr = String(a.role || '').toLowerCase();
    return roleStr !== 'admin' && roleStr !== 'petugas';
  });
  const totalSiswaAktif = siswaOnly.filter(a => String(a.status || 'aktif').toLowerCase() === 'aktif').length;

  const pctDipinjam = buku.length > 0 ? ((totalPeminjamanAktif / buku.length) * 100).toFixed(1) : '0';
  const subtextTerlambat = totalTerlambat > 0 
    ? `${totalTerlambat} transaksi perlu tindakan` 
    : 'Semua peminjaman tepat waktu';

  return {
    stats: {
      totalBuku: buku.length,
      totalAnggota: siswaOnly.length,
      peminjamanAktif: totalPeminjamanAktif,
      peminjamanTerlambat: totalTerlambat,
      subtextBuku: `Total ${totalStokFisik} eksemplar fisik`,
      subtextAnggota: `${totalSiswaAktif} siswa berstatus aktif`,
      subtextPinjam: `${pctDipinjam}% dari total koleksi`,
      subtextTerlambat: subtextTerlambat
    },
    peminjamanTerbaru,
    peminjamanAktifAll: activeOnly,
    kategoriStats,
    buku,
    anggota
  };
}

function getStudentDashboardData(nis) {
  try {
    const cleanNis = String(nis || '').trim();
    const buku = getSheetData('buku');
    const transaksi = getSheetData('transaksi');
    const anggota = getSheetData('siswa');

    const siswaInfo = anggota.find(a => String(a.nis).trim() === cleanNis) || {};
    const mapBuku = {};
    const activeBorrowMap = {};

    transaksi.forEach(t => {
      if (String(t.status || '').toLowerCase() === 'dipinjam') {
        const bId = String(t.id_buku || '');
        activeBorrowMap[bId] = (activeBorrowMap[bId] || 0) + 1;
      }
    });

    buku.forEach(b => mapBuku[b.id_buku] = b);

    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    function parseLocalYMD(str) {
      if (!str) return new Date();
      if (str instanceof Date) {
        return new Date(str.getFullYear(), str.getMonth(), str.getDate());
      }
      const s = String(str).split('T')[0];
      const parts = s.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
      const dObj = new Date(str);
      return isNaN(dObj.getTime()) ? new Date() : dObj;
    }

    function formatIndoDate(dateStr) {
      if (!dateStr) return '-';
      const dObj = parseLocalYMD(dateStr);
      return `${dObj.getDate()} ${monthsIndo[dObj.getMonth()]} ${dObj.getFullYear()}`;
    }

    function formatShortIndoDate(dateStr) {
      if (!dateStr) return '-';
      const dObj = parseLocalYMD(dateStr);
      return `${dObj.getDate()} ${monthsIndo[dObj.getMonth()]}`;
    }

    const todayDate = parseLocalYMD(todayStr);

    const myTransaksi = transaksi.filter(t => {
      const tNis = String(t.nis || t.nis_anggota || t.id_anggota || '').trim();
      return tNis.toLowerCase() === cleanNis.toLowerCase();
    });

    let totalDipinjamSaya = 0;
    let totalRiwayatDibaca = 0;
    let totalTerlambatSaya = 0;

    const myActiveLoans = [];
    const myAllLoans = [];

    myTransaksi.forEach(t => {
      const bInfo = mapBuku[t.id_buku] || {};
      const dueDate = parseLocalYMD(t.tgl_jatuh_tempo);
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      const stLower = String(t.status || 'dipinjam').toLowerCase();
      let statusText = 'Dipinjam';
      let subText = `Tenggat: ${formatShortIndoDate(t.tgl_jatuh_tempo)}`;
      let badgeClass = 'bg-primary text-white';
      let rawStatus = 'dipinjam';

      if (stLower === 'dipinjam') {
        totalDipinjamSaya++;
        if (diffDays < 0) {
          totalTerlambatSaya++;
          statusText = 'Terlambat';
          subText = `${Math.abs(diffDays)} Hari`;
          badgeClass = 'bg-danger text-white';
          rawStatus = 'terlambat';
        } else if (diffDays === 0) {
          statusText = 'Jatuh Tempo';
          subText = 'Hari Ini';
          badgeClass = 'bg-warning text-dark';
          rawStatus = 'dipinjam';
        } else {
          statusText = 'Dipinjam';
          subText = `Sisa ${diffDays} Hari`;
          badgeClass = 'bg-primary text-white';
          rawStatus = 'dipinjam';
        }

        myActiveLoans.push({
          id_transaksi: String(t.id_transaksi || ''),
          judul_buku: String(bInfo.judul_buku || t.id_buku || '-'),
          kategori_buku: String(bInfo.kategori || 'Umum'),
          tgl_pinjam_indo: formatShortIndoDate(t.tgl_pinjam),
          tgl_jatuh_tempo_indo: formatShortIndoDate(t.tgl_jatuh_tempo),
          periode_pinjam: `${formatShortIndoDate(t.tgl_pinjam)} - ${formatShortIndoDate(t.tgl_jatuh_tempo)}`,
          badgeClass,
          badgeText: statusText,
          subText
        });
      } else if (stLower === 'dikembalikan') {
        totalRiwayatDibaca++;
        statusText = 'Dikembalikan';
        subText = (t.tgl_kembali || t.tgl_dikembalikan) ? formatShortIndoDate(t.tgl_kembali || t.tgl_dikembalikan) : '-';
        badgeClass = 'bg-success text-white';
        rawStatus = 'dikembalikan';
      }

      myAllLoans.push({
        id_transaksi: String(t.id_transaksi || ''),
        id_buku: String(t.id_buku || ''),
        judul_buku: String(bInfo.judul_buku || t.id_buku || '-'),
        kategori_buku: String(bInfo.kategori || 'Umum'),
        penulis: String(bInfo.penulis || '-'),
        tgl_pinjam_indo: formatShortIndoDate(t.tgl_pinjam),
        tgl_jatuh_tempo_indo: formatShortIndoDate(t.tgl_jatuh_tempo),
        periode_pinjam: `${formatShortIndoDate(t.tgl_pinjam)} - ${formatShortIndoDate(t.tgl_jatuh_tempo)}`,
        tgl_kembali_indo: (t.tgl_kembali || t.tgl_dikembalikan) ? formatShortIndoDate(t.tgl_kembali || t.tgl_dikembalikan) : '-',
        status: stLower,
        statusRaw: rawStatus,
        statusClass: badgeClass,
        statusText,
        subText
      });
    });

    const countKategori = {};
    let totalBukuKategori = 0;

    buku.forEach(b => {
      let kat = String(b.kategori || 'Lainnya').trim();
      if (!kat) kat = 'Lainnya';
      kat = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
      countKategori[kat] = (countKategori[kat] || 0) + 1;
      totalBukuKategori++;
    });

    const paletteColors = ['#0052cc', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    let colorIdx = 0;

    const kategoriStats = Object.keys(countKategori).map(kat => {
      const count = countKategori[kat];
      const pct = totalBukuKategori > 0 ? Math.round((count / totalBukuKategori) * 100) : 0;
      const color = paletteColors[colorIdx % paletteColors.length];
      colorIdx++;

      return {
        label: kat,
        count: count,
        percentage: pct,
        color: color
      };
    });

    const rekomendasiBuku = buku.slice(0, 5).map(b => {
      const bId = String(b.id_buku || '');
      const baseStok = Number(b.stok_buku !== undefined ? b.stok_buku : (b.stok_aktual !== undefined ? b.stok_aktual : 0));
      const activeCount = activeBorrowMap[bId] || 0;
      const sisaStok = Math.max(0, baseStok - activeCount);
      return {
        id_buku: bId,
        judul_buku: String(b.judul_buku || ''),
        penulis: String(b.penulis || '-'),
        kategori: String(b.kategori || 'Umum'),
        stok_buku: sisaStok
      };
    });

    return {
      stats: {
        totalBuku: buku.length,
        dipinjamSaya: totalDipinjamSaya,
        totalDibaca: totalRiwayatDibaca,
        totalTerlambat: totalTerlambatSaya,
        statusAnggota: String(siswaInfo.status || 'aktif').toLowerCase() === 'aktif' ? 'Aktif' : 'Non-Aktif'
      },
      myActiveLoans: myActiveLoans.slice(0, 5),
      myAllLoans,
      kategoriStats,
      rekomendasiBuku
    };
  } catch (err) {
    return { error: err.toString() };
  }
}


function verifyOtpUniversal(email, otpInput) {
  const cleanEmail = String(email).trim().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const rawData = props.getProperty('OTP_' + cleanEmail);

  if (!rawData) {
    return { success: false, message: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' };
  }

  const otpObj = JSON.parse(rawData);
  const now = new Date().getTime();

  if (now > otpObj.expiry) {
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: false, message: 'Kode OTP sudah kadaluarsa (lebih dari 10 menit). Silakan minta kode baru.' };
  }

  if (String(otpInput).trim() !== String(otpObj.otp).trim()) {
    return { success: false, message: 'Kode OTP yang Anda masukkan salah.' };
  }

  return { success: true, message: 'Kode OTP valid.' };
}


// ==========================================
// API MANAJEMEN BUKU (CRUD LENGKAP)
// ==========================================

function getBukuListFull(searchQuery, kategori, statusFilter) {
  const allBuku = getSheetData('buku');
  const allTrx = getSheetData('transaksi');
  
  return allBuku.filter(buku => {
    const matchesSearch = !searchQuery || 
      String(buku.judul_buku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.penulis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.isbn || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesKategori = !kategori || kategori === 'semua' || 
      String(buku.kategori || '').toLowerCase() === kategori.toLowerCase();

    const isDipinjam = allTrx.some(t => String(t.id_buku) === String(buku.id_buku) && String(t.status).toLowerCase() === 'dipinjam');
    const matchesStatus = !statusFilter || statusFilter === 'semua' ||
      (statusFilter === 'tersedia' && Number(buku.stok_buku || buku.stok_aktual || 0) > 0) ||
      (statusFilter === 'dipinjam' && isDipinjam);

    return matchesSearch && matchesKategori && matchesStatus;
  });
}

function saveBukuData(bukuObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName('buku');
  if (!sheet) return { success: false, message: 'Sheet buku tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  
  const idBukuIdx = headers.indexOf('id_buku');
  const isbnIdx = headers.indexOf('isbn');
  const judulIdx = headers.indexOf('judul_buku');
  const penulisIdx = headers.indexOf('penulis');
  const penerbitIdx = headers.indexOf('penerbit');
  const tahunIdx = headers.indexOf('tahun_terbit');
  const kategoriIdx = headers.indexOf('kategori');
  const rakIdx = headers.indexOf('rak_lokasi');
  
  let stokIdx = headers.indexOf('stok_buku');
  if (stokIdx === -1) stokIdx = headers.indexOf('stok_aktual');
  
  const urlIdx = headers.indexOf('url_sampul');
  const urlFileIdx = headers.indexOf('url_file_buku');

  let rowToUpdate = -1;
  let isEdit = false;

  if (bukuObj.id_buku) {
    const searchIdx = idBukuIdx !== -1 ? idBukuIdx : 0;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][searchIdx]).trim() === String(bukuObj.id_buku).trim()) {
        rowToUpdate = i + 1;
        isEdit = true;
        break;
      }
    }
  }

  const stokVal = Number(bukuObj.stok_buku || bukuObj.stok_aktual || 1);

  if (!isEdit) {
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const newId = 'bk-' + String(nextRow - 1).padStart(3, '0');
    
    // Construct row matching current headers dynamically
    const rowData = headers.map(h => {
      if (h === 'id_buku') return newId;
      if (h === 'isbn') return bukuObj.isbn || '';
      if (h === 'judul_buku') return bukuObj.judul_buku || '';
      if (h === 'penulis') return bukuObj.penulis || '';
      if (h === 'penerbit') return bukuObj.penerbit || '';
      if (h === 'tahun_terbit') return bukuObj.tahun_terbit || '';
      if (h === 'kategori') return bukuObj.kategori || 'Fiksi';
      if (h === 'stok_buku' || h === 'stok_aktual') return stokVal;
      if (h === 'url_sampul') return bukuObj.url_sampul || '';
      if (h === 'url_file_buku') return bukuObj.url_file_buku || '';
      if (h === 'rak_lokasi') return bukuObj.rak_lokasi || 'Utama';
      return '';
    });

    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('buku', nextRow, 1);
    return { success: true, message: 'Buku baru berhasil ditambahkan!' };
  } else {
    if (isbnIdx !== -1) sheet.getRange(rowToUpdate, isbnIdx + 1).setValue(bukuObj.isbn || '');
    if (judulIdx !== -1) sheet.getRange(rowToUpdate, judulIdx + 1).setValue(bukuObj.judul_buku || '');
    if (penulisIdx !== -1) sheet.getRange(rowToUpdate, penulisIdx + 1).setValue(bukuObj.penulis || '');
    if (penerbitIdx !== -1) sheet.getRange(rowToUpdate, penerbitIdx + 1).setValue(bukuObj.penerbit || '');
    if (tahunIdx !== -1) sheet.getRange(rowToUpdate, tahunIdx + 1).setValue(bukuObj.tahun_terbit || '');
    if (kategoriIdx !== -1) sheet.getRange(rowToUpdate, kategoriIdx + 1).setValue(bukuObj.kategori || 'Fiksi');
    if (rakIdx !== -1) sheet.getRange(rowToUpdate, rakIdx + 1).setValue(bukuObj.rak_lokasi || 'Utama');
    if (stokIdx !== -1) sheet.getRange(rowToUpdate, stokIdx + 1).setValue(stokVal);
    if (urlIdx !== -1 && bukuObj.url_sampul !== undefined) sheet.getRange(rowToUpdate, urlIdx + 1).setValue(bukuObj.url_sampul);
    if (urlFileIdx !== -1 && bukuObj.url_file_buku !== undefined) sheet.getRange(rowToUpdate, urlFileIdx + 1).setValue(bukuObj.url_file_buku);
    return { success: true, message: 'Data buku berhasil diperbarui!' };
  }
}

function deleteBukuData(idBuku) {
  const ss = getDb();
  const sheet = ss.getSheetByName('buku');
  if (!sheet) return { success: false, message: 'Sheet buku tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(idBuku).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Buku berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Buku tidak ditemukan.' };
}

// ==========================================
// API MANAJEMEN ANGGOTA & ADMIN (CRUD LENGKAP)
// ==========================================

function getAnggotaListFull(searchQuery, statusFilter) {
  const allAnggota = getSheetData('anggota');
  return allAnggota.filter(a => {
    const matchesSearch = !searchQuery ||
      String(a.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.nis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || statusFilter === 'semua' ||
      String(a.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });
}

function getDaftarKelasUnik() {
  const anggota = getSheetData('siswa');
  const kelasSet = new Set();
  (anggota || []).forEach(a => {
    const k = String(a.kelas || '').trim();
    if (k && String(a.status || 'aktif').toLowerCase() === 'aktif') {
      kelasSet.add(k);
    }
  });
  return Array.from(kelasSet).sort();
}

function prosesKenaikanKelasMassal(ruleMapping) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: false, message: 'Data siswa kosong.' };

  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const kelasIdx = headers.indexOf('kelas');
  const statusIdx = headers.indexOf('status');

  if (kelasIdx === -1) return { success: false, message: 'Kolom kelas tidak ditemukan.' };

  let updatedCount = 0;
  for (let i = 1; i < values.length; i++) {
    const currentKelas = String(values[i][kelasIdx]).trim();
    if (ruleMapping && ruleMapping[currentKelas]) {
      const targetKelas = String(ruleMapping[currentKelas]).trim();
      if (targetKelas.toUpperCase() === 'LULUS' || targetKelas.toUpperCase() === 'ALUMNI') {
        sheet.getRange(i + 1, kelasIdx + 1).setValue(targetKelas);
        if (statusIdx !== -1) {
          sheet.getRange(i + 1, statusIdx + 1).setValue('nonaktif');
        }
      } else {
        sheet.getRange(i + 1, kelasIdx + 1).setValue(targetKelas);
      }
      updatedCount++;
    }
  }

  return { 
    success: true, 
    message: `Berhasil memproses kenaikan kelas untuk ${updatedCount} siswa!` 
  };
}

function saveAnggotaData(anggotaObj) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const nisClean = String(anggotaObj.nis).trim();
  const targetNisSearch = String(anggotaObj.originalNis || anggotaObj.nis).trim();

  const nisIdx = headers.indexOf('nis');
  const namaIdx = headers.indexOf('nama_lengkap');
  const kelasIdx = headers.indexOf('kelas');
  const emailIdx = headers.indexOf('email');
  const userIdx = headers.indexOf('username');
  const passIdx = headers.indexOf('password');
  const statusIdx = headers.indexOf('status');

  let rowToUpdate = -1;
  const searchIdx = nisIdx !== -1 ? nisIdx : 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][searchIdx]).trim() === targetNisSearch) {
      rowToUpdate = i + 1;
      break;
    }
  }

  if (rowToUpdate === -1) {
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const rowData = headers.map(h => {
      if (h === 'nis') return "'" + nisClean;
      if (h === 'nama_lengkap') return anggotaObj.nama_lengkap || '';
      if (h === 'kelas') return anggotaObj.kelas || '1';
      if (h === 'email') return anggotaObj.email || '';
      if (h === 'username') return "'" + (anggotaObj.username || nisClean);
      if (h === 'password') return "'" + (anggotaObj.password || '123');
      if (h === 'status') return anggotaObj.status || 'aktif';
      return '';
    });
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('siswa', nextRow, 1);
    return { success: true, message: 'Data Siswa baru berhasil ditambahkan!' };
  } else {
    if (nisIdx !== -1) sheet.getRange(rowToUpdate, nisIdx + 1).setValue("'" + nisClean);
    if (namaIdx !== -1) sheet.getRange(rowToUpdate, namaIdx + 1).setValue(anggotaObj.nama_lengkap || '');
    if (kelasIdx !== -1) sheet.getRange(rowToUpdate, kelasIdx + 1).setValue("'" + (anggotaObj.kelas || ''));
    if (emailIdx !== -1) sheet.getRange(rowToUpdate, emailIdx + 1).setValue(anggotaObj.email || '');
    if (userIdx !== -1 && anggotaObj.username) sheet.getRange(rowToUpdate, userIdx + 1).setValue("'" + anggotaObj.username);
    if (passIdx !== -1 && anggotaObj.password) sheet.getRange(rowToUpdate, passIdx + 1).setValue("'" + anggotaObj.password);
    if (statusIdx !== -1 && anggotaObj.status) sheet.getRange(rowToUpdate, statusIdx + 1).setValue(anggotaObj.status);
    return { success: true, message: 'Data Siswa berhasil diperbarui!' };
  }
}

function deleteAnggotaData(nis) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const nisIdx = headers.indexOf('nis');
  
  const searchIdx = nisIdx !== -1 ? nisIdx : 0;
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][searchIdx]).trim() === String(nis).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Data Siswa berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Data Siswa tidak ditemukan.' };
}

function getAdminListFull() {
  const allAdmin = getSheetData('admin');
  return allAdmin.map(a => ({
    id_admin: a.id_admin || '',
    nama_lengkap: a.nama_lengkap || '',
    email: a.email || '',
    username: a.username || ''
  }));
}

function saveAdminData(adminObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName('admin');
  if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const userClean = String(adminObj.username || '').trim().toLowerCase();

  let rowToUpdate = -1;
  if (adminObj.id_admin) {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(adminObj.id_admin).trim()) {
        rowToUpdate = i + 1;
        break;
      }
    }
  }

  if (rowToUpdate === -1) {
    const exists = values.slice(1).some(r => String(r[3]).trim().toLowerCase() === userClean);
    if (exists) {
      return { success: false, message: 'Username sudah digunakan oleh petugas lain!' };
    }
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const newId = 'adm-' + String(nextRow - 1).padStart(2, '0');
    const rowData = [
      newId,
      adminObj.nama_lengkap || '',
      adminObj.email || '',
      adminObj.username || '',
      adminObj.password || '123'
    ];
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('admin', nextRow, 1);
    return { success: true, message: 'Petugas Admin baru berhasil ditambahkan!' };
  } else {
    for (let i = 1; i < values.length; i++) {
      if (i + 1 !== rowToUpdate && String(values[i][3]).trim().toLowerCase() === userClean) {
        return { success: false, message: 'Username sudah digunakan oleh petugas lain!' };
      }
    }
    sheet.getRange(rowToUpdate, 2).setValue(adminObj.nama_lengkap || '');
    sheet.getRange(rowToUpdate, 3).setValue(adminObj.email || '');
    sheet.getRange(rowToUpdate, 4).setValue(adminObj.username || '');
    if (adminObj.password && String(adminObj.password).trim() !== '') {
      sheet.getRange(rowToUpdate, 5).setValue(String(adminObj.password).trim());
    }
    return { success: true, message: 'Data Petugas Admin berhasil diperbarui!' };
  }
}

function deleteAdminData(idAdmin) {
  const ss = getDb();
  const sheet = ss.getSheetByName('admin');
  if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 2) {
    return { success: false, message: 'Minimal harus ada 1 Petugas Admin dalam sistem!' };
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(idAdmin).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Petugas Admin berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Petugas Admin tidak ditemukan.' };
}
// ==========================================
// HELPER PERATAAN KOLOM PERSISI (EXACT ALIGNMENT TABLE)
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

function getStudentLoansFull(nis) {
  const dashData = getStudentDashboardData(nis);
  if (dashData.error) {
    return { success: false, message: dashData.error };
  }
  return {
    success: true,
    data: dashData.myAllLoans || [],
    stats: {
      active: dashData.stats ? dashData.stats.dipinjamSaya : 0,
      read: dashData.stats ? dashData.stats.totalDibaca : 0,
      overdue: dashData.stats ? dashData.stats.totalTerlambat : 0
    }
  };
}
// ==========================================
// API TRANSAKSI PEMINJAMAN & PENGEMBALIAN
// ==========================================

function createTransaksiPeminjaman(nis, idBuku, tglPinjam, tglTempo, catatan) {
  const ss = getDb();
  
  // Validasi Siswa
  const sheetSiswa = getFlexibleSheet(ss, 'siswa');
  const siswaData = sheetSiswa.getDataRange().getValues();
  const siswaHeaders = siswaData[0].map(h => String(h).trim().toLowerCase());
  const nisIdx = siswaHeaders.indexOf('nis');
  let siswaFound = false;
  let namaSiswa = '';
  for (let i = 1; i < siswaData.length; i++) {
    if (String(siswaData[i][nisIdx]).trim() === String(nis).trim()) {
      siswaFound = true;
      namaSiswa = String(siswaData[i][siswaHeaders.indexOf('nama_lengkap')] || '');
      break;
    }
  }
  if (!siswaFound) return { success: false, message: 'NIS tidak ditemukan.' };

  // Validasi Buku
  const sheetBuku = ss.getSheetByName('buku');
  const bukuData = sheetBuku.getDataRange().getValues();
  const bukuHeaders = bukuData[0].map(h => String(h).trim().toLowerCase());
  const idBukuIdx = bukuHeaders.indexOf('id_buku');
  let stokIdx = bukuHeaders.indexOf('stok_buku');
  if (stokIdx === -1) stokIdx = bukuHeaders.indexOf('stok_aktual');
  let bukuFound = false;
  let judulBuku = '';
  let rowBuku = -1;
  let currentStok = 0;
  for (let i = 1; i < bukuData.length; i++) {
    if (String(bukuData[i][idBukuIdx]).trim() === String(idBuku).trim()) {
      bukuFound = true;
      rowBuku = i + 1;
      judulBuku = String(bukuData[i][bukuHeaders.indexOf('judul_buku')] || '');
      currentStok = parseInt(bukuData[i][stokIdx]) || 0;
      break;
    }
  }
  if (!bukuFound) return { success: false, message: 'Buku tidak ditemukan.' };
  if (currentStok <= 0) return { success: false, message: 'Stok buku habis (0).' };

  // Generate ID Transaksi
  const sheetTrx = ss.getSheetByName('transaksi');
  if (!sheetTrx) return { success: false, message: 'Sheet transaksi tidak ditemukan.' };
  
  const trxData = sheetTrx.getDataRange().getValues();
  const trxHeaders = trxData[0].map(h => String(h).trim().toLowerCase());
  const idTrxIdx = trxHeaders.indexOf('id_transaksi');
  
  const dateObj = new Date();
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const prefix = `trx-${yyyy}${mm}-`;
  
  let maxSeq = 0;
  if (idTrxIdx !== -1) {
    for (let i = 1; i < trxData.length; i++) {
      const idVal = String(trxData[i][idTrxIdx] || '');
      if (idVal.startsWith(prefix)) {
        const seq = parseInt(idVal.replace(prefix, ''), 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  let newIdTrx = `${prefix}${nextSeq}`;

  // Baris baru
  const newRow = trxHeaders.map(h => {
    if (h === 'id_transaksi') return newIdTrx;
    if (h === 'nis' || h === 'nis_anggota' || h === 'id_anggota') return "'" + nis;
    if (h === 'nama_anggota' || h === 'nama_siswa') return namaSiswa;
    if (h === 'id_buku') return idBuku;
    if (h === 'judul_buku') return judulBuku;
    if (h === 'tgl_pinjam') return tglPinjam;
    if (h === 'tgl_jatuh_tempo') return tglTempo;
    if (h === 'status') return 'dipinjam';
    if (h === 'catatan') return catatan || '';
    return '';
  });

  const nextRow = sheetTrx.getLastRow() + 1;
  sheetTrx.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
  applyColumnAlignments('transaksi', nextRow, 1);

  // Kurangi stok buku
  if (stokIdx !== -1) {
    sheetBuku.getRange(rowBuku, stokIdx + 1).setValue(currentStok - 1);
  }

  return { success: true, message: 'Peminjaman berhasil disimpan!' };
}

function findTransaksiForReturn(query) {
  function parseLocalYMD(str) {
    if (!str) return new Date();
    const pts = String(str).split('-');
    if (pts.length === 3) return new Date(pts[0], parseInt(pts[1]) - 1, pts[2]);
    return new Date(str);
  }

  const q = String(query).trim().toLowerCase();
  const trxList = getSheetData('transaksi');
  const bukuList = getSheetData('buku');
  const siswaList = getSheetData('siswa');

  let found = null;
  for (let i = 0; i < trxList.length; i++) {
    const t = trxList[i];
    if (String(t.status || '').toLowerCase() === 'dipinjam') {
      const idTrx = String(t.id_transaksi || '').toLowerCase();
      const idBuku = String(t.id_buku || '').toLowerCase();
      const nis = String(t.nis || t.nis_anggota || t.id_anggota || '').toLowerCase();
      
      if (idTrx === q || idBuku === q || nis === q) {
        found = { ...t };
        break;
      }
    }
  }

  if (!found) return { success: false, message: 'Peminjaman aktif tidak ditemukan untuk kode tersebut.' };

  const bInfo = bukuList.find(b => String(b.id_buku).toLowerCase() === String(found.id_buku).toLowerCase()) || {};
  const sInfo = siswaList.find(s => String(s.nis).toLowerCase() === String(found.nis || found.nis_anggota || found.id_anggota).toLowerCase()) || {};

  found.nama_anggota = sInfo.nama_lengkap || found.nama_anggota || '-';
  found.kelas = sInfo.kelas || '-';
  found.judul_buku = bInfo.judul_buku || found.judul_buku || '-';
  found.penulis = bInfo.penulis || '-';

  const todayDate = parseLocalYMD(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  found.tgl_dikembalikan = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  if (found.tgl_jatuh_tempo) {
    const dueDate = parseLocalYMD(found.tgl_jatuh_tempo);
    const diffTime = todayDate.getTime() - dueDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    
    if (diffDays > 0) {
      found.terlambat_hari = diffDays;
      found.denda_keterlambatan = diffDays * 1000;
    } else {
      found.terlambat_hari = 0;
      found.denda_keterlambatan = 0;
    }
  } else {
    found.terlambat_hari = 0;
    found.denda_keterlambatan = 0;
  }

  return { success: true, transaksi: found };
}

function processPengembalianBuku(idTransaksi) {
  function parseLocalYMD(str) {
    if (!str) return new Date();
    const pts = String(str).split('-');
    if (pts.length === 3) return new Date(pts[0], parseInt(pts[1]) - 1, pts[2]);
    return new Date(str);
  }

  const ss = getDb();
  const sheetTrx = ss.getSheetByName('transaksi');
  const sheetBuku = ss.getSheetByName('buku');
  if (!sheetTrx) return { success: false, message: 'Sheet transaksi tidak ditemukan.' };

  const values = sheetTrx.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const idTrxIdx = headers.indexOf('id_transaksi');
  const idBukuIdx = headers.indexOf('id_buku');
  const statusIdx = headers.indexOf('status');
  const tglKembaliIdx = headers.indexOf('tgl_dikembalikan') !== -1 ? headers.indexOf('tgl_dikembalikan') : headers.indexOf('tgl_kembali');
  const dendaIdx = headers.indexOf('denda_keterlambatan') !== -1 ? headers.indexOf('denda_keterlambatan') : headers.indexOf('denda');

  let rowToUpdate = -1;
  let idBukuToUpdate = '';
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idTrxIdx]).trim() === String(idTransaksi).trim()) {
      rowToUpdate = i + 1;
      idBukuToUpdate = String(values[i][idBukuIdx]).trim();
      break;
    }
  }

  if (rowToUpdate === -1) return { success: false, message: 'Data transaksi tidak ditemukan.' };

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Update Status
  if (statusIdx !== -1) sheetTrx.getRange(rowToUpdate, statusIdx + 1).setValue('dikembalikan');
  if (tglKembaliIdx !== -1) sheetTrx.getRange(rowToUpdate, tglKembaliIdx + 1).setValue(todayStr);
  if (dendaIdx !== -1) sheetTrx.getRange(rowToUpdate, dendaIdx + 1).setValue(0); // Denda dihilangkan (selalu 0)

  // Update Stok Buku

  if (idBukuToUpdate && sheetBuku) {
    const bukuValues = sheetBuku.getDataRange().getValues();
    const bHeaders = bukuValues[0].map(h => String(h).trim().toLowerCase());
    const bIdIdx = bHeaders.indexOf('id_buku');
    let stokIdx = bHeaders.indexOf('stok_buku');
    if (stokIdx === -1) stokIdx = bHeaders.indexOf('stok_aktual');
    
    if (bIdIdx !== -1 && stokIdx !== -1) {
      for (let i = 1; i < bukuValues.length; i++) {
        if (String(bukuValues[i][bIdIdx]).trim() === idBukuToUpdate) {
          const currentStok = parseInt(bukuValues[i][stokIdx]) || 0;
          sheetBuku.getRange(i + 1, stokIdx + 1).setValue(currentStok + 1);
          break;
        }
      }
    }
  }

  return { success: true, message: 'Buku berhasil dikembalikan!' };
}

// ==========================================
// API PENCARIAN DROPDOWN PEMINJAMAN
// ==========================================

function searchAnggotaOptions(query) {
  try {
    const q = String(query || '').trim().toLowerCase();
    const anggota = getSheetData('siswa') || [];
    const maxResults = 10;
    const results = [];
    
    for (let i = 0; i < anggota.length; i++) {
      const a = anggota[i];
      if (!a) continue;
      
      const status = String(a.status || 'aktif').toLowerCase();
      if (status === 'aktif') {
        const nama = String(a.nama_lengkap || '').toLowerCase();
        const nis = String(a.nis || '').toLowerCase();
        if (nama.includes(q) || nis.includes(q)) {
          results.push({ nis: String(a.nis || ''), nama_lengkap: String(a.nama_lengkap || ''), kelas: String(a.kelas || '') });
          if (results.length >= maxResults) break;
        }
      }
    }
    return results;
  } catch (err) {
    throw new Error("Gagal load data anggota: " + err.message);
  }
}

function searchBukuOptions(query) {
  try {
    const q = String(query || '').trim().toLowerCase();
    const buku = getSheetData('buku') || [];
    const maxResults = 10;
    const results = [];
    
    for (let i = 0; i < buku.length; i++) {
      const b = buku[i];
      if (!b) continue;
      
      const stok = parseInt(b.stok_buku !== undefined ? b.stok_buku : (b.stok_aktual !== undefined ? b.stok_aktual : 0)) || 0;
      if (stok > 0) {
        const judul = String(b.judul_buku || '').toLowerCase();
        const isbn = String(b.isbn || '').toLowerCase();
        const idBuku = String(b.id_buku || '').toLowerCase();
        if (judul.includes(q) || isbn.includes(q) || idBuku.includes(q)) {
          results.push({ id_buku: String(b.id_buku || ''), judul_buku: String(b.judul_buku || ''), penulis: String(b.penulis || ''), stok_aktual: stok });
          if (results.length >= maxResults) break;
        }
      }
    }
    return results;
  } catch (err) {
    throw new Error("Gagal load data buku: " + err.message);
  }
}

// ==========================================
// API TABEL PENGEMBALIAN BUKU
// ==========================================

function getTransaksiPeminjamanAktif(searchQuery) {
  const transaksi = getSheetData('transaksi');
  const buku = getSheetData('buku');
  const anggota = getSheetData('siswa');
  
  const mapBuku = {};
  buku.forEach(b => mapBuku[b.id_buku] = b);
  
  const mapAnggota = {};
  anggota.forEach(a => mapAnggota[a.nis] = a);

  let activeLoans = [];
  
  transaksi.forEach(t => {
    if (String(t.status || '').toLowerCase() === 'dipinjam') {
      const nis = t.nis || t.nis_anggota || t.id_anggota;
      const bInfo = mapBuku[t.id_buku] || {};
      const aInfo = mapAnggota[nis] || {};
      
      activeLoans.push({
        id_transaksi: t.id_transaksi,
        nis: nis,
        nama_anggota: aInfo.nama_lengkap || t.nama_anggota || '-',
        kelas: aInfo.kelas || '-',
        id_buku: t.id_buku,
        judul_buku: bInfo.judul_buku || t.judul_buku || '-',
        kategori: bInfo.kategori || '-',
        tgl_pinjam: t.tgl_pinjam,
        tgl_jatuh_tempo: t.tgl_jatuh_tempo,
        url_sampul: bInfo.url_sampul || ''
      });
    }
  });

  if (searchQuery) {
    const q = String(searchQuery).toLowerCase().trim();
    activeLoans = activeLoans.filter(l => 
      String(l.nama_anggota).toLowerCase().includes(q) ||
      String(l.nis).toLowerCase().includes(q) ||
      String(l.judul_buku).toLowerCase().includes(q)
    );
  }

  // Sort by tgl_jatuh_tempo ascending (closest deadline first)
  activeLoans.sort((a, b) => new Date(a.tgl_jatuh_tempo) - new Date(b.tgl_jatuh_tempo));

  return activeLoans;
}



function getLaporanRingkasanFull() {
  const ss = getDb();
  
  // Baca data transaksi
  const sheetTrx = ss.getSheetByName('transaksi');
  let trxData = [];
  if (sheetTrx) {
    trxData = sheetTrx.getDataRange().getValues();
  }
  
  let totalPeminjaman = 0;
  let totalDikembalikan = 0;
  let masihDipinjam = 0;
  let terlambat = 0;
  
  const bukuStats = {}; // id_buku -> { id_buku, judul, total_dipinjam, dikembalikan, sedang_dipinjam }
  
  if (trxData.length > 1) {
    const headers = trxData[0].map(h => String(h).trim().toLowerCase());
    const idBukuIdx = headers.indexOf('id_buku');
    const judulIdx = headers.indexOf('judul_buku');
    const statusIdx = headers.indexOf('status');
    
    if (idBukuIdx !== -1 && statusIdx !== -1) {
      for (let i = 1; i < trxData.length; i++) {
        const row = trxData[i];
        const status = String(row[statusIdx] || '').toLowerCase();
        const idBuku = String(row[idBukuIdx] || '');
        const judul = judulIdx !== -1 ? String(row[judulIdx] || '') : 'Buku Tidak Diketahui';
        
        if (!idBuku) continue;
        
        totalPeminjaman++;
        if (status === 'dikembalikan') totalDikembalikan++;
        else if (status === 'dipinjam') masihDipinjam++;
        else if (status === 'terlambat') {
          masihDipinjam++;
          terlambat++;
        }
        
        if (!bukuStats[idBuku]) {
          bukuStats[idBuku] = { id_buku: idBuku, judul_buku: judul, dipinjam: 0, dikembalikan: 0, masih_dipinjam: 0, terlambat: 0 };
        }
        
        bukuStats[idBuku].dipinjam++;
        if (status === 'dikembalikan') bukuStats[idBuku].dikembalikan++;
        else if (status === 'dipinjam') bukuStats[idBuku].masih_dipinjam++;
        else if (status === 'terlambat') {
          bukuStats[idBuku].masih_dipinjam++;
          bukuStats[idBuku].terlambat++;
        }
      }
    }
  }
  
  const ringkasanBuku = Object.values(bukuStats).sort((a, b) => b.dipinjam - a.dipinjam);
  
  return {
    totalPeminjaman,
    totalDikembalikan,
    masihDipinjam,
    terlambat,
    ringkasanBuku
  };
}
