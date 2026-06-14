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
  return (
    <>
      {actionMode === "add_to_library" ? (
        <select
          value={studentId}
          onChange={(event) => onStudentChange(event.target.value)}
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {labelProfile(profile)}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={prospectiveLearnerName}
            onChange={(event) =>
              onProspectiveLearnerNameChange(event.target.value)
            }
            placeholder="Future learner name"
            style={{
              border: "1px solid rgba(0,0,0,0.18)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          />
          <input
            value={prospectiveLearnerContact}
            onChange={(event) =>
              onProspectiveLearnerContactChange(event.target.value)
            }
            placeholder="Email or note, optional"
            style={{
              border: "1px solid rgba(0,0,0,0.18)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          />
        </div>
      )}

      <div style={{ opacity: 0.65, fontSize: 12 }}>
        {actionMode === "prep_future"
          ? "This keeps the prep item on your shelf only. You can connect it to a real learner later."
          : "This creates a visible row in the selected learner’s library."}
      </div>
    </>
  );
}