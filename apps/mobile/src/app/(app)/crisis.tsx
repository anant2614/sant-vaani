import { HELPLINES } from '@sant-vaani/core';
import { openBrowserAsync } from 'expo-web-browser';
import { Linking, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { useTheme } from '@/theme/useTheme';

/** India's emergency number, for police, fire and ambulance. */
const EMERGENCY = '112';

const call = (number: string) => Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => {});

/**
 * What Ask shows when a question carries signs of self-harm or suicide:
 * free helplines first, before any clip. It works with no signal, since
 * the numbers ship inside the app.
 */
export default function CrisisScreen() {
  const t = useStrings();
  const { tokens } = useTheme();

  return (
    <Screen gap={22}>
      <BackHeader backLabel={t.back} />
      <View style={styles.heading}>
        <Text variant="title" role="heading">
          {t.crisis.title}
        </Text>
        <Text variant="lead">{t.crisis.lead}</Text>
      </View>

      {HELPLINES.map((helpline) => (
        <View key={helpline.id} style={[styles.card, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
          <View style={styles.cardText}>
            <Text variant="strong">{helpline.name}</Text>
            <Text color="muted">{t.crisis.helplines[helpline.id] ?? helpline.note}</Text>
          </View>
          {helpline.numbers.map((number, i) =>
            i === 0 ? (
              <Button key={number} label={t.crisis.call(number)} onPress={() => call(number)} />
            ) : (
              <PillButton key={number} icon="phone" label={t.crisis.call(number)} onPress={() => call(number)} />
            ),
          )}
          {helpline.url ? (
            <PillButton
              label={t.crisis.findHelpline}
              onPress={() => helpline.url && openBrowserAsync(helpline.url).catch(() => {})}
            />
          ) : null}
        </View>
      ))}

      <View style={styles.emergency}>
        <Text variant="strong">{t.crisis.emergency}</Text>
        <PillButton icon="phone" label={t.crisis.callEmergency} onPress={() => call(EMERGENCY)} />
      </View>

      <Text variant="small" color="muted">
        {t.crisis.note}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 10 },
  card: { gap: 12, padding: 18, borderRadius: 20, borderWidth: 1 },
  cardText: { gap: 4 },
  emergency: { gap: 10 },
});
