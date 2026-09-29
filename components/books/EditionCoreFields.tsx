import { EDITION_FORMAT_OPTIONS } from "@/lib/books/bookMetadata";
import { COMMON_BOOK_LANGUAGE_OPTIONS, normalizeBookLanguageCode } from "@/lib/books/bookLanguage";

type Props = {
  title: string;
  author: string;
  languageCode: string;
  editionFormat: string;
  narrator: string;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onNarratorChange: (value: string) => void;
};

export default function EditionCoreFields(props: Props) {
  const inputClass = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900";
  const languageCode = normalizeBookLanguageCode(props.languageCode) ?? "";
  return (
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      <label>
        Title *
        <input required className={inputClass} value={props.title} onChange={event => props.onTitleChange(event.target.value)} />
      </label>
      <label>
        Author *
        <input required className={inputClass} value={props.author} onChange={event => props.onAuthorChange(event.target.value)} />
      </label>
      <label>
        Language *
        <select required className={inputClass} value={languageCode} onChange={event => props.onLanguageChange(event.target.value)}>
          <option value="">Select edition language</option>
          {COMMON_BOOK_LANGUAGE_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          {languageCode && !COMMON_BOOK_LANGUAGE_OPTIONS.some(option => option.code === languageCode)
            ? <option value={languageCode}>{languageCode}</option> : null}
        </select>
      </label>
      <label>
        Format *
        <select required className={inputClass} value={props.editionFormat} onChange={event => props.onFormatChange(event.target.value)}>
          <option value="">Choose format</option>
          {EDITION_FORMAT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {props.editionFormat === "audiobook" ? (
        <label>
          Narrator (optional)
          <input className={inputClass} value={props.narrator} onChange={event => props.onNarratorChange(event.target.value)} />
        </label>
      ) : null}
    </div>
  );
}
