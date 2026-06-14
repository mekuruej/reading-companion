type TeacherAssignMessageBannerProps = {
  errorMsg?: string | null;
  successMsg?: string | null;
};

export function TeacherAssignMessageBanner({
  errorMsg,
  successMsg,
}: TeacherAssignMessageBannerProps) {
  return (
    <>
      {errorMsg ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(200,0,0,0.35)",
            background: "rgba(200,0,0,0.06)",
          }}
        >
          <b>Error:</b> {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(0,140,0,0.35)",
            background: "rgba(0,140,0,0.06)",
            whiteSpace: "pre-wrap",
          }}
        >
          {successMsg}
        </div>
      ) : null}
    </>
  );
}