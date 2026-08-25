type CommonBookLanguageOption = {
  code: string;
  label: string;
};

type AddBookEditionLanguageConfirmationProps = {
  selectedCommonEditionLanguageCode: string;
  confirmedEditionLanguageCode: string;
  selectedEditionLanguageLabel: string | null;
  languageOptions: CommonBookLanguageOption[];
  onLanguageCodeChange: (value: string) => void;
};

export default function AddBookEditionLanguageConfirmation({
  selectedCommonEditionLanguageCode,
  confirmedEditionLanguageCode,
  selectedEditionLanguageLabel,
  languageOptions,
  onLanguageCodeChange,
}: AddBookEditionLanguageConfirmationProps) {
  return (
    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <label className="block text-sm font-black text-stone-900">
        What language is this edition?
      </label>

      <select
        value={selectedCommonEditionLanguageCode}
        onChange={(event) => onLanguageCodeChange(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
      >
        <option value="">Select edition language</option>
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        value={confirmedEditionLanguageCode}
        onChange={(event) => onLanguageCodeChange(event.target.value)}
        placeholder="Edition language code"
        className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
      />

      <p className="mt-2 text-xs leading-5 text-stone-600">
        {selectedEditionLanguageLabel
          ? `This will be saved as ${selectedEditionLanguageLabel}.`
          : "Language is saved as book metadata for this ISBN edition."}
      </p>
    </div>
  );
}
