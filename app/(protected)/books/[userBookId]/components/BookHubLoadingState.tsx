import { DEFAULT_PAGE_STYLE } from "@/lib/appearance/defaultAppearance";
import hubStyles from "../bookHubAppearance.module.css";

export default function BookHubLoadingState() {
  return (
    <main className={`${hubStyles.hub} min-h-screen p-6`} style={DEFAULT_PAGE_STYLE}>
      <div className="text-sm text-gray-600">Loading book info…</div>
    </main>
  );
}