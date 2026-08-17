/**
 * ====================================================================
 * SiPustaka - Modul Manajemen & Katalog Buku
 * ====================================================================
 */

// API PUBLIC & KATALOG
// ==========================================

function getKatalogBuku(searchQuery, kategori) {
  const allBuku = getSheetData('buku');
  const transaksi = getSheetData('transaksi');
  const activeBorrowMap = {};

  transaksi.forEach(t => {
    if (String(t.status || '').toLowerCase() === 'dipinjam') {
      const bId = String(t.id_buku || '');
      activeBorrowMap[bId] = (activeBorrowMap[bId] || 0) + 1;
    }
  });

  return allBuku.filter(buku => {
    const matchesSearch = !searchQuery || 
      String(buku.judul_buku).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.penulis).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.isbn).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesKategori = !kategori || kategori === 'semua' || 
      String(buku.kategori).toLowerCase() === kategori.toLowerCase();

    return matchesSearch && matchesKategori;
  }).map(buku => {
    const bId = String(buku.id_buku || '');
    const baseStok = Number(buku.stok_buku !== undefined ? buku.stok_buku : (buku.stok_aktual !== undefined ? buku.stok_aktual : 0));
    const activeCount = activeBorrowMap[bId] || 0;
    const sisaStok = Math.max(0, baseStok - activeCount);
    
    const bCopy = {};
    for (let key in buku) { bCopy[key] = buku[key]; }
    bCopy.stok_buku = sisaStok;
    return bCopy;
  });
}

function getKategoriList() {
  const allBuku = getSheetData('buku');
  const setKategori = new Set();
  allBuku.forEach(b => {
    if (b.kategori) setKategori.add(String(b.kategori).trim().toLowerCase());
  });
  return Array.from(setKategori);
}

function getBukuListFull(searchQuery, kategori, statusFilter) {
  const allBuku = getSheetData('buku');
  const allTrx = getSheetData('transaksi');
  
  return allBuku.filter(buku => {
    const matchesSearch = !searchQuery || 
      String(buku.judul_buku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.penulis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(buku.isbn || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesKategori = !kategori || kategori === 'semua' || 
      String(buku.kategori || '').toLowerCase() === kategori.toLowerCase();

    const isDipinjam = allTrx.some(t => String(t.id_buku) === String(buku.id_buku) && String(t.status).toLowerCase() === 'dipinjam');
    const matchesStatus = !statusFilter || statusFilter === 'semua' ||
      (statusFilter === 'tersedia' && Number(buku.stok_buku || buku.stok_aktual || 0) > 0) ||
      (statusFilter === 'dipinjam' && isDipinjam);

    return matchesSearch && matchesKategori && matchesStatus;
  });
}

function uploadFileToDrive(base64Data, fileName, mimeType) {
  try {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.includes(';base64,')) {
      return '';
    }
    
    let targetFolder = null;
    if (typeof UPLOAD_FOLDER_ID !== 'undefined' && UPLOAD_FOLDER_ID) {
      try {
        targetFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
      } catch (fErr) {
        Logger.log("Folder ID error: " + fErr.message);
      }
    }
    
    if (!targetFolder) {
      const folderName = "SiPustaka_Uploads";
      const folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        targetFolder = folders.next();
      } else {
        targetFolder = DriveApp.createFolder(folderName);
      }
    }
    
    const splitParts = base64Data.split(';base64,');
    const actualData = splitParts[1];
    const detectedMime = splitParts[0].replace('data:', '') || mimeType || 'application/octet-stream';
    const decoded = Utilities.base64Decode(actualData);
    const blob = Utilities.newBlob(decoded, detectedMime, fileName);
    
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?id=' + file.getId();
  } catch (e) {
    Logger.log("Drive upload error: " + e.message);
    return '';
  }
}

