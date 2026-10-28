import { formatDuration, localize, type Clip } from '@sant-vaani/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { HelplineLine } from '@/components/HelplineLine';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { VerseCard } from '@/components/VerseCard';
import { config } from '@/config';
import { useVerse } from '@/gita/GitaProvider';
import { useStrings } from '@/i18n/strings';
import { ClipPlayer } from '@/player/ClipPlayer';
import { usePlayerAllowed } from '@/player/usePlayerAllowed';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';
import { useIsSaved, useUserStore } from '@/user/UserDataProvider';

/**
 * The saints' answers to one question: a clip from each, played one at a
 * time in YouTube's own player, then a verse and one small step.
 */
export default function AnswerScreen() {
  const { id, helpline } = useLocalSearchParams<{ id: string; helpline?: string }>();
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index, refresh } = useCatalogue();
  const store = useUserStore();
  const saved = useIsSaved('answer', id);
  const playerAllowed = usePlayerAllowed();
  const [selected, setSelected] = useState<string | null>(null);
  const [looked, setLooked] = useState(false);

  const answer = index.answer(id);
  const question = answer ? index.question(answer.questionId) : undefined;
  const clips = answer ? index.clipsFor(answer) : [];
  const playing = clips.find((clip) => clip.id === selected) ?? clips[0];
  const verse = useVerse(answer?.verse ?? null);

  // An answer this copy of the catalogue lacks may be in a newer one.
  useEffect(() => {
    if (answer || looked) return;
    refresh().finally(() => setLooked(true));
  }, [answer, looked, refresh]);

  if (!answer || !question) {
    return (
      <Screen>
        <BackHeader backLabel={t.back} />
        {looked ? (
          <>
            <Text variant="title" role="heading">
              {t.answer.gone}
            </Text>
            <Button label={t.goToday} onPress={() => router.replace('/')} />
          </>
        ) : null}
      </Screen>
    );
  }

  const questionText = localize(question.text, prefs.language);
  const saints = new Set(clips.map((clip) => clip.saintId)).size;
  const saintName = (clip: Clip) => localize(index.saint(clip.saintId)?.name, prefs.language);

  const share = async () => {
    const link = config.shareBaseUrl ? `${config.shareBaseUrl}/a/${encodeURIComponent(answer.id)}` : null;
    try {
      const result = await Share.share({ message: t.answer.shareMessage(questionText, saints, link) });
      if (result.action === Share.sharedAction) track('answer_shared', { answer: answer.id });
    } catch (error) {
      console.warn('Sharing failed', error);
    }
  };

  const toggleSave = () => {
    if (!saved) track('answer_saved', { answer: answer.id });
    store.setSaved('answer', answer.id, !saved);
  };

  return (
    <Screen>
      <BackHeader
        label={t.answerLabel}
        backLabel={t.back}
        actions={
          <>
            <IconButton icon="bookmark" label={saved ? t.answer.unsave : t.answer.save} selected={saved} onPress={toggleSave} />
            <IconButton icon="share" label={t.answer.share} onPress={share} />
          </>
        }
      />

      <View style={styles.heading}>
        <Text variant="question" role="heading">
          {questionText}
        </Text>
        <Text variant="small" color="muted">
          {t.saintsAndMinutes(saints, index.answerMinutes(answer))}
        </Text>
      </View>

      {helpline ? <HelplineLine /> : null}

      {playing ? (
        playerAllowed ? (
          <ClipPlayer key={playing.id} clip={playing} title={saintName(playing)} />
        ) : (
          <View style={[styles.playerSpace, { backgroundColor: tokens.surface2 }]} />
        )
      ) : null}

      <View style={styles.list}>
        {clips.map((clip) => {
          const name = saintName(clip);
          const length = formatDuration(clip.end - clip.start);
          const summary = localize(clip.summary, prefs.language);
          const isPlaying = clip.id === playing?.id;
          return (
            <Pressable
              key={clip.id}
              role="button"
              accessibilityLabel={t.answer.clip(name, length, summary)}
              accessibilityState={{ selected: isPlaying }}
              onPress={() => setSelected(clip.id)}
              style={({ pressed }) => [
                styles.clip,
                {
                  borderColor: isPlaying ? tokens.accentText : tokens.line,
                  backgroundColor: pressed ? tokens.surface2 : tokens.surface,
                },
              ]}
            >
              <Avatar initials={index.saint(clip.saintId)?.initials ?? '·'} />
              <View style={styles.clipText}>
                <View style={styles.clipTitle}>
                  <Text variant="strong" style={styles.flex}>
                    {name}
                  </Text>
                  <Text variant="small" color="muted">
                    {length}
                  </Text>
                </View>
                <Text>{summary}</Text>
                {isPlaying ? (
                  <Text variant="small" color="accentText">
                    {t.answer.inPlayer}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {answer.verse ? (
        <VerseCard
          label={t.answer.fromTheGita}
          reference={t.gitaRef(answer.verse.chapter, answer.verse.verse)}
          verse={verse}
          language={prefs.language}
          onOpen={() => answer.verse && router.push(`/gita/${answer.verse.chapter}/${answer.verse.verse}`)}
        />
      ) : null}

      {answer.step ? (
        <View style={[styles.step, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
          <Text variant="eyebrow" color="muted">
            {t.answer.step}
          </Text>
          <Text variant="lead">{localize(answer.step, prefs.language)}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6 },
  playerSpace: { width: '100%', aspectRatio: 16 / 9, minHeight: 200, borderRadius: 16 },
  list: { gap: 10 },
  clip: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1 },
  clipText: { flex: 1, minWidth: 0, gap: 4 },
  clipTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  flex: { flex: 1 },
  step: { gap: 6, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1 },
});
