import { describe, expect, it } from 'vitest';
import {
  AskModelOutputSchema,
  HELPLINES,
  lexicalMatch,
  screenForCrisis,
  type CuratedQuestion,
} from '../src/index.ts';

describe('screenForCrisis', () => {
  const crisis = [
    'I want to end my life',
    'i want to kill myself',
    'Thinking about suicide lately',
    "I don't want to live anymore",
    'I keep hurting myself',
    'everyone would be better off if I was dead',
    'mujhe mar jana hai',
    'main marna chahta hu',
    'ab jeena nahi chahti',
    'khudkushi kar lunga',
    'मैं जीना नहीं चाहता',
    'मुझे आत्महत्या के विचार आते हैं',
    'मैं मर जाना चाहती हूँ',
    'ज़िंदगी ख़त्म कर दूँगा',
    'I wanna die',
    'mujhe jeene ka man nahi karta',
    'khud ko khatam kar lunga',
  ];

  it.each(crisis)('flags "%s"', (text) => {
    expect(screenForCrisis(text).crisis).toBe(true);
  });

  const safe = [
    'I am dying to see my family',
    'How do I kill time without guilt',
    'My phone battery died',
    'mujhe gussa bahut aata hai',
    'मन शांत कैसे करें',
    'How do I deal with the death of my father',
    'I am afraid to die',
    'jab koi mar jata hai to kya hota hai',
    'marne ke baad kya hota hai',
    'मरने के बाद क्या होता है',
    'zindagi khatam ho jayegi tab kya bachega',
  ];

  it.each(safe)('does not flag "%s"', (text) => {
    expect(screenForCrisis(text).crisis).toBe(false);
  });
});

describe('lexicalMatch', () => {
  const questions: CuratedQuestion[] = [
    {
      id: 'q-overthinking',
      topicSlug: 'overthinking',
      text: { en: 'How do I stop overthinking?', hi: 'ज़्यादा सोचना कैसे बंद करूँ?' },
      phrasings: ['my mind races at night', 'I cannot stop thinking'],
    },
    {
      id: 'q-anger',
      topicSlug: 'anger',
      text: { en: 'How do I control my anger?' },
      phrasings: ['gussa kaise control karein'],
    },
  ];

  it('ranks the closest curated question first', () => {
    const [best] = lexicalMatch('how can I stop overthinking every night', questions);
    expect(best?.questionId).toBe('q-overthinking');
    expect(best!.score).toBeGreaterThan(0.3);
  });

  it('matches Hinglish phrasings', () => {
    const [best] = lexicalMatch('gussa control kaise karu', questions);
    expect(best?.questionId).toBe('q-anger');
  });

  it('returns nothing for unrelated text', () => {
    expect(lexicalMatch('best pizza in town', questions)).toEqual([]);
  });
});

describe('AskModelOutputSchema', () => {
  it('accepts the model output shape', () => {
    const parsed = AskModelOutputSchema.parse({
      crisis: false,
      language: 'hinglish',
      matches: [{ question_id: 'q-anger', confidence: 0.82 }],
      topic_slugs: ['anger'],
    });
    expect(parsed.matches[0]?.question_id).toBe('q-anger');
  });

  it('rejects an unknown language', () => {
    expect(() =>
      AskModelOutputSchema.parse({ crisis: false, language: 'fr', matches: [], topic_slugs: [] }),
    ).toThrow();
  });
});

describe('HELPLINES', () => {
  it('lists Tele-MANAS with both numbers', () => {
    const teleManas = HELPLINES.find((h) => h.id === 'tele-manas');
    expect(teleManas?.numbers).toEqual(['14416', '1800-891-4416']);
  });
});
