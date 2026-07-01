type CuriosityPageHeaderProps = {
  title?: string;
  description?: string;
};

export default function CuriosityPageHeader({
  title = "Curiosity Reading",
  description = "Use this for a slower, exploratory reading experience. This is where you stop, investigate, save new words, and let lookup time count as part of the reading session.",
}: CuriosityPageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">
        {title}
      </h1>

      <p className="mt-1 hidden text-sm text-stone-600 sm:block">
        {description}
      </p>
    </div>
  );
}
