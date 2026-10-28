import { localize } from '@sant-vaani/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { track } from '@/analytics';
import { useCatalogue } from '@/catalogue/CatalogueProvider';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';

/** One saint and the questions their clips help answer. */
export default function SaintScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useStrings();
  const router = useRouter();
  const { prefs } = usePrefs();
  const { index } = useCatalogue();
  const saint = index.saint(id);
  const answers = saint ? index.answersForSaint(saint.id) : [];

  return (
    <Screen>
      <BackHeader label={t.tabs.saints} backLabel={t.back} />
      {saint ? (
        <>
          <View style={styles.heading}>
            <Avatar initials={saint.initials} size={72} />
            <Text variant="title" role="heading">
              {localize(saint.name, prefs.language)}
            </Text>
            {saint.tradition ? <Text color="muted">{saint.tradition}</Text> : null}
          </View>
          <View style={styles.list}>
            <Text variant="eyebrow" color="muted">
              {t.saints.theirAnswers}
            </Text>
            {answers.map((answer) => {
              const question = index.question(answer.questionId);
              if (!question) return null;
              return (
                <Row
                  key={answer.id}
                  title={localize(question.text, prefs.language)}
                  onPress={() => {
                    track('answer_opened', { answer: answer.id, from: 'saint' });
                    router.push(`/answer/${answer.id}`);
                  }}
                />
              );
            })}
          </View>
        </>
      ) : (
        <Text variant="title" role="heading">
          {t.notFound}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
  list: { gap: 10 },
});
