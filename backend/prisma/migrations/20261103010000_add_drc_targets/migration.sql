-- Target peserta kegiatan DRC per prodi dan angkatan.
-- Array kosong berarti semua, sehingga kegiatan lama tetap untuk seluruh mahasiswa.

ALTER TABLE "KegiatanDrc"
    ADD COLUMN "targetProdi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "targetAngkatan" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
