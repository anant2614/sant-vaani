import type { Chapter } from '@sant-vaani/core';
import type { ClipLiveness } from './clips';

// Row shapes the studio reads. The Supabase client is untyped, so each
// query names the shape it selects through rows() or row() in ./db.

export type TopicGroup = 'mind' | 'relationships' | 'work' | 'hardship' | 'spirit';

export type Topic = {
  id: string;
  slug: string;
  group_slug: TopicGroup;
  name_en: string;
  name_hi: string;
  sensitive: boolean;
  sort_order: number;
};

export type ClipLanguage = 'hi' | 'en' | 'mixed' | 'other';

/** A row of the clip_cards view. */
export type ClipCard = ClipLiveness & {
  id: string;
  video_id: string;
  saint_id: string;
  start_seconds: number;
  end_seconds: number;
  language: ClipLanguage;
  summary_en: string | null;
  summary_hi: string | null;
  sensitive: boolean;
  created_by: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  created_at: string;
  saint_name: string;
  youtube_id: string;
  video_title: string;
  topic_ids: string[];
  created_by_name: string | null;
};

export type VideoStatus = 'new' | 'suggesting' | 'suggested' | 'done' | 'ignored';

/** Where the overnight model suggests looking. */
export type Suggestion = { topic_slug: string; start: number; end: number; reason: string };

export type Video = {
  id: string;
  channel_id: string;
  youtube_id: string;
  title: string;
  description: string;
  published_at: string | null;
  duration_seconds: number;
  chapters: Chapter[];
  embeddable: boolean;
  privacy_status: 'public' | 'unlisted' | 'private' | 'gone';
  status: VideoStatus;
  suggestions: Suggestion[];
  fetched_at: string;
};

export type Saint = {
  id: string;
  slug: string;
  name_en: string | null;
  name_hi: string | null;
  initials: string;
  tradition: string | null;
  bio_en: string | null;
  bio_hi: string | null;
  taken_down: boolean;
  taken_down_at: string | null;
};

export type RightsBasis = 'official_embed' | 'written_permission' | 'license';

export type Channel = {
  id: string;
  saint_id: string;
  youtube_channel_id: string;
  handle: string | null;
  title: string;
  rights_basis: RightsBasis;
  active: boolean;
  last_fetched_at: string | null;
};

export type Question = {
  id: string;
  topic_id: string;
  text_en: string | null;
  text_hi: string | null;
  phrasings: string[];
  sort_order: number;
};

export type Step = { id: string; text_en: string | null; text_hi: string | null };

export type AnswerStatus = 'draft' | 'published' | 'needs_replacement';

export type Answer = {
  id: string;
  question_id: string;
  verse_chapter: number | null;
  verse_number: number | null;
  step_id: string | null;
  status: AnswerStatus;
  published_at: string | null;
};

export type BacklogStatus = 'open' | 'answered' | 'dismissed';

export type BacklogItem = {
  id: string;
  example: string;
  topic_slugs: string[];
  ask_count: number;
  first_asked_at: string;
  last_asked_at: string;
  status: BacklogStatus;
  question_id: string | null;
};

export type Path = {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  published: boolean;
  sort_order: number;
};

export type PathDay = {
  path_id: string;
  day: number;
  clip_id: string | null;
  verse_chapter: number | null;
  verse_number: number | null;
  step_id: string | null;
};
