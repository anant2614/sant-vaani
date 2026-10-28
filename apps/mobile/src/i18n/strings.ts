import type { ThemePref } from '@sant-vaani/core';

import { usePrefs } from '@/prefs/PrefsProvider';
import type { AppLanguage } from '@/prefs/prefs';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

const en = {
  tabs: { today: 'Today', ask: 'Ask', scriptures: 'Scriptures', saints: 'Saints', paths: 'Paths' },
  dayPart: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' } as Record<DayPart, string>,
  greeting: {
    morning: 'Shubh prabhat',
    afternoon: 'Namaste',
    evening: 'Shubh sandhya',
    night: 'Shubh ratri',
  } as Record<DayPart, string>,
  clockTime: (hours: number, minutes: number) =>
    `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`,
  settings: 'Settings',
  back: 'Back',
  topicLabel: 'Topic',
  answerLabel: 'The saints answer',
  todaysGuidance: "Today's guidance",
  playAnswer: "Play the saints' answers",
  saintsAndMinutes: (saints: number, minutes: number) =>
    `${saints} ${saints === 1 ? 'saint' : 'saints'} · ${minutes} min`,
  whatsOnYourMind: "What's on your mind?",
  todaysVerse: "Today's verse",
  gitaRef: (chapter: number, verse: number) => `Gita ${chapter}.${verse}`,
  answersOnTheirWay: "The saints' answers are on their way. Until then, sit with today's verse.",
  path: {
    label: 'Your path',
    dayOf: (day: number) => `Day ${day} of 7`,
    minutesToday: (minutes: number) => `${minutes} min today`,
    sevenDays: 'Seven days',
    open: 'Open this path',
    day: (day: number) => `Day ${day}`,
  },
  gita: {
    title: 'Bhagavad Gita',
    summary: '18 chapters · 700 verses',
    chapter: (number: number) => `Chapter ${number}`,
    verseCount: (count: number) => `${count} verses`,
    verse: (number: number) => `Verse ${number}`,
    yourVerses: 'Your verses',
    saved: 'Saved',
    save: 'Save this verse',
    unsave: 'Remove from saved',
    yourNote: 'Your note',
    notePlaceholder: 'What does this verse say to you today?',
    saveNote: 'Save note',
    deleteNote: 'Delete note',
    notePrivate: 'Only you can see your notes.',
    meaningSoon: 'The English meaning is still being written.',
    previous: 'Previous verse',
    next: 'Next verse',
    notInGita: 'This verse is not in the Gita.',
  },
  welcome: {
    title: 'Sant Vaani',
    tagline: 'Answers from the saints for what is on your mind.',
    language: 'Language',
    ageConfirm: 'I am 18 or older',
    ageNote: 'Sant Vaani is for adults for now.',
    next: 'Continue',
    guidanceNote: 'Sant Vaani shares guidance, not therapy or medical advice.',
    youtubeNote: "Clips play through YouTube, so YouTube's Terms of Service apply.",
    youtubeTerms: 'YouTube Terms',
    googlePrivacy: 'Google Privacy Policy',
    ourTerms: 'Our terms',
    ourPrivacy: 'Privacy',
  },
  settingsScreen: {
    look: 'Look',
    themes: {
      sun: 'Switch at sunset',
      system: 'Follow the phone',
      light: 'Ganga Ghat, always',
      dark: 'Chandni, always',
    } as Record<ThemePref, string>,
    language: 'Language',
    city: 'City for sunset',
    done: 'Done',
  },
  soon: {
    ask: 'Ask the saints a question in your own words.',
    saints: 'Meet the saints whose talks answer your questions.',
    paths: 'Seven-day paths of small daily practices.',
  },
  notFound: "This page isn't here.",
  goToday: 'Go to Today',
};

export type Strings = typeof en;

