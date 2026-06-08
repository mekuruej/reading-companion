type DictionaryHeaderProps = {
  title: string;
  description: string;
};

export default function DictionaryHeader({
  title,
  description,
}: DictionaryHeaderProps) {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
      <p className="mb-4 text-sm text-stone-500">{description}</p>
    </>
  );
}