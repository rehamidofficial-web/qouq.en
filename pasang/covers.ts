// Sampul profil bawaan dan cara menampilkannya.
// Sampul bawaan: nomor 1..6 disimpan di server sebagai "tpl:N".
export const COVERS: { id: string; label: string; css: string }[] = [
  { id: "tpl:1", label: "Menara jam dan sakura", css: "center/cover url(/images/london.jpg)" },
  { id: "tpl:2", label: "Pohon dan bangku", css: "center/cover url(/images/tree.jpg)" },
  { id: "tpl:3", label: "Gradasi sakura", css: "linear-gradient(135deg,#f9e3e7,#f2cbd3 55%,#e8b6c2)" },
  { id: "tpl:4", label: "Hutan dan emas", css: "linear-gradient(135deg,#14392b,#2f6a4f 55%,#e6c97f)" },
  { id: "tpl:5", label: "Fajar", css: "linear-gradient(135deg,#f1dd9c,#dc8a45 60%,#c9672b)" },
  { id: "tpl:6", label: "Toska embun", css: "linear-gradient(135deg,#d2ece8,#a9d8d3 60%,#7fc3bc)" },
];

export function coverCss(value: string | null | undefined) {
  if (!value) return COVERS[2].css;
  if (value.startsWith("data:")) return `center/cover url(${value})`;
  return (COVERS.find((c) => c.id === value) ?? COVERS[2]).css;
}

