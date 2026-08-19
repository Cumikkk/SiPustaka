const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureModalDetailReal() {
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

  // 1. Salin 12_detail_buku.png (yang berisi mode tabel) ke 11b_katalog_tabel.png
  fs.copyFileSync(path.join(IMAGES_DIR, '12_detail_buku.png'), path.join(IMAGES_DIR, '11b_katalog_tabel.png'));
  console.log('✅ Mode Tabel tersimpan di 11b_katalog_tabel.png');

  // 2. Sekarang buka modal detail buku
  console.log('📸 Buka Modal Detail Buku (101 Cerita Nusantara / E-Book)...');
  await appFrame.evaluate(() => {
    switchSubView('katalog');
    const firstDetailBtn = document.querySelector('#katalog-list-container button, .btn-detail-buku, button[onclick*="openDetailBukuModal"]');
    if (firstDetailBtn) {
      firstDetailBtn.click();
    } else if (typeof openDetailBukuModal === 'function' && catalogDataCache && catalogDataCache.length > 0) {
      openDetailBukuModal(catalogDataCache[1].id_buku);
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '12_detail_buku.png') });
  console.log('✅ Modal Detail Buku tersimpan di 12_detail_buku.png');

  // Tutup modal
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalDetailBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });

  browser.disconnect();
  console.log('🎉 SEMUA SCREENSHOT KATALOG GRID, TABEL, DAN MODAL DETAIL BUKU SELESAI!');
}

captureModalDetailReal().catch(console.error);
