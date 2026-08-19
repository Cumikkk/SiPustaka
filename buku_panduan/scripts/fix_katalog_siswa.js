const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function fixKatalogSiswa() {
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
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log('📸 Buka Koleksi Buku Siswa dan simpan ke 11_katalog_grid_tabel.png...');
  await appFrame.evaluate(() => {
    switchSubView('katalog');
  });
  await new Promise(r => setTimeout(r, 4000));

  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '11_katalog_grid_tabel.png') });

  browser.disconnect();
  console.log('🎉 11_katalog_grid_tabel.png BERHASIL DIPERBAIKI SESUAI KATALOG SISWA!');
}

fixKatalogSiswa().catch(console.error);
