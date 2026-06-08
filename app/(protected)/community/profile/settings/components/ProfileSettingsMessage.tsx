type ProfileSettingsMessageProps = {
  type: "error" | "success";
  message: string;
};

export default function ProfileSettingsMessage({
  type,
  message,
}: ProfileSettingsMessageProps) {
  if (!message) return null;

  const className =
    type === "error"
      ? "text-sm text-red-600"
      : "text-sm text-emerald-700";

  return <p className={className}>{message}</p>;
}