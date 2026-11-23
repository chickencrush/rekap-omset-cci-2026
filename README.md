# Dashboard Omset CCI

Dashboard membaca langsung dari Google Sheet `Rekap_Omset_CCI_Revisi_ESB_Delivery_Kontribusi_FIX` lewat Apps Script. Data baru di sheet muncul otomatis (dashboard cek ulang tiap 60 detik dan saat tab dibuka kembali).

## File

| File | Fungsi |
|---|---|
| `Code.gs` | Apps Script: membaca sheet dan menyajikannya sebagai JSON |
| `index.html` | Dashboard (satu file, tanpa build) |

## 1. Pasang Apps Script

1. Buka spreadsheet, **Extensions → Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel isi `Code.gs` dari paket ini, simpan.
3. Pilih fungsi `siapkanTab`, klik **Run**, izinkan akses. Ini membuat tab `TARGET MITRA`, `DATA MENU`, dan `ARSIP BULANAN`. Tab yang sudah ada tidak diubah.
4. Jalankan `pasangTrigger` sekali. Data DATABASE OMSET akan diarsipkan otomatis tiap malam.
5. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*. Salin URL yang berakhir `/exec`.

Setelah mengubah `Code.gs`, buat deployment baru (**Manage deployments → Edit → New version**) agar perubahan aktif.

## 2. Pasang di GitHub Pages

1. Buka `index.html`, ganti `GANTI_DENGAN_URL_WEB_APP` dengan URL dari langkah 1.5.
2. Buat repository baru, unggah `index.html`.
3. **Settings → Pages → Deploy from a branch → main / root**. Alamat dashboard muncul setelah beberapa menit.

## 3. Yang perlu diisi di sheet

- **TARGET MITRA**: kolom *Target Bulanan* per outlet mitra. Tanpa ini, kolom target mitra di ranking kosong.
- **DATA MENU**: seluruh menu dengan qty dan nilai omset (satu baris per menu). Dari sini dashboard menghitung 5 tertinggi dan 5 terendah berdasarkan **qty** maupun **nilai**. Jika kosong, dashboard memakai tabel 5 + 5 di PERFORMA MENU (hanya urutan qty).
- **Perbandingan per kategori dan per outlet**: DATABASE OMSET hanya memuat satu bulan (sesuai B3 di INPUT OMSET), jadi data bulan lalu perlu diarsipkan. Setelah `pasangTrigger`, bulan berjalan masuk ARSIP BULANAN tiap malam. Untuk bulan lalu yang sudah lewat, ganti B3 ke bulan itu, jalankan `arsipkanBulanIni` sekali, lalu kembalikan B3. Sebelum arsip ada, dashboard memakai estimasi seperti di RINGKASAN (E3 ÷ hari bulan lalu × hari berjalan), hanya untuk Semua dan Pusat.

## Cara dashboard menghitung

- Sumber: DATABASE OMSET, MASTER DATA (outlet NONAKTIF dikeluarkan), TARGET PUSAT, TARGET MITRA, INPUT OMSET (B3, E3, kolom AJ).
- Total, kontribusi kategori, dan ranking sama dengan RINGKASAN dan KONTRIBUSI KANAL.
- Perbandingan bulan lalu memakai **tanggal 1 sampai tanggal terakhir yang datanya lengkap** (minimal 90% outlet yang punya data pada bulan itu sudah input), supaya outlet yang terlambat input tidak membuat bulan ini tampak turun. Karena itu persentasenya bisa berbeda dari RINGKASAN, yang memakai semua hari berjalan.
- Analisa otomatis hanya menyatakan fakta dari angka, tanpa menebak penyebab.

## Keamanan

URL web app dengan akses *Anyone* bisa dibuka siapa pun yang mengetahuinya. Untuk menambah satu lapis: di Apps Script buka **Project Settings → Script properties**, tambah `TOKEN` dengan nilai acak, lalu isi konstanta `TOKEN` yang sama di `index.html`. Token ini terlihat di sumber halaman, jadi hanya mencegah akses iseng, bukan pengaman penuh.
