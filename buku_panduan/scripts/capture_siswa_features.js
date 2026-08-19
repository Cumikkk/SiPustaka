const puppeteer = require('c:/Users/M. Fahrul Alfanani/Downloads/Programs/Google App Script/SiPustaka/node_modules/puppeteer-core');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

async function captureSiswaFeatures() {
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

  // 1. Switch ke Admin
  console.log('🔑 Switch ke Admin Sesi...');
  await appFrame.evaluate(() => {
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
    switchSubView('anggota');
  });
  await new Promise(r => setTimeout(r, 3500));

  // 2. Capture Modal Tambah Anggota Siswa (05b_tambah_siswa.png)
  console.log('📸 1. Mengambil 05b_tambah_siswa.png...');
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormAnggota');
    if (m && typeof bootstrap !== 'undefined') {
      const titleEl = document.getElementById('modalFormAnggotaTitle');
      if (titleEl) titleEl.innerText = 'Tambah Anggota Siswa Baru';
      const bs = bootstrap.Modal.getOrCreateInstance(m);
      bs.show();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '05b_tambah_siswa.png') });
  await appFrame.evaluate(() => {
    const m = document.getElementById('modalFormAnggota');
    if (m && typeof bootstrap !== 'undefined') {
      const bs = bootstrap.Modal.getInstance(m);
      if (bs) bs.hide();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // 3. Capture Dialog Hapus Siswa Lulus Massal (05c_hapus_siswa_lulus.png)
  console.log('📸 2. Mengambil 05c_hapus_siswa_lulus.png...');
  await appFrame.evaluate(() => {
    Swal.fire({
      title: 'Hapus Semua Siswa Lulus?',
      text: 'Tindakan ini akan menghapus seluruh data siswa yang berstatus "Lulus" atau "Nonaktif" dari sistem database. Apakah Anda yakin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus Semua Siswa Lulus',
      cancelButtonText: 'Batal'
    });
  });
  await new Promise(r => setTimeout(r, 1500));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '05c_hapus_siswa_lulus.png') });
  await appFrame.evaluate(() => {
    if (typeof Swal !== 'undefined') Swal.close();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Capture Modal Kenaikan Kelas Massal Lengkap Tanpa Loading (06_kenaikan_kelas.png)
  console.log('📸 3. Mengambil 06_kenaikan_kelas.png (Lengkap dengan data alur kelas)...');
  await appFrame.evaluate(() => {
    const container = document.getElementById('kenaikan-kelas-rules-container');
    if (container) {
      const daftarKelas = ['1', '2', '3', '4', '5', '6'];
      let html = '<div class="row g-3">';
      daftarKelas.forEach(k => {
        let targetDisplay = '';
        let isLulus = false;
        const num = parseInt(k, 10);
        if (num < 6) {
          targetDisplay = 'Naik ke Kelas ' + (num + 1);
        } else {
          targetDisplay = 'LULUS (Alumni)';
          isLulus = true;
        }

        const badgeStyle = isLulus 
          ? 'background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca;' 
          : 'background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;';
        
        const icon = isLulus 
          ? '<i class="bi bi-mortarboard-fill" style="margin-right: 8px;"></i>' 
          : '<i class="bi bi-arrow-up-circle-fill" style="margin-right: 8px;"></i>';

        html += '<div class="col-md-6">' +
          '<div class="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between shadow-2xs" style="padding: 14px 18px !important;">' +
            '<div class="d-flex align-items-center">' +
              '<span class="badge bg-light text-dark border px-2.5 py-1.5 fw-bold font-monospace">Kelas ' + k + '</span>' +
              '<i class="bi bi-arrow-right text-muted" style="margin-left: 10px; margin-right: 8px;"></i>' +
            '</div>' +
            '<span class="badge rounded-pill fw-semibold" style="' + badgeStyle + ' padding: 6px 12px;">' + icon + targetDisplay + '</span>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      container.innerHTML = html;
    }

    const modalEl = document.getElementById('modalKenaikanKelas');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
    }
  });

  await new Promise(r => setTimeout(r, 2000));
  await targetPage.screenshot({ path: path.join(IMAGES_DIR, '06_kenaikan_kelas.png') });

  await appFrame.evaluate(() => {
    const modalEl = document.getElementById('modalKenaikanKelas');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }
  });

  browser.disconnect();
  console.log('🎉 SEMUA SCREENSHOT SISWA, TAMBAH, HAPUS LULUS, DAN KENAIKAN KELAS SELESAI!');
}

captureSiswaFeatures().catch(console.error);
