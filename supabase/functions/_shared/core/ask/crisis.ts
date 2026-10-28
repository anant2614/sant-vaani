// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import { foldForMatching } from '../text/normalize.ts';

/**
 * The first check on every typed or spoken question. It is deliberately
 * keyword based and runs before the model, so a person in crisis reaches
 * the helpline even when the model is slow or down. The model's own
 * crisis flag is a second net for wording these lists miss.
 *
 * Text is folded first (lowercase, no punctuation, no nukta, chandrabindu
 * as anusvara), so "don't" reads "don t" and ज़िंदगी reads जिंदगी.
 * Devanagari has no \b in JavaScript, so those patterns use spaces.
 */

type CrisisPattern = { label: string; pattern: RegExp };

const ENGLISH: CrisisPattern[] = [
  { label: 'en-suicide', pattern: /\bsuicid\w*/ },
  { label: 'en-kill-myself', pattern: /\bkill(?:ing)? my ?self\b/ },
  { label: 'en-end-my-life', pattern: /\b(?:end|ending|take|taking|kill|killing) my (?:own )?life\b/ },
  { label: 'en-want-to-die', pattern: /\b(?:want|wants|wanted|wanna|wish|wishing) (?:to )?die\b/ },
  { label: 'en-wish-dead', pattern: /\bwish (?:i|i d) (?:was|were|be|been) dead\b/ },
  { label: 'en-better-off-dead', pattern: /\bbetter off (?:\w+ ){0,4}?(?:dead|without me)\b/ },
  { label: 'en-no-reason-to-live', pattern: /\bno (?:reason|point|will) (?:to|in) (?:live|living|go on|going on)\b/ },
  { label: 'en-not-worth-living', pattern: /\bnot worth living\b/ },
  {
    label: 'en-dont-want-to-live',
    pattern: /\b(?:don t|dont|do not) want to (?:live|be alive|exist|wake up|be here)\b/,
  },
  { label: 'en-end-it-all', pattern: /\bend(?:ing)? it all\b/ },
  {
    label: 'en-end-everything',
    pattern: /\b(?:want|wanna|going|gonna|ready|thinking about|think about) (?:to )?end(?:ing)? everything\b/,
  },
  { label: 'en-never-wake-up', pattern: /\b(?:want|wanna|wish|hope|pray)(?: \w+){0,5}? never (?:to )?wake (?:up|again)\b/ },
  { label: 'en-cant-go-on', pattern: /\bi (?:just )?can ?t go on(?= any ?more| any longer| living| like this|$)/ },
  { label: 'en-self-harm', pattern: /\bself ?harm\w*/ },
  { label: 'en-hurt-myself', pattern: /\b(?:hurt|hurting|harm|harming|cut|cutting|burn|burning) my ?self\b/ },
  { label: 'en-hang-myself', pattern: /\bhang(?:ing)? my ?self\b/ },
  { label: 'en-overdose', pattern: /\boverdos(?:e|ed|ing)\b/ },
];

