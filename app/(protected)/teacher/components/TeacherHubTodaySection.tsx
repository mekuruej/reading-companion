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
        <h2 className="text-lg font-black text-stone-900">Student Alerts</h2>
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
            <TeacherAlertList
              alerts={alerts.filter((alert) => !alert.placeholder && alert.count > 0)}
              emptyText="No teacher alerts are waiting right now."
            />
          </>
        )}
      </TeacherAlertPanel>
    </section>
  );
}
