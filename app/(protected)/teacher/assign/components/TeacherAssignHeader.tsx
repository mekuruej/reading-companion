import Link from "next/link";

type TeacherAssignHeaderProps = {
  isSuperTeacher: boolean;
};

export function TeacherAssignHeader({ isSuperTeacher }: TeacherAssignHeaderProps) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Add / Prep a Book</h1>
        <Link
          href="/teacher/students"
          style={{
            border: "1px solid rgba(0,0,0,0.18)",
            borderRadius: 12,
            padding: "8px 12px",
            textDecoration: "none",
            color: "#292524",
            background: "white",
            fontWeight: 750,
          }}
        >
          Back to My Students
        </Link>
      </div>

      <p style={{ marginTop: 8, color: "#57534e", lineHeight: 1.6 }}>
        Add a book directly to an existing learner’s library, or save a book on your
        prep shelf for someone who has not signed up yet.
        {isSuperTeacher
          ? " Super teachers can choose any learner profile."
          : " Regular teachers can choose linked students only."}
      </p>
    </>
  );
}