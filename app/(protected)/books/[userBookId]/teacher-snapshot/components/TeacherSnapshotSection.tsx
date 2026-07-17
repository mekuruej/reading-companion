type TeacherSnapshotSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function TeacherSnapshotSection({
  title,
  description,
  children,
}: TeacherSnapshotSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-black text-stone-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
