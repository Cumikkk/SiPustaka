const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET_URL = 'https://sipustaka-sdnkedungsumur03.vercel.app';
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function captureAll() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('🚀 Memulai Chrome Engine dari:', chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850, deviceScaleFactor: 2 });

  console.log('🌐 Membuka Web App SiPustaka:', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 6000));

  // Temukan frame aktif aplikasi (baik di Vercel wrapper atau langsung)
  let appFrame = page.mainFrame();
  for (const f of page.frames()) {
    try {
      const hasLogin = await f.evaluate(() => !!document.getElementById('form-login'));
      if (hasLogin) {
        appFrame = f;
        console.log('🎯 Frame Aplikasi Aktif Ditemukan:', f.url().substring(0, 80));
        break;
      }
    } catch (e) {}
  }

  // 1. Screenshot Halaman Login
  console.log('📸 1. Mengambil Screenshot Login...');
  await page.screenshot({ path: path.join(IMAGES_DIR, '01_login.png') });

  // 2. Screenshot Modal Lupa Password (OTP)
  console.log('📸 2. Mengambil Screenshot Modal Lupa Password OTP...');
  await appFrame.evaluate(() => { if (typeof openForgotModal === 'function') openForgotModal(); });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(IMAGES_DIR, '14_reset_password_otp.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalLupaPassword');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // ==========================================
  // SESI ADMINISTRATOR (Login Real: admin / 123)
  // ==========================================
  console.log('🔑 Melakukan Login Nyata sebagai Administrator (admin / 123)...');
  await appFrame.evaluate(() => {
    const cred = document.getElementById('login-username') || document.getElementById('login-credential');
    const pass = document.getElementById('login-password');
    if (cred) cred.value = 'admin';
    if (pass) pass.value = '123';
    const form = document.getElementById('form-login');
    if (typeof handleLoginSubmit === 'function') {
      handleLoginSubmit({ preventDefault: () => {} });
    }
  });
  await new Promise(r => setTimeout(r, 6000));

  // 3. Dashboard Admin
  console.log('📸 3. Mengambil Screenshot Dashboard Admin...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('dashboard'); });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(IMAGES_DIR, '02_dashboard_admin.png') });

  // 4. Master Data Buku
  console.log('📸 4. Mengambil Screenshot Master Data Buku...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('buku'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, '03_master_buku.png') });

  // 5. Modal Tambah / Upload Buku
  console.log('📸 5. Mengambil Screenshot Modal Tambah Buku...');
  await appFrame.evaluate(() => { if (typeof showModalTambahBuku === 'function') showModalTambahBuku(); });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(IMAGES_DIR, '04_upload_buku.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // 6. Master Data Siswa
  console.log('📸 6. Mengambil Screenshot Master Data Siswa...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('anggota'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, '05_master_siswa.png') });

  // 7. Modal Kenaikan Kelas Massal
  console.log('📸 7. Mengambil Screenshot Modal Kenaikan Kelas...');
  await appFrame.evaluate(() => { if (typeof openModalKenaikanKelas === 'function') openModalKenaikanKelas(); });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(IMAGES_DIR, '06_kenaikan_kelas.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalKenaikanKelas');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // 8. Sirkulasi Peminjaman & Pengembalian
  console.log('📸 8. Mengambil Screenshot Sirkulasi Peminjaman (Admin)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('peminjaman'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, '07_sirkulasi_pinjam.png') });

  // 9. Laporan Perpustakaan
  console.log('📸 9. Mengambil Screenshot Laporan Perpustakaan...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('laporan'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, '09_laporan_cetak.png') });

  // 10. Profil Petugas
  console.log('📸 10. Mengambil Screenshot Profil Petugas...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('profil'); });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(IMAGES_DIR, '15_profil_pengguna.png') });

  // ==========================================
  // SESI SISWA (Login Real: rafi / 123)
  // ==========================================
  console.log('🚪 Melakukan Logout dan Login Nyata sebagai Siswa (rafi / 123)...');
  await appFrame.evaluate(() => {
    currentUser = null;
    localStorage.removeItem('sipustaka_session');
    if (typeof showLoginScreenDirect === 'function') showLoginScreenDirect();
    const cred = document.getElementById('login-username') || document.getElementById('login-credential');
    const pass = document.getElementById('login-password');
    if (cred) cred.value = 'rafi';
    if (pass) pass.value = '123';
    if (typeof handleLoginSubmit === 'function') {
      handleLoginSubmit({ preventDefault: () => {} });
    }
  });
  await new Promise(r => setTimeout(r, 6000));

  // 11. Dashboard Siswa
  console.log('📸 11. Mengambil Screenshot Dashboard Siswa...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('dashboard'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, '10_dashboard_siswa.png') });

  // 12. Katalog Koleksi Siswa
  console.log('📸 12. Mengambil Screenshot Katalog Koleksi Siswa...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('katalog'); });
  await new Promise(r => setTimeout(r, 4500));
  await page.screenshot({ path: path.join(IMAGES_DIR, '11_katalog_grid_tabel.png') });

  // 13. Peminjaman Saya
  console.log('📸 13. Mengambil Screenshot Peminjaman Saya (Siswa)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('peminjaman-siswa'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, '13_peminjaman_siswa.png') });

  console.log('✨ Menutup Browser...');
  await browser.close();
  console.log('🎉 SELURUH SCREENSHOT DENGAN DATA ASLI BERHASIL DIAMBIL DI:', IMAGES_DIR);
}

captureAll().catch(err => {
  console.error('❌ Error saat capture screenshot:', err);
  process.exit(1);
});
