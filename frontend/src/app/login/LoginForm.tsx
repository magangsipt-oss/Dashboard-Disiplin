"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";

export type LoginRole = "mhs" | "dosen" | "admin";

const roleDetails: Record<
  LoginRole,
  { label: string; identityLabel: string; identityPlaceholder: string }
> = {
  mhs: {
    label: "Mahasiswa",
    identityLabel: "NIM (Nomor Induk Mahasiswa)",
    identityPlaceholder: "Masukkan NIM Anda",
  },
  dosen: {
    label: "Dosen PA",
    identityLabel: "NIP atau NIDN",
    identityPlaceholder: "Masukkan nomor identitas",
  },
  admin: {
    label: "Admin Kemahasiswaan",
    identityLabel: "NIP Kemahasiswaan",
    identityPlaceholder: "Masukkan nomor identitas",
  },
};

export default function LoginForm({ role }: { role: LoginRole }) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const details = roleDetails[role];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identity, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Login gagal. Periksa identitas dan kata sandi.",
        );
      }

      router.replace("/");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Tidak dapat menghubungi layanan login.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center p-4 font-sans"
      style={{ backgroundImage: "url(/campus.svg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />

      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white/95 px-7 py-10 shadow-sm sm:px-11 sm:py-12">
          <header className="mb-10 text-center">
            <GraduationCap
              aria-hidden="true"
              className="mx-auto mb-5 h-14 w-14 text-orange-700"
              strokeWidth={1.8}
            />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Login {details.label}
            </h1>
            <p className="mt-8 text-base text-slate-500 sm:text-lg">
              Masukkan identitas dan kata sandi Anda
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8 text-left">
            <div>
              <label
                htmlFor="identity"
                className="mb-3 block text-base font-bold text-slate-800"
              >
                {details.identityLabel}
              </label>
              <input
                id="identity"
                type="text"
                required
                autoComplete="username"
                placeholder={details.identityPlaceholder}
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-blue-50 px-5 py-5 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-3 block text-base font-bold text-slate-800"
              >
                Kata Sandi
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-blue-50 px-5 py-5 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>

            {error && (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-red-800 to-red-700 py-4 text-base font-bold text-white shadow-lg shadow-red-900/15 transition hover:from-red-900 hover:to-red-800 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoggingIn ? "Memeriksa akun..." : "Masuk Dashboard"}
            </button>
          </form>

          <a
            href="/"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-800 to-red-700 py-4 text-base font-bold text-white shadow-lg shadow-red-900/15 transition hover:from-red-900 hover:to-red-800"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke Menu Utama
          </a>
      </section>
    </main>
  );
}
