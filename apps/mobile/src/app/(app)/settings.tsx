import { CITIES, THEME_PREFS } from '@sant-vaani/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { resetAnalytics, track } from '@/analytics';
import { useAuth } from '@/auth/AuthProvider';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { legalLinks, Links } from '@/components/Links';
import { PillButton } from '@/components/PillButton';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { allowNotifications } from '@/notifications';
import { scheduleReminder } from '@/paths/reminders';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';
import { deleteAccount } from '@/user/sync';
import { useUserStore } from '@/user/UserDataProvider';

/** Times offered for the daily path reminder: early morning and evening. */
const REMINDER_TIMES = ['06:00', '07:00', '08:00', '20:00', '21:00'];

type Deleting = 'closed' | 'confirm' | 'working' | 'failed';

/** The look, language, sunset city and reminder, the terms that apply, and deleting the account. */
export default function SettingsScreen() {
  const t = useStrings();
  const { prefs, city, update } = usePrefs();
  const { client } = useAuth();
  const store = useUserStore();
  const [choosingCity, setChoosingCity] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [deleting, setDeleting] = useState<Deleting>('closed');

  const chooseReminder = async (time: string | null) => {
    if (time && !(await allowNotifications({ ask: true }))) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    update({ reminderTime: time });
    track('reminder_set', { time });
  };

  const deleteEverything = async () => {
    setDeleting('working');
    try {
      await deleteAccount(client, store);
    } catch (error) {
      console.warn('Account deletion failed', error);
      setDeleting('failed');
      return;
    }
    resetAnalytics();
    // The welcome screen replaces the app before its reminder hook sees the
    // cleared time, so the reminder is turned off here.
    await scheduleReminder(null, t.reminder).catch((error: unknown) => console.warn('Could not cancel the reminder', error));
    // Without the age confirmation the welcome screen takes over, as on a new phone.
    update({ ageConfirmedAt: null, cityId: null, reminderTime: null });
  };

  return (
    <Screen gap={24}>
      <BackHeader backLabel={t.back} />
      <Text variant="title" role="heading">
        {t.settings}
      </Text>

      <View style={styles.group} role="radiogroup" accessibilityLabel={t.settingsScreen.look}>
        <Text variant="eyebrow" color="muted">
          {t.settingsScreen.look}
        </Text>
        {THEME_PREFS.map((pref) => (
          <Choice
            key={pref}
            kind="radio"
            label={t.settingsScreen.themes[pref]}
            checked={prefs.themePref === pref}
            onPress={() => update({ themePref: pref })}
          />
        ))}
      </View>

      {prefs.themePref === 'sun' ? (
        <View style={styles.group}>
          <Text variant="eyebrow" color="muted">
            {t.settingsScreen.city}
          </Text>
          <Row
            title={city.name}
            detail={t.settingsScreen.changeCity}
            label={`${t.settingsScreen.city}: ${city.name}. ${t.settingsScreen.changeCity}`}
            onPress={() => setChoosingCity(!choosingCity)}
          />
          {choosingCity ? (
            <View style={styles.group} role="radiogroup" accessibilityLabel={t.settingsScreen.city}>
              {CITIES.map((option) => (
                <Choice
                  key={option.id}
                  kind="radio"
                  label={option.name}
                  checked={option.id === city.id}
                  onPress={() => {
                    update({ cityId: option.id });
                    setChoosingCity(false);
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.group} role="radiogroup" accessibilityLabel={t.settingsScreen.language}>
        <Text variant="eyebrow" color="muted">
          {t.settingsScreen.language}
        </Text>
        {(['en', 'hi'] as const).map((language) => (
          <Choice
            key={language}
            kind="radio"
            label={language === 'en' ? 'English' : 'हिन्दी'}
            checked={prefs.language === language}
            onPress={() => update({ language })}
          />
        ))}
      </View>

      <View style={styles.group}>
        <Text variant="eyebrow" color="muted">
          {t.settingsScreen.reminder}
        </Text>
        <Text color="muted">{t.settingsScreen.reminderNote}</Text>
        <View style={styles.chips} role="radiogroup" accessibilityLabel={t.settingsScreen.reminder}>
          {[null, ...REMINDER_TIMES].map((time) => (
            <TimeChip
              key={time ?? 'off'}
              label={time ? t.timeOfDay(...hoursAndMinutes(time)) : t.settingsScreen.reminderOff}
              checked={prefs.reminderTime === time}
              onPress={() => chooseReminder(time)}
            />
          ))}
        </View>
        {blocked ? (
          <Text variant="small" color="muted">
            {t.settingsScreen.notificationsBlocked}
          </Text>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text variant="eyebrow" color="muted">
          {t.settingsScreen.about}
        </Text>
        <Text variant="small" color="muted">
          {t.welcome.guidanceNote}
        </Text>
        <Text variant="small" color="muted">
          {t.settingsScreen.youtubeApi}
        </Text>
        <Text variant="small" color="muted">
          {t.ask.aiNote}
        </Text>
        <Links links={legalLinks(t)} />
      </View>

      <View style={styles.group}>
        {deleting === 'closed' ? (
          <PillButton label={t.settingsScreen.deleteAccount} onPress={() => setDeleting('confirm')} />
        ) : (
          <DeleteConfirm
            working={deleting === 'working'}
            failed={deleting === 'failed'}
            onConfirm={deleteEverything}
            onCancel={() => setDeleting('closed')}
          />
        )}
      </View>
    </Screen>
  );
}

function hoursAndMinutes(time: string): [number, number] {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return [hours, minutes];
}

function TimeChip({ label, checked, onPress }: { label: string; checked: boolean; onPress(): void }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: checked ? tokens.accentText : tokens.line,
          backgroundColor: pressed ? tokens.surface2 : tokens.surface,
        },
      ]}
    >
      <Text variant={checked ? 'strong' : 'body'} color={checked ? 'accentText' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

function DeleteConfirm({
  working,
  failed,
  onConfirm,
  onCancel,
}: {
  working: boolean;
  failed: boolean;
  onConfirm(): void;
  onCancel(): void;
}) {
  const t = useStrings();
  const { tokens } = useTheme();
  return (
    <View style={[styles.card, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
      <Text variant="strong">{t.settingsScreen.deleteAccount}</Text>
      <Text>{t.settingsScreen.deleteWarning}</Text>
      <Button
        label={working ? t.settingsScreen.deleting : t.settingsScreen.deleteConfirm}
        disabled={working}
        onPress={onConfirm}
      />
      <PillButton label={t.settingsScreen.deleteCancel} disabled={working} onPress={onCancel} />
      {failed ? (
        <Text variant="small" color="muted">
          {t.settingsScreen.deleteFailed}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  card: { gap: 12, padding: 16, borderRadius: 20, borderWidth: 1 },
});
