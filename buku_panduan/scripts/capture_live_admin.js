const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureLiveAdmin() {
  console.log('🔗 Menghubungkan ke Chrome Aktif di port 9222...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let targetPage = pages.find(p => p.url().includes('sipustaka') || p.url().includes('script.google.com')) || pages[0];
  console.log('🎯 Mengendalikan Tab:', targetPage.url());

  // 1. Simpan Screenshot Login
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '01_login.png') });
  console.log('📸 1. Login page tersimpan.');

  // Cari frame yang memuat form login
  let appFrame = null;
  for (const f of targetPage.frames()) {
    try {
      const hasInput = await f.evaluate(() => !!document.getElementById('login-username'));
      if (hasInput) {
        appFrame = f;
        console.log('🎯 Frame form login ditemukan:', f.name(), f.url().substring(0, 60));
        break;
      }
    } catch(e) {}
  }

  if (!appFrame) {
    throw new Error('Frame aplikasi tidak ditemukan di tab aktif!');
  }

  // Buka modal lupa password & screenshot
  console.log('📸 2. Mengambil Screenshot Lupa Password OTP...');
  await appFrame.evaluate(() => { if (typeof openForgotModal === 'function') openForgotModal(); });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '14_reset_password_otp.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalLupaPassword');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Login Admin: Set value dan panggil handleLoginSubmit langsung
  console.log('🔑 Melakukan login Admin di layar Chrome Anda...');
  await appFrame.evaluate(() => {
    const u = document.getElementById('login-username');
    const p = document.getElementById('login-password');
    if (u) u.value = 'admin';
    if (p) p.value = '123';
    if (typeof handleLoginSubmit === 'function') {
      handleLoginSubmit({ preventDefault: () => {} });
    }
  });

  console.log('⏳ Menunggu dashboard admin termuat di layar (8 detik)...');
  await new Promise(r => setTimeout(r, 8000));

  // Cari frame aplikasi utama setelah login
  for (const f of targetPage.frames()) {
    try {
      const isDashboard = await f.evaluate(() => !!document.getElementById('subview-dashboard'));
      if (isDashboard) {
        appFrame = f;
        console.log('🎯 Frame Dashboard ditemukan!');
        break;
      }
    } catch(e) {}
  }

  // 3. Dashboard Admin
  console.log('📸 3. Mengambil Screenshot Dashboard Admin...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('dashboard'); });
  await new Promise(r => setTimeout(r, 4000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '02_dashboard_admin.png') });

  // 4. Master Data Buku
  console.log('📸 4. Mengambil Screenshot Master Data Buku...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('buku'); });
  await new Promise(r => setTimeout(r, 4500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '03_master_buku.png') });

  // 5. Modal Tambah Buku
  console.log('📸 5. Mengambil Screenshot Modal Tambah Buku...');
  await appFrame.evaluate(() => { if (typeof showModalTambahBuku === 'function') showModalTambahBuku(); });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '04_upload_buku.png') });
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
  await new Promise(r => setTimeout(r, 4500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '05_master_siswa.png') });

  // 7. Modal Kenaikan Kelas
  console.log('📸 7. Mengambil Screenshot Modal Kenaikan Kelas...');
  await appFrame.evaluate(() => { if (typeof openModalKenaikanKelas === 'function') openModalKenaikanKelas(); });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '06_kenaikan_kelas.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalKenaikanKelas');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // 8. Sirkulasi Peminjaman
  console.log('📸 8. Mengambil Screenshot Sirkulasi Peminjaman...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('peminjaman'); });
  await new Promise(r => setTimeout(r, 4500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '07_sirkulasi_pinjam.png') });

  // 9. Laporan Perpustakaan
  console.log('📸 9. Mengambil Screenshot Laporan...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('laporan'); });
  await new Promise(r => setTimeout(r, 4500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '09_laporan_cetak.png') });

  // 10. Profil Petugas
  console.log('📸 10. Mengambil Screenshot Profil...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('profil'); });
  await new Promise(r => setTimeout(r, 3000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '15_profil_pengguna.png') });

  // ==========================================
  // LOGOUT ADMIN & LOGIN SISWA (rafi / 123)
  // ==========================================
  console.log('🚪 Logout Admin dan Login Siswa...');
  await appFrame.evaluate(() => {
    localStorage.removeItem('sipustaka_session');
    if (typeof showLoginScreenDirect === 'function') showLoginScreenDirect();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Cari ulang frame login
  for (const f of targetPage.frames()) {
    try {
      const hasInput = await f.evaluate(() => !!document.getElementById('login-username'));
      if (hasInput) {
        appFrame = f;
        break;
      }
    } catch(e) {}
  }

  await appFrame.evaluate(() => {
    const u = document.getElementById('login-username');
    const p = document.getElementById('login-password');
    if (u) u.value = 'rafi';
    if (p) p.value = '123';
    if (typeof handleLoginSubmit === 'function') {
      handleLoginSubmit({ preventDefault: () => {} });
    }
  });
  await new Promise(r => setTimeout(r, 8000));

  // 11. Dashboard Siswa
  console.log('📸 11. Mengambil Screenshot Dashboard Siswa...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('dashboard'); });
  await new Promise(r => setTimeout(r, 4000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '10_dashboard_siswa.png') });

  // 12. Katalog Koleksi Siswa
  console.log('📸 12. Mengambil Screenshot Katalog Siswa...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('katalog'); });
  await new Promise(r => setTimeout(r, 5000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '11_katalog_grid_tabel.png') });

  // 13. Peminjaman Saya
  console.log('📸 13. Mengambil Screenshot Peminjaman Siswa...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('peminjaman-siswa'); });
  await new Promise(r => setTimeout(r, 4000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '13_peminjaman_siswa.png') });

  browser.disconnect();
  console.log('🎉 SELURUH PROSES SCREENSHOT LIVE SELESAI!');
}

captureLiveAdmin().catch(err => {
  console.error('❌ Error capture live:', err);
  process.exit(1);
});
