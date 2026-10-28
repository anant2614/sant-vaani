import { THEME_PREFS } from '@sant-vaani/core';
import { StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Choice } from '@/components/Choice';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';

/** The look and the language for now; the rest of Settings follows with Ask and paths. */
export default function SettingsScreen() {
  const t = useStrings();
  const { prefs, city, update } = usePrefs();

  return (
    <Screen>
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
          >
            {pref === 'sun' ? (
              <Text variant="small" color="muted">
                {`${t.settingsScreen.city}: ${city.name}`}
              </Text>
            ) : null}
          </Choice>
        ))}
      </View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
});
