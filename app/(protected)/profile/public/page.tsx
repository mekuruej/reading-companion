"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PublicProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_public_profile")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) console.error(error);
    setProfile(data);
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("user_public_profile")
      .update(profile)
      .eq("user_id", user.id);

    if (error) setMessage("Error saving profile.");
    else setMessage("Saved!");

    setSaving(false);
  }

  if (loading || !profile) return <p>Loading…</p>;

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Public Profile</h1>

      <label className="block mb-2">JLPT Level (public):</label>
      <select
        className="border p-2 mb-4 w-full rounded"
        value={profile.jlpt_level_public}
        onChange={(e) =>
          setProfile({ ...profile, jlpt_level_public: e.target.value })
        }
      >
        {["N5", "N4", "N3", "N2", "N1", "None"].map((lvl) => (
          <option key={lvl}>{lvl}</option>
        ))}
      </select>

      <label className="block mb-2">Favorite Genres:</label>
      <input
        type="text"
        className="border p-2 mb-4 w-full rounded"
        placeholder="comma separated, e.g. fantasy, slice-of-life"
        value={profile.favorite_genres?.join(", ")}
        onChange={(e) =>
          setProfile({
            ...profile,
            favorite_genres: e.target.value
              .split(",")
              .map((s) => s.trim()),
          })
        }
      />

      <label className="block mb-2">Bio:</label>
      <textarea
        className="border p-2 mb-4 w-full rounded"
        rows={4}
        value={profile.bio || ""}
        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
      />

      <button
        onClick={saveProfile}
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
    </main>
  );
}
