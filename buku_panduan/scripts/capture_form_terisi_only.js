const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureFormTerisiOnly() {
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

  console.log('📸 Buka Modal Tambah Peminjaman dan isi data siswa & buku...');
  await appFrame.evaluate(() => {
    switchSubView('peminjaman');
    
    // Reset form elements
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (!m) return;
    
    // Select Siswa
    currentSelectedAnggotaPinjam = { nis: '123', nama_lengkap: 'Moch Alfian Rafi Firmaniarrochman', kelas: '1' };
    const avatar = document.getElementById('selected-anggota-avatar');
    if (avatar) avatar.innerText = 'M';
    const namaEl = document.getElementById('selected-anggota-nama');
    if (namaEl) namaEl.innerText = 'Moch Alfian Rafi Firmaniarrochman';
    const subEl = document.getElementById('selected-anggota-sub');
    if (subEl) subEl.innerHTML = 'NIS: 123 &bull; Kelas: 1';
    const btnContainer = document.getElementById('btn-pilih-anggota-container');
    if (btnContainer) btnContainer.classList.add('d-none');
    const box = document.getElementById('selected-anggota-box');
    if (box) box.classList.remove('d-none');

    // Select Buku
    currentSelectedBukuPinjam = { id_buku: 'buku-001', judul_buku: 'Why? Human Body - Tubuh Manusia', stok_buku: 8 };
    const judulEl = document.getElementById('selected-buku-judul');
    if (judulEl) judulEl.innerText = 'Why? Human Body - Tubuh Manusia';
    const subBukuEl = document.getElementById('selected-buku-sub');
    if (subBukuEl) subBukuEl.innerHTML = 'Yearim Dang &bull; Stok: <strong class="text-primary">8</strong>';
    const coverEl = document.getElementById('selected-buku-icon');
    if (coverEl) {
      coverEl.innerHTML = '<img src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c" class="w-100 h-100 object-fit-cover" style="object-fit:cover; border-radius:4px;">';
    }
    const btnBukuContainer = document.getElementById('btn-pilih-buku-container');
    if (btnBukuContainer) btnBukuContainer.classList.add('d-none');
    const boxBuku = document.getElementById('selected-buku-box');
    if (boxBuku) boxBuku.classList.remove('d-none');

    // Dates
    const tglPinjamEl = document.getElementById('pinjam-tgl-pinjam');
    const tglKembaliEl = document.getElementById('pinjam-tgl-kembali');
    if (tglPinjamEl) tglPinjamEl.value = '2026-08-19';
    if (tglKembaliEl) tglKembaliEl.value = '2026-08-26';

    m.style.removeProperty('display');
    const bs = bootstrap.Modal.getOrCreateInstance(m);
    bs.show();
  });

  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08c_form_pinjam_terisi.png') });
  console.log('✅ 08c_form_pinjam_terisi.png berhasil diambil!');

  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });

  browser.disconnect();
}

captureFormTerisiOnly().catch(console.error);
