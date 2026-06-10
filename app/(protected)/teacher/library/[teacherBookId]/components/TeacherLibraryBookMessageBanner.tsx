type TeacherLibraryBookMessageBannerProps = {
  message: string;
};

export default function TeacherLibraryBookMessageBanner({
  message,
}: TeacherLibraryBookMessageBannerProps) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {message}
    </div>
  );
}