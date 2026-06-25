import { TeacherAlertList } from "./TeacherAlertList";
import { TeacherAlertPanel } from "./TeacherAlertPanel";

type TeacherAlertSummary = {
  title: string;
  href?: string;
  count: number;
  description: string;
  badgeLabel?: string;
  hasToday?: boolean;
  placeholder?: boolean;
  sortDate?: string | null;
};

type TeacherHubTodaySectionProps = {
  alertsLoading: boolean;
  isSuperTeacher: boolean;
  alerts: TeacherAlertSummary[];
};

export function TeacherHubTodaySection({
  alertsLoading,
  isSuperTeacher,
  alerts,
}: TeacherHubTodaySectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-black text-stone-900">Today</h2>
        <p className="mt-1 text-sm text-stone-500">
          Alerts show the kind of work waiting and how many items need attention.
        </p>
      </div>

      <TeacherAlertPanel
        eyebrow="Alerts"
        title="What needs attention?"
      >
        {alertsLoading ? (
          <p className="mt-4 text-sm text-stone-500">
            Loading teacher alerts...
          </p>
        ) : (
          <>
            {!isSuperTeacher ? (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Site upkeep alerts are only shown for super teachers. Student-facing follow-up stays here when it is available.
              </p>
            ) : null}

            <TeacherAlertList
              alerts={alerts}
              emptyText="No teacher alerts are waiting right now."
            />
          </>
        )}
      </TeacherAlertPanel>
    </section>
  );
}
