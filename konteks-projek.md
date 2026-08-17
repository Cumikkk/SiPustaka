# Konteks Proyek: Sistem Informasi Perpustakaan Sekolah (SiPustaka)

Aplikasi Perpustakaan Sekolah berbasis Web App modern menggunakan **Google Apps Script (GAS)**, **Google Sheets** sebagai Database, **Bootstrap 5**, **Bootstrap Icons**, dan **SweetAlert2**.

---

## 1. Lingkungan Pengembangan & Teknologi
* **Runtime Backend:** Google Apps Script (GAS) Engine V8.
* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bootstrap 5.3 (CDN), Bootstrap Icons 1.11 (CDN), SweetAlert2 (CDN), Google Fonts Poppins.
* **Database:** Google Sheets (`db_perpus`) ID: `1BJVNzX9wWw3rHnHlN8GkR3-KK_6kfjqBXOldbU3_TEg` (terletak di dalam folder `database/`)
* **Struktur Google Drive (`Sistem Perpustakaan`):**
  * 📁 `database/` : Menyimpan spreadsheet database `db_perpus`
  * 📁 `upload/` (ID: `1XIJJx-OVC7JPZ4eOWUaT_fDJXMQJhOi5`)
    * 📁 `sampul/` : Menyimpan gambar sampul buku untuk tampilan web
    * 📁 `buku/` : Menyimpan berkas buku digital (PDF/dokumen) untuk dibaca/diunduh siswa & guru
* **Clasp Script ID:** `16lOateVKmUu1Q8YDmHgfiKqRW3izKDA5ZbAaBtCeS4fLmzY6pqymPkGP`

---

## 2. Struktur Database (5 Sheet Utama - Lowercase & Snake_case)

1. **`admin`**: `id_admin`, `nama_lengkap`, `email`, `username`, `password`
2. **`siswa`**: `nis`, `nama_lengkap`, `kelas`, `email`, `username`, `password`, `status`
3. **`buku`**: `id_buku`, `isbn`, `judul_buku`, `penulis`, `penerbit`, `tahun_terbit`, `kategori`, `stok_buku`, `url_sampul`, `url_file_buku`
4. **`transaksi`**: `id_transaksi`, `nis_anggota`, `id_buku`, `tgl_pinjam`, `tgl_jatuh_tempo`, `status`, `tgl_dikembalikan`
5. **`pengaturan`**: `kunci`, `nilai`

---

## 3. SOP Push Kode & Teks Deskripsi Rilis (WAJIB DIPATUHI)
Antigravity mengedit kode di laptop dan mengunggahnya ke Apps Script Online via:
```bash
npx @google/clasp push -f
```
Setelah push selesai, Antigravity **WAJIB menentukan dan merumuskan teks deskripsi rilis** secara spesifik berdasarkan perubahan fitur yang baru dibuat, lalu memberikannya kepada User dalam bentuk kotak teks siap salin untuk diisikan pada kolom Description saat deploy manual di Apps Script Editor.