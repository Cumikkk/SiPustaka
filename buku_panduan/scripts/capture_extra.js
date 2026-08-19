const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureExtra() {
  console.log('🔗 Menghubungkan ke Chrome Aktif di port 9222...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let targetPage = pages.find(p => p.url().includes('sipustaka') || p.url().includes('script.google.com')) || pages[0];

  let appFrame = null;
  for (const f of targetPage.frames()) {
    try {
      const hasApp = await f.evaluate(() => typeof switchSubView === 'function');
      if (hasApp) {
        appFrame = f;
        break;
      }
    } catch(e) {}
  }

  // ==========================================
  // 1. SISWA VIEWS
  // ==========================================
  console.log('📸 A. Mengambil Screenshot Katalog Siswa...');
  await appFrame.evaluate(() => { switchSubView('katalog'); });
  await new Promise(r => setTimeout(r, 4500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '11_katalog_grid_tabel.png') });

  console.log('📸 B. Mengambil Screenshot Modal Detail Buku...');
  await appFrame.evaluate(() => {
    const cards = document.querySelectorAll('.katalog-card, .btn-detail-buku');
    if (cards.length > 0) cards[0].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '12_detail_buku.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalDetailBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('📸 C. Mengambil Screenshot Peminjaman Siswa...');
  await appFrame.evaluate(() => { switchSubView('peminjaman-siswa'); });
  await new Promise(r => setTimeout(r, 3500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '13_peminjaman_siswa.png') });

  // ==========================================
  // 2. ADMIN VIEWS
  // ==========================================
  console.log('🔑 Switch ke Admin untuk capture modal...');
  await appFrame.evaluate(() => {
    const adminUser = {
      role: 'admin',
      userData: {
        id_admin: 'adm-001',
        nama_lengkap: 'M. Fahrul Alfanani',
        email: 'sdnkedungsumur03@gmail.com',
        username: 'admin',
        role_title: 'Petugas / Admin'
      }
    };
    currentUser = adminUser;
    applyLoggedInUserUI(adminUser);
  });
  await new Promise(r => setTimeout(r, 4000));

  console.log('📸 D. Mengambil Screenshot Sirkulasi Peminjaman...');
  await appFrame.evaluate(() => { switchSubView('peminjaman'); });
  await new Promise(r => setTimeout(r, 4000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '07_sirkulasi_pinjam.png') });

  console.log('📸 E. Mengambil Screenshot Modal Tambah Peminjaman...');
  await appFrame.evaluate(() => {
    const btn = document.querySelector('.btn-tambah-peminjaman') || document.querySelector('button[onclick*="openModalTambahPeminjaman"]');
    if (btn) btn.click();
    else if (typeof openModalTambahPeminjaman === 'function') openModalTambahPeminjaman();
  });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08_modal_pinjam.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('📸 F. Mengambil Screenshot Laporan...');
  await appFrame.evaluate(() => { switchSubView('laporan'); });
  await new Promise(r => setTimeout(r, 4000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '09_laporan_cetak.png') });

  browser.disconnect();
  console.log('🎉 SEMUA SCREENSHOT EXTRA BERHASIL DISIMPAN!');
}

captureExtra().catch(err => {
  console.error('❌ Error extra capture:', err);
  process.exit(1);
});
