type StudyErrorStateProps = {
  message: string;
};

export default function StudyErrorState({ message }: StudyErrorStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <p className="text-red-700">{message}</p>
    </main>
  );
}