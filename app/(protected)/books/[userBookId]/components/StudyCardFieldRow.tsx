type StudyCardFieldRowProps = {
  label: string;
  value: string;
  visible: boolean;
  big?: boolean;
  placeholder?: string;
};

export default function StudyCardFieldRow({
  label,
  value,
  visible,
  big = false,
  placeholder = "—",
}: StudyCardFieldRowProps) {
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div
        className={[
          big
            ? "text-[2rem] font-bold sm:text-[2.3rem]"
            : "text-[1.25rem] sm:text-[1.45rem]",
          "transition-opacity duration-200",
          visible ? "text-slate-900 opacity-100" : "text-slate-300 opacity-70",
        ].join(" ")}
      >
        {visible ? value : placeholder}
      </div>
    </div>
  );
}