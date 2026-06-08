import ProfileShell from "@/components/profile/ProfileShell";

type ProfileSettingsLoadingStateProps = {
  title: string;
  description: string;
  message: string;
};

export default function ProfileSettingsLoadingState({
  title,
  description,
  message,
}: ProfileSettingsLoadingStateProps) {
  return (
    <ProfileShell title={title} description={description}>
      <div className="mx-auto w-full max-w-4xl rounded-xl border bg-white p-6 text-center shadow-sm">
        <p className="text-stone-600">{message}</p>
      </div>
    </ProfileShell>
  );
}