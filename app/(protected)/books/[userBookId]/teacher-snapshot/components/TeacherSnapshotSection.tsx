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
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-black text-stone-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
