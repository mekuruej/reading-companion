import { Suspense } from "react";
import VocabPageContent from "./VocabPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VocabPageContent />
    </Suspense>
  );
}
