type ProfilePreviewBioProps = {
  bio: string;
};

export default function ProfilePreviewBio({ bio }: ProfilePreviewBioProps) {
  return (
    <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-600">
      {bio}
    </div>
  );
}