// ISBN helpers
//
// For now, Mekuru only accepts ISBN-13 for normal user book lookup.
// This keeps the add-book flow simple and prevents messy manual book creation.

export function cleanIsbn(rawIsbn: string) {
  return rawIsbn.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn13(isbn: string) {
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  const sum = isbn
    .split("")
    .map((digit) => Number(digit))
    .reduce((total, digit, index) => {
      const weight = index % 2 === 0 ? 1 : 3;
      return total + digit * weight;
    }, 0);

  return sum % 10 === 0;
}

export function normalizeIsbn13(rawIsbn: string) {
  const cleaned = cleanIsbn(rawIsbn);

  if (!isValidIsbn13(cleaned)) {
    return null;
  }

  return cleaned;
}