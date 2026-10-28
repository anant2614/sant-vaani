import { TOPIC_GROUPS } from '@/lib/format';
import type { Question, Topic, TopicGroup } from '@/lib/types';

/** The fields of a curated question, shared by the new-question and edit forms. */
export function QuestionFields({
  topics,
  question,
  topicId,
  phrasings,
}: {
  topics: Topic[];
  question?: Question;
  topicId?: string;
  phrasings?: string[];
}) {
  const groups = Object.keys(TOPIC_GROUPS) as TopicGroup[];
  return (
    <>
      <label className="field">
        <span>Topic</span>
        <select name="topicId" defaultValue={question?.topic_id ?? topicId ?? ''} required>
          <option value="" disabled>
            Choose a topic
          </option>
          {groups.map((group) => (
            <optgroup key={group} label={TOPIC_GROUPS[group]}>
              {topics
                .filter((t) => t.group_slug === group)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_en} · {t.name_hi}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Question in English</span>
        <input name="textEn" defaultValue={question?.text_en ?? ''} placeholder="How do I stop overthinking at night?" />
      </label>
      <label className="field">
        <span>Question in Hindi</span>
        <input name="textHi" className="hindi" lang="hi" defaultValue={question?.text_hi ?? ''} />
      </label>
      <label className="field">
        <span>Other ways people ask it</span>
        <textarea
          name="phrasings"
          defaultValue={(question?.phrasings ?? phrasings ?? []).join('\n')}
          placeholder={'One per line, in English, Hindi or Hinglish\nraat ko neend nahi aati, sochta rehta hoon'}
          rows={4}
        />
        <small>Ask also matches questions against these.</small>
      </label>
    </>
  );
}
