import ReadAlongPageNavigator from "../../../../../books/[userBookId]/_shared/readalong/ReadAlongPageNavigator";

type TeacherFollowAlongReaderHeaderProps = {
  titleLabel?: string;
  title?: string;
  pageIndex: number;
  pageCount: number;
  jumpPageInput: string;
  currentPageLabel: string;
  currentPageItemCount: number | null;
  onJumpPageInputChange: (value: string) => void;
  onJumpToPage: (pageNumber: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function TeacherFollowAlongReaderHeader({
  titleLabel = "Teacher Vocabulary",
  title = "Private Lesson Support",
  pageIndex,
  pageCount,
  jumpPageInput,
  currentPageLabel,
  currentPageItemCount,
  onJumpPageInputChange,
  onJumpToPage,
  onPrevious,
  onNext,
}: TeacherFollowAlongReaderHeaderProps) {
  return (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          {titleLabel}
        </p>
        <h3 className="mt-1 text-xl font-black text-stone-950">
          {title}
        </h3>
      </div>

      <ReadAlongPageNavigator
        pageIndex={pageIndex}
        pageCount={pageCount}
        jumpPageInput={jumpPageInput}
        onJumpPageInputChange={onJumpPageInputChange}
        onJumpToPage={onJumpToPage}
        onPrevious={onPrevious}
        onNext={onNext}
      />

      <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3 sm:items-center sm:text-left">
        <div className="order-2 text-sm text-stone-500 sm:order-1">
          {currentPageItemCount != null
            ? `${currentPageItemCount} ready item${
                currentPageItemCount === 1 ? "" : "s"
              }`
            : "No ready words yet"}
        </div>

        <div className="order-1 text-xl font-bold text-stone-900 sm:order-2 sm:text-center">
          {currentPageLabel}
        </div>

        <div className="order-3 text-sm text-stone-500 sm:text-right">
          Tap items to follow along.
        </div>
      </div>
    </>
  );
}
