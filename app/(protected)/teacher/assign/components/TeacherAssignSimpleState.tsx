type TeacherAssignSimpleStateProps = {
  message: string;
};

export function TeacherAssignSimpleState({
  message,
}: TeacherAssignSimpleStateProps) {
  return (
    <main style={{ padding: 24 }}>
      <p>{message}</p>
    </main>
  );
}