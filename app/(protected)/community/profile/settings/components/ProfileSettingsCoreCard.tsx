import ProfileSettingsSectionLabel from "./ProfileSettingsSectionLabel";

type ProfileSettingsCoreCardProps = {
  displayName: string;
  username: string;
  nativeLanguageChoice: string;
  customNativeLanguage: string;
  japaneseLearningEnabled: boolean;
  nativeLanguageOptions: readonly string[];
  nativeLanguageOther: string;
  onDisplayNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onNativeLanguageChoiceChange: (value: string) => void;
  onCustomNativeLanguageChange: (value: string) => void;
  onJapaneseLearningEnabledChange: (value: boolean) => void;
};

export default function ProfileSettingsCoreCard({
  displayName,
  username,
  nativeLanguageChoice,
  customNativeLanguage,
  japaneseLearningEnabled,
  nativeLanguageOptions,
  nativeLanguageOther,
  onDisplayNameChange,
  onUsernameChange,
  onNativeLanguageChoiceChange,
  onCustomNativeLanguageChange,
  onJapaneseLearningEnabledChange,
}: ProfileSettingsCoreCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <ProfileSettingsSectionLabel
        eyebrow="Account basics"
        title="Core profile"
        detail="These details keep your account, Library link, and reading setup working smoothly."
      />

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-stone-800">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Devon"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="devon"
          />
          <p className="mt-1 text-xs text-stone-500">
            Lowercase letters, numbers, and underscores only. Your Library link uses this name.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800">
            Native language
          </label>
          <select
            value={nativeLanguageChoice}
            onChange={(e) => onNativeLanguageChoiceChange(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="">Choose a language</option>
            {nativeLanguageOptions.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
            <option value={nativeLanguageOther}>Other</option>
          </select>

          {nativeLanguageChoice === nativeLanguageOther ? (
            <input
              value={customNativeLanguage}
              onChange={(e) => onCustomNativeLanguageChange(e.target.value)}
              className="mt-2 w-full rounded-xl border px-3 py-2"
              placeholder="Type your language"
            />
          ) : null}

          <p className="mt-1 text-xs text-stone-500">
            One primary language for now. You can use Other for bilingual or less common answers.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800">
            Japanese Study Tools
          </label>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onJapaneseLearningEnabledChange(true)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                japaneseLearningEnabled
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
              }`}
            >
              <span className="block text-sm font-black">On</span>
              <span className="mt-1 block text-xs opacity-80">
                Show the Study area with the free, foundational flashcards.
              </span>
            </button>
            <button
              type="button"
              onClick={() => onJapaneseLearningEnabledChange(false)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                !japaneseLearningEnabled
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
              }`}
            >
              <span className="block text-sm font-black">Off</span>
              <span className="mt-1 block text-xs opacity-80">
                I don’t need Japanese study tools.
              </span>
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Paid Japanese Learning features are separate.
          </p>
        </div>
      </div>
    </div>
  );
}
