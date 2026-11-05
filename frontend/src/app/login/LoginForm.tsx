"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { ArrowLeft, BookOpen, Eye, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";

export type LoginRole = "mhs" | "dosen" | "admin" | "akademik";

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
    identityLabel: "Email Dosen",
    identityPlaceholder: "Masukkan email Dosen",
  },
  admin: {
    label: "Admin Kemahasiswaan",
    identityLabel: "Email Kemahasiswaan",
    identityPlaceholder: "Masukkan email Kemahasiswaan",
  },
  akademik: {
    label: "Akademik",
    identityLabel: "Email Akademik",
    identityPlaceholder: "Masukkan email Akademik",
  },
};

// Reset sandi belum otomatis; arahkan ke pihak yang mengelola akun tiap peran.
const forgotPasswordContacts: Record<LoginRole, string> = {
  mhs: "bagian Akademik",
  dosen: "bagian Akademik",
  admin: "administrator sistem",
  akademik: "administrator sistem",
};

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-blue-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600";

// Kolom kata sandi dengan tombol mata yang selalu tampil (ikon bawaan Edge disembunyikan).
function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${inputClassName} pr-11 [&::-ms-reveal]:hidden`}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

async function readMessage(response: Response): Promise<string | null> {
  try {
    const data: unknown = await response.json();
    return typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
      ? data.message
      : null;
  } catch {
    return null;
  }
}

export default function LoginForm({ role }: { role: LoginRole }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "change-password">("login");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const details = roleDetails[role];

  function switchMode(nextMode: "login" | "change-password") {
    setMode(nextMode);
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
    setShowForgotHelp(false);
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi baru tidak sama.");
      return;
    }
    setIsChanging(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identity, password, newPassword }),
      });
      const message = await readMessage(response);
      if (!response.ok) {
        throw new Error(message ?? "Kata sandi gagal diubah. Coba kembali.");
      }
      switchMode("login");
      setNotice(message ?? "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.");
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Tidak dapat menghubungi layanan ubah kata sandi.",
      );
    } finally {
      setIsChanging(false);
    }
  }
  const RoleIcon =
    role === "dosen"
      ? GraduationCap
      : role === "akademik"
        ? BookOpen
        : ShieldCheck;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identity, password }),
      });
      const responseText = await response.text();
      let data: unknown = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : response.status >= 500
              ? "Layanan login sedang tidak tersedia. Pastikan backend berjalan, lalu coba kembali."
              : "Login gagal. Periksa identitas dan kata sandi.";
        throw new Error(message);
      }

      if (typeof data !== "object" || data === null || !("profile" in data)) {
        throw new Error(
          "Respons layanan login tidak valid. Pastikan backend berjalan, lalu coba kembali.",
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
      style={{ backgroundImage: "url(/portal-access-background.jpg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      <section className="relative z-10 w-full max-w-[380px] rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-6 shadow-xl backdrop-blur-sm sm:px-7 sm:py-7">
        <header className="mb-5 text-center">
          {role === "mhs" ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2.5 h-9 w-9 text-red-700"
            >
              <circle cx="12" cy="7" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2H5Z" />
            </svg>
          ) : (
            <RoleIcon
              aria-hidden="true"
              className={`mx-auto mb-2.5 h-9 w-9 ${
                role === "akademik" ? "text-red-800" : "text-orange-700"
              }`}
              strokeWidth={1.8}
            />
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {mode === "login" ? "Login" : "Ubah Kata Sandi"} {details.label}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {mode === "login"
              ? "Masukkan identitas dan kata sandi Anda"
              : "Masukkan kata sandi lama dan kata sandi baru Anda"}
          </p>
        </header>

        <form
          onSubmit={mode === "login" ? handleSubmit : handleChangePassword}
          className="space-y-3.5 text-left"
        >
          <div>
            <label
              htmlFor="identity"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              {details.identityLabel}
            </label>
            <input
              id="identity"
              type={role === "mhs" ? "text" : "email"}
              required
              autoComplete="username"
              placeholder={details.identityPlaceholder}
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              {mode === "login" ? "Kata Sandi" : "Kata Sandi Lama"}
            </label>
            <PasswordInput
              id="password"
              required
              autoComplete="current-password"
              placeholder={mode === "login" ? "Masukkan kata sandi" : "Masukkan kata sandi lama"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "login" && (
              <div className="mt-1.5 flex items-center justify-between text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => switchMode("change-password")}
                  className="text-red-800 hover:text-red-900 hover:underline"
                >
                  Ubah Kata Sandi
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotHelp((shown) => !shown)}
                  aria-expanded={showForgotHelp}
                  className="text-red-800 hover:text-red-900 hover:underline"
                >
                  Lupa Kata Sandi
                </button>
              </div>
            )}
          </div>

          {mode === "login" && showForgotHelp && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900" role="status">
              Hubungi {forgotPasswordContacts[role]} dengan menyebutkan {details.identityLabel.split(" (")[0]} Anda
              agar kata sandi direset. Setelah menerima kata sandi sementara, gunakan &quot;Ubah Kata Sandi&quot;
              untuk menggantinya.
            </p>
          )}

          {mode === "change-password" && (
            <>
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Kata Sandi Baru
                </label>
                <PasswordInput
                  id="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Konfirmasi Kata Sandi Baru
                </label>
                <PasswordInput
                  id="confirm-password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </>
          )}

          {notice && (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800"
              role="status"
            >
              {notice}
            </p>
          )}

          {error && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || isChanging}
            className="mt-1 w-full rounded-xl bg-gradient-to-r from-red-800 to-red-700 py-2.5 text-sm font-bold text-white shadow-md shadow-red-900/15 transition hover:from-red-900 hover:to-red-800 disabled:cursor-wait disabled:opacity-60"
          >
            {mode === "login"
              ? isLoggingIn ? "Memeriksa akun..." : "Masuk Dashboard"
              : isChanging ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
          </button>
        </form>

        {mode === "login" ? (
          <Link
            href="/"
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-800 to-red-700 py-2.5 text-sm font-bold text-white shadow-md shadow-red-900/15 transition hover:from-red-900 hover:to-red-800"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke Menu Utama
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-2.5 text-sm font-bold text-red-800 transition hover:bg-red-50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke Login
          </button>
        )}
      </section>
    </main>
  );
}
