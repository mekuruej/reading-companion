import Link from "next/link";

type DictionaryWordHistoryLinkProps = {
  word: string;
};

export default function DictionaryWordHistoryLink({
  word,
}: DictionaryWordHistoryLinkProps) {
  return (
    <div className="mt-4">
      <Link
        href={`/discovery/word-history?word=${encodeURIComponent(word)}`}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        View Word History →
      </Link>
    </div>
  );
}