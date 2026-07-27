import { redirect } from "next/navigation";

type VocabHistoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VocabHistoryPage({
  searchParams,
}: VocabHistoryPageProps) {
  const params = searchParams ? await searchParams : {};
  const wordParam = params.word;
  const word = Array.isArray(wordParam) ? wordParam[0] : wordParam;
  const query = word ? `?word=${encodeURIComponent(word)}` : "";

  redirect(`/discovery/dictionary${query}`);
}
