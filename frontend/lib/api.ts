// Alamat backend. Diatur di frontend/.env.local (lihat panduan). Awalan NEXT_PUBLIC_ wajib
// supaya nilainya terbaca di browser.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Pesan validasi dari backend berbahasa Inggris. Yang umum kita terjemahkan.
function toIndonesian(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email must be an email")) return "Format email belum benar.";
  if (m.includes("password must be longer") || m.includes("newpassword must be longer"))
    return "Kata sandi minimal 8 karakter.";
  if (m.includes("name must be longer")) return "Nama minimal 2 karakter.";
  return message;
}

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; token?: string | null };

export async function api<T>(path: string, { method = "GET", body, token }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Tidak bisa terhubung ke server. Periksa internetmu lalu coba lagi.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const raw = data?.message;
    const text = Array.isArray(raw) ? raw[0] : typeof raw === "string" ? raw : "Terjadi kesalahan. Coba lagi.";
    throw new ApiError(toIndonesian(text), res.status);
  }
  return data as T;
}
