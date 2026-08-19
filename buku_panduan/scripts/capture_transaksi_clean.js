const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureTransaksiClean() {
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

  // Switch ke Admin & Bersihkan View
  await appFrame.evaluate(() => {
    if (typeof Swal !== 'undefined') Swal.close();
    document.querySelectorAll('.modal').forEach(m => {
      if (typeof bootstrap !== 'undefined') {
        const bs = bootstrap.Modal.getInstance(m);
        if (bs) bs.hide();
      }
    });
    const adminUser = {
      role: 'admin',
      userData: {
        id_admin: 'adm-001',
        nama_lengkap: 'M. Fahrul Alfanani',
        email: 'sdnkedungsumur03@gmail.com',
        username: 'admin',
        role_title: 'Admin Perpustakaan'
      }
    };
    currentUser = adminUser;
    applyLoggedInUserUI(adminUser);
    switchSubView('peminjaman');
  });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Capture Modal Pilih Siswa (08a_modal_pilih_siswa.png)
  console.log('📸 1. Modal Pilih Siswa...');
  await appFrame.evaluate(() => {
    if (typeof openModalPilihSiswa === 'function') {
      openModalPilihSiswa();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08a_modal_pilih_siswa.png') });

  // Tutup Modal Siswa
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalPilihSiswa');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Capture Modal Pilih Buku (08b_modal_pilih_buku.png)
  console.log('📸 2. Modal Pilih Buku...');
  await appFrame.evaluate(() => {
    if (typeof openModalPilihBuku === 'function') {
      openModalPilihBuku();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08b_modal_pilih_buku.png') });

  // Tutup Modal Buku
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalPilihBuku');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // 3. Capture Form Pinjam Terisi Lengkap (08c_form_pinjam_terisi.png)
  console.log('📸 3. Form Peminjaman Terisi Lengkap...');
  await appFrame.evaluate(() => {
    if (typeof showModalTambahPeminjaman === 'function') {
      showModalTambahPeminjaman();
    }
    if (typeof selectSiswaPinjam === 'function') {
      selectSiswaPinjam('123', 'Moch Alfian Rafi Firmaniarrochman', '1');
    }
    if (typeof selectBukuPinjam === 'function') {
      selectBukuPinjam('buku-001', 'Why? Human Body - Tubuh Manusia', 8, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c', 'Yearim Dang');
    }
    const tglPinjamEl = document.getElementById('pinjam-tgl-pinjam');
    const tglKembaliEl = document.getElementById('pinjam-tgl-kembali');
    if (tglPinjamEl) tglPinjamEl.value = '2026-08-19';
    if (tglKembaliEl) tglKembaliEl.value = '2026-08-26';
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08c_form_pinjam_terisi.png') });

  // Tutup Form Pinjam
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormTambahPeminjaman');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // 4. Capture Konfirmasi Pengembalian SweetAlert2 (08d_konfirmasi_kembali.png)
  console.log('📸 4. Konfirmasi Pengembalian...');
  await appFrame.evaluate(() => {
    Swal.fire({
      title: 'Konfirmasi Pengembalian',
      text: 'Apakah Anda yakin ingin memproses pengembalian buku "Why? Human Body - Tubuh Manusia" oleh "Moch Alfian Rafi Firmaniarrochman"?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      confirmButtonText: 'Ya, Kembalikan Buku',
      cancelButtonText: 'Batal'
    });
  });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '08d_konfirmasi_kembali.png') });

  // Tutup Swal
  await appFrame.evaluate(() => {
    if (typeof Swal !== 'undefined') Swal.close();
  });
  await new Promise(r => setTimeout(r, 1200));

  // 5. Capture Status Selesai / Dikembalikan di Tabel Sirkulasi (08e_status_dikembalikan.png)
  console.log('📸 5. Status Dikembalikan di Tabel...');
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

  browser.disconnect();
  console.log('🎉 SEMUA SCREENSHOT BERHASIL DIAMBIL SECARA INDIVIDUAL DAN SEMPURNA!');
}

captureTransaksiClean().catch(console.error);
