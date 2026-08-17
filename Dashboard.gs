/**
 * ====================================================================
 * SiPustaka - Modul Dashboard & Laporan Statistik
 * ====================================================================
 */

function getAdminDashboardData() {
  const buku = getSheetData('buku');
  const anggota = getSheetData('siswa');
  const transaksi = getSheetData('transaksi');

  const mapBukuObj = {};
  buku.forEach(b => mapBukuObj[b.id_buku] = b);
  const mapAnggotaObj = {};
  anggota.forEach(a => {
    if (a.nis) mapAnggotaObj[String(a.nis).trim()] = a;
    if (a.id_anggota) mapAnggotaObj[String(a.id_anggota).trim()] = a;
  });

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  function parseLocalYMD(str) {
    if (!str) return new Date();
    if (str instanceof Date) {
      return new Date(str.getFullYear(), str.getMonth(), str.getDate());
    }
    const parts = String(str).split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(str);
  }

  const todayDate = parseLocalYMD(todayStr);

  let totalPeminjamanAktif = 0;
  let totalTerlambat = 0;

  const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function formatIndoDate(dateStr) {
    if (!dateStr) return '-';
    const dObj = parseLocalYMD(dateStr);
    return `${dObj.getDate()} ${monthsIndo[dObj.getMonth()]}`;
  }

  const formattedTransaksi = transaksi.map(t => {
    const tNis = String(t.nis || t.nis_anggota || t.id_anggota || '').trim();
    const bInfo = mapBukuObj[t.id_buku] || {};
    const aInfo = mapAnggotaObj[tNis] || {};

    let statusText = 'Dipinjam';
    let subText = '-';
    let badgeClass = 'bg-primary text-white';

    if (t.status === 'dipinjam') {
      totalPeminjamanAktif++;
      const dueDate = parseLocalYMD(t.tgl_jatuh_tempo);
      
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays < 0) {
        totalTerlambat++;
        statusText = 'Terlambat';
        subText = `${Math.abs(diffDays)} Hari`;
        badgeClass = 'bg-danger text-white';
      } else if (diffDays === 0) {
        statusText = 'Jatuh Tempo';
        subText = 'Hari Ini';
        badgeClass = 'bg-warning text-dark';
      } else {
        statusText = 'Dipinjam';
        subText = `Sisa ${diffDays} Hari`;
        badgeClass = 'bg-primary text-white';
      }
    } else {
      statusText = 'Dikembalikan';
      subText = 'Selesai';
      badgeClass = 'bg-secondary text-white';
    }

    const statusBadge = { text: statusText, class: badgeClass, subText: subText };

    return {
      ...t,
      nama_buku: bInfo.judul_buku || t.id_buku,
      kategori_buku: bInfo.kategori || 'Umum',
      nama_anggota: aInfo.nama_lengkap || tNis || 'Siswa',
      kelas_anggota: aInfo.kelas ? `Kelas ${aInfo.kelas}` : 'Siswa',
      tgl_pinjam_indo: formatIndoDate(t.tgl_pinjam),
      tgl_jatuh_tempo_indo: formatIndoDate(t.tgl_jatuh_tempo),
      periode_pinjam: `${formatIndoDate(t.tgl_pinjam)} - ${formatIndoDate(t.tgl_jatuh_tempo)}`,
      isTerlambat: t.status === 'dipinjam' && String(t.tgl_jatuh_tempo).split('T')[0] < todayStr,
      statusBadge,
      subText
    };
  });

  const activeOnly = formattedTransaksi.filter(t => t.status === 'dipinjam');

  activeOnly.sort((a, b) => {
    if (a.isTerlambat && !b.isTerlambat) return -1;
    if (!a.isTerlambat && b.isTerlambat) return 1;
    return new Date(a.tgl_jatuh_tempo) - new Date(b.tgl_jatuh_tempo);
  });

  const peminjamanTerbaru = activeOnly.slice(0, 5);

  const countKategori = {};
  let totalBukuKategori = 0;

  buku.forEach(b => {
    let kat = String(b.kategori || 'Lainnya').trim();
    if (!kat) kat = 'Lainnya';
    kat = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
    countKategori[kat] = (countKategori[kat] || 0) + 1;
    totalBukuKategori++;
  });

  const paletteColors = ['#0052cc', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
  let colorIdx = 0;

  const kategoriStats = Object.keys(countKategori).map(kat => {
    const count = countKategori[kat];
    const pct = totalBukuKategori > 0 ? Math.round((count / totalBukuKategori) * 100) : 0;
    const color = paletteColors[colorIdx % paletteColors.length];
    colorIdx++;

    return {
      label: kat,
      count: count,
      percentage: pct,
      color: color
    };
  });

  let totalStokFisik = 0;
  buku.forEach(b => totalStokFisik += Number(b.stok_buku || b.stok_aktual || 0));

  const siswaOnly = anggota.filter(a => {
    const roleStr = String(a.role || '').toLowerCase();
    return roleStr !== 'admin' && roleStr !== 'petugas';
  });
  const totalSiswaAktif = siswaOnly.filter(a => String(a.status || 'aktif').toLowerCase() === 'aktif').length;

  const pctDipinjam = buku.length > 0 ? ((totalPeminjamanAktif / buku.length) * 100).toFixed(1) : '0';
  const subtextTerlambat = totalTerlambat > 0 
    ? `${totalTerlambat} transaksi perlu tindakan` 
    : 'Semua peminjaman tepat waktu';

  return {
    stats: {
      totalBuku: buku.length,
      totalAnggota: siswaOnly.length,
      peminjamanAktif: totalPeminjamanAktif,
      peminjamanTerlambat: totalTerlambat,
      subtextBuku: `Total ${totalStokFisik} eksemplar fisik`,
      subtextAnggota: `${totalSiswaAktif} siswa berstatus aktif`,
      subtextPinjam: `${pctDipinjam}% dari total koleksi`,
      subtextTerlambat: subtextTerlambat
    },
    peminjamanTerbaru,
    peminjamanAktifAll: activeOnly,
    kategoriStats,
    buku,
    anggota
  };
}

