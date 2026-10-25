import { redirect } from "next/navigation";

export default function ProfileSettingsCompatibilityRoute() {
  redirect("/community/profile?edit=1");
}
