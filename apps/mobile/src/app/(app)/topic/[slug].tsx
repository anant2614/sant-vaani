import { localize } from '@sant-vaani/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { BackHeader } from '@/components/BackHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';

/** A topic's curated questions; each opens the saints' answer. */
export default function TopicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const topic = index.topicBySlug(slug);
  const answers = topic ? index.answersForTopic(topic.id) : [];

  return (
    <Screen>
      <BackHeader label={t.topicLabel} backLabel={t.back} />
      <Text variant="title" role="heading">
        {topic ? localize(topic.name, prefs.language) : t.notFound}
      </Text>
      <View style={styles.list}>
        {answers.map((answer) => {
          const question = index.question(answer.questionId);
          if (!question) return null;
          const text = localize(question.text, prefs.language);
          return (
            <Pressable
              key={answer.id}
              role="button"
              accessibilityLabel={text}
              onPress={() => router.push(`/answer/${answer.id}`)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
              ]}
            >
              <Text variant="strong" style={styles.rowText}>
                {text}
              </Text>
              <Icon name="chevron" color={tokens.muted} size={20} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1 },
  rowText: { flex: 1 },
});
