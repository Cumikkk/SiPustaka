/**
 * ==============================================================================
 * SIPUSTAKA - MASTER SCREENSHOT AUTOMATION SCRIPT
 * Skrip Master Lengkap Pengambil Seluruh 22 Tangkapan Layar Buku Panduan
 * SDN Kedungsumur 03 (Format A5 Resmi - Resolusi Seragam 1920x945)
 * 
 * Cara Menjalankan:
 * node buku_panduan/scripts/capture_screenshots.js
 * ==============================================================================
 */

const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET_URL = 'https://sipustaka-sdnkedungsumur03.vercel.app';
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function captureAllScreenshots() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('🚀 Memulai Browser Chrome Headless dari:', chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  // Seragam 1920x945 viewport (100% konsisten di seluruh 22 gambar)
  await page.setViewport({ width: 1920, height: 945, deviceScaleFactor: 1 });

  console.log('🌐 Membuka Web App SiPustaka:', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 6000));

  // Temukan frame aktif aplikasi
  let appFrame = page.mainFrame();
  for (const f of page.frames()) {
    try {
      const hasApp = await f.evaluate(() => typeof switchSubView === 'function');
      if (hasApp) {
        appFrame = f;
        console.log('🎯 Frame Aplikasi Aktif Ditemukan:', f.url().substring(0, 80));
        break;
      }
    } catch (e) {}
  }

  // Helper fungsi di dalam frame untuk menutup SEMUA modal & backdrop secara tuntas
  const forceCloseAllModals = async () => {
    await appFrame.evaluate(() => {
      if (typeof Swal !== 'undefined') Swal.close();
      document.querySelectorAll('.modal').forEach(el => {
        if (typeof bootstrap !== 'undefined') {
          const bs = bootstrap.Modal.getInstance(el);
          if (bs) bs.hide();
        }
        el.classList.remove('show');
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
        el.removeAttribute('aria-modal');
      });
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    });
    await new Promise(r => setTimeout(r, 800));
  };

  // ==========================================
  // 1. SESI UMUM & AUTENTIKASI
  // ==========================================
  console.log('📸 1. Mengambil Screenshot Login (gbr_2_1_login.png)...');
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_1_login.png') });

  console.log('📸 2. Mengambil Screenshot Modal Lupa Password OTP (gbr_2_7_reset_password_otp.png)...');
  await appFrame.evaluate(() => { if (typeof openForgotModal === 'function') openForgotModal(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_7_reset_password_otp.png') });
  await forceCloseAllModals();

  // ==========================================
  // 2. SESI PORTAL ADMIN (Login: admin / 123)
  // ==========================================
  console.log('🔑 Melakukan Login sebagai Admin...');
  await appFrame.evaluate(() => {
    const cred = document.getElementById('login-username') || document.getElementById('login-credential');
    const pass = document.getElementById('login-password');
    if (cred) cred.value = 'admin';
    if (pass) pass.value = '123';
    if (typeof handleLoginSubmit === 'function') {
      handleLoginSubmit({ preventDefault: () => {} });
    }
  });
  await new Promise(r => setTimeout(r, 6000));

  // 3.1 Dashboard Admin
  console.log('📸 3. Mengambil Dashboard Admin (gbr_3_1_dashboard_admin.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('dashboard'); });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_1_dashboard_admin.png') });

  // 3.2 Master Data Buku
  console.log('📸 4. Mengambil Master Data Buku (gbr_3_2_master_buku.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('buku'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_2_master_buku.png') });

  // 3.3 Modal Tambah Buku
  console.log('📸 5. Mengambil Modal Tambah Buku (gbr_3_3_upload_buku.png)...');
  await appFrame.evaluate(() => { if (typeof showModalTambahBuku === 'function') showModalTambahBuku(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_3_upload_buku.png') });
  await forceCloseAllModals();

  // 3.4 Master Data Anggota Siswa
  console.log('📸 6. Mengambil Master Data Siswa (gbr_3_4_master_siswa.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('anggota'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_4_master_siswa.png') });

  // 3.4a Tambah Siswa Baru
  console.log('📸 7. Mengambil Modal Tambah Siswa (gbr_3_5_tambah_siswa.png)...');
  await appFrame.evaluate(() => { if (typeof showModalTambahAnggota === 'function') showModalTambahAnggota(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_5_tambah_siswa.png') });
  await forceCloseAllModals();

  // 3.4b Dialog Hapus Siswa Lulus
  console.log('📸 8. Mengambil Dialog Hapus Siswa Lulus (gbr_3_6_hapus_siswa_lulus.png)...');
  await appFrame.evaluate(() => { if (typeof handleHapusSiswaLulusMassal === 'function') handleHapusSiswaLulusMassal(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_6_hapus_siswa_lulus.png') });
  await forceCloseAllModals();

  // 3.5 Modal Kenaikan Kelas Massal
  console.log('📸 9. Mengambil Modal Kenaikan Kelas (gbr_3_7_kenaikan_kelas.png)...');
  await appFrame.evaluate(() => { if (typeof openModalKenaikanKelas === 'function') openModalKenaikanKelas(); });
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_7_kenaikan_kelas.png') });
  await forceCloseAllModals();

  // 3.6 Sirkulasi Peminjaman
  console.log('📸 10. Mengambil Sirkulasi Peminjaman (gbr_3_8_sirkulasi_pinjam.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('peminjaman'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_8_sirkulasi_pinjam.png') });

  // 3.6 Form Tambah Peminjaman
  console.log('📸 11. Mengambil Form Tambah Peminjaman (gbr_3_9_modal_pinjam.png)...');
  await appFrame.evaluate(() => { if (typeof showModalTambahPeminjaman === 'function') showModalTambahPeminjaman(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_9_modal_pinjam.png') });
  await forceCloseAllModals();

  // 3.6 Dialog Pilih Siswa
  console.log('📸 12. Mengambil Dialog Pilih Siswa (gbr_3_10_modal_pilih_siswa.png)...');
  await appFrame.evaluate(() => { if (typeof openModalPilihSiswa === 'function') openModalPilihSiswa(); });
  // Wait until table has loaded rows (no spinner)
  await appFrame.waitForFunction(() => {
    const tbody = document.getElementById('pilih-siswa-tbody');
    return tbody && tbody.querySelectorAll('.btn').length > 0 && !tbody.querySelector('.spinner-border');
  }, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_10_modal_pilih_siswa.png') });
  await forceCloseAllModals();

  // 3.6 Dialog Pilih Buku
  console.log('📸 13. Mengambil Dialog Pilih Buku (gbr_3_11_modal_pilih_buku.png)...');
  await appFrame.evaluate(() => {
    if (typeof openModalPilihBuku === 'function') openModalPilihBuku();
  });
  // Wait until table has loaded rows (no spinner)
  await appFrame.waitForFunction(() => {
    const tbody = document.getElementById('pilih-buku-tbody');
    return tbody && tbody.querySelectorAll('.btn').length > 0 && !tbody.querySelector('.spinner-border');
  }, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_11_modal_pilih_buku.png') });
  await forceCloseAllModals();

  // 3.7 Konfirmasi Pengembalian (Tampilan bersih di menu Peminjaman)
  console.log('📸 14. Mengambil Dialog Konfirmasi Pengembalian (gbr_3_12_konfirmasi_kembali.png)...');
  await appFrame.evaluate(() => {
    if (typeof switchSubView === 'function') switchSubView('peminjaman');
  });
  await new Promise(r => setTimeout(r, 2000));
  await appFrame.evaluate(() => {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Konfirmasi Pengembalian',
        text: 'Apakah Anda yakin ingin memproses pengembalian buku "Why? Human Body - Tubuh Manusia" oleh "Moch Alfian Rafi Firmaniarrochman"?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Kembalikan Buku',
        cancelButtonText: 'Batal'
      });
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_12_konfirmasi_kembali.png') });
  await forceCloseAllModals();

  // 3.8 Laporan Perpustakaan (Tampilan bersih)
  console.log('📸 15. Mengambil Laporan Perpustakaan (gbr_3_13_laporan_cetak.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('laporan'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_13_laporan_cetak.png') });

  // 3.9 Profil Admin (Tampilan bersih)
  console.log('📸 16. Mengambil Profil Admin (gbr_3_14_profil_admin.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('profil'); });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_3_14_profil_admin.png') });

  // ==========================================
  // 3. SESI PORTAL SISWA (Login: rafi / 123)
  // ==========================================
  console.log('🚪 Logout dan Login sebagai Siswa (rafi / 123)...');
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

  // 2.2 Dashboard Siswa
  console.log('📸 17. Mengambil Dashboard Siswa (gbr_2_2_dashboard_siswa.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('dashboard'); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_2_dashboard_siswa.png') });

  // 2.3 Katalog Grid & Tabel
  console.log('📸 18. Mengambil Katalog Siswa Mode Grid (gbr_2_3_katalog_grid.png)...');
  await appFrame.evaluate(() => {
    if (typeof switchSubView === 'function') switchSubView('katalog');
    if (typeof setKatalogViewMode === 'function') setKatalogViewMode('grid');
  });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_3_katalog_grid.png') });

  console.log('📸 19. Mengambil Katalog Siswa Mode Tabel (gbr_2_4_katalog_tabel.png)...');
  await appFrame.evaluate(() => {
    if (typeof setKatalogViewMode === 'function') setKatalogViewMode('table');
  });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_4_katalog_tabel.png') });

  // 2.4 Detail Buku
  console.log('📸 20. Mengambil Detail Buku & E-Book (gbr_2_5_detail_buku.png)...');
  await appFrame.evaluate(() => {
    if (typeof openDetailBukuModal === 'function') openDetailBukuModal('buku-001');
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_5_detail_buku.png') });
  await forceCloseAllModals();

  // 2.5 Peminjaman Saya
  console.log('📸 21. Mengambil Peminjaman Saya Siswa (gbr_2_6_peminjaman_siswa.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('peminjaman-siswa'); });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_6_peminjaman_siswa.png') });

  // 2.7 Profil Siswa
  console.log('📸 22. Mengambil Profil Siswa (gbr_2_8_profil_siswa.png)...');
  await appFrame.evaluate(() => { if (typeof switchSubView === 'function') switchSubView('profil'); });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(IMAGES_DIR, 'gbr_2_8_profil_siswa.png') });

  console.log('✨ Menutup Browser...');
  await browser.close();
  console.log('🎉 SEMUA 22 SCREENSHOT RESMI BERHASIL DIAMBIL & TERSIMPAN DI:', IMAGES_DIR);
}

captureAllScreenshots().catch(err => {
  console.error('❌ Error saat capture screenshot:', err);
  process.exit(1);
});
