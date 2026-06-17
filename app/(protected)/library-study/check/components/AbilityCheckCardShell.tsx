import type { ReactNode } from "react";

type AbilityCheckCardShellProps = {
  cardClassName: string;
  hasCard: boolean;
  gateClassName?: string;
  gateLabel?: string;
  colorDotClassName?: string;
  colorName?: string;
  showKatakanaBadge?: boolean;
  definitionText?: string;
  definitionChipClassName?: string;
  readChipClassName?: string;
  encounterCount?: number;
  children: ReactNode;
};

export default function AbilityCheckCardShell({
  cardClassName,
  hasCard,
  gateClassName = "",
  gateLabel = "",
  colorDotClassName = "",
  colorName = "",
  showKatakanaBadge = false,
  definitionText = "",
  definitionChipClassName = "",
  readChipClassName = "",
  encounterCount,
  children,
}: AbilityCheckCardShellProps) {
  return (
    <div className={cardClassName}>
      {hasCard ? (
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4 sm:gap-3">
          <div className={gateClassName}>
            {gateLabel}
          </div>

          <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
            <div className="rounded-full border border-slate-100 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm sm:px-3 sm:py-1.5 sm:text-sm">
              <span
                className={`mr-1 inline-block h-2.5 w-2.5 rounded-full sm:mr-1.5 sm:h-5 sm:w-5 ${colorDotClassName}`}
              />
              {colorName}
            </div>

            {showKatakanaBadge ? (
              <span
                title="Katakana-only word"
                className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
              >
                カ
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
        {definitionText ? (
          <div className={definitionChipClassName}>
            {definitionText}
          </div>
        ) : null}
      </div>

      {hasCard ? (
        <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1.5 sm:bottom-4 sm:right-4 sm:gap-2">
          <div className={readChipClassName}>
            Saved {encounterCount}x
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
