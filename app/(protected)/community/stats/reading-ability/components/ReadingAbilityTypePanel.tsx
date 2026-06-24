import BarStrip from "./BarStrip";
import SectionBand from "./SectionBand";

type AbilityTypeMetric = {
  bookType: string;
  pagesRead: number;
  averageMinutesPerPage: number | null;
};

type ReadingAbilityTypePanelProps = {
  selectedFilterLabel: string;
  tone: string;
  rows: AbilityTypeMetric[];
  formatDecimal: (value: number | null, digits?: number) => string;
};

export default function ReadingAbilityTypePanel({
  selectedFilterLabel,
  tone,
  rows,
  formatDecimal,
}: ReadingAbilityTypePanelProps) {
  return (
    <SectionBand
      eyebrow={`Book type — ${selectedFilterLabel}`}
      title="Ability by book type"
      description="This groups your reading by book category and compares page movement and timed reading pace."
      tone={tone}
    >
      <div className="space-y-5">
        <BarStrip
          items={rows.map((item) => ({
            label: item.bookType,
            value: item.pagesRead,
          }))}
          colorClass="bg-indigo-500"
          valueSuffix=" pages"
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Pages</th>
                <th className="px-3 py-2">Min/page</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((item) => (
                <tr key={item.bookType}>
                  <td className="px-3 py-2 font-medium text-slate-900">{item.bookType}</td>
                  <td className="px-3 py-2 text-slate-700">{item.pagesRead}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {formatDecimal(item.averageMinutesPerPage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionBand>
  );
}