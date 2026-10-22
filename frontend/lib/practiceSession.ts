// Satu sesi latihan dipakai ulang untuk beberapa kalimat dalam kategori yang sama
// (selama masih kurang dari 2 jam), supaya riwayat latihan rapi.
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const key = (categoryId: string) => `qouq-sesi-${categoryId}`;

export function readSession(categoryId: string): string | null {
  try {
    const raw = sessionStorage.getItem(key(categoryId));
    if (!raw) return null;
    const v = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof v.id === "string" && typeof v.at === "number" && Date.now() - v.at < MAX_AGE_MS) return v.id;
  } catch {
    /* diabaikan: penyimpanan diblokir atau isinya rusak */
  }
  return null;
}

export function saveSession(categoryId: string, id: string) {
  try {
    sessionStorage.setItem(key(categoryId), JSON.stringify({ id, at: Date.now() }));
  } catch {
    /* diabaikan */
  }
}

export function forgetSession(categoryId: string) {
  try {
    sessionStorage.removeItem(key(categoryId));
  } catch {
    /* diabaikan */
  }
}
