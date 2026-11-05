export async function studentApi(path, options = {}) {
  const response = await globalThis.fetch(path, options);
  const body = await response.text();
  let data = {};

  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error("Respons layanan tidak dapat dibaca. Silakan coba kembali.");
    }
  }

  if (response.status === 401 && typeof window !== "undefined") {
    // Sesi habis: muat ulang penuh ke login agar semua state lama ikut dibuang.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  if (!response.ok) {
    throw new Error(data.message || "Permintaan gagal diproses.");
  }

  return data;
}

// Unduh file dari API (mis. ekspor Excel/CSV). Lewat fetch, bukan tautan biasa,
// agar pesan galat dari server tampil sebagai pesan, bukan file rusak.
export async function downloadFile(path) {
  const response = await globalThis.fetch(path);

  if (response.status === 401 && typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  if (!response.ok) {
    let message = "Unduhan gagal diproses.";
    try {
      message = (await response.json()).message || message;
    } catch {
      // Respons galat bukan JSON; pakai pesan umum.
    }
    throw new Error(message);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "unduhan";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function jsonRequest(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// Hanya izinkan tautan http/https atau path bukti internal; lainnya dibuat mati.
export function safeHref(value) {
  if (typeof value !== "string") return undefined;
  if (/^\/uploads\/evidence\/[a-f0-9]+\.(jpg|png)$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
