import { TeacherAlertList } from "./TeacherAlertList";
import { TeacherAlertPanel } from "./TeacherAlertPanel";

type TeacherAlertSummary = {
  title: string;
  href?: string;
  count: number;
  description: string;
  placeholder?: boolean;
};

type TeacherHubTodaySectionProps = {
  alertsLoading: boolean;
  isSuperTeacher: boolean;
  learnerAlerts: TeacherAlertSummary[];
  upkeepAlerts: TeacherAlertSummary[];
};

export function TeacherHubTodaySection({
  alertsLoading,
  isSuperTeacher,
  learnerAlerts,
  upkeepAlerts,
}: TeacherHubTodaySectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-black text-stone-900">Today</h2>
        <p className="mt-1 text-sm text-stone-500">
          Future alerts should answer two questions: what do my learners need, and what does the app need from me?
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeacherAlertPanel
          eyebrow="Learner / Lesson Alerts"
          title="What do I need to do for my learners?"
        >
          <p className="mt-2 text-sm leading-6 text-stone-600">
            After each lesson, remember to add new words, notes, or prep items while they are still fresh.
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Upcoming lessons, assignment follow-up, and prep reminders can be added here later.
          </p>

          {alertsLoading ? (
            <p className="mt-4 text-sm text-stone-500">
              Loading learner alerts...
            </p>
          ) : (
            <TeacherAlertList
              alerts={learnerAlerts}
              emptyText="No learner alerts are shown right now."
            />
          )}
        </TeacherAlertPanel>

        <TeacherAlertPanel
          eyebrow="App / Upkeep Alerts"
          title="What does the app or global data need from me?"
        >
          {alertsLoading ? (
            <p className="mt-4 text-sm text-stone-500">
              Loading upkeep alerts...
            </p>
          ) : isSuperTeacher ? (
            <TeacherAlertList
              alerts={upkeepAlerts}
              emptyText="No app upkeep alerts are waiting right now."
            />
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-600">
              No app upkeep alerts are shown for your role right now. Learner and lesson follow-up will stay separate from global maintenance work.
            </p>
          )}
        </TeacherAlertPanel>
      </div>
    </section>
  );
}
