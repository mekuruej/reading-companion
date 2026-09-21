import type { ReactNode } from "react";
import StudyCardBadges from "@/components/study/StudyCardBadges";
import type { StudyCardTarget } from "@/lib/studyCardPresentation";

type AbilityCheckCardShellProps = {
  cardClassName: string;
  hasCard: boolean;
  modeTarget?: StudyCardTarget;
  jlpt?: string | null;
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
  modeTarget,
  jlpt,
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
        <StudyCardBadges
          modeLabel={gateLabel}
          modeTarget={modeTarget}
          jlpt={jlpt}
          colorDotClassName={colorDotClassName}
          colorName={colorName}
          showKatakanaBadge={showKatakanaBadge}
          definitionText={definitionText}
          definitionChipClassName={definitionChipClassName}
          readChipClassName={readChipClassName}
          encounterCount={encounterCount ?? 0}
        />
      ) : null}

      {children}
    </div>
  );
}
