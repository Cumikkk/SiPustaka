/**
 * ====================================================================
 * SiPustaka - Modul Manajemen Anggota, Petugas & Kenaikan Kelas
 * ====================================================================
 */

function getAnggotaListFull(searchQuery, statusFilter) {
  const allAnggota = getSheetData('anggota');
  return allAnggota.filter(a => {
    const matchesSearch = !searchQuery ||
      String(a.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.nis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || statusFilter === 'semua' ||
      String(a.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });
}

function getDaftarKelasUnik() {
  const anggota = getSheetData('siswa');
  const kelasSet = new Set();
  (anggota || []).forEach(a => {
    const k = String(a.kelas || '').trim();
    if (k && String(a.status || 'aktif').toLowerCase() === 'aktif') {
      kelasSet.add(k);
    }
  });
  return Array.from(kelasSet).sort();
}

function prosesKenaikanKelasMassal(ruleMapping) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: false, message: 'Data siswa kosong.' };

  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const kelasIdx = headers.indexOf('kelas');
  const statusIdx = headers.indexOf('status');

  if (kelasIdx === -1) return { success: false, message: 'Kolom kelas tidak ditemukan.' };

  let updatedCount = 0;
  for (let i = 1; i < values.length; i++) {
    const currentKelas = String(values[i][kelasIdx]).trim();
    if (ruleMapping && ruleMapping[currentKelas]) {
      const targetKelas = String(ruleMapping[currentKelas]).trim();
      if (targetKelas.toUpperCase() === 'LULUS' || targetKelas.toUpperCase() === 'ALUMNI') {
        sheet.getRange(i + 1, kelasIdx + 1).setValue(targetKelas);
        if (statusIdx !== -1) {
          sheet.getRange(i + 1, statusIdx + 1).setValue('nonaktif');
        }
      } else {
        sheet.getRange(i + 1, kelasIdx + 1).setValue(targetKelas);
      }
      updatedCount++;
    }
  }

  return { 
    success: true, 
    message: `Berhasil memproses kenaikan kelas untuk ${updatedCount} siswa!` 
  };
}

function saveAnggotaData(anggotaObj) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const nisClean = String(anggotaObj.nis).trim();
  const targetNisSearch = String(anggotaObj.originalNis || anggotaObj.nis).trim();

  const nisIdx = headers.indexOf('nis');
  const namaIdx = headers.indexOf('nama_lengkap');
  const kelasIdx = headers.indexOf('kelas');
  const emailIdx = headers.indexOf('email');
  const userIdx = headers.indexOf('username');
  const passIdx = headers.indexOf('password');
  const statusIdx = headers.indexOf('status');

  let rowToUpdate = -1;
  const searchIdx = nisIdx !== -1 ? nisIdx : 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][searchIdx]).trim() === targetNisSearch) {
      rowToUpdate = i + 1;
      break;
    }
  }

  if (rowToUpdate === -1) {
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const rowData = headers.map(h => {
      if (h === 'nis') return "'" + nisClean;
      if (h === 'nama_lengkap') return anggotaObj.nama_lengkap || '';
      if (h === 'kelas') return anggotaObj.kelas || '1';
      if (h === 'email') return anggotaObj.email || '';
      if (h === 'username') return "'" + (anggotaObj.username || nisClean);
      if (h === 'password') return "'" + (anggotaObj.password || '123');
      if (h === 'status') return anggotaObj.status || 'aktif';
      return '';
    });
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('siswa', nextRow, 1);
    return { success: true, message: 'Data Siswa baru berhasil ditambahkan!' };
  } else {
    if (nisIdx !== -1) sheet.getRange(rowToUpdate, nisIdx + 1).setValue("'" + nisClean);
    if (namaIdx !== -1) sheet.getRange(rowToUpdate, namaIdx + 1).setValue(anggotaObj.nama_lengkap || '');
    if (kelasIdx !== -1) sheet.getRange(rowToUpdate, kelasIdx + 1).setValue("'" + (anggotaObj.kelas || ''));
    if (emailIdx !== -1) sheet.getRange(rowToUpdate, emailIdx + 1).setValue(anggotaObj.email || '');
    if (userIdx !== -1 && anggotaObj.username) sheet.getRange(rowToUpdate, userIdx + 1).setValue("'" + anggotaObj.username);
    if (passIdx !== -1 && anggotaObj.password) sheet.getRange(rowToUpdate, passIdx + 1).setValue("'" + anggotaObj.password);
    if (statusIdx !== -1 && anggotaObj.status) sheet.getRange(rowToUpdate, statusIdx + 1).setValue(anggotaObj.status);
    return { success: true, message: 'Data Siswa berhasil diperbarui!' };
  }
}

function deleteAnggotaData(nis) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const nisIdx = headers.indexOf('nis');
  
  const searchIdx = nisIdx !== -1 ? nisIdx : 0;
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][searchIdx]).trim() === String(nis).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Data Siswa berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Data Siswa tidak ditemukan.' };
}

function getAdminListFull() {
  const allAdmin = getSheetData('admin');
  return allAdmin.map(a => ({
    id_admin: a.id_admin || '',
    nama_lengkap: a.nama_lengkap || '',
    email: a.email || '',
    username: a.username || ''
  }));
}

function saveAdminData(adminObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName('admin');
  if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const userClean = String(adminObj.username || '').trim().toLowerCase();

  let rowToUpdate = -1;
  if (adminObj.id_admin) {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(adminObj.id_admin).trim()) {
        rowToUpdate = i + 1;
        break;
      }
    }
  }

  if (rowToUpdate === -1) {
    const exists = values.slice(1).some(r => String(r[3]).trim().toLowerCase() === userClean);
    if (exists) {
      return { success: false, message: 'Username sudah digunakan oleh petugas lain!' };
    }
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const newId = 'adm-' + String(nextRow - 1).padStart(2, '0');
    const rowData = [
      newId,
      adminObj.nama_lengkap || '',
      adminObj.email || '',
      adminObj.username || '',
      adminObj.password || '123'
    ];
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('admin', nextRow, 1);
    return { success: true, message: 'Petugas Admin baru berhasil ditambahkan!' };
  } else {
    for (let i = 1; i < values.length; i++) {
      if (i + 1 !== rowToUpdate && String(values[i][3]).trim().toLowerCase() === userClean) {
        return { success: false, message: 'Username sudah digunakan oleh petugas lain!' };
      }
    }
    sheet.getRange(rowToUpdate, 2).setValue(adminObj.nama_lengkap || '');
    sheet.getRange(rowToUpdate, 3).setValue(adminObj.email || '');
    sheet.getRange(rowToUpdate, 4).setValue(adminObj.username || '');
    if (adminObj.password && String(adminObj.password).trim() !== '') {
      sheet.getRange(rowToUpdate, 5).setValue(String(adminObj.password).trim());
    }
    return { success: true, message: 'Data Petugas Admin berhasil diperbarui!' };
  }
}

function deleteAdminData(idAdmin) {
  const ss = getDb();
  const sheet = ss.getSheetByName('admin');
  if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 2) {
    return { success: false, message: 'Minimal harus ada 1 Petugas Admin dalam sistem!' };
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(idAdmin).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Petugas Admin berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Petugas Admin tidak ditemukan.' };
}
// ==========================================
// HELPER PERATAAN KOLOM PERSISI (EXACT ALIGNMENT TABLE)
// ==========================================
