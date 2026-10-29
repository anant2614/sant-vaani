import { describe, expect, it } from 'vitest';
import fixture from './fixtures/catalogue.json' with { type: 'json' };
import {
  AskModelOutputSchema,
  HELPLINES,
  askableQuestions,
  lexicalMatch,
  parseCatalogue,
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
    // Common phrasings the first lists missed (whole-branch review).
    'mujhe marna hai',
    'ab bas marna hai',
    'मुझे मरना है',
    'अब मुझे मरना है',
    'main jaan de dunga',
    'मैं अपनी जान दे दूंगा',
    'sab khatam kar dena chahta hoon',
    'सब कुछ खत्म कर देना चाहती हूँ',
    'जीने की कोई वजह नहीं',
    'jeene ki koi wajah nahi hai',
    'jeene ka koi matlab nahi',
    'kaash mar jaun',
    'काश मर जाऊं',
    'I want to never wake up',
    'I just want to sleep and never wake up',
    'thinking about ending it all',
    'I want to end everything',
    "I can't go on anymore",
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
    'mere papa mar gaye, kaise sambhalun',
    'sabko ek din marna hai, phir dar kyun',
    'mujhe marne se dar lagta hai',
    'मुझे मरने से डर लगता है',
    'I never wake up early, how do I build discipline',
    'How do I end everything with my ex peacefully',
    "I can't go on a trip because of work",
    "We can't go on like this as a couple",
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

  it('reads a language outside the list as other rather than losing the reply', () => {
    const parsed = AskModelOutputSchema.parse({ crisis: false, language: 'Hindi', matches: [], topic_slugs: [] });
    expect(parsed.language).toBe('other');
  });
});

describe('HELPLINES', () => {
  it('lists Tele-MANAS with both numbers', () => {
    const teleManas = HELPLINES.find((h) => h.id === 'tele-manas');
    expect(teleManas?.numbers).toEqual(['14416', '1800-891-4416']);
  });
});

describe('askableQuestions', () => {
  it('lists only answered questions, in topic order, with their answer and phrasings', () => {
    const catalogue = parseCatalogue({
      ...fixture,
      topics: fixture.topics.map((t) => (t.slug === 'anger' ? { ...t, sortOrder: 0 } : t)),
      questions: [...fixture.questions, { id: 'q-unanswered', topicId: 't-anger', text: { en: 'Not answered yet' } }],
    });
    expect(askableQuestions(catalogue, new Map([['q-anger', ['gussa kaise kam karu']]]))).toEqual([
      {
        id: 'q-anger',
        answerId: 'a-anger',
        topicSlug: 'anger',
        text: { en: 'How do I stop reacting in anger?', hi: 'मैं गुस्से में प्रतिक्रिया देना कैसे रोकूँ?' },
        phrasings: ['gussa kaise kam karu'],
      },
      {
        id: 'q-overthinking',
        answerId: 'a-overthinking',
        topicSlug: 'overthinking',
        text: { en: 'How do I stop overthinking at night?' },
        phrasings: [],
      },
    ]);
  });
});
