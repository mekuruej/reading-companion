type PersonRowProps = {
  label: string;
  name: string | null | undefined;
  reading: string | null | undefined;
  img: string | null | undefined;
  editing: boolean;
  nameValue: string;
  setNameValue: (value: string) => void;
  englishNameValue: string;
  setEnglishNameValue: (value: string) => void;
  imgValue: string;
  setImgValue: (value: string) => void;
  readingValue: string;
  setReadingValue: (value: string) => void;
  nameInputLabel?: string;
  englishNameInputLabel?: string;
  readingInputLabel?: string;
  showEnglishName?: boolean;
  showReading?: boolean;
};

export default function PersonRow({
  label,
  name,
  reading,
  img,
  editing,
  nameValue,
  setNameValue,
  englishNameValue,
  setEnglishNameValue,
  imgValue,
  setImgValue,
  readingValue,
  setReadingValue,
  nameInputLabel,
  englishNameInputLabel,
  readingInputLabel,
  showEnglishName = true,
  showReading = true,
}: PersonRowProps) {
  const displayEnglishName = showEnglishName && englishNameValue;
  const displayReading = showReading && reading;

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-stone-100">
        {img ? (
          <img
            src={img}
            alt={name || label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!editing ? (
          <>
            <div className="text-xs uppercase tracking-wide text-stone-500">
              {label}
            </div>
            <div className="mt-1 text-sm font-medium text-stone-900">
              {name || "—"}
            </div>

            {displayEnglishName ? (
              <div className="text-sm text-stone-700">{displayEnglishName}</div>
            ) : null}

            {showReading ? (
              <div className="text-sm text-stone-500">{reading || "—"}</div>
            ) : null}
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              {label}
            </div>

            <input
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              placeholder={nameInputLabel ?? `${label} name`}
              className="w-full rounded border px-3 py-2 text-sm"
            />

            {showEnglishName ? (
              <input
                value={englishNameValue}
                onChange={(event) => setEnglishNameValue(event.target.value)}
                placeholder={englishNameInputLabel ?? `${label} English name`}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            ) : null}

            {showReading ? (
              <input
                value={readingValue}
                onChange={(event) => setReadingValue(event.target.value)}
                placeholder={readingInputLabel ?? `${label} reading`}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            ) : null}

            <input
              value={imgValue}
              onChange={(event) => setImgValue(event.target.value)}
              placeholder={`${label} image URL`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
