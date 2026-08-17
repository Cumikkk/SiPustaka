/**
 * ====================================================================
 * SiPustaka - Modul Autentikasi & OTP Password
 * ====================================================================
 */

// API AUTENTIKASI UNIFIED & RESET OTP UNIVERSAL
// ==========================================

function loginUserUnified(credential, password) {
  const cred = String(credential || '').trim();
  const pass = String(password || '').trim();

  // 1. Cek Admin terlebih dahulu (Username atau Email)
  const admins = getSheetData('admin');
  const adminUser = admins.find(a => 
    (String(a.username || '').trim().toLowerCase() === cred.toLowerCase() || String(a.email || '').trim().toLowerCase() === cred.toLowerCase()) && 
    String(a.password || '').trim() === pass
  );

  if (adminUser) {
    return {
      success: true,
      role: 'admin',
      userData: {
        id_admin: adminUser.id_admin,
        nama_lengkap: adminUser.nama_lengkap,
        email: adminUser.email,
        username: adminUser.username,
        role_title: 'Petugas / Admin'
      }
    };
  }

  // 2. Jika bukan Admin, Cek Siswa / Anggota (Strict: Username atau Email Saja)
  const anggota = getSheetData('siswa');
  const siswaUser = anggota.find(a => {
    const userClean = String(a.username || '').trim().toLowerCase();
    const emailClean = String(a.email || '').trim().toLowerCase();
    const isUserMatch = userClean !== '' && userClean === cred.toLowerCase();
    const isEmailMatch = emailClean !== '' && emailClean === cred.toLowerCase();
    
    return (isUserMatch || isEmailMatch) && String(a.password || '').trim() === pass;
  });

  if (siswaUser) {
    if (String(siswaUser.status || 'aktif').toLowerCase() !== 'aktif') {
      return { success: false, message: 'Akun Siswa Anda sedang dinonaktifkan oleh petugas perpustakaan.' };
    }
    return {
      success: true,
      role: 'siswa',
      userData: {
        nis: siswaUser.nis,
        nama_lengkap: siswaUser.nama_lengkap,
        username: siswaUser.username,
        kelas: siswaUser.kelas,
        email: siswaUser.email,
        status: siswaUser.status || 'Aktif',
        role_title: 'Siswa (Kelas ' + (siswaUser.kelas || '-') + ')'
      }
    };
  }

  return { success: false, message: 'Username / Email atau Kata Sandi salah!' };
}

