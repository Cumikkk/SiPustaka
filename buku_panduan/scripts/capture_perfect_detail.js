const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function capturePerfectDetail() {
  console.log('🔗 Menghubungkan ke Chrome di port 9222...');
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

  // 1. Simpan Modal Pinjam
  console.log('📸 1. Capture 08_modal_pinjam.png...');
  await appFrame.evaluate(() => {
    switchSubView('peminjaman');
    if (typeof showModalTambahPeminjaman === 'function') {
      showModalTambahPeminjaman();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08_modal_pinjam.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Buka Detail Buku Modal (E-Book)
  console.log('📸 2. Capture 12_detail_buku.png...');
  await appFrame.evaluate(() => {
    switchSubView('katalog');
    if (typeof openDetailBukuModal === 'function' && typeof katalogData !== 'undefined' && katalogData.length > 0) {
      openDetailBukuModal(katalogData[0]);
    } else {
      const btn = document.querySelector('.btn-detail-buku, button[onclick*="openDetailBukuModal"]');
      if (btn) btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 2500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '12_detail_buku.png') });

  await appFrame.evaluate(() => {
    const m = document.getElementById('modalDetailBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });

  browser.disconnect();
  console.log('🎉 SEMUA MODAL BERHASIL DIAMBIL ULANG!');
}

capturePerfectDetail().catch(console.error);
