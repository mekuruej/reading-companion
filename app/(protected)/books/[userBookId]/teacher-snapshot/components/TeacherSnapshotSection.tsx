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
    <section className="space-y-3">
      <div className="mb-3">
        <h2 className="text-lg font-black text-stone-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
