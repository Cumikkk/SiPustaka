const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureKatalogModes() {
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

  // Set sebagai Siswa (Rafi)
  console.log('🔑 Switch ke Akun Siswa (Rafi)...');
  await appFrame.evaluate(() => {
    const siswaUser = {
      role: 'siswa',
      userData: {
        id_siswa: 'sis-001',
        nama_lengkap: 'Moch Alfian Rafi Firmaniarrochman',
        username: 'rafi',
        nis: '123',
        kelas: '1',
        email: ''
      }
    };
    currentUser = siswaUser;
    applyLoggedInUserUI(siswaUser);
    switchSubView('katalog');
  });
  await new Promise(r => setTimeout(r, 4000));

  // 1. Capture Mode Grid
  console.log('📸 1. Mengambil 11a_katalog_grid.png (Mode Galeri Grid)...');
  await appFrame.evaluate(() => {
    setKatalogViewMode('grid');
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '11a_katalog_grid.png') });

  // 2. Capture Mode Tabel
  console.log('📸 2. Mengambil 11b_katalog_tabel.png (Mode Tabel Baris)...');
  await appFrame.evaluate(() => {
    setKatalogViewMode('table');
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '11b_katalog_tabel.png') });

  // 3. Capture Detail Modal
  console.log('📸 3. Mengambil 12_detail_buku.png (Modal Detail Buku & E-Book)...');
  await appFrame.evaluate(() => {
    setKatalogViewMode('grid');
    if (typeof catalogDataCache !== 'undefined' && catalogDataCache.length > 0) {
      // Ambil buku yang ada e-book (101 Cerita Nusantara)
      const ebook = catalogDataCache.find(b => b.file_buku || b.url_buku) || catalogDataCache[1] || catalogDataCache[0];
      openDetailBukuModal(ebook.id_buku);
    }
  });
  await new Promise(r => setTimeout(r, 2500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '12_detail_buku.png') });

  // Tutup modal
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalDetailBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });

  browser.disconnect();
  console.log('🎉 SELURUH GAMBAR KATALOG GRID, TABEL, DAN DETAIL BUKU SELESAI DISIMPAN!');
}

captureKatalogModes().catch(console.error);