const HINGLISH: CrisisPattern[] = [
  { label: 'hinglish-khudkushi', pattern: /\bkhud ?kh?ushi\b/ },
  { label: 'hinglish-atmahatya', pattern: /\ba{1,2}tm[ae]? ?hatya\b/ },
  { label: 'hinglish-marna-chahta', pattern: /\bmarna chah(?:ta|ti|te|ata|ati)\b/ },
  {
    label: 'hinglish-marna-hai',
    pattern: /\b(?:mujhe|mujhko|main|mai|mein|ab|bas)(?: \w+){0,2}? marna (?:hai|he|h|hain|chahiye)\b/,
  },
  { label: 'hinglish-kaash-mar-jaun', pattern: /\bkaa?sh(?: \w+){0,3}? mar ja/ },
  { label: 'hinglish-mar-jana-chahta', pattern: /\bmar ja{1,2}n[ae] (?:chah|ka (?:man|mann|dil))/ },
  {
    label: 'hinglish-mujhe-mar-jana',
    pattern: /\b(?:mujhe|mujhko|main|mai|mein)(?: \w+){0,2}? mar ja{1,2}(?:na|u|un|oon|ung[ai]|aung[ai]|unga|ungi)\b/,
  },
  { label: 'hinglish-marne-ka-man', pattern: /\bmarne k[ae] (?:man|mann|dil|khayal|khyal|khayaal|vichar|vichaar)\b/ },
  { label: 'hinglish-jeena-nahi', pattern: /\bje{1,2}na nahi?n? chah/ },
  { label: 'hinglish-jina-nahi', pattern: /\bjina nahi?n? chah/ },
  {
    label: 'hinglish-jeene-ka-man-nahi',
    pattern:
      /\bj(?:ee|i)ne k[ai] (?:koi )?(?:man|mann|dil|mood|ichha|iccha|icchha|wajah|vajah|matlab|maqsad|maksad) nahi?n?\b/,
  },
  { label: 'hinglish-zindagi-khatam', pattern: /\b[zj]ind[ae]gi (?:ko )?kh?at[a]?m kar/ },
  { label: 'hinglish-khud-ko-khatam', pattern: /\bkhud ko (?:khatam|khatm|maar|mar|hurt|chot|nuksan|nuksaan)\b/ },
  { label: 'hinglish-apni-jaan', pattern: /\bapni jaan le\b/ },
  { label: 'hinglish-jaan-de-dunga', pattern: /\bjaa?n de d(?:u|un|oo|oon|unga|ungi|oonga|oongi)\b/ },
  { label: 'hinglish-jaan-dena-hai', pattern: /\bjaa?n de(?:na|ni) (?:hai|he|h|chah)/ },
  {
    label: 'hinglish-sab-khatam-kar',
    pattern: /\bsab ?(?:kuch )?kh?at[a]?m kar (?:d(?:u|un|oon|unga|ungi|ena|eni|eta|eti)|lu|lun|lunga|lungi)\b/,
  },
];

const DEVANAGARI: CrisisPattern[] = [
  { label: 'hi-atmahatya', pattern: /आत्म ?हत्या/ },
  { label: 'hi-khudkushi', pattern: /खुद ?कुशी/ },
  { label: 'hi-marna-chahta', pattern: /मरना चाह/ },
  { label: 'hi-marna-hai', pattern: /(?:^| )(?:मुझे|मुझको|मैं|मै|अब|बस)(?: \S+){0,2}? मरना (?:है|हैं|चाहिए)/ },
  { label: 'hi-kaash-mar-jaun', pattern: /काश(?: \S+){0,3}? मर जा/ },
  { label: 'hi-mar-jana-chahta', pattern: /मर जाना चाह/ },
  { label: 'hi-mujhe-mar-jana', pattern: /(?:^| )(?:मुझे|मैं|मै)(?: \S+){0,2}? मर जा(?:ना|ऊं|ऊ|ऊंगा|ऊंगी)(?= |$)/ },
  { label: 'hi-marne-ka-man', pattern: /मरने (?:का|के) (?:मन|दिल|ख्याल|खयाल|विचार)/ },
  { label: 'hi-jeena-nahi', pattern: /(?:जीना|जिना) नहीं? चाह/ },
  { label: 'hi-jeene-ka-man-nahi', pattern: /जीने (?:का|की) (?:कोई )?(?:मन|दिल|इच्छा|वजह|मतलब|मकसद) नहीं?/ },
  { label: 'hi-zindagi-khatam', pattern: /(?:जिंदगी|जिन्दगी) (?:को )?खत्म कर/ },
  { label: 'hi-khud-ko-khatam', pattern: /खुद को (?:खत्म|मार|चोट|नुकसान)/ },
  { label: 'hi-apni-jaan', pattern: /अपनी जान ले/ },
  { label: 'hi-jaan-de-dunga', pattern: /जान दे दू(?:ं|ंगा|ंगी|गा|गी)?(?= |$)/ },
  { label: 'hi-jaan-dena-hai', pattern: /जान दे(?:ना|नी) (?:है|चाह)/ },
  { label: 'hi-sab-khatam-kar', pattern: /सब (?:कुछ )?खत्म कर (?:दू|दे|लू|ले)/ },
];

const PATTERNS = [...ENGLISH, ...HINGLISH, ...DEVANAGARI];

export type CrisisScreen = {
  crisis: boolean;
  /** Which rule fired, for counting. Never the person's text. */
  matched: string | null;
};

export function screenForCrisis(text: string): CrisisScreen {
  const folded = foldForMatching(text);
  for (const { label, pattern } of PATTERNS) {
    if (pattern.test(folded)) return { crisis: true, matched: label };
  }
  return { crisis: false, matched: null };
}
