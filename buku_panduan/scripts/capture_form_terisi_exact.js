const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureFormTerisiExact() {
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

  console.log('📸 Buka dan isi form peminjaman...');
  await appFrame.evaluate(() => {
    // 1. Panggil showModalTambahPeminjaman
    if (typeof showModalTambahPeminjaman === 'function') {
      showModalTambahPeminjaman();
    }

    // 2. Isi Siswa
    if (typeof selectSiswaPinjam === 'function') {
      selectSiswaPinjam('123', 'Moch Alfian Rafi Firmaniarrochman', '1');
    }

    // 3. Isi Buku
    if (typeof selectBukuPinjam === 'function') {
      selectBukuPinjam('buku-001', 'Why? Human Body - Tubuh Manusia', 8, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c', 'Yearim Dang');
    }

    // 4. Pastikan tanggal terisi
    const tglPinjamEl = document.getElementById('pinjam-tgl-pinjam');
    const tglTempoEl = document.getElementById('pinjam-tgl-tempo');
    if (tglPinjamEl) tglPinjamEl.value = '2026-08-19';
    if (tglTempoEl) tglTempoEl.value = '2026-08-26';
  });

  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08c_form_pinjam_terisi.png') });
  console.log('✅ 08c_form_pinjam_terisi.png berhasil disimpan!');

  await appFrame.evaluate(() => {
    const modalEl = document.getElementById('modalFormTambahPeminjaman');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }
  });

  browser.disconnect();
}

captureFormTerisiExact().catch(console.error);
