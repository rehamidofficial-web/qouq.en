// Memperkecil foto di browser sebelum dikirim, supaya ringan (foto profil ±30 KB, sampul ±90 KB).
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export async function resizeImage(file: File, width: number, height: number, quality = 0.8): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Pilih foto JPG atau PNG.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran foto maksimal 2 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa memproses foto.");
  // Potong dari tengah supaya memenuhi bingkai (seperti object-fit: cover)
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
