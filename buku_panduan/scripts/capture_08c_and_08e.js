const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function capture08cAnd08e() {
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

  // 1. Capture 08c_form_pinjam_terisi.png
  console.log('📸 Buka Modal Tambah Peminjaman...');
  await appFrame.evaluate(() => {
    const btn = document.querySelector('button[onclick*="showModalTambahPeminjaman"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await appFrame.evaluate(() => {
    // Populate Siswa
    selectSiswaPinjam('123', 'Moch Alfian Rafi Firmaniarrochman', '1');
    // Populate Buku
    selectBukuPinjam('buku-001', 'Why? Human Body - Tubuh Manusia', 8, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c', 'Yearim Dang');
    
    // Set dates
    const tglPinjam = document.getElementById('pinjam-tgl-pinjam');
    const tglTempo = document.getElementById('pinjam-tgl-tempo');
    if (tglPinjam) tglPinjam.value = '2026-08-19';
    if (tglTempo) tglTempo.value = '2026-08-26';
  });

  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08c_form_pinjam_terisi.png') });
  console.log('✅ 08c_form_pinjam_terisi.png berhasil diambil!');

  // Tutup modal
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Capture 08e_status_dikembalikan.png
  console.log('📸 Render baris Dikembalikan dan ambil 08e_status_dikembalikan.png...');
  await appFrame.evaluate(() => {
    const tbody = document.getElementById('peminjaman-admin-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td class="text-center fw-bold text-secondary" style="width: 50px;">1</td>
          <td class="border-start text-start">
            <div class="fw-bold text-dark mb-0.5">Moch Alfian Rafi Firmaniarrochman</div>
            <small class="text-muted d-block">NIS: 123 &bull; <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5" style="margin-left: 4px; font-size:0.68rem;">Kelas 1</span></small>
          </td>
          <td class="border-start text-start">
            <div class="d-flex align-items-center gap-3">
              <img src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c" class="rounded-2 shadow-2xs flex-shrink-0 object-fit-cover" style="width: 42px; height: 56px;">
              <div class="overflow-hidden">
                <div class="fw-bold text-dark text-truncate mb-1" style="max-width: 260px; font-size: 0.95rem;">Why? Human Body - Tubuh Manusia</div>
                <div class="d-flex align-items-center flex-wrap gap-1">
                  <span class="text-muted" style="font-size:0.75rem;">Penulis: Yearim Dang</span> &bull; 
                  <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5" style="font-size:0.68rem;">Sains</span>
                </div>
              </div>
            </div>
          </td>
          <td class="border-start text-center" style="width: 170px;"><div class="fw-semibold text-dark small">19 Agu - 26 Agu</div></td>
          <td class="border-start text-center" style="width: 130px;">
            <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5">
              <i class="bi bi-check-circle-fill"></i> Dikembalikan
            </span>
          </td>
          <td class="pe-3 text-center border-start" style="width: 120px;">
            <span class="text-success small fw-semibold d-inline-flex align-items-center">
              <i class="bi bi-check2-all" style="margin-right: 4px;"></i><span>Selesai</span>
            </span>
          </td>
        </tr>
      `;
    }
  });

  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08e_status_dikembalikan.png') });
  console.log('✅ 08e_status_dikembalikan.png berhasil diambil!');

  browser.disconnect();
}

capture08cAnd08e().catch(console.error);
