import type { ComponentProps } from "react";
import BookCategoryFilterSelector from "./BookCategoryFilterSelector";
import SectionBand from "./SectionBand";

type VocabularyCategoryPanelProps = {
  selectedFilterLabel: string;
  tone: string;
  filters: ComponentProps<typeof BookCategoryFilterSelector>["filters"];
  value: ComponentProps<typeof BookCategoryFilterSelector>["value"];
  onChange: ComponentProps<typeof BookCategoryFilterSelector>["onChange"];
  bookCount: number;
};

export default function VocabularyCategoryPanel({
  selectedFilterLabel,
  tone,
  filters,
  value,
  onChange,
  bookCount,
}: VocabularyCategoryPanelProps) {
  return (
    <SectionBand
      eyebrow={`Book category — ${selectedFilterLabel}`}
      title={selectedFilterLabel}
      description="Choose a broad kind of reading material. This changes the vocabulary totals, charts, study rhythm, and book examples below."
      tone={tone}
    >
      <BookCategoryFilterSelector filters={filters} value={value} onChange={onChange} />

      <p className="mt-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{bookCount}</span>{" "}
        book{bookCount === 1 ? "" : "s"} with vocabulary data included in this category.
      </p>
    </SectionBand>
  );
}