const hi: Strings = {
  tabs: { today: 'आज', ask: 'पूछें', scriptures: 'शास्त्र', saints: 'संत', paths: 'पथ' },
  dayPart: { morning: 'सुबह', afternoon: 'दोपहर', evening: 'शाम', night: 'रात' },
  greeting: { morning: 'शुभ प्रभात', afternoon: 'नमस्ते', evening: 'शुभ संध्या', night: 'शुभ रात्रि' },
  clockTime: (hours, minutes) => `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, '0')}`,
  settings: 'सेटिंग्स',
  back: 'वापस',
  topicLabel: 'विषय',
  answerLabel: 'संतों के उत्तर',
  todaysGuidance: 'आज का मार्गदर्शन',
  playAnswer: 'संतों के उत्तर सुनें',
  saintsAndMinutes: (saints, minutes) => `${saints} संत · ${minutes} मिनट`,
  whatsOnYourMind: 'मन में क्या है?',
  todaysVerse: 'आज का श्लोक',
  gitaRef: (chapter, verse) => `गीता ${chapter}.${verse}`,
  answersOnTheirWay: 'संतों के उत्तर जल्द आ रहे हैं। तब तक आज के श्लोक के साथ कुछ पल बिताएँ।',
  path: {
    label: 'आपका पथ',
    dayOf: (day) => `7 में से दिन ${day}`,
    minutesToday: (minutes) => `आज ${minutes} मिनट`,
    sevenDays: 'सात दिन',
    open: 'यह पथ खोलें',
    day: (day) => `दिन ${day}`,
  },
  gita: {
    title: 'श्रीमद्भगवद्गीता',
    summary: '18 अध्याय · 700 श्लोक',
    chapter: (number) => `अध्याय ${number}`,
    verseCount: (count) => `${count} श्लोक`,
    verse: (number) => `श्लोक ${number}`,
    yourVerses: 'आपके श्लोक',
    saved: 'सहेजा गया',
    save: 'यह श्लोक सहेजें',
    unsave: 'सहेजे गए से हटाएँ',
    yourNote: 'आपका नोट',
    notePlaceholder: 'आज यह श्लोक आपसे क्या कहता है?',
    saveNote: 'नोट सहेजें',
    deleteNote: 'नोट हटाएँ',
    notePrivate: 'आपके नोट केवल आप देख सकते हैं।',
    meaningSoon: 'इस श्लोक का हिंदी अर्थ अभी लिखा जा रहा है।',
    previous: 'पिछला श्लोक',
    next: 'अगला श्लोक',
    notInGita: 'यह श्लोक गीता में नहीं है।',
  },
  welcome: {
    title: 'संत वाणी',
    tagline: 'आपके मन की बात पर संतों के उत्तर।',
    language: 'भाषा',
    ageConfirm: 'मेरी आयु 18 वर्ष या उससे अधिक है',
    ageNote: 'अभी संत वाणी केवल वयस्कों के लिए है।',
    next: 'आगे बढ़ें',
    guidanceNote: 'संत वाणी मार्गदर्शन देती है। यह इलाज या चिकित्सा सलाह नहीं है।',
    youtubeNote: 'क्लिप YouTube पर चलती हैं, इसलिए YouTube की सेवा की शर्तें लागू होती हैं।',
    youtubeTerms: 'YouTube की शर्तें',
    googlePrivacy: 'Google की गोपनीयता नीति',
    ourTerms: 'हमारी शर्तें',
    ourPrivacy: 'गोपनीयता',
  },
  settingsScreen: {
    look: 'रूप',
    themes: {
      sun: 'सूर्यास्त पर बदलें',
      system: 'फ़ोन के अनुसार',
      light: 'हमेशा गंगा घाट',
      dark: 'हमेशा चाँदनी',
    },
    language: 'भाषा',
    city: 'सूर्यास्त के लिए शहर',
    done: 'हो गया',
  },
  soon: {
    ask: 'अपने शब्दों में संतों से प्रश्न पूछें।',
    saints: 'उन संतों से मिलें जिनके प्रवचन आपके प्रश्नों का उत्तर देते हैं।',
    paths: 'छोटे दैनिक अभ्यासों के सात-दिन के पथ।',
  },
  notFound: 'यह पेज यहाँ नहीं है।',
  goToday: 'आज पर जाएँ',
};

export const STRINGS: Record<AppLanguage, Strings> = { en, hi };

export function useStrings(): Strings {
  return STRINGS[usePrefs().prefs.language];
}

/** Morning from 4 am, afternoon from noon, evening from 5 pm and night from 9 pm. */
export function dayPartOf(date: Date): DayPart {
  const hour = date.getHours();
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
