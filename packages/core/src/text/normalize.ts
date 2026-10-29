/**
 * Lowercases, removes punctuation and symbols (including the danda), and
 * collapses spaces. Devanagari letters and vowel signs are kept.
 */
export function normalizeQuestion(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}।॥]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A looser form for keyword matching: also drops the nukta and folds
 * chandrabindu into anusvara, so ज़िंदगी and जिंदगी, हूँ and हूं compare equal.
 */
export function foldForMatching(text: string): string {
  return normalizeQuestion(text).normalize('NFD').replace(/़/g, '').replace(/ँ/g, 'ं').normalize('NFC');
}
