import { localize, MAX_ASKS_PER_DAY, MAX_QUESTION_CHARS } from '@sant-vaani/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { track } from '@/analytics';
import { askQuestion, requestNotify } from '@/ask/askQuestion';
import { VoiceButton } from '@/ask/VoiceButton';
import { useAuth } from '@/auth/AuthProvider';
import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { Button } from '@/components/Button';
import { HelplineLine } from '@/components/HelplineLine';
import { PillButton } from '@/components/PillButton';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopicChips } from '@/components/TopicChips';
import { useStrings } from '@/i18n/strings';
import { registerForPush } from '@/notifications';
import { usePrefs } from '@/prefs/PrefsProvider';
import { fontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';
import { savedRefs } from '@/user/localStore';
import { useUserData } from '@/user/UserDataProvider';

type Notify = 'ready' | 'sending' | 'on' | 'failed';

type AskState =
  | { kind: 'idle' }
  | { kind: 'asking' }
  | { kind: 'nearest'; topicSlugs: string[]; backlogId: string | null; notify: Notify }
  | { kind: 'note'; text: string };

/**
 * Ask the saints in your own words, typed or spoken. A strong match opens
 * the saints' answer; anything else offers the nearest topics, and the
 * full list of topics is always there to browse.
 */
export default function AskScreen() {
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index, refresh } = useCatalogue();
  const { client, status, retry } = useAuth();
  const data = useUserData();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<AskState>({ kind: 'idle' });
  const [micBlocked, setMicBlocked] = useState(false);

  const text = question.trim();
  const connecting = client !== null && (status === 'waiting' || status === 'signing-in');
  const canAsk = text.length >= 2 && state.kind !== 'asking';

  async function ask() {
    setState({ kind: 'asking' });
    const outcome = await askQuestion(status === 'signed-in' ? client : null, { question: text, uiLanguage: prefs.language });
    track('ask_result', { kind: outcome.kind, checkedOn: outcome.checkedOn });

    switch (outcome.kind) {
      case 'crisis':
        // The helplines come before anything else, and the words leave the screen.
        setQuestion('');
        setState({ kind: 'idle' });
        router.push('/crisis');
        return;
      case 'answer':
        if (!index.answer(outcome.answerId)) await refresh();
        setState({ kind: 'idle' });
        track('answer_opened', { answer: outcome.answerId, from: 'ask' });
        // Word overlap cannot spot distress, so that answer opens with the helpline line.
        router.push(outcome.matchedBy === 'words' ? `/answer/${outcome.answerId}?helpline=1` : `/answer/${outcome.answerId}`);
        return;
      case 'nearest':
        setState({ kind: 'nearest', topicSlugs: outcome.topicSlugs, backlogId: outcome.backlogId, notify: 'ready' });
        return;
      case 'limited':
        setState({ kind: 'note', text: t.ask.limited(MAX_ASKS_PER_DAY) });
        return;
      case 'failed':
        if (outcome.reason === 'not-signed-in') {
          if (!client) return setState({ kind: 'note', text: t.ask.notSetUp });
          if (connecting) return setState({ kind: 'note', text: t.ask.connecting });
          // Signing in failed earlier, almost always for want of a connection.
          retry();
        }
        setState({ kind: 'note', text: outcome.reason === 'server' ? t.ask.unavailable : t.ask.offline });
        return;
    }
  }

  async function notifyMe(backlogId: string) {
    if (!client || state.kind !== 'nearest') return;
    setState({ ...state, notify: 'sending' });
    const ok = await requestNotify(client, backlogId);
    setState({ ...state, notify: ok ? 'on' : 'failed' });
    if (!ok) return;
    track('notify_requested', {});
    registerForPush(client).catch((error: unknown) => console.warn('Push registration failed', error));
  }

  const openTopic = (slug: string) => {
    track('topic_opened', { topic: slug, from: 'ask' });
    router.push(`/topic/${slug}`);
  };
  const chipFor = (slug: string) => {
    const topic = index.topicBySlug(slug);
    return topic ? [{ key: topic.slug, label: localize(topic.name, prefs.language) }] : [];
  };
  const nearest = state.kind === 'nearest' ? state.topicSlugs.flatMap(chipFor) : [];
  const others = index.topics
    .filter((topic) => index.answersForTopic(topic.id).length > 0 && !nearest.some((chip) => chip.key === topic.slug))
    .map((topic) => ({ key: topic.slug, label: localize(topic.name, prefs.language) }));
  const saved = savedRefs(data, 'answer').flatMap((id) => {
    const answer = index.answer(id);
    const savedQuestion = answer ? index.question(answer.questionId) : undefined;
    return answer && savedQuestion ? [{ id, text: localize(savedQuestion.text, prefs.language) }] : [];
  });

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="title" role="heading">
          {t.ask.title}
        </Text>
        <Text color="muted">{t.ask.lead}</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t.ask.placeholder}
          placeholderTextColor={tokens.muted}
          multiline
          maxLength={MAX_QUESTION_CHARS}
          accessibilityLabel={t.ask.label}
          textAlignVertical="top"
          style={[styles.input, { color: tokens.ink, backgroundColor: tokens.surface, borderColor: tokens.line }]}
        />
        <View style={styles.actions}>
          <VoiceButton
            language={prefs.language}
            onText={(heard) => {
              setMicBlocked(false);
              setQuestion(heard);
            }}
            onBlocked={() => setMicBlocked(true)}
          />
          <View style={styles.flex}>
            <Button label={t.ask.ask} disabled={!canAsk} onPress={ask} />
          </View>
        </View>
        {micBlocked ? (
          <Text variant="small" color="muted">
            {t.ask.micBlocked}
          </Text>
        ) : null}
        <Text variant="small" color="muted">
          {t.ask.aiNote}
        </Text>
      </View>

      <View accessibilityLiveRegion="polite" style={styles.result}>
        {state.kind === 'asking' ? <Text color="muted">{t.ask.asking}</Text> : null}
        {state.kind === 'note' ? (
          <>
            <Text variant="lead">{state.text}</Text>
            <HelplineLine />
          </>
        ) : null}
        {state.kind === 'nearest' ? (
          <View style={[styles.card, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
            <Text variant="lead">{t.ask.nearest}</Text>
            {nearest.length > 0 ? <TopicChips title={t.ask.nearestTopics} chips={nearest} onSelect={openTopic} /> : null}
            {state.backlogId && state.notify !== 'on' ? (
              <PillButton
                icon="bell"
                label={t.ask.notify}
                disabled={state.notify === 'sending'}
                onPress={() => state.backlogId && notifyMe(state.backlogId)}
              />
            ) : null}
            {state.notify === 'on' ? <Text>{t.ask.notifyOn}</Text> : null}
            {state.notify === 'failed' ? (
              <Text variant="small" color="muted">
                {t.ask.notifyFailed}
              </Text>
            ) : null}
            <HelplineLine />
          </View>
        ) : null}
      </View>

      {others.length > 0 ? (
        <TopicChips title={nearest.length > 0 ? t.ask.moreTopics : t.ask.browse} chips={others} onSelect={openTopic} />
      ) : null}

      {saved.length > 0 ? (
        <View style={styles.list}>
          <Text variant="eyebrow" color="muted">
            {t.ask.saved}
          </Text>
          {saved.map((item) => (
            <Row
              key={item.id}
              title={item.text}
              onPress={() => {
                track('answer_opened', { answer: item.id, from: 'saved' });
                router.push(`/answer/${item.id}`);
              }}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  form: { gap: 12 },
  input: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  result: { gap: 12 },
  card: { gap: 14, padding: 16, borderRadius: 20, borderWidth: 1 },
  list: { gap: 10 },
});
