/**
 * ====================================================================
 * SiPustaka - Modul Manajemen Anggota, Petugas & Kenaikan Kelas
 * ====================================================================
 */

function getAnggotaListFull(searchQuery, statusFilter, kelasFilter) {
  const allAnggota = getSheetData('siswa');
  const filtered = (allAnggota || []).filter(a => {
    const matchesSearch = !searchQuery ||
      String(a.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.nis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || statusFilter === 'semua' ||
      String(a.status || '').toLowerCase() === statusFilter.toLowerCase();

    const matchesKelas = !kelasFilter || kelasFilter === 'semua' ||
      String(a.kelas || '').trim().toLowerCase() === kelasFilter.trim().toLowerCase();

    return matchesSearch && matchesStatus && matchesKelas;
  });

  // Hapus properti password dari data yang dikirim ke browser
  return stripPassword(filtered);
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
        sheet.getRange(i + 1, kelasIdx + 1).setValue(sanitizeSheetInput(targetKelas));
        if (statusIdx !== -1) {
          sheet.getRange(i + 1, statusIdx + 1).setValue('nonaktif');
        }
      } else {
        sheet.getRange(i + 1, kelasIdx + 1).setValue(sanitizeSheetInput(targetKelas));
      }
      updatedCount++;
    }
  }

  return { 
    success: true, 
    message: `Berhasil memproses kenaikan kelas untuk ${updatedCount} siswa!` 
  };
}

function hapusSemuaSiswaLulus() {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return { success: false, message: 'Data siswa masih kosong.' };
  }

  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const kelasIdx = headers.indexOf('kelas');
  const statusIdx = headers.indexOf('status');

  let deletedCount = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    const rowStatus = statusIdx !== -1 ? String(values[i][statusIdx] || '').trim().toLowerCase() : '';
    const rowKelas = kelasIdx !== -1 ? String(values[i][kelasIdx] || '').trim().toUpperCase() : '';

    const isLulus = rowStatus === 'lulus' || rowStatus === 'nonaktif' || rowKelas === 'LULUS' || rowKelas === 'ALUMNI';
    if (isLulus) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  if (deletedCount === 0) {
    return { success: true, count: 0, message: 'Tidak ada data siswa berstatus lulus/nonaktif untuk dihapus.' };
  }

  return {
    success: true,
    count: deletedCount,
    message: `Berhasil menghapus ${deletedCount} data siswa yang sudah lulus/nonaktif!`
  };
}

function saveAnggotaData(anggotaObj) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const nisClean = String(anggotaObj.nis || '').trim();
  const targetNisSearch = String(anggotaObj.originalNis || anggotaObj.nis || '').trim();

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
      if (h === 'nis') return sanitizeSheetInput(nisClean);
      if (h === 'nama_lengkap') return sanitizeSheetInput(anggotaObj.nama_lengkap || '');
      if (h === 'kelas') return sanitizeSheetInput(anggotaObj.kelas || '');
      if (h === 'email') return sanitizeSheetInput(anggotaObj.email || '');
      if (h === 'username') return sanitizeSheetInput(anggotaObj.username || nisClean);
      if (h === 'password') return sanitizeSheetInput(anggotaObj.password || 'siswa123');
      if (h === 'status') return sanitizeSheetInput(anggotaObj.status || 'aktif');
      return '';
    });
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('siswa', nextRow, 1);
    return { success: true, message: 'Data Siswa baru berhasil ditambahkan!' };
  } else {
    if (nisIdx !== -1) sheet.getRange(rowToUpdate, nisIdx + 1).setValue(sanitizeSheetInput(nisClean));
    if (namaIdx !== -1) sheet.getRange(rowToUpdate, namaIdx + 1).setValue(sanitizeSheetInput(anggotaObj.nama_lengkap || ''));
    if (kelasIdx !== -1) sheet.getRange(rowToUpdate, kelasIdx + 1).setValue(sanitizeSheetInput(anggotaObj.kelas || ''));
    if (emailIdx !== -1) sheet.getRange(rowToUpdate, emailIdx + 1).setValue(sanitizeSheetInput(anggotaObj.email || ''));
    if (userIdx !== -1 && anggotaObj.username) sheet.getRange(rowToUpdate, userIdx + 1).setValue(sanitizeSheetInput(anggotaObj.username));
    if (passIdx !== -1 && anggotaObj.password) sheet.getRange(rowToUpdate, passIdx + 1).setValue(sanitizeSheetInput(anggotaObj.password));
    if (statusIdx !== -1 && anggotaObj.status) sheet.getRange(rowToUpdate, statusIdx + 1).setValue(sanitizeSheetInput(anggotaObj.status));
    return { success: true, message: 'Data Siswa berhasil diperbarui!' };
  }
}

