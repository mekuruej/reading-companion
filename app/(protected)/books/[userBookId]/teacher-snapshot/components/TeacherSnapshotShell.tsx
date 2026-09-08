type TeacherSnapshotShellProps = {
  children: React.ReactNode;
};

export default function TeacherSnapshotShell({ children }: TeacherSnapshotShellProps) {
  return (
    <main className="min-h-screen bg-stone-50 p-6 text-stone-900">
      <div className="mx-auto max-w-6xl space-y-5">
        {children}
      </div>
    </main>
  );
}
