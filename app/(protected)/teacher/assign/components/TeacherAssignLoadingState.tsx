type TeacherAssignLoadingStateProps = {
  message?: string;
};

export function TeacherAssignLoadingState({
  message = "Loading…",
}: TeacherAssignLoadingStateProps) {
  return (
    <main style={{ padding: 24 }}>
      <p>{message}</p>
    </main>
  );
}