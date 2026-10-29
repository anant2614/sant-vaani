// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import type { Localized } from '../catalogue/schema.ts';
import { foldForMatching } from '../text/normalize.ts';

/**
 * Word-overlap matching against the curated questions. Ask uses it when the
 * model call fails, so a person still gets the closest answer or topic.
 */

export type CuratedQuestion = {
  id: string;
  topicSlug: string;
  text: Localized;
  /** Other ways people ask the same thing, written by curators. */
  phrasings: string[];
};

export type LexicalMatch = { questionId: string; score: number };

const STOPWORDS = new Set(
  [
    // English
    'a an the i me my myself we our you your he she it its they them their is am are was were be been being',
    'do does did doing have has had how what why when where who whom which can could should would will shall',
    'may might must to of in on at for with about from by as into and or but if so that this these those there',
    'then than too very just not no don t s m ll ve d get got every all any some more most much many really',
    'always even also still keep make let please help want need like one ever again way',
    // Hinglish
    'main mai mein mujhe mujhko mera meri mere hum ham aap tum kya kaise kese kyu kyun kyon kab kahan jab toh',
    'bhi hi hai hain hu hun hoon ho tha thi ka ki ke ko se par pe aur ya ye yeh wo woh vo kar karu karun',
    'karoon karein karen kare karna karte karta karti raha rahi rahe sakta sakti sakte chahiye liye lie ek',
    'bahut bohot bahot nahi nahin na koi kuch kuchh apne apna apni ab bas sab',
    // Hindi, after folding
    'है हैं मैं मै मुझे मुझको मेरा मेरी मेरे हम आप तुम क्या कैसे क्यों कब कहां जब तो भी ही हूं हो था थी थे',
    'का की के को से पर और या यह ये वह वो कर करूं करें करे करना करते करता करती रहा रही रहे सकता सकती',
    'सकते चाहिए लिए एक बहुत नहीं नही कोई कुछ अपने अपना अपनी अब बस सब',
  ]
    .join(' ')
    .split(' '),
);

/** Folds English endings and common Hinglish spellings (jeena/jina, gussa/gusa). */
function stem(word: string): string {
  if (!/^[a-z]+$/.test(word)) return word;
  let w = word;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  w = w.replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/(.)\1+/g, '$1');
  if (w.length > 3 && w.endsWith('a')) w = w.slice(0, -1);
  return w;
}

function terms(text: string): Set<string> {
  const out = new Set<string>();
  for (const word of foldForMatching(text).split(' ')) {
    if (!word || STOPWORDS.has(word)) continue;
    const term = stem(word);
    if (term.length > 1) out.add(term);
  }
  return out;
}

/** Dice overlap: 1 when both sides use the same words, 0 when none are shared. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const term of a) if (b.has(term)) shared++;
  return (2 * shared) / (a.size + b.size);
}

const MIN_SCORE = 0.2;

/** Curated questions ranked by overlap with the person's words, best first. */
export function lexicalMatch(text: string, questions: CuratedQuestion[], limit = 3): LexicalMatch[] {
  const query = terms(text);
  if (query.size === 0) return [];
  return questions
    .map((q) => {
      const texts = [q.text.en, q.text.hi, ...q.phrasings].filter((t): t is string => Boolean(t));
      const score = Math.max(0, ...texts.map((t) => overlap(query, terms(t))));
      return { questionId: q.id, score };
    })
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.questionId.localeCompare(b.questionId))
    .slice(0, limit);
}
