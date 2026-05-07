// Curiosity Reading
//

import { redirect } from "next/navigation";

type CuriosityReadingPageProps = {
  params: Promise<{
    userBookId: string;
  }>;
};

export default async function CuriosityReadingPage({
  params,
}: CuriosityReadingPageProps) {
  const { userBookId } = await params;

  redirect(`/vocab/single-add?userBookId=${encodeURIComponent(userBookId)}`);
}