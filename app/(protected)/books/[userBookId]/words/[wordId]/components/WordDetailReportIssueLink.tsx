type WordDetailReportIssueLinkProps = {
  onReportIssue: () => void;
};

export default function WordDetailReportIssueLink({
  onReportIssue,
}: WordDetailReportIssueLinkProps) {
  return (
    <div className="mt-4">
      <button
        onClick={onReportIssue}
        className="text-xs text-gray-500 underline hover:text-gray-700"
      >
        Something seems off?
      </button>
    </div>
  );
}