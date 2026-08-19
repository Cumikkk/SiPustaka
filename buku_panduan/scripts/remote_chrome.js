const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function startRemoteChrome() {
  console.log('🚀 Membuka Google Chrome dengan Remote DevTools Port (9222)...');
  
  // Buka Chrome dengan remote debugging port
  const chromeCmd = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\Users\\M. Fahrul Alfanani\\.gemini\\chrome-debug-profile" "https://sipustaka-sdnkedungsumur03.vercel.app"`;
  
  exec(chromeCmd);
  console.log('⏳ Menunggu jendela Chrome terbuka di layar Anda...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('🔗 Menghubungkan DevTools ke Google Chrome Anda...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('✅ Berhasil terhubung ke Chrome Anda via DevTools!');
  console.log('💡 Silakan lihat browser Chrome yang baru terbuka di layar laptop Anda.');
  console.log('📸 Mengambil screenshot halaman saat ini...');
  
  await page.screenshot({ path: path.join(IMAGES_DIR, '01_login.png') });
  console.log('💾 Tersimpan: 01_login.png');

  // Disconnect agar browser tetap terbuka untuk Anda
  browser.disconnect();
  console.log('🎉 Siap! DevTools aktif dan siap mengambil screenshot halaman berikutnya.');
}

startRemoteChrome().catch(err => {
  console.error('❌ Gagal terhubung ke DevTools Chrome:', err.message);
});
