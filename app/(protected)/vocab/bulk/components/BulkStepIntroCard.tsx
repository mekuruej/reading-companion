type BulkStepIntroCardProps = {
  title: string;
  description: string;
};

export default function BulkStepIntroCard({
  title,
  description,
}: BulkStepIntroCardProps) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-lg font-medium">{title}</div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}