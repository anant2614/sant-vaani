import Sanscript from '@indic-transliteration/sanscript';

// Consonant letters in IAST. A word ending in one of these runs into the
// next word in Devanagari (कर्मण्येवाधिकारस्ते); words ending in a vowel,
// anusvara (ṃ) or visarga (ḥ) stay apart, as printed editions do.
const ENDS_IN_CONSONANT = /(?:kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|[kgṅcjñṭḍṇtdnpbmyrlvśṣsh])$/;

/**
 * Joins the words of one IAST half-line the way Devanagari prints them.
 * A `;` (the middle of a long line) counts as a space. Words starting with
 * an avagraha (') always attach to the word before.
 */
export function joinWords(iastLine) {
  const words = iastLine.replace(/;/g, ' ').split(/\s+/).filter(Boolean);
  let out = '';
  for (const word of words) {
    if (out === '') out = word;
    else if (word.startsWith("'") || ENDS_IN_CONSONANT.test(out)) out += word;
    else out += ` ${word}`;
  }
  return out;
}

/**
 * One IAST half-line to Devanagari. The source writes the nasal before l
 * as ṁ (śraddhāvāṁl labhate); Devanagari editions print a candrabindu
 * there (श्रद्धावाँल्लभते), which Sanscript spells "~". Sanscript reads
 * every "oṃ" as ॐ, which is right only for the word oṃ on its own, so
 * inside a word it becomes ṅ before k or g (पवित्रमोङ्कार) and a plain
 * anusvara elsewhere.
 */
export function toDevanagari(iastLine) {
  const joined = joinWords(iastLine)
    .replace(/ṁ/g, '~')
    .replace(/oṃ/g, (match, offset, line) => {
      const before = line[offset - 1] ?? ' ';
      const after = line[offset + match.length] ?? ' ';
      if (before === ' ' && after === ' ') return match;
      return after === 'k' || after === 'g' ? 'oṅ' : 'o\u0001';
    });
  return Sanscript.t(joined, 'iast', 'devanagari').replace(/\u0001/g, 'ं');
}
