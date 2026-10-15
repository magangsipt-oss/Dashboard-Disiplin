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
Di dalamnya terdapat tiga tabel:

- `Mahasiswa`: `id`, `NIM`, `Nama`, `Password`, `Jurusan`, `timestamp`.
- `Dosen`: `id`, `NIDN`, `NIP`, `Nama`, `Password`, `timestamp`.
- `Kemahasiswaan`: `id`, `NIP`, `Nama`, `Password`, `timestamp`.

Atur `DATABASE_URL` pada `backend/.env` agar menunjuk ke database tersebut.
Contoh format URL:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dashboard_disiplin?schema=public"
```

URL ini menggunakan username/password PostgreSQL lokal Anda. Jangan commit
`backend/.env` atau membagikan kredensialnya.
Pengguna PostgreSQL pada URL perlu memiliki izin `CREATEDB` agar perintah
setup dapat membuat database secara otomatis.

### Memindahkan data dari tiga database lama

Database sumber `Mahasiswa`, `Dosen`, dan `Kemahasiswaan` tidak dihapus oleh
langkah ini. Sebelum memindahkan data, pastikan tiga variabel URL sumber masih
ada di `backend/.env` dan masing-masing menunjuk ke database lama yang sesuai:
`MAHASISWA_DATABASE_URL`, `DOSEN_DATABASE_URL`, dan
`KEMAHASISWAAN_DATABASE_URL`.

Di komputer yang masih dapat mengakses database lama, jalankan dari folder
`backend`:

```powershell
npm.cmd install
npm.cmd run prisma:data:export
```

Perintah ini mengekspor semua baris dari tiga tabel lama ke
`backend/prisma/database-data.json`. File ini berisi informasi pribadi
termasuk password. Simpan dan pindahkan hanya melalui kanal privat yang aman;
jangan commit atau mengirimnya ke kanal publik. File tersebut sudah
dikecualikan dari Git.

Atur `DATABASE_URL` agar menunjuk ke database tujuan `dashboard_disiplin`.
Di komputer tujuan, pindahkan file ekspor ke folder `backend/prisma/`, lalu
jalankan:

```powershell
npm.cmd install
npm.cmd run prisma:setup
```

Perintah setup akan membuat database `dashboard_disiplin` jika belum ada,
menerapkan satu skema Prisma yang berisi ketiga tabel, lalu mengimpor data.
Database sumber tidak dihapus. Jika baris bentrok dengan primary key atau
unique key yang sudah ada di tujuan, baris itu dilewati; data yang ada tidak
ditimpa.

Untuk komputer baru yang belum punya database sumber, cukup atur
`DATABASE_URL`, siapkan file ekspor dari komputer sumber, lalu jalankan
`npm.cmd run prisma:setup`.

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
sampai tabel dan API untuk data tersebut dibuat.

## Prisma

Jalankan dari folder `backend`:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
```

Gunakan `npm.cmd run prisma:setup` hanya saat perlu membuat database baru dan
mengimpor file ekspor data.
