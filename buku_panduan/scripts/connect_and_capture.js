const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function captureActiveChrome() {
  console.log('🔗 Menghubungkan ke Chrome Anda di port 9222...');
  
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  console.log(`Ditemukan ${pages.length} tab di Chrome.`);

  let targetPage = pages.find(p => p.url().includes('sipustaka') || p.url().includes('script.google.com')) || pages[0];
  console.log('🎯 Target Tab URL:', targetPage.url());

  // Screenshot tab aktif saat ini
  const timestamp = Date.now();
  const filename = `live_screen_${timestamp}.png`;
  const outPath = path.join(IMAGES_DIR, filename);

  await targetPage.screenshot({ path: outPath });
  console.log(`📸 Screenshot tab aktif berhasil disimpan ke: ${outPath}`);

  // Disconnect agar koneksi tidak menggantung
  browser.disconnect();
  console.log('✅ Selesai.');
}

captureActiveChrome().catch(err => {
  console.error('❌ Gagal terhubung ke port 9222:', err.message);
  process.exit(1);
});
