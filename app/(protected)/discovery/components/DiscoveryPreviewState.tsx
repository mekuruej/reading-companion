type DiscoveryPreviewStateProps = {
  type: "loading" | "empty";
};

export default function DiscoveryPreviewState({
  type,
}: DiscoveryPreviewStateProps) {
  if (type === "loading") {
    return (
      <p className="text-sm text-slate-500">
        Loading rated books...
      </p>
    );
  }

  return (
    <p className="text-sm leading-6 text-slate-500">
      No shared book ratings match these filters yet.
    </p>
  );
}