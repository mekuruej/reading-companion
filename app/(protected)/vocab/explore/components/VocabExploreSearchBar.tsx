type VocabExploreSearchBarProps = {
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
};

export default function VocabExploreSearchBar({
  query,
  loading,
  onQueryChange,
  onSearch,
}: VocabExploreSearchBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSearch();
          }
        }}
        placeholder="Search Japanese word..."
        className="flex-1 rounded border bg-white px-3 py-2"
      />

      <button
        type="button"
        onClick={onSearch}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Searching..." : "Search"}
      </button>
    </div>
  );
}