type TeacherSnapshotShellProps = {
  children: React.ReactNode;
};

export default function TeacherSnapshotShell({ children }: TeacherSnapshotShellProps) {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        {children}
      </div>
    </main>
  );
}
