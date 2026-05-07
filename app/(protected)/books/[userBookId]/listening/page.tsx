// Listening Session
//

import SimpleTimedSessionPage from "../components/SimpleTimedSessionPage";

export default function ListeningPage() {
  return (
    <SimpleTimedSessionPage
      sessionMode="listening"
      eyebrow="Listening"
      title="Listening"
      subtitle="Timer-only listening session"
      description="Listen to the book or audiobook and log your listening time. Page numbers are optional, so you can simply track time if that fits the session better."
      saveSuccessMessage="Your listening session has been saved in the Reading Tab."
    />
  );
}