function saveBukuData(bukuObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName('buku');
  if (!sheet) return { success: false, message: 'Sheet buku tidak ditemukan.' };

  // Handle uploaded cover image file
  if (bukuObj.sampul_base64) {
    const origName = bukuObj.sampul_filename || 'cover.jpg';
    const cleanTitle = (bukuObj.judul_buku || 'cover').replace(/[^a-zA-Z0-9]/g, '_');
    const ext = origName.includes('.') ? origName.substring(origName.lastIndexOf('.')) : '.jpg';
    const uploadedCoverUrl = uploadFileToDrive(bukuObj.sampul_base64, 'Cover_' + cleanTitle + '_' + Date.now() + ext, 'image/jpeg');
    if (uploadedCoverUrl) {
      bukuObj.url_sampul = uploadedCoverUrl;
    }
  }

  // Handle uploaded ebook PDF file
  if (bukuObj.ebook_base64) {
    const cleanTitle = (bukuObj.judul_buku || 'ebook').replace(/[^a-zA-Z0-9]/g, '_');
    const uploadedEbookUrl = uploadFileToDrive(bukuObj.ebook_base64, 'EBook_' + cleanTitle + '_' + Date.now() + '.pdf', 'application/pdf');
    if (uploadedEbookUrl) {
      bukuObj.url_file_buku = uploadedEbookUrl;
    }
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  
  const idBukuIdx = headers.indexOf('id_buku');
  const isbnIdx = headers.indexOf('isbn');
  const judulIdx = headers.indexOf('judul_buku');
  const penulisIdx = headers.indexOf('penulis');
  const penerbitIdx = headers.indexOf('penerbit');
  const tahunIdx = headers.indexOf('tahun_terbit');
  const kategoriIdx = headers.indexOf('kategori');
  
  let stokIdx = headers.indexOf('stok_buku');
  if (stokIdx === -1) stokIdx = headers.indexOf('stok_aktual');
  
  const urlIdx = headers.indexOf('url_sampul');
  const urlFileIdx = headers.indexOf('url_file_buku');

  let rowToUpdate = -1;
  let isEdit = false;

  if (bukuObj.id_buku) {
    const searchIdx = idBukuIdx !== -1 ? idBukuIdx : 0;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][searchIdx]).trim() === String(bukuObj.id_buku).trim()) {
        rowToUpdate = i + 1;
        isEdit = true;
        break;
      }
    }
  }

  const stokVal = Number(bukuObj.stok_buku || bukuObj.stok_aktual || 1);

  if (!isEdit) {
    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    const newId = 'bk-' + String(nextRow - 1).padStart(3, '0');
    
    // Construct row matching current headers dynamically
    const rowData = headers.map(h => {
      if (h === 'id_buku') return newId;
      if (h === 'isbn') return bukuObj.isbn || '';
      if (h === 'judul_buku') return bukuObj.judul_buku || '';
      if (h === 'penulis') return bukuObj.penulis || '';
      if (h === 'penerbit') return bukuObj.penerbit || '';
      if (h === 'tahun_terbit') return bukuObj.tahun_terbit || '';
      if (h === 'kategori') return bukuObj.kategori || 'Fiksi';
      if (h === 'stok_buku' || h === 'stok_aktual') return stokVal;
      if (h === 'url_sampul') return bukuObj.url_sampul || '';
      if (h === 'url_file_buku') return bukuObj.url_file_buku || '';
      return '';
    });

    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    applyColumnAlignments('buku', nextRow, 1);
    return { success: true, message: 'Buku baru berhasil ditambahkan!' };
  } else {
    if (isbnIdx !== -1) sheet.getRange(rowToUpdate, isbnIdx + 1).setValue(bukuObj.isbn || '');
    if (judulIdx !== -1) sheet.getRange(rowToUpdate, judulIdx + 1).setValue(bukuObj.judul_buku || '');
    if (penulisIdx !== -1) sheet.getRange(rowToUpdate, penulisIdx + 1).setValue(bukuObj.penulis || '');
    if (penerbitIdx !== -1) sheet.getRange(rowToUpdate, penerbitIdx + 1).setValue(bukuObj.penerbit || '');
    if (tahunIdx !== -1) sheet.getRange(rowToUpdate, tahunIdx + 1).setValue(bukuObj.tahun_terbit || '');
    if (kategoriIdx !== -1) sheet.getRange(rowToUpdate, kategoriIdx + 1).setValue(bukuObj.kategori || 'Fiksi');
    if (stokIdx !== -1) sheet.getRange(rowToUpdate, stokIdx + 1).setValue(stokVal);
    if (urlIdx !== -1 && bukuObj.url_sampul !== undefined) sheet.getRange(rowToUpdate, urlIdx + 1).setValue(bukuObj.url_sampul);
    if (urlFileIdx !== -1 && bukuObj.url_file_buku !== undefined) sheet.getRange(rowToUpdate, urlFileIdx + 1).setValue(bukuObj.url_file_buku);
    return { success: true, message: 'Data buku berhasil diperbarui!' };
  }
}

function deleteBukuData(idBuku) {
  const ss = getDb();
  const sheet = ss.getSheetByName('buku');
  if (!sheet) return { success: false, message: 'Sheet buku tidak ditemukan.' };

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(idBuku).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Buku berhasil dihapus.' };
    }
  }
  return { success: false, message: 'Buku tidak ditemukan.' };
}
