type AbilityCheckPageHeaderProps = {
  title?: string;
};

export default function AbilityCheckPageHeader({
  title = "Ability Check",
}: AbilityCheckPageHeaderProps) {
  return (
    <div className="mb-3 flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </div>
  );
}