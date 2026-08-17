/**
 * ====================================================================
 * SiPustaka - Modul Transaksi Peminjaman & Pengembalian
 * ====================================================================
 */

function getStudentLoansFull(nis) {
  const dashData = getStudentDashboardData(nis);
  if (dashData.error) {
    return { success: false, message: dashData.error };
  }
  return {
    success: true,
    data: dashData.myAllLoans || [],
    stats: {
      active: dashData.stats ? dashData.stats.dipinjamSaya : 0,
      read: dashData.stats ? dashData.stats.totalDibaca : 0,
      overdue: dashData.stats ? dashData.stats.totalTerlambat : 0
    }
  };
}

// ==========================================
// API TRANSAKSI PEMINJAMAN & PENGEMBALIAN
// ==========================================

function createTransaksiPeminjaman(nis, idBuku, tglPinjam, tglTempo, catatan) {
  const ss = getDb();
  
  // Validasi Siswa
  const sheetSiswa = getFlexibleSheet(ss, 'siswa');
  const siswaData = sheetSiswa.getDataRange().getValues();
  const siswaHeaders = siswaData[0].map(h => String(h).trim().toLowerCase());
  const nisIdx = siswaHeaders.indexOf('nis');
  let siswaFound = false;
  let namaSiswa = '';
  for (let i = 1; i < siswaData.length; i++) {
    if (String(siswaData[i][nisIdx]).trim() === String(nis).trim()) {
      siswaFound = true;
      namaSiswa = String(siswaData[i][siswaHeaders.indexOf('nama_lengkap')] || '');
      break;
    }
  }
  if (!siswaFound) return { success: false, message: 'NIS tidak ditemukan.' };

  // Validasi Buku
  const sheetBuku = ss.getSheetByName('buku');
  const bukuData = sheetBuku.getDataRange().getValues();
  const bukuHeaders = bukuData[0].map(h => String(h).trim().toLowerCase());
  const idBukuIdx = bukuHeaders.indexOf('id_buku');
  let stokIdx = bukuHeaders.indexOf('stok_buku');
  if (stokIdx === -1) stokIdx = bukuHeaders.indexOf('stok_aktual');
  let bukuFound = false;
  let judulBuku = '';
  let rowBuku = -1;
  let currentStok = 0;
  for (let i = 1; i < bukuData.length; i++) {
    if (String(bukuData[i][idBukuIdx]).trim() === String(idBuku).trim()) {
      bukuFound = true;
      rowBuku = i + 1;
      judulBuku = String(bukuData[i][bukuHeaders.indexOf('judul_buku')] || '');
      currentStok = parseInt(bukuData[i][stokIdx]) || 0;
      break;
    }
  }
  if (!bukuFound) return { success: false, message: 'Buku tidak ditemukan.' };
  if (currentStok <= 0) return { success: false, message: 'Stok buku habis (0).' };

  // Generate ID Transaksi
  const sheetTrx = ss.getSheetByName('transaksi');
  if (!sheetTrx) return { success: false, message: 'Sheet transaksi tidak ditemukan.' };
  
  const trxData = sheetTrx.getDataRange().getValues();
  const trxHeaders = trxData[0].map(h => String(h).trim().toLowerCase());
  const idTrxIdx = trxHeaders.indexOf('id_transaksi');
  
  const dateObj = new Date();
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const prefix = `trx-${yyyy}${mm}-`;
  
  let maxSeq = 0;
  if (idTrxIdx !== -1) {
    for (let i = 1; i < trxData.length; i++) {
      const idVal = String(trxData[i][idTrxIdx] || '');
      if (idVal.startsWith(prefix)) {
        const seq = parseInt(idVal.replace(prefix, ''), 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  let newIdTrx = `${prefix}${nextSeq}`;

  // Baris baru
  const newRow = trxHeaders.map(h => {
    if (h === 'id_transaksi') return newIdTrx;
    if (h === 'nis' || h === 'nis_anggota' || h === 'id_anggota') return "'" + nis;
    if (h === 'nama_anggota' || h === 'nama_siswa') return namaSiswa;
    if (h === 'id_buku') return idBuku;
    if (h === 'judul_buku') return judulBuku;
    if (h === 'tgl_pinjam') return tglPinjam;
    if (h === 'tgl_jatuh_tempo') return tglTempo;
    if (h === 'status') return 'dipinjam';
    if (h === 'catatan') return catatan || '';
    return '';
  });

  const nextRow = sheetTrx.getLastRow() + 1;
  sheetTrx.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
  applyColumnAlignments('transaksi', nextRow, 1);

  // Kurangi stok buku
  if (stokIdx !== -1) {
    sheetBuku.getRange(rowBuku, stokIdx + 1).setValue(currentStok - 1);
  }

  return { success: true, message: 'Peminjaman berhasil disimpan!' };
}

function findTransaksiForReturn(query) {
  function parseLocalYMD(str) {
    if (!str) return new Date();
    const pts = String(str).split('-');
    if (pts.length === 3) return new Date(pts[0], parseInt(pts[1]) - 1, pts[2]);
    return new Date(str);
  }

  const q = String(query).trim().toLowerCase();
  const trxList = getSheetData('transaksi');
  const bukuList = getSheetData('buku');
  const siswaList = getSheetData('siswa');

  let found = null;
  for (let i = 0; i < trxList.length; i++) {
    const t = trxList[i];
    if (String(t.status || '').toLowerCase() === 'dipinjam') {
      const idTrx = String(t.id_transaksi || '').toLowerCase();
      const idBuku = String(t.id_buku || '').toLowerCase();
      const nis = String(t.nis || t.nis_anggota || t.id_anggota || '').toLowerCase();
      
      if (idTrx === q || idBuku === q || nis === q) {
        found = { ...t };
        break;
      }
    }
  }

  if (!found) return { success: false, message: 'Peminjaman aktif tidak ditemukan untuk kode tersebut.' };

  const bInfo = bukuList.find(b => String(b.id_buku).toLowerCase() === String(found.id_buku).toLowerCase()) || {};
  const sInfo = siswaList.find(s => String(s.nis).toLowerCase() === String(found.nis || found.nis_anggota || found.id_anggota).toLowerCase()) || {};

  found.nama_anggota = sInfo.nama_lengkap || found.nama_anggota || '-';
  found.kelas = sInfo.kelas || '-';
  found.judul_buku = bInfo.judul_buku || found.judul_buku || '-';
  found.penulis = bInfo.penulis || '-';

  const todayDate = parseLocalYMD(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  found.tgl_dikembalikan = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  if (found.tgl_jatuh_tempo) {
    const dueDate = parseLocalYMD(found.tgl_jatuh_tempo);
    const diffTime = todayDate.getTime() - dueDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    
    if (diffDays > 0) {
      found.terlambat_hari = diffDays;
      found.denda_keterlambatan = diffDays * 1000;
    } else {
      found.terlambat_hari = 0;
      found.denda_keterlambatan = 0;
    }
  } else {
    found.terlambat_hari = 0;
    found.denda_keterlambatan = 0;
  }

  return { success: true, transaksi: found };
}

function processPengembalianBuku(idTransaksi) {
  function parseLocalYMD(str) {
    if (!str) return new Date();
    const pts = String(str).split('-');
    if (pts.length === 3) return new Date(pts[0], parseInt(pts[1]) - 1, pts[2]);
    return new Date(str);
  }

  const ss = getDb();
  const sheetTrx = ss.getSheetByName('transaksi');
  const sheetBuku = ss.getSheetByName('buku');
  if (!sheetTrx) return { success: false, message: 'Sheet transaksi tidak ditemukan.' };

  const values = sheetTrx.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const idTrxIdx = headers.indexOf('id_transaksi');
  const idBukuIdx = headers.indexOf('id_buku');
  const statusIdx = headers.indexOf('status');
  const tglKembaliIdx = headers.indexOf('tgl_dikembalikan') !== -1 ? headers.indexOf('tgl_dikembalikan') : headers.indexOf('tgl_kembali');
  const dendaIdx = headers.indexOf('denda_keterlambatan') !== -1 ? headers.indexOf('denda_keterlambatan') : headers.indexOf('denda');

  let rowToUpdate = -1;
  let idBukuToUpdate = '';
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idTrxIdx]).trim() === String(idTransaksi).trim()) {
      rowToUpdate = i + 1;
      idBukuToUpdate = String(values[i][idBukuIdx]).trim();
      break;
    }
  }

  if (rowToUpdate === -1) return { success: false, message: 'Data transaksi tidak ditemukan.' };

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Update Status
  if (statusIdx !== -1) sheetTrx.getRange(rowToUpdate, statusIdx + 1).setValue('dikembalikan');
  if (tglKembaliIdx !== -1) sheetTrx.getRange(rowToUpdate, tglKembaliIdx + 1).setValue(todayStr);
  if (dendaIdx !== -1) sheetTrx.getRange(rowToUpdate, dendaIdx + 1).setValue(0); // Denda dihilangkan (selalu 0)

  // Update Stok Buku
  if (idBukuToUpdate && sheetBuku) {
    const bukuValues = sheetBuku.getDataRange().getValues();
    const bHeaders = bukuValues[0].map(h => String(h).trim().toLowerCase());
    const bIdIdx = bHeaders.indexOf('id_buku');
    let stokIdx = bHeaders.indexOf('stok_buku');
    if (stokIdx === -1) stokIdx = bHeaders.indexOf('stok_aktual');
    
    if (bIdIdx !== -1 && stokIdx !== -1) {
      for (let i = 1; i < bukuValues.length; i++) {
        if (String(bukuValues[i][bIdIdx]).trim() === idBukuToUpdate) {
          const currentStok = parseInt(bukuValues[i][stokIdx]) || 0;
          sheetBuku.getRange(i + 1, stokIdx + 1).setValue(currentStok + 1);
          break;
        }
      }
    }
  }

  return { success: true, message: 'Buku berhasil dikembalikan!' };
}

// ==========================================
// API PENCARIAN DROPDOWN PEMINJAMAN
// ==========================================

function searchAnggotaOptions(query) {
  try {
    const q = String(query || '').trim().toLowerCase();
    const anggota = getSheetData('siswa') || [];
    const maxResults = 10;
    const results = [];
    
    for (let i = 0; i < anggota.length; i++) {
      const a = anggota[i];
      if (!a) continue;
      
      const status = String(a.status || 'aktif').toLowerCase();
      if (status === 'aktif') {
        const nama = String(a.nama_lengkap || '').toLowerCase();
        const nis = String(a.nis || '').toLowerCase();
        if (nama.includes(q) || nis.includes(q)) {
          results.push({ nis: String(a.nis || ''), nama_lengkap: String(a.nama_lengkap || ''), kelas: String(a.kelas || '') });
          if (results.length >= maxResults) break;
        }
      }
    }
    return results;
  } catch (err) {
    throw new Error("Gagal load data anggota: " + err.message);
  }
}

function searchBukuOptions(query) {
  try {
    const q = String(query || '').trim().toLowerCase();
    const buku = getSheetData('buku') || [];
    const maxResults = 10;
    const results = [];
    
    for (let i = 0; i < buku.length; i++) {
      const b = buku[i];
      if (!b) continue;
      
      const stok = parseInt(b.stok_buku !== undefined ? b.stok_buku : (b.stok_aktual !== undefined ? b.stok_aktual : 0)) || 0;
      if (stok > 0) {
        const judul = String(b.judul_buku || '').toLowerCase();
        const isbn = String(b.isbn || '').toLowerCase();
        const idBuku = String(b.id_buku || '').toLowerCase();
        if (judul.includes(q) || isbn.includes(q) || idBuku.includes(q)) {
          results.push({ id_buku: String(b.id_buku || ''), judul_buku: String(b.judul_buku || ''), penulis: String(b.penulis || ''), stok_aktual: stok });
          if (results.length >= maxResults) break;
        }
      }
    }
    return results;
  } catch (err) {
    throw new Error("Gagal load data buku: " + err.message);
  }
}

// ==========================================
// API TABEL PENGEMBALIAN BUKU
// ==========================================

function getTransaksiPeminjamanAktif(searchQuery) {
  const transaksi = getSheetData('transaksi');
  const buku = getSheetData('buku');
  const anggota = getSheetData('siswa');
  
  const mapBuku = {};
  buku.forEach(b => mapBuku[b.id_buku] = b);
  
  const mapAnggota = {};
  anggota.forEach(a => mapAnggota[a.nis] = a);

  let activeLoans = [];
  
  transaksi.forEach(t => {
    if (String(t.status || '').toLowerCase() === 'dipinjam') {
      const nis = t.nis || t.nis_anggota || t.id_anggota;
      const bInfo = mapBuku[t.id_buku] || {};
      const aInfo = mapAnggota[nis] || {};
      
      activeLoans.push({
        id_transaksi: t.id_transaksi,
        nis: nis,
        nama_anggota: aInfo.nama_lengkap || t.nama_anggota || '-',
        kelas: aInfo.kelas || '-',
        id_buku: t.id_buku,
        judul_buku: bInfo.judul_buku || t.judul_buku || '-',
        kategori: bInfo.kategori || '-',
        tgl_pinjam: t.tgl_pinjam,
        tgl_jatuh_tempo: t.tgl_jatuh_tempo,
        url_sampul: bInfo.url_sampul || ''
      });
    }
  });

  if (searchQuery) {
    const q = String(searchQuery).toLowerCase().trim();
    activeLoans = activeLoans.filter(l => 
      String(l.nama_anggota).toLowerCase().includes(q) ||
      String(l.nis).toLowerCase().includes(q) ||
      String(l.judul_buku).toLowerCase().includes(q)
    );
  }

  // Sort by tgl_jatuh_tempo ascending (closest deadline first)
  activeLoans.sort((a, b) => new Date(a.tgl_jatuh_tempo) - new Date(b.tgl_jatuh_tempo));

  return activeLoans;
}

function getAllTransaksiPeminjamanListFull() {
  const transaksi = getSheetData('transaksi') || [];
  const buku = getSheetData('buku') || [];
  const anggota = getSheetData('siswa') || [];

  const mapBuku = {};
  buku.forEach(b => {
    if (b && b.id_buku) mapBuku[String(b.id_buku).trim()] = b;
  });

  const mapAnggota = {};
  anggota.forEach(a => {
    if (a && a.nis) mapAnggota[String(a.nis).trim()] = a;
  });

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const list = [];
  transaksi.forEach(t => {
    if (!t || !t.id_transaksi) return;
    const nis = String(t.nis || t.nis_anggota || t.id_anggota || '').trim();
    const idBuku = String(t.id_buku || '').trim();
    const bInfo = mapBuku[idBuku] || {};
    const aInfo = mapAnggota[nis] || {};

    const rawStatus = String(t.status || 'dipinjam').trim().toLowerCase();
    const isLate = rawStatus === 'dipinjam' && t.tgl_jatuh_tempo && String(t.tgl_jatuh_tempo).trim() < todayStr;

    list.push({
      id_transaksi: t.id_transaksi,
      nis: nis,
      nama_anggota: aInfo.nama_lengkap || t.nama_anggota || t.nama_siswa || '-',
      kelas: aInfo.kelas || '-',
      id_buku: idBuku,
      judul_buku: bInfo.judul_buku || t.judul_buku || '-',
      kategori: bInfo.kategori || '-',
      url_sampul: bInfo.url_sampul || '',
      tgl_pinjam: t.tgl_pinjam || '',
      tgl_jatuh_tempo: t.tgl_jatuh_tempo || '',
      tgl_dikembalikan: t.tgl_dikembalikan || t.tgl_kembali || '',
      status: rawStatus,
      is_late: isLate
    });
  });

  list.reverse();
  return list;
}
