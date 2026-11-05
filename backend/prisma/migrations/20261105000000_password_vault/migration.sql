-- Salinan password terenkripsi (AES-256-GCM) agar Kemahasiswaan dapat melihat
-- password pengguna. Kunci ada di PASSWORD_VAULT_KEY (.env), bukan di database.
ALTER TABLE "Mahasiswa" ADD COLUMN "Password_Terenkripsi" VARCHAR(512);
ALTER TABLE "Dosen" ADD COLUMN "Password_Terenkripsi" VARCHAR(512);
ALTER TABLE "Kemahasiswaan" ADD COLUMN "Password_Terenkripsi" VARCHAR(512);
ALTER TABLE "Akademik" ADD COLUMN "Password_Terenkripsi" VARCHAR(512);
