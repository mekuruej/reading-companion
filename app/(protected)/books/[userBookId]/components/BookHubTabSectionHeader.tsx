type BookHubTabSectionHeaderProps = {
  title: string;
};

export default function BookHubTabSectionHeader({
  title,
}: BookHubTabSectionHeaderProps) {
  return (
    <div className="px-4 md:px-6">
      <div className="text-base font-semibold text-stone-900">{title}</div>
    </div>
  );
}