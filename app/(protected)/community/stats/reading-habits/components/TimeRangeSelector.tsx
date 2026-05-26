import SectionBand from "./SectionBand";

type TimeRangeOption<T extends string> = {
  value: T;
  title: string;
  description: string;
};

type TimeRangeOptionTheme = {
  activeButton: string;
  inactiveButton: string;
};

type TimeRangeSelectorProps<T extends string> = {
  filters: TimeRangeOption<T>[];
  timeRange: T;
  selectedTimeLabel: string;
  tone: string;
  getOptionTheme: (value: T) => TimeRangeOptionTheme;
  onSelectTimeRange: (value: T) => void;
};

export default function TimeRangeSelector<T extends string>({
  filters,
  timeRange,
  selectedTimeLabel,
  tone,
  getOptionTheme,
  onSelectTimeRange,
}: TimeRangeSelectorProps<T>) {
  return (
    <SectionBand
      eyebrow={`Time range — ${selectedTimeLabel}`}
      title={selectedTimeLabel}
      description="Choose the window for your reading rhythm. The stats below update to match this range."
      tone={tone}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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