function getStudentDashboardData(nis) {
  try {
    const cleanNis = String(nis || '').trim();
    const buku = getSheetData('buku');
    const transaksi = getSheetData('transaksi');
    const anggota = getSheetData('siswa');

    const siswaInfo = anggota.find(a => String(a.nis).trim() === cleanNis) || {};
    const mapBuku = {};
    const activeBorrowMap = {};

    transaksi.forEach(t => {
      if (String(t.status || '').toLowerCase() === 'dipinjam') {
        const bId = String(t.id_buku || '');
        activeBorrowMap[bId] = (activeBorrowMap[bId] || 0) + 1;
      }
    });

    buku.forEach(b => mapBuku[b.id_buku] = b);

    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    function parseLocalYMD(str) {
      if (!str) return new Date();
      if (str instanceof Date) {
        return new Date(str.getFullYear(), str.getMonth(), str.getDate());
      }
      const s = String(str).split('T')[0];
      const parts = s.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
      const dObj = new Date(str);
      return isNaN(dObj.getTime()) ? new Date() : dObj;
    }

    function formatIndoDate(dateStr) {
      if (!dateStr) return '-';
      const dObj = parseLocalYMD(dateStr);
      return `${dObj.getDate()} ${monthsIndo[dObj.getMonth()]} ${dObj.getFullYear()}`;
    }

    function formatShortIndoDate(dateStr) {
      if (!dateStr) return '-';
      const dObj = parseLocalYMD(dateStr);
      return `${dObj.getDate()} ${monthsIndo[dObj.getMonth()]}`;
    }

    const todayDate = parseLocalYMD(todayStr);

    const myTransaksi = transaksi.filter(t => {
      const tNis = String(t.nis || t.nis_anggota || t.id_anggota || '').trim();
      return tNis.toLowerCase() === cleanNis.toLowerCase();
    });

    let totalDipinjamSaya = 0;
    let totalRiwayatDibaca = 0;
    let totalTerlambatSaya = 0;

    const myActiveLoans = [];
    const myAllLoans = [];

    myTransaksi.forEach(t => {
      const bInfo = mapBuku[t.id_buku] || {};
      const dueDate = parseLocalYMD(t.tgl_jatuh_tempo);
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      const stLower = String(t.status || 'dipinjam').toLowerCase();
      let statusText = 'Dipinjam';
      let subText = `Tenggat: ${formatShortIndoDate(t.tgl_jatuh_tempo)}`;
      let badgeClass = 'bg-primary text-white';
      let rawStatus = 'dipinjam';

      if (stLower === 'dipinjam') {
        totalDipinjamSaya++;
        if (diffDays < 0) {
          totalTerlambatSaya++;
          statusText = 'Terlambat';
          subText = `${Math.abs(diffDays)} Hari`;
          badgeClass = 'bg-danger text-white';
          rawStatus = 'terlambat';
        } else if (diffDays === 0) {
          statusText = 'Jatuh Tempo';
          subText = 'Hari Ini';
          badgeClass = 'bg-warning text-dark';
          rawStatus = 'dipinjam';
        } else {
          statusText = 'Dipinjam';
          subText = `Sisa ${diffDays} Hari`;
          badgeClass = 'bg-primary text-white';
          rawStatus = 'dipinjam';
        }

        myActiveLoans.push({
          id_transaksi: String(t.id_transaksi || ''),
          judul_buku: String(bInfo.judul_buku || t.id_buku || '-'),
          kategori_buku: String(bInfo.kategori || 'Umum'),
          tgl_pinjam_indo: formatShortIndoDate(t.tgl_pinjam),
          tgl_jatuh_tempo_indo: formatShortIndoDate(t.tgl_jatuh_tempo),
          periode_pinjam: `${formatShortIndoDate(t.tgl_pinjam)} - ${formatShortIndoDate(t.tgl_jatuh_tempo)}`,
          badgeClass,
          badgeText: statusText,
          subText
        });
      } else if (stLower === 'dikembalikan') {
        totalRiwayatDibaca++;
        statusText = 'Dikembalikan';
        subText = (t.tgl_kembali || t.tgl_dikembalikan) ? formatShortIndoDate(t.tgl_kembali || t.tgl_dikembalikan) : '-';
        badgeClass = 'bg-success text-white';
        rawStatus = 'dikembalikan';
      }

      myAllLoans.push({
        id_transaksi: String(t.id_transaksi || ''),
        id_buku: String(t.id_buku || ''),
        judul_buku: String(bInfo.judul_buku || t.id_buku || '-'),
        kategori_buku: String(bInfo.kategori || 'Umum'),
        penulis: String(bInfo.penulis || '-'),
        tgl_pinjam_indo: formatShortIndoDate(t.tgl_pinjam),
        tgl_jatuh_tempo_indo: formatShortIndoDate(t.tgl_jatuh_tempo),
        periode_pinjam: `${formatShortIndoDate(t.tgl_pinjam)} - ${formatShortIndoDate(t.tgl_jatuh_tempo)}`,
        tgl_kembali_indo: (t.tgl_kembali || t.tgl_dikembalikan) ? formatShortIndoDate(t.tgl_kembali || t.tgl_dikembalikan) : '-',
        status: stLower,
        statusRaw: rawStatus,
        statusClass: badgeClass,
        statusText,
        subText
      });
    });

    const countKategori = {};
    let totalBukuKategori = 0;

    buku.forEach(b => {
      let kat = String(b.kategori || 'Lainnya').trim();
      if (!kat) kat = 'Lainnya';
      kat = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
      countKategori[kat] = (countKategori[kat] || 0) + 1;
      totalBukuKategori++;
    });

    const paletteColors = ['#0052cc', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    let colorIdx = 0;

    const kategoriStats = Object.keys(countKategori).map(kat => {
      const count = countKategori[kat];
      const pct = totalBukuKategori > 0 ? Math.round((count / totalBukuKategori) * 100) : 0;
      const color = paletteColors[colorIdx % paletteColors.length];
      colorIdx++;

      return {
        label: kat,
        count: count,
        percentage: pct,
        color: color
      };
    });

    const rekomendasiBuku = buku.slice(0, 5).map(b => {
      const bId = String(b.id_buku || '');
      const baseStok = Number(b.stok_buku !== undefined ? b.stok_buku : (b.stok_aktual !== undefined ? b.stok_aktual : 0));
      const activeCount = activeBorrowMap[bId] || 0;
      const sisaStok = Math.max(0, baseStok - activeCount);
      return {
        id_buku: bId,
        judul_buku: String(b.judul_buku || ''),
        penulis: String(b.penulis || '-'),
        kategori: String(b.kategori || 'Umum'),
        stok_buku: sisaStok
      };
    });

    return {
      stats: {
        totalBuku: buku.length,
        dipinjamSaya: totalDipinjamSaya,
        totalDibaca: totalRiwayatDibaca,
        totalTerlambat: totalTerlambatSaya,
        statusAnggota: String(siswaInfo.status || 'aktif').toLowerCase() === 'aktif' ? 'Aktif' : 'Non-Aktif'
      },
      myActiveLoans: myActiveLoans.slice(0, 5),
      myAllLoans,
      kategoriStats,
      rekomendasiBuku
    };
  } catch (err) {
    return { error: err.toString() };
  }
}



function getLaporanRingkasanFull() {
  const ss = getDb();
  
  // Baca data transaksi
  const sheetTrx = ss.getSheetByName('transaksi');
  let trxData = [];
  if (sheetTrx) {
    trxData = sheetTrx.getDataRange().getValues();
  }
  
  let totalPeminjaman = 0;
  let totalDikembalikan = 0;
  let masihDipinjam = 0;
  let terlambat = 0;
  
  const bukuStats = {}; // id_buku -> { id_buku, judul, total_dipinjam, dikembalikan, sedang_dipinjam }
  
  if (trxData.length > 1) {
    const headers = trxData[0].map(h => String(h).trim().toLowerCase());
    const idBukuIdx = headers.indexOf('id_buku');
    const judulIdx = headers.indexOf('judul_buku');
    const statusIdx = headers.indexOf('status');
    
    if (idBukuIdx !== -1 && statusIdx !== -1) {
      for (let i = 1; i < trxData.length; i++) {
        const row = trxData[i];
        const status = String(row[statusIdx] || '').toLowerCase();
        const idBuku = String(row[idBukuIdx] || '');
        const judul = judulIdx !== -1 ? String(row[judulIdx] || '') : 'Buku Tidak Diketahui';
        
        if (!idBuku) continue;
        
        totalPeminjaman++;
        if (status === 'dikembalikan') totalDikembalikan++;
        else if (status === 'dipinjam') masihDipinjam++;
        else if (status === 'terlambat') {
          masihDipinjam++;
          terlambat++;
        }
        
        if (!bukuStats[idBuku]) {
          bukuStats[idBuku] = { id_buku: idBuku, judul_buku: judul, dipinjam: 0, dikembalikan: 0, masih_dipinjam: 0, terlambat: 0 };
        }
        
        bukuStats[idBuku].dipinjam++;
        if (status === 'dikembalikan') bukuStats[idBuku].dikembalikan++;
        else if (status === 'dipinjam') bukuStats[idBuku].masih_dipinjam++;
        else if (status === 'terlambat') {
          bukuStats[idBuku].masih_dipinjam++;
          bukuStats[idBuku].terlambat++;
        }
      }
    }
  }
  
  const ringkasanBuku = Object.values(bukuStats).sort((a, b) => b.dipinjam - a.dipinjam);
  
  return {
    totalPeminjaman,
    totalDikembalikan,
    masihDipinjam,
    terlambat,
    ringkasanBuku
  };
}
