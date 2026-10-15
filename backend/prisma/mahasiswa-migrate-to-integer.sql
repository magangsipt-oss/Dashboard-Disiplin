BEGIN;

LOCK TABLE public."Mahasiswa" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public."Mahasiswa"
  ADD COLUMN "id_new" SERIAL;

ALTER TABLE public."Mahasiswa"
  DROP CONSTRAINT "Mahasiswa_pkey";

ALTER TABLE public."Mahasiswa"
  DROP COLUMN "id";

ALTER TABLE public."Mahasiswa"
  RENAME COLUMN "id_new" TO "id";

ALTER TABLE public."Mahasiswa"
  ADD CONSTRAINT "Mahasiswa_pkey" PRIMARY KEY ("id");

ALTER TABLE public."Mahasiswa"
  ALTER COLUMN "NIM" TYPE INTEGER USING "NIM"::INTEGER;

ALTER TABLE public."Mahasiswa"
  ALTER COLUMN "Password" TYPE VARCHAR(255) USING "Password"::VARCHAR(255);

COMMIT;
