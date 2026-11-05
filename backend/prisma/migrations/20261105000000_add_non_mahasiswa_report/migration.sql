-- Laporan terhadap staf atau pihak lain selain mahasiswa langsung diteruskan ke Kemahasiswaan.
ALTER TYPE "JalurLaporan" ADD VALUE IF NOT EXISTS 'NON_MAHASISWA';
