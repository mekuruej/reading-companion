type DestinationMode = "me" | "student" | "user" | "global";

type DestinationUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  level: string | null;
};

type AddBookDestinationPanelProps = {
  destinationMode: DestinationMode;
  destinationUserId: string;
  isTeacher: boolean;
  isSuperTeacher: boolean;
  studentOptions: DestinationUser[];
  userOptions: DestinationUser[];
  onDestinationModeChange: (mode: DestinationMode) => void;
  onDestinationUserChange: (userId: string) => void;
};

export default function AddBookDestinationPanel({
  destinationMode,
  destinationUserId,
  isTeacher,
  isSuperTeacher,
  studentOptions,
  userOptions,
  onDestinationModeChange,
  onDestinationUserChange,
}: AddBookDestinationPanelProps) {
  return (
    <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
        Destination
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
          <input
            type="radio"
            checked={destinationMode === "me"}
            onChange={() => onDestinationModeChange("me")}
          />
          My library
        </label>

        {isTeacher ? (
          <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="radio"
              checked={destinationMode === "student"}
              onChange={() => onDestinationModeChange("student")}
            />
            Linked student
          </label>
        ) : null}

        {isSuperTeacher ? (
          <>
            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
              <input
                type="radio"
                checked={destinationMode === "user"}
                onChange={() => onDestinationModeChange("user")}
              />
              Any user
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
              <input
                type="radio"
                checked={destinationMode === "global"}
                onChange={() => onDestinationModeChange("global")}
              />
              Global catalog only
            </label>
          </>
        ) : null}
      </div>

      {destinationMode === "student" ? (
        <select
          value={destinationUserId}
          onChange={(event) => onDestinationUserChange(event.target.value)}
          className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"
        >
          {studentOptions.length === 0 ? (
            <option value="">No active linked students</option>
          ) : null}

          {studentOptions.map((student) => (
            <option key={student.id} value={student.id}>
              {student.display_name || student.username || student.id}
              {student.level ? ` · ${student.level}` : ""}
            </option>
          ))}
        </select>
      ) : null}

      {destinationMode === "user" ? (
        <select
          value={destinationUserId}
          onChange={(event) => onDestinationUserChange(event.target.value)}
          className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"
        >
          {userOptions.length === 0 ? (
            <option value="">No users found</option>
          ) : null}

          {userOptions.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name || user.username || user.id}
              {user.level ? ` · ${user.level}` : ""}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}