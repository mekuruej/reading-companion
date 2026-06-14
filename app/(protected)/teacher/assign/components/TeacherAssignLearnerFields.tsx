type TeacherAssignActionMode = "add_to_library" | "prep_future";

type TeacherAssignProfileOption = {
  id: string;
  display_name: string | null;
  level: string | null;
  is_public: boolean | null;
  created_at: string | null;
  role?: string | null;
  is_super_teacher?: boolean | null;
};

type TeacherAssignLearnerFieldsProps = {
  actionMode: TeacherAssignActionMode;
  studentId: string;
  profiles: TeacherAssignProfileOption[];
  prospectiveLearnerName: string;
  prospectiveLearnerContact: string;
  labelProfile: (profile: TeacherAssignProfileOption) => string;
  onStudentChange: (id: string) => void;
  onProspectiveLearnerNameChange: (value: string) => void;
  onProspectiveLearnerContactChange: (value: string) => void;
};

export function TeacherAssignLearnerFields({
  actionMode,
  studentId,
  profiles,
  prospectiveLearnerName,
  prospectiveLearnerContact,
  labelProfile,
  onStudentChange,
  onProspectiveLearnerNameChange,
  onProspectiveLearnerContactChange,
}: TeacherAssignLearnerFieldsProps) {
  if (actionMode === "add_to_library") {
    return (
      <>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Learner</span>
          <select
            value={studentId}
            onChange={(event) => onStudentChange(event.target.value)}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "white",
            }}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {labelProfile(profile)}
              </option>
            ))}
          </select>
        </label>

        <div style={{ color: "#57534e", fontSize: 13, lineHeight: 1.5 }}>
          This will add the selected book directly to the learner’s library.
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Future learner name</span>
          <input
            value={prospectiveLearnerName}
            onChange={(event) =>
              onProspectiveLearnerNameChange(event.target.value)
            }
            placeholder="Example: Trial student, Mina, Book club group..."
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "white",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Contact / note</span>
          <input
            value={prospectiveLearnerContact}
            onChange={(event) =>
              onProspectiveLearnerContactChange(event.target.value)
            }
            placeholder="Email, note, class, or reminder"
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "white",
            }}
          />
        </label>
      </div>

      <div style={{ color: "#57534e", fontSize: 13, lineHeight: 1.5 }}>
        This saves a teacher-only prep shelf item. It does not create anything in a
        learner’s library yet.
      </div>
    </>
  );
}