import {
  ASK_THRESHOLD,
  HELPLINES,
  LEXICAL_THRESHOLD,
  lexicalMatch,
  normalizeQuestion,
  screenForCrisis,
  type AskableQuestion,
  type AskMatcher,
  type AskModelOutput,
  type AskRequest,
  type AskResponse,
} from '../_shared/core/index.ts';

export type AskLanguage = AskModelOutput['language'];

/** One row of the person's question history. A crisis never stores the text. */
export type AskRecord = {
  question: string | null;
  language: AskLanguage | null;
  result: AskResponse['kind'];
  questionId: string | null;
  confidence: number | null;
  topicSlugs: string[];
  matcher: 'model' | 'lexical' | 'none';
  backlogId: string | null;
};

export type BacklogEntry = { normalized: string; example: string; topicSlugs: string[] };

/** Everything handleAsk reads or writes, so tests can replace it. */
export type AskDeps = {
  userId: string;
  loadQuestions(): Promise<AskableQuestion[]>;
  classify(request: AskRequest, questions: AskableQuestion[]): Promise<AskModelOutput>;
  recordAsk(record: AskRecord): Promise<void>;
  addToBacklog(entry: BacklogEntry): Promise<string | null>;
  /** Counts this question for today; false once the daily limit is passed. */
  bumpUsage(): Promise<boolean>;
  /** Counts one Claude call against everyone's budget for today; false once it is spent. */
  claimModelCall(): Promise<boolean>;
};

const MAX_TOPICS = 3;
const DEVANAGARI = /[ऀ-ॿ]/;

function crisis(): AskResponse {
  return { kind: 'crisis', helplines: HELPLINES };
}

const nothing = { questionId: null, confidence: null, topicSlugs: [], backlogId: null };

/**
 * Routes a typed question to a curated answer. A crisis check runs first
 * and needs no model; then the model matches, with word overlap as the
 * fallback when it cannot be reached. Questions nothing answers well go
 * to the curators' backlog.
 */
export async function handleAsk(request: AskRequest, deps: AskDeps): Promise<AskResponse> {
  const text = request.question;

  if (screenForCrisis(text).crisis) {
    await deps.recordAsk({ ...nothing, question: null, language: null, result: 'crisis', matcher: 'none' });
    return crisis();
  }

  if (!(await deps.bumpUsage())) {
    await deps.recordAsk({ ...nothing, question: null, language: null, result: 'limited', matcher: 'none' });
    return { kind: 'limited' };
  }

  const questions = await deps.loadQuestions();
  const byId = new Map(questions.map((q) => [q.id, q]));
  const knownTopics = new Set(questions.map((q) => q.topicSlug));

  let matcher: AskRecord['matcher'];
  let language: AskLanguage;
  let ranked: { question: AskableQuestion; confidence: number }[];
  let topicSlugs: string[];
  let threshold: number;

  try {
    if (!(await deps.claimModelCall())) throw new Error("today's model budget is spent");
    const output = await deps.classify(request, questions);
    if (output.crisis) {
      await deps.recordAsk({ ...nothing, question: null, language: output.language, result: 'crisis', matcher: 'model' });
      return crisis();
    }
    matcher = 'model';
    language = output.language;
    threshold = ASK_THRESHOLD;
    ranked = output.matches
      .flatMap((m) => {
        const question = byId.get(m.question_id);
        return question ? [{ question, confidence: Math.min(1, Math.max(0, m.confidence)) }] : [];
      })
      .sort((a, b) => b.confidence - a.confidence);
    topicSlugs = output.topic_slugs;
  } catch (error) {
    console.error('ask: model unavailable, using word overlap', error);
    matcher = 'lexical';
    language = DEVANAGARI.test(text) ? 'hi' : 'en';
    threshold = LEXICAL_THRESHOLD;
    ranked = lexicalMatch(text, questions).flatMap((m) => {
      const question = byId.get(m.questionId);
      return question ? [{ question, confidence: m.score }] : [];
    });
    topicSlugs = [];
  }

  const best = ranked[0];
  if (best && best.confidence >= threshold) {
    await deps.recordAsk({
      question: text,
      language,
      result: 'answer',
      questionId: best.question.id,
      confidence: best.confidence,
      topicSlugs: [best.question.topicSlug],
      matcher,
      backlogId: null,
    });
    return { kind: 'answer', questionId: best.question.id, answerId: best.question.answerId, matchedBy: matchedBy(matcher) };
  }

  // Nearest topics: the ones the model named, then those of the weak matches.
  const nearest = [...new Set([...topicSlugs, ...ranked.map((r) => r.question.topicSlug)])]
    .filter((slug) => knownTopics.has(slug))
    .slice(0, MAX_TOPICS);
  const backlogId = await deps.addToBacklog({ normalized: normalizeQuestion(text), example: text, topicSlugs: nearest });
  await deps.recordAsk({
    question: text,
    language,
    result: 'nearest',
    questionId: best?.question.id ?? null,
    confidence: best?.confidence ?? null,
    topicSlugs: nearest,
    matcher,
    backlogId,
  });
  return { kind: 'nearest', topicSlugs: nearest, backlogId, matchedBy: matchedBy(matcher) };
}

function matchedBy(matcher: AskRecord['matcher']): AskMatcher {
  return matcher === 'model' ? 'model' : 'words';
}
