// Social Profile
//

import ProfileShell from "@/components/profile/ProfileShell";

export default function SocialProfilePage() {
  return (
    <ProfileShell
      title="Social Profile"
      description="This will eventually hold community-facing reader preferences, sharing choices, and social profile settings."
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Coming Later
        </div>
        <h2 className="mt-2 text-lg font-semibold text-stone-900">
          Social settings are not active yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          For now, your editable profile details live in Edit Profile, and your color and Ability
          Check preferences live in Reading Profile.
        </p>
      </div>
    </ProfileShell>
  );
}
