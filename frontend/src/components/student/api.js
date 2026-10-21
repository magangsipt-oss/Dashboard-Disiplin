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

  if (!response.ok) {
    throw new Error(data.message || "Permintaan gagal diproses.");
  }

  return data;
}

export function jsonRequest(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
