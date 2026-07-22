// Listening Timer
//

import SimpleTimedSessionPage from "../_shared/timed-session/SimpleTimedSessionPage";

export default function ListeningPage() {
  return (
    <SimpleTimedSessionPage
      sessionMode="listening"
      eyebrow="Listening"
      title="Listening Timer"
      subtitle="Timer-only listening"
      description="Listen to this book or audiobook without word capture. Let the timer keep you company and log your listening time."
      saveSuccessMessage="Your listening session has been saved in the Reading Tab."
      startLocationLabel="Start page optional"
      endLocationLabel="End page optional"
      sessionLocationNote="Page numbers are optional. If you leave them blank, only the time will be saved. Pace stats can only be generated with page numbers."
    />
  );
}
