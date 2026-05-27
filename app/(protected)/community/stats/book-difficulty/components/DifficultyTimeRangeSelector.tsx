// TODO: Consider moving this to a shared stats component if more stats pages use the same time range selector pattern.

import SectionBand from "./SectionBand";

type DifficultyTimeRange =
  | "all_time"
  | "this_month"
  | "past_90_days"
  | "past_6_months"
  | "past_year";

type DifficultyTimeRangeOption = {
  value: DifficultyTimeRange;
  title: string;
  description: string;
};

type DifficultyTimeRangeOptionTheme = {
  activeButton: string;
  inactiveButton: string;
};

type DifficultyTimeRangeSelectorProps = {
  filters: DifficultyTimeRangeOption[];
  timeRange: DifficultyTimeRange;
  selectedTimeLabel: string;
  tone: string;
  getOptionTheme: (value: DifficultyTimeRange) => DifficultyTimeRangeOptionTheme;
  onSelectTimeRange: (value: DifficultyTimeRange) => void;
};

export default function DifficultyTimeRangeSelector({
  filters,
  timeRange,
  selectedTimeLabel,
  tone,
  getOptionTheme,
  onSelectTimeRange,
}: DifficultyTimeRangeSelectorProps) {
  return (
    <SectionBand
      eyebrow={`Time range — ${selectedTimeLabel}`}
      title={selectedTimeLabel}
      description="Choose the reader-fit window. Time ranges use a book’s finished date when available, then DNF, started, or added date."
      tone={tone}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {filters.map((option) => {
          const selected = timeRange === option.value;
          const optionTheme = getOptionTheme(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectTimeRange(option.value)}
              className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                selected ? optionTheme.activeButton : optionTheme.inactiveButton
              }`}
            >
              <div className="text-sm font-black">{option.title}</div>
              <div
                className={`mt-0.5 text-xs leading-4 ${
                  selected ? "text-white/85" : ""
                }`}
              >
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </SectionBand>
  );
}