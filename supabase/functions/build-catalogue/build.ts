import { parseCatalogue, type Catalogue, type Language, type Localized } from '../_shared/core/index.ts';

/** A published answer stays in the app while at least two of its clips are live. */
const MIN_LIVE_CLIPS = 2;
const MAX_CLIPS = 5;
const PATH_DAYS = 7;

type Text = { text_en: string | null; text_hi: string | null };

/** The rows build-catalogue reads, shaped as the database returns them. */
export type CatalogueRows = {
  topics: { id: string; slug: string; name_en: string; name_hi: string; sort_order: number }[];
  questions: { id: string; topic_id: string; text_en: string | null; text_hi: string | null; sort_order: number }[];
  answers: {
    id: string;
    question_id: string;
    status: 'draft' | 'published' | 'needs_replacement';
    verse_chapter: number | null;
    verse_number: number | null;
    step: Text | null;
    clips: { clip_id: string; position: number }[];
  }[];
  /** Live clips only. */
  clips: {
    id: string;
    saint_id: string;
    youtube_id: string;
    start_seconds: number;
    end_seconds: number;
    language: Language;
    summary_en: string | null;
    summary_hi: string | null;
  }[];
  saints: { id: string; name_en: string | null; name_hi: string | null; initials: string; tradition: string | null }[];
  /** Published paths only. */
  paths: {
    id: string;
    slug: string;
    title_en: string;
    title_hi: string;
    description_en: string;
    description_hi: string;
    sort_order: number;
    days: { day: number; clip_id: string | null; verse_chapter: number | null; verse_number: number | null; step: Text | null }[];
  }[];
  dailyVerses: { chapter: number; verse: number }[];
};

function localized(en: string | null | undefined, hi: string | null | undefined): Localized | null {
  const text: Localized = {};
  if (en?.trim()) text.en = en.trim();
  if (hi?.trim()) text.hi = hi.trim();
  return text.en || text.hi ? text : null;
}

const stepText = (step: Text | null) => (step ? localized(step.text_en, step.text_hi) : null);
const verseRef = (chapter: number | null, verse: number | null) => (chapter && verse ? { chapter, verse } : null);

/**
 * The one file the app downloads each night: answers in topic order with
 * their live clips, and only the questions, topics, clips and saints they
 * use. The result is checked against the catalogue rules, so a broken file
 * throws here instead of reaching phones. An answer that repeats a saint
 * loses the repeat and is reported, so one bad answer cannot hold back
 * every later file, takedowns included.
 */
export function buildCatalogue(rows: CatalogueRows, now: Date, report: (problem: string) => void): Catalogue {
  const saints = new Map(
    rows.saints.flatMap((s) => {
      const name = localized(s.name_en, s.name_hi);
      return name ? [[s.id, { id: s.id, name, initials: s.initials, ...(s.tradition ? { tradition: s.tradition } : {}) }] as const] : [];
    }),
  );
  const liveClips = new Map(
    rows.clips.flatMap((c) => {
      const summary = localized(c.summary_en, c.summary_hi);
      if (!summary || !saints.has(c.saint_id)) return [];
      const clip = {
        id: c.id,
        saintId: c.saint_id,
        youtubeId: c.youtube_id,
        start: c.start_seconds,
        end: c.end_seconds,
        language: c.language,
        summary,
      };
      return [[c.id, clip] as const];
    }),
  );
  const topics = new Map(rows.topics.map((t) => [t.id, t]));
  const questions = new Map(rows.questions.map((q) => [q.id, q]));

  const answered = rows.answers
    .flatMap((answer) => {
      const question = questions.get(answer.question_id);
      const topic = question ? topics.get(question.topic_id) : undefined;
      const text = question ? localized(question.text_en, question.text_hi) : null;
      if (answer.status === 'draft' || !question || !topic || !text) return [];
      const saintsSeen = new Set<string>();
      const clipIds = [...answer.clips]
        .sort((a, b) => a.position - b.position)
        .map((c) => c.clip_id)
        .filter((id) => liveClips.has(id))
        .filter((id) => {
          const saintId = liveClips.get(id)!.saintId;
          if (saintsSeen.has(saintId)) {
            report(`answer ${answer.id} repeats saint ${saintId}, so clip ${id} was left out`);
            return false;
          }
          saintsSeen.add(saintId);
          return true;
        })
        .slice(0, MAX_CLIPS);
      return clipIds.length >= MIN_LIVE_CLIPS ? [{ answer, question, topic, text, clipIds }] : [];
    })
    .sort(
      (a, b) =>
        a.topic.sort_order - b.topic.sort_order ||
        a.question.sort_order - b.question.sort_order ||
        a.question.id.localeCompare(b.question.id),
    );

  const paths = rows.paths
    .flatMap((p) => {
      const title = localized(p.title_en, p.title_hi);
      const description = localized(p.description_en, p.description_hi);
      const days = [...p.days].sort((a, b) => a.day - b.day);
      if (!title || !description || days.length !== PATH_DAYS || days.some((d, i) => d.day !== i + 1)) return [];
      return [
        {
          path: p,
          entry: {
            id: p.id,
            slug: p.slug,
            title,
            description,
            days: days.map((d) => ({
              day: d.day,
              clipId: d.clip_id && liveClips.has(d.clip_id) ? d.clip_id : null,
              verse: verseRef(d.verse_chapter, d.verse_number),
              step: stepText(d.step),
            })),
          },
        },
      ];
    })
    .sort((a, b) => a.path.sort_order - b.path.sort_order || a.path.slug.localeCompare(b.path.slug))
    .map(({ entry }) => entry);

  const usedClipIds = [
    ...new Set([...answered.flatMap((a) => a.clipIds), ...paths.flatMap((p) => p.days.map((d) => d.clipId))]),
  ].filter((id): id is string => id !== null);
  const clips = usedClipIds.map((id) => liveClips.get(id)!);
  const nameOf = (id: string) => saints.get(id)!.name;
  const saintIds = [...new Set(clips.map((c) => c.saintId))].sort((a, b) => {
    const [x, y] = [nameOf(a), nameOf(b)];
    return (x.en ?? x.hi ?? '').localeCompare(y.en ?? y.hi ?? '');
  });

  return parseCatalogue({
    version: 1,
    generatedAt: now.toISOString(),
    saints: saintIds.map((id) => saints.get(id)!),
    topics: [...new Map(answered.map((a) => [a.topic.id, a.topic])).values()].map((t) => ({
      id: t.id,
      slug: t.slug,
      name: localized(t.name_en, t.name_hi) ?? { en: t.slug },
      sortOrder: t.sort_order,
    })),
    questions: answered.map((a) => ({ id: a.question.id, topicId: a.topic.id, text: a.text })),
    clips,
    answers: answered.map((a) => ({
      id: a.answer.id,
      questionId: a.question.id,
      clipIds: a.clipIds,
      verse: verseRef(a.answer.verse_chapter, a.answer.verse_number),
      step: stepText(a.answer.step),
    })),
    paths,
    dailyVerses: rows.dailyVerses.map((v) => ({ chapter: v.chapter, verse: v.verse })),
  });
}
