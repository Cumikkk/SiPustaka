const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function quickCapture() {
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

  // 1. Form Pinjam Terisi
  console.log('1. Form pinjam terisi...');
  await appFrame.evaluate(() => {
    // Reset backdrop
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    if (typeof Swal !== 'undefined') Swal.close();

    const m = document.getElementById('modalFormTambahPeminjaman');
    if (!m) return;

    // Fill data
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

    currentSelectedBukuPinjam = { id_buku: 'buku-001', judul_buku: 'Why? Human Body - Tubuh Manusia', stok_buku: 8 };
    const judulEl = document.getElementById('selected-buku-judul');
    if (judulEl) judulEl.innerText = 'Why? Human Body - Tubuh Manusia';
    const subBukuEl = document.getElementById('selected-buku-sub');
    if (subBukuEl) subBukuEl.innerHTML = 'Yearim Dang &bull; Stok: <strong class="text-primary">8</strong>';
    const coverEl = document.getElementById('selected-buku-icon');
    if (coverEl) {
      coverEl.innerHTML = '<img src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c" class="w-100 h-100 object-fit-cover" style="border-radius:4px;">';
    }
    const btnBukuContainer = document.getElementById('btn-pilih-buku-container');
    if (btnBukuContainer) btnBukuContainer.classList.add('d-none');
    const boxBuku = document.getElementById('selected-buku-box');
    if (boxBuku) boxBuku.classList.remove('d-none');

    const tglPinjam = document.getElementById('pinjam-tgl-pinjam');
    const tglTempo = document.getElementById('pinjam-tgl-tempo');
    if (tglPinjam) tglPinjam.value = '2026-08-19';
    if (tglTempo) tglTempo.value = '2026-08-26';

    const bs = bootstrap.Modal.getOrCreateInstance(m);
    bs.show();
  });
  await new Promise(r => setTimeout(r, 1200));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08c_form_pinjam_terisi.png') });

  // 2. Status Dikembalikan
  console.log('2. Status dikembalikan...');
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m) {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');

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
  await new Promise(r => setTimeout(r, 1200));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08e_status_dikembalikan.png') });

  browser.disconnect();
  console.log('✅ SELESAI SEMUA!');
}

quickCapture().catch(console.error);
