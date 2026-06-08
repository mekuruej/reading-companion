import { PROFILE_LEVEL_OPTIONS } from "@/lib/profileLevels";
import FavoriteGenreEditor from "./FavoriteGenreEditor";
import ProfileSettingsSectionLabel from "./ProfileSettingsSectionLabel";

type PublicNameChoice = "display_name" | "username";

type ProfileLevelOption = (typeof PROFILE_LEVEL_OPTIONS)[number];

type ProfileSettingsPublicCardProps = {
  publicNameChoice: PublicNameChoice;
  displayName: string;
  username: string;
  chosenPublicName: string;
  publicLevel: string;
  favoriteGenres: string[];
  favoriteGenreInput: string;
  bio: string;
  profileLevelOptions: readonly ProfileLevelOption[];
  onPublicNameChoiceChange: (value: PublicNameChoice) => void;
  onPublicLevelChange: (value: string) => void;
  onFavoriteGenreInputChange: (value: string) => void;
  onAddFavoriteGenres: () => void;
  onRemoveFavoriteGenre: (genre: string) => void;
  onBioChange: (value: string) => void;
};

export default function ProfileSettingsPublicCard({
  publicNameChoice,
  displayName,
  username,
  chosenPublicName,
  publicLevel,
  favoriteGenres,
  favoriteGenreInput,
  bio,
  profileLevelOptions,
  onPublicNameChoiceChange,
  onPublicLevelChange,
  onFavoriteGenreInputChange,
  onAddFavoriteGenres,
  onRemoveFavoriteGenre,
  onBioChange,
}: ProfileSettingsPublicCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <ProfileSettingsSectionLabel
        eyebrow="Community"
        title="Public reader profile"
        detail="These details are optional. Keep them simple now, or use them to make your reader profile feel more like you."
      />

      <div className="mt-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-800">
            Name shown to other readers
          </label>

          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={publicNameChoice}
            onChange={(e) =>
              onPublicNameChoiceChange(e.target.value as PublicNameChoice)
            }
          >
            <option value="display_name">
              Display Name ({displayName.trim() || "not set yet"})
            </option>
            <option value="username">
              Username ({username.trim() || "not set yet"})
            </option>
          </select>

          <p className="mt-2 text-sm text-stone-600">
            Other readers will see:{" "}
            <span className="font-medium text-stone-900">
              {chosenPublicName}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-800">
            Japanese reading level shown publicly
          </label>

          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={publicLevel}
            onChange={(e) => onPublicLevelChange(e.target.value)}
          >
            <option value="None">Prefer not to share</option>
            {profileLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.title} · {option.plain} ({option.cefr} · {option.jlpt})
              </option>
            ))}
          </select>
        </div>

        <FavoriteGenreEditor
          favoriteGenres={favoriteGenres}
          favoriteGenreInput={favoriteGenreInput}
          onFavoriteGenreInputChange={onFavoriteGenreInputChange}
          onAddFavoriteGenres={onAddFavoriteGenres}
          onRemoveFavoriteGenre={onRemoveFavoriteGenre}
        />

        <div>
          <label className="block text-sm font-medium text-stone-800">
            Bio
          </label>

          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={5}
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="A little about your reading life, interests, or goals."
          />
        </div>
      </div>
    </div>
  );
}