import { localize } from '@sant-vaani/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { BackHeader } from '@/components/BackHeader';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';

/** A topic's curated questions; each opens the saints' answer. */
export default function TopicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useStrings();
  const router = useRouter();
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
          return (
            <Row
              key={answer.id}
              title={localize(question.text, prefs.language)}
              onPress={() => {
                track('answer_opened', { answer: answer.id, from: 'topic' });
                router.push(`/answer/${answer.id}`);
              }}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
