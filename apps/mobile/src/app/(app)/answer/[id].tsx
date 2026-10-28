import { formatDuration, localize } from '@sant-vaani/core';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';

/** The saints' clips for one curated question. */
export default function AnswerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useStrings();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const answer = index.answer(id);
  const question = answer ? index.question(answer.questionId) : undefined;

  return (
    <Screen>
      <BackHeader label={t.answerLabel} backLabel={t.back} />
      <Text variant="title" role="heading">
        {question ? localize(question.text, prefs.language) : t.notFound}
      </Text>
      <View style={styles.list}>
        {answer
          ? index.clipsFor(answer).map((clip) => {
              const saint = index.saint(clip.saintId);
              return (
                <View key={clip.id} style={[styles.clip, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
                  <Text variant="strong">{saint ? localize(saint.name, prefs.language) : ''}</Text>
                  <Text variant="small" color="muted">
                    {formatDuration(clip.end - clip.start)}
                  </Text>
                  <Text>{localize(clip.summary, prefs.language)}</Text>
                </View>
              );
            })
          : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  clip: { gap: 4, padding: 16, borderRadius: 20, borderWidth: 1 },
});