function requestOtpUniversal(email) {
  const cleanEmail = String(email).trim().toLowerCase();
  
  const admins = getSheetData('admin');
  let user = admins.find(a => String(a.email).trim().toLowerCase() === cleanEmail);
  let roleType = 'admin';

  if (!user) {
    const anggota = getSheetData('anggota');
    user = anggota.find(a => String(a.email).trim().toLowerCase() === cleanEmail);
    roleType = 'siswa';
  }

  if (!user) {
    return { success: false, message: 'Email tidak terdaftar dalam sistem perpustakaan!' };
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const props = PropertiesService.getScriptProperties();
  const otpData = JSON.stringify({
    email: cleanEmail,
    roleType: roleType,
    otp: otpCode,
    expiry: new Date().getTime() + (10 * 60 * 1000)
  });
  props.setProperty('OTP_' + cleanEmail, otpData);

  try {
    const namaUser = user.nama_lengkap || user.username || 'Pengguna SiPustaka';
    MailApp.sendEmail({
      to: cleanEmail,
      subject: '[SiPustaka] Kode OTP Reset Password Akun',
      htmlBody: `
        <div style="font-family: 'Poppins', Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 82, 204, 0.08); border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #0052cc 0%, #003da6 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">📘 SiPustaka</div>
            <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Sistem Informasi Perpustakaan Sekolah</div>
          </div>
          <div style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Permintaan Reset Kata Sandi</h2>
            <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">Halo <b>${namaUser}</b>,</p>
            <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">Kami menerima permintaan untuk mengatur ulang kata sandi akun SiPustaka Anda. Gunakan kode OTP 6-digit di bawah ini untuk verifikasi:</p>
            
            <div style="background-color: #eef3ff; border: 2px dashed #0052cc; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #0052cc; letter-spacing: 1.5px; margin-bottom: 6px;">KODE OTP VERIFIKASI ANDA</div>
              <div style="font-size: 36px; font-weight: 800; color: #0052cc; letter-spacing: 12px; font-family: monospace;">${otpCode}</div>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px;">
              <div style="margin-bottom: 6px;">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="#92400e" style="vertical-align: -2px; margin-right: 6px;"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                Kode ini berlaku selama <b>10 menit</b>.
              </div>
              <div>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="#92400e" style="vertical-align: -2px; margin-right: 6px;"><path d="M8 1a2 2 0 0 0-2 2v4H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V3a2 2 0 0 0-2-2zm-1 6V3a1 1 0 0 1 2 0v4H7z"/></svg>
                Mohon tidak memberikan kode OTP ini kepada siapa pun demi keamanan akun Anda.
              </div>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini dengan aman.</p>
          </div>
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
            &copy; 2026 SiPustaka &bull; KKN Kelompok 18 UNUSIDA. All rights reserved.
          </div>
        </div>
      `
    });
    return { success: true, message: 'Kode OTP telah dikirim ke email ' + cleanEmail };
  } catch (e) {
    return { success: false, message: 'Gagal mengirim email: ' + e.toString() };
  }
}

function resetPasswordUniversal(email, otpInput, newPassword) {
  const cleanEmail = String(email).trim().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const rawData = props.getProperty('OTP_' + cleanEmail);

  if (!rawData) {
    return { success: false, message: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' };
  }

  const otpObj = JSON.parse(rawData);
  if (new Date().getTime() > otpObj.expiry) {
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: false, message: 'Kode OTP sudah kadaluarsa.' };
  }

  if (String(otpObj.otp).trim() !== String(otpInput).trim()) {
    return { success: false, message: 'Kode OTP yang Anda masukkan salah!' };
  }

  const ss = getDb();
  let updated = false;

  if (otpObj.roleType === 'admin') {
    const sheetAdmin = ss.getSheetByName('admin');
    if (sheetAdmin) {
      const values = sheetAdmin.getDataRange().getValues();
      const headers = values[0].map(h => String(h).trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const passIdx = headers.indexOf('password');
      for (let i = 1; i < values.length; i++) {
        if (emailIdx !== -1 && String(values[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
          if (passIdx !== -1) {
            sheetAdmin.getRange(i + 1, passIdx + 1).setValue(newPassword);
            updated = true;
          }
          break;
        }
      }
    }
  } else {
    const sheetSiswa = getFlexibleSheet(ss, 'siswa');
    if (sheetSiswa) {
      const values = sheetSiswa.getDataRange().getValues();
      const headers = values[0].map(h => String(h).trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const passIdx = headers.indexOf('password');
      for (let i = 1; i < values.length; i++) {
        if (emailIdx !== -1 && String(values[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
          if (passIdx !== -1) {
            sheetSiswa.getRange(i + 1, passIdx + 1).setValue(newPassword);
            updated = true;
          }
          break;
        }
      }
    }
  }

  if (updated) {
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: true, message: 'Password berhasil diubah! Silakan login dengan password baru.' };
  }

  return { success: false, message: 'Gagal memperbarui password di database.' };
}

// ==========================================
// API AREA SISWA & ADMIN
// ==========================================

function verifyOtpUniversal(email, otpInput) {
  const cleanEmail = String(email).trim().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const rawData = props.getProperty('OTP_' + cleanEmail);

  if (!rawData) {
    return { success: false, message: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' };
  }

  const otpObj = JSON.parse(rawData);
  const now = new Date().getTime();

  if (now > otpObj.expiry) {
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: false, message: 'Kode OTP sudah kadaluarsa (lebih dari 10 menit). Silakan minta kode baru.' };
  }

  if (String(otpInput).trim() !== String(otpObj.otp).trim()) {
    return { success: false, message: 'Kode OTP yang Anda masukkan salah.' };
  }

  return { success: true, message: 'Kode OTP valid.' };
}

/**
 * Update Data Profil & Password Mandiri Pengguna (Siswa / Admin)
 */
function updateUserSelfProfile(profileData) {
  try {
    const role = String(profileData.role || '').toLowerCase();
    const idOrNis = String(profileData.identifier || '').trim();
    const namaLengkap = String(profileData.nama_lengkap || '').trim();
    const username = String(profileData.username || '').trim();
    const email = String(profileData.email || '').trim().toLowerCase();
    const oldPassword = String(profileData.old_password || '').trim();
    const newPassword = String(profileData.new_password || '').trim();

    if (!namaLengkap || !username || !email) {
      return { success: false, message: 'Nama lengkap, username, dan email wajib diisi!' };
    }

    const ss = getDb();

    if (role === 'admin') {
      const sheet = ss.getSheetByName('admin');
      if (!sheet) return { success: false, message: 'Sheet admin tidak ditemukan.' };
      const values = sheet.getDataRange().getValues();
      const headers = values[0].map(h => String(h).toLowerCase().trim());
      
      const idIdx = headers.indexOf('id_admin');
      const namaIdx = headers.indexOf('nama_lengkap');
      const userIdx = headers.indexOf('username');
      const emailIdx = headers.indexOf('email');
      const passIdx = headers.indexOf('password');

      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idIdx] || values[i][userIdx] || '').trim() === idOrNis) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, message: 'Data admin tidak ditemukan di database.' };
      }

      // Validasi ganti password
      if (newPassword) {
        const currentDbPass = String(values[rowIndex - 1][passIdx] || '').trim();
        if (oldPassword !== currentDbPass) {
          return { success: false, message: 'Password saat ini / lama yang Anda masukkan salah!' };
        }
        sheet.getRange(rowIndex, passIdx + 1).setValue(newPassword);
      }

      if (namaIdx !== -1) sheet.getRange(rowIndex, namaIdx + 1).setValue(namaLengkap);
      if (userIdx !== -1) sheet.getRange(rowIndex, userIdx + 1).setValue(username);
      if (emailIdx !== -1) sheet.getRange(rowIndex, emailIdx + 1).setValue(email);

      return {
        success: true,
        message: 'Profil berhasil diperbarui!',
        userData: {
          id_admin: idOrNis,
          nama_lengkap: namaLengkap,
          username: username,
          email: email,
          role: 'admin'
        }
      };

    } else {
      // Role Siswa / Anggota
      const sheet = ss.getSheetByName('siswa') || ss.getSheetByName('anggota');
      if (!sheet) return { success: false, message: 'Sheet siswa tidak ditemukan.' };
      const values = sheet.getDataRange().getValues();
      const headers = values[0].map(h => String(h).toLowerCase().trim());

      const nisIdx = headers.indexOf('nis');
      const namaIdx = headers.indexOf('nama_lengkap');
      const userIdx = headers.indexOf('username');
      const emailIdx = headers.indexOf('email');
      const passIdx = headers.indexOf('password');
      const kelasIdx = headers.indexOf('kelas');
      const statusIdx = headers.indexOf('status');

      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][nisIdx]).trim() === idOrNis) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, message: 'Data siswa tidak ditemukan di database.' };
      }

      // Validasi ganti password
      if (newPassword) {
        const currentDbPass = String(values[rowIndex - 1][passIdx] || '').trim();
        if (oldPassword !== currentDbPass) {
          return { success: false, message: 'Password saat ini / lama yang Anda masukkan salah!' };
        }
        sheet.getRange(rowIndex, passIdx + 1).setValue(newPassword);
      }

      if (namaIdx !== -1) sheet.getRange(rowIndex, namaIdx + 1).setValue(namaLengkap);
      if (userIdx !== -1) sheet.getRange(rowIndex, userIdx + 1).setValue(username);
      if (emailIdx !== -1) sheet.getRange(rowIndex, emailIdx + 1).setValue(email);

      const kelasVal = kelasIdx !== -1 ? values[rowIndex - 1][kelasIdx] : '';
      const statusVal = statusIdx !== -1 ? values[rowIndex - 1][statusIdx] : 'Aktif';

      return {
        success: true,
        message: 'Profil data diri berhasil diperbarui!',
        userData: {
          nis: idOrNis,
          nama_lengkap: namaLengkap,
          username: username,
          email: email,
          kelas: kelasVal,
          status: statusVal,
          role: 'siswa'
        }
      };
    }
  } catch (err) {
    return { success: false, message: 'Error server: ' + err.toString() };
  }
}