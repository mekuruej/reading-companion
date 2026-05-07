// Fluid Reading - Just Reading
//

import SimpleTimedSessionPage from "../components/SimpleTimedSessionPage";

export default function JustReadingPage() {
    return (
        <SimpleTimedSessionPage
            sessionMode="fluid"
            eyebrow="Fluid Reading"
            title="Extensive · Just Reading"
            subtitle="Timer-only fluid reading"
            description="Read without saved-word support or new lookups. Let the timer keep you company and stay with the story."
            saveSuccessMessage="Your fluid reading session has been saved in the Reading Tab."
        />
    );
}