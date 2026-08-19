const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureModalsDirect() {
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

  // 1. Modal Kenaikan Kelas
  console.log('📸 1. Capture 06_kenaikan_kelas.png...');
  await appFrame.evaluate(() => {
    switchSubView('anggota');
    const m = document.getElementById('modalKenaikanKelas');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getOrCreateInstance(m);
      bs.show();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '06_kenaikan_kelas.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalKenaikanKelas');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Sirkulasi Peminjaman (Tabel Data)
  console.log('📸 2. Capture 07_sirkulasi_pinjam.png...');
  await appFrame.evaluate(() => { switchSubView('peminjaman'); });
  await new Promise(r => setTimeout(r, 5000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '07_sirkulasi_pinjam.png') });

  // 3. Modal Tambah Peminjaman
  console.log('📸 3. Capture 08_modal_pinjam.png...');
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getOrCreateInstance(m);
      bs.show();
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

  // 4. Modal Detail Buku & Baca E-Book
  console.log('📸 4. Capture 12_detail_buku.png...');
  await appFrame.evaluate(() => {
    switchSubView('katalog');
    if (typeof viewDetailBuku === 'function' && typeof currentKatalogData !== 'undefined' && currentKatalogData.length > 0) {
      viewDetailBuku(currentKatalogData[0].id_buku);
    } else {
      const m = document.getElementById('modalDetailBuku');
      if (m && typeof bootstrap !== 'undefined') {
        const bs = bootstrap.Modal.getOrCreateInstance(m);
        bs.show();
      }
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
  console.log('🎉 DIRECT MODAL CAPTURE SELESAI!');
}

captureModalsDirect().catch(console.error);
