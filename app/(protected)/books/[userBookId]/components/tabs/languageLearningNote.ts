// Keep legacy plain-text notes readable while storing location without a schema change.
const PREFIX = "mekuru-language-note:v1:";
export function parseLanguageLearningNote(details: string) {
  if (details.startsWith(PREFIX)) {
    try {
      const value = JSON.parse(details.slice(PREFIX.length));
      if (typeof value.location === "string" && typeof value.note === "string") {
        return { location: value.location, note: value.note };
      }
    } catch { /* Preserve unrecognized text as a legacy note. */ }
  }
  return { location: "", note: details };
}
export function formatLanguageLearningNote(location: string, note: string) {
  return location.trim() ? PREFIX + JSON.stringify({ location, note }) : note;
}
