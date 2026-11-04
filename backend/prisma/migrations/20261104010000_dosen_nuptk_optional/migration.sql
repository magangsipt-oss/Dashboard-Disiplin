-- NUPTK dosen boleh kosong (beberapa dosen ditambahkan tanpa NUPTK).
-- Di database utama kolom ini sudah nullable; migrasi ini menyamakan riwayat.

ALTER TABLE "Dosen" ALTER COLUMN "NUPTK" DROP NOT NULL;
