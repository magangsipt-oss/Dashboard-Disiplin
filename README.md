# SiDisiplin

Struktur awal aplikasi SiDisiplin:

- `frontend/`: aplikasi web Next.js.
- `backend/`: REST API Express dan satu database PostgreSQL melalui Prisma.

## Menjalankan frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Buka `http://localhost:3000`. Frontend meneruskan permintaan `/api/*` ke
backend lokal di `http://localhost:5000`. Jalankan backend terlebih dahulu
agar indikator koneksi API di portal menunjukkan status terhubung.

## Database PostgreSQL

Aplikasi menggunakan satu database PostgreSQL bernama `dashboard_disiplin`.
Tabel utama yang digunakan meliputi:

- `Mahasiswa`: `id`, `NIM`, `Nama`, `Password`, `Jurusan`, `timestamp`.
- `Dosen`: `id`, `NIDN`, `NIP`, `Nama`, `Password`, `timestamp`.
- `Kemahasiswaan`: `id`, `NIP`, `Nama`, `Password`, `timestamp`.
- `CatatanKonseling`: catatan pembinaan atau panggilan konseling yang dibuat Dosen PA untuk mahasiswa bimbingannya.

Atur `DATABASE_URL` pada `backend/.env` agar menunjuk ke database tersebut.
Contoh format URL:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dashboard_disiplin?schema=public"
```

URL ini menggunakan username/password PostgreSQL lokal Anda. Jangan commit
`backend/.env` atau membagikan kredensialnya.
Pengguna PostgreSQL pada URL perlu memiliki izin `CREATEDB` agar perintah
setup dapat membuat database secara otomatis.

### Menyiapkan database yang sama di komputer teman

Di komputer Anda, pastikan `backend/.env` menunjuk ke database sumber
`dashboard_disiplin`, lalu jalankan dari folder `backend`:

```powershell
npm.cmd install
npm.cmd run prisma:data:export
```

Perintah ini mengekspor seluruh data terkini dari ketiga tabel ke
`backend/prisma/database-data.json`. File ini berisi data pribadi termasuk
password. File tersebut dikecualikan dari Git. Pindahkan file itu ke teman
Anda melalui kanal privat yang aman; jangan mengirimkannya melalui kanal
publik.

Di komputer teman, salin `backend/.env.example` menjadi `backend/.env`, lalu
ubah `DATABASE_URL` agar menggunakan host, username, dan password PostgreSQL
lokalnya dengan nama database `dashboard_disiplin`. Pindahkan file
`database-data.json` ke folder `backend/prisma/`, lalu jalankan:

```powershell
npm.cmd install
npm.cmd run prisma:setup
```

Perintah tersebut membuat database jika belum tersedia, membuat tabel sesuai
`backend/prisma/schema.prisma`, lalu memasukkan data ekspor. Jika baris
bertabrakan dengan primary key atau unique key yang sudah ada, baris itu
dilewati dan data yang sudah ada tidak ditimpa.

### Memulai backend

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Backend berjalan di `http://localhost:5000`. Endpoint pemeriksaan:
`http://localhost:5000/api/health`.

### Login dan profil dashboard

Frontend mengirim login ke backend. Pilih peran di halaman awal, lalu masuk
menggunakan NIM mahasiswa, NIP/NIDN dosen, atau NIP kemahasiswaan dan password
yang tersimpan di tabel terkait. Backend membuat sesi cookie HttpOnly dan
dashboard menampilkan profil dari database. Sesi aktif disimpan di memori
backend dan berakhir setelah 8 jam atau ketika backend dimulai ulang.

Password teks biasa yang sudah ada didukung untuk migrasi awal: setelah login
berhasil, backend langsung menggantinya dengan hash scrypt. Password yang sudah
di-hash harus memakai format internal `scrypt$...` yang dihasilkan backend.
Jangan kirim atau menampilkan password dalam respons API.

Statistik poin, presensi, SKPI, dan aktivitas pada dashboard masih data demo
sampai tabel dan API untuk data tersebut dibuat. Catatan konseling disimpan
oleh Dosen PA dan ditampilkan sebagai riwayat baca-saja pada dashboard
mahasiswa.

### Alur laporan anonim dan tindak lanjut

Semua peran yang sudah login dapat mengirim laporan anonim. Identitas pelapor
tidak disimpan. Jika nama dan NIM terlapor cocok dengan data mahasiswa, laporan
diteruskan sebagai pemberitahuan di dashboard kepada mahasiswa dan Dosen PA.
Dosen PA meninjau laporan; poin baru dikurangi setelah DPA mengonfirmasi
pelanggaran. Kemahasiswaan kemudian menetapkan tugas edukatif atau coaching.
Mahasiswa mengirim tautan bukti penyelesaian, dan Dosen PA menyetujuinya untuk
memulihkan poin. Catatan pengurangan, pemulihan, dan laporan asal tetap menjadi
riwayat.

Jika nama/NIM tidak cocok atau terlapor belum diketahui, laporan hanya masuk
ke antrean Kemahasiswaan. Setelah penelusuran, Kemahasiswaan dapat meneruskan
laporan kepada mahasiswa yang teridentifikasi dan Dosen PA-nya untuk
dikonfirmasi. Laporan yang belum terkonfirmasi tidak mengubah poin.

Pemberitahuan alur ini saat ini ditampilkan di dashboard; pengiriman email
eksternal belum dikonfigurasi. Terapkan perubahan skema alur ini dengan
`npm.cmd run prisma:migrate:report-workflow` dari folder `backend`. Migrasi ini
menambahkan kolom dan nilai status tanpa menghapus kolom lama yang masih
menyimpan data.

## Prisma

Jalankan dari folder `backend`:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
```

Setelah memperbarui skema, terapkan perubahan tabel dengan
`npm.cmd run prisma:push` sebelum menjalankan fitur konseling. Perintah ini
menyesuaikan database yang terkonfigurasi dengan `schema.prisma`.

Gunakan `npm.cmd run prisma:setup` hanya saat perlu membuat database baru dan
mengimpor file ekspor data.

Backend memuat konfigurasi dari `backend/.env`, termasuk saat perintah
dijalankan dari folder lain. Halaman login dapat dibuka langsung melalui
`/login?role=mhs`, `/login?role=dosen`, `/login?role=admin`, atau
`/login?role=akademik`.

Setelah login Akademik, menu **Upload Absensi** menerima CSV/XLSX dengan kolom
`Mata_Kuliah`, `Kelas`, `NIM`, `Nama_Mahasiswa`, dan `Jumlah_Kehadiran`.
Baris dengan kombinasi mata kuliah, kelas, dan NIM yang sudah ada akan dilewati.
Menu **Pembagian Mahasiswa Bimbingan** menerima CSV/XLSX dengan kolom `NIM`
dan `NIP`; setiap impor mengganti pembagian dosen PA sebelumnya, dan mahasiswa
yang tidak tercantum akan menjadi tanpa dosen PA.

Untuk menyiapkan tabel penyimpanan absensi pada database yang dikonfigurasi,
jalankan `npm.cmd run prisma:push` dari folder `backend`.
