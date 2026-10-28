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
  { label: 'en-end-it-all', pattern: /\bend it all\b/ },
  { label: 'en-self-harm', pattern: /\bself ?harm\w*/ },
  { label: 'en-hurt-myself', pattern: /\b(?:hurt|hurting|harm|harming|cut|cutting|burn|burning) my ?self\b/ },
  { label: 'en-hang-myself', pattern: /\bhang(?:ing)? my ?self\b/ },
  { label: 'en-overdose', pattern: /\boverdos(?:e|ed|ing)\b/ },
];

const HINGLISH: CrisisPattern[] = [
  { label: 'hinglish-khudkushi', pattern: /\bkhud ?kh?ushi\b/ },
  { label: 'hinglish-atmahatya', pattern: /\ba{1,2}tm[ae]? ?hatya\b/ },
  { label: 'hinglish-marna-chahta', pattern: /\bmarna chah(?:ta|ti|te|ata|ati)\b/ },
  { label: 'hinglish-mar-jana-chahta', pattern: /\bmar ja{1,2}n[ae] (?:chah|ka (?:man|mann|dil))/ },
  {
    label: 'hinglish-mujhe-mar-jana',
    pattern: /\b(?:mujhe|mujhko|main|mai|mein)(?: \w+){0,2}? mar ja{1,2}(?:na|u|un|oon|ung[ai]|aung[ai]|unga|ungi)\b/,
  },
  { label: 'hinglish-marne-ka-man', pattern: /\bmarne k[ae] (?:man|mann|dil|khayal|khyal|khayaal|vichar|vichaar)\b/ },
  { label: 'hinglish-jeena-nahi', pattern: /\bje{1,2}na nahi?n? chah/ },
  { label: 'hinglish-jina-nahi', pattern: /\bjina nahi?n? chah/ },
  { label: 'hinglish-jeene-ka-man-nahi', pattern: /\bj(?:ee|i)ne k[ai] (?:man|mann|dil|mood|ichha|iccha|icchha|wajah|vajah) nahi?n?\b/ },
  { label: 'hinglish-zindagi-khatam', pattern: /\b[zj]ind[ae]gi (?:ko )?kh?at[a]?m kar/ },
  { label: 'hinglish-khud-ko-khatam', pattern: /\bkhud ko (?:khatam|khatm|maar|mar|hurt|chot|nuksan|nuksaan)\b/ },
  { label: 'hinglish-apni-jaan', pattern: /\bapni jaan le\b/ },
];

const DEVANAGARI: CrisisPattern[] = [
  { label: 'hi-atmahatya', pattern: /आत्म ?हत्या/ },
  { label: 'hi-khudkushi', pattern: /खुद ?कुशी/ },
  { label: 'hi-marna-chahta', pattern: /मरना चाह/ },
  { label: 'hi-mar-jana-chahta', pattern: /मर जाना चाह/ },
  { label: 'hi-mujhe-mar-jana', pattern: /(?:^| )(?:मुझे|मैं|मै)(?: \S+){0,2}? मर जा(?:ना|ऊं|ऊ|ऊंगा|ऊंगी)(?= |$)/ },
  { label: 'hi-marne-ka-man', pattern: /मरने (?:का|के) (?:मन|दिल|ख्याल|खयाल|विचार)/ },
  { label: 'hi-jeena-nahi', pattern: /(?:जीना|जिना) नहीं? चाह/ },
  { label: 'hi-jeene-ka-man-nahi', pattern: /जीने (?:का|की) (?:मन|दिल|इच्छा|वजह) नहीं?/ },
  { label: 'hi-zindagi-khatam', pattern: /(?:जिंदगी|जिन्दगी) (?:को )?खत्म कर/ },
  { label: 'hi-khud-ko-khatam', pattern: /खुद को (?:खत्म|मार|चोट|नुकसान)/ },
  { label: 'hi-apni-jaan', pattern: /अपनी जान ले/ },
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
