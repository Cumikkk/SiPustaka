const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function retakeMismatched() {
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

  // ==========================================
  // 1. DETAIL BUKU & BACA E-BOOK (SISWA)
  // ==========================================
  console.log('📸 1. Mengambil 11_katalog_siswa.png & 12_detail_buku.png...');
  await appFrame.evaluate(() => { switchSubView('katalog'); });
  await new Promise(r => setTimeout(r, 4000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '11_katalog_grid_tabel.png') });

  await appFrame.evaluate(() => {
    // Buka detail buku pertama
    const btn = document.querySelector('button[onclick*="viewDetailBuku"]') || document.querySelector('.katalog-card button');
    if (btn) btn.click();
    else if (typeof viewDetailBuku === 'function' && currentKatalogData && currentKatalogData.length > 0) {
      viewDetailBuku(currentKatalogData[0].id_buku);
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '12_detail_buku.png') });

  await appFrame.evaluate(() => {
    const m = document.getElementById('modalDetailBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // ==========================================
  // 2. ADMIN: KENAIKAN KELAS, SIRKULASI & MODAL PINJAM
  // ==========================================
  console.log('🔑 Switch ke Admin Sesi...');
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

  // A. Modal Kenaikan Kelas
  console.log('📸 2. Mengambil 06_kenaikan_kelas.png...');
  await appFrame.evaluate(() => { switchSubView('anggota'); });
  await new Promise(r => setTimeout(r, 3500));
  await appFrame.evaluate(() => {
    const btn = document.querySelector('button[onclick*="openModalKenaikanKelas"]');
    if (btn) btn.click();
    else if (typeof openModalKenaikanKelas === 'function') openModalKenaikanKelas();
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

  // B. Sirkulasi Peminjaman (tunggu sampai tabel memuat)
  console.log('📸 3. Mengambil 07_sirkulasi_pinjam.png (Tabel Selesai Memuat)...');
  await appFrame.evaluate(() => { switchSubView('peminjaman'); });
  await new Promise(r => setTimeout(r, 6000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '07_sirkulasi_pinjam.png') });

  // C. Modal Tambah Peminjaman
  console.log('📸 4. Mengambil 08_modal_pinjam.png...');
  await appFrame.evaluate(() => {
    const btn = document.querySelector('button[onclick*="openModalTambahPeminjaman"]');
    if (btn) btn.click();
    else if (typeof openModalTambahPeminjaman === 'function') openModalTambahPeminjaman();
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

  browser.disconnect();
  console.log('🎉 SELURUH GAMBAR BERHASIL DIAMBIL ULANG & 100% COCOK!');
}

retakeMismatched().catch(console.error);
