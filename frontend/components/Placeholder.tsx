export default function Placeholder({
  title,
  subtitle,
  task,
}: {
  title: string;
  subtitle: string;
  task: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>
      <div className="card">
        <span className="chip chip-gold">Segera hadir</span>
        <p className="mt-3 text-muted">Isi halaman ini dibuat di {task}.</p>
      </div>
    </div>
  );
}