function deleteAnggotaData(nis) {
  const ss = getDb();
  const sheet = getFlexibleSheet(ss, 'siswa');
  if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };

  const cleanNis = String(nis || '').trim();

  // 1. Cascading Integrity Check: Cek apakah siswa masih punya pinjaman buku yang belum dikembalikan
  const transaksi = getSheetData('transaksi');
  const hasActiveLoan = (transaksi || []).some(t => {
    const tNis = String(t.nis || t.nis_anggota || t.id_anggota || '').trim();
    const st = String(t.status || '').toLowerCase().trim();
    return tNis === cleanNis && st === 'dipinjam';
  });

  if (hasActiveLoan) {
    return {
      success: false,
      message: 'Tidak dapat menghapus siswa ini karena masih memiliki buku pinjaman yang belum dikembalikan!'
    };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const searchIdx = headers.indexOf('nis') !== -1 ? headers.indexOf('nis') : 0;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][searchIdx]).trim() === cleanNis) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Data siswa berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Siswa tidak ditemukan.' };
}

// ==========================================
// CONTROLLER KHUSUS PETUGAS / ADMIN
// ==========================================

function getAdminListFull() {
  const admins = getSheetData('admin');
  return stripPassword(admins);
}

function saveAdminData(adminObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName('admin');
  if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());

  const idAdminIdx = headers.indexOf('id_admin');
  const userIdx = headers.indexOf('username');
  const passIdx = headers.indexOf('password');
  const namaIdx = headers.indexOf('nama_lengkap');
  const emailIdx = headers.indexOf('email');

  let rowToUpdate = -1;
  let isEdit = false;

  if (adminObj.id_admin) {
    const searchIdx = idAdminIdx !== -1 ? idAdminIdx : 0;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][searchIdx]).trim() === String(adminObj.id_admin).trim()) {
        rowToUpdate = i + 1;
        isEdit = true;
        break;
      }
    }
  }

  if (!isEdit) {
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const newId = 'adm-' + String(nextRow - 1).padStart(3, '0');
    const rowData = headers.map(h => {
      if (h === 'id_admin') return newId;
      if (h === 'username') return sanitizeSheetInput(adminObj.username || '');
      if (h === 'password') return sanitizeSheetInput(adminObj.password || 'admin123');
      if (h === 'nama_lengkap') return sanitizeSheetInput(adminObj.nama_lengkap || '');
      if (h === 'email') return sanitizeSheetInput(adminObj.email || '');
      return '';
    });
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('admin', nextRow, 1);
    return { success: true, message: 'Petugas Admin baru berhasil ditambahkan!' };
  } else {
    if (userIdx !== -1) sheet.getRange(rowToUpdate, userIdx + 1).setValue(sanitizeSheetInput(adminObj.username || ''));
    if (namaIdx !== -1) sheet.getRange(rowToUpdate, namaIdx + 1).setValue(sanitizeSheetInput(adminObj.nama_lengkap || ''));
    if (emailIdx !== -1) sheet.getRange(rowToUpdate, emailIdx + 1).setValue(sanitizeSheetInput(adminObj.email || ''));
    if (passIdx !== -1 && adminObj.password) sheet.getRange(rowToUpdate, passIdx + 1).setValue(sanitizeSheetInput(adminObj.password));
    return { success: true, message: 'Data Petugas Admin berhasil diperbarui!' };
  }
}

function deleteAdminData(idAdmin) {
  const ss = getDb();
  const sheet = ss.getSheetByName('admin');
  if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };

  const cleanId = String(idAdmin || '').trim();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === cleanId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Data admin berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Admin tidak ditemukan.' };
}
