import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { track } from '@/analytics';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { config } from '@/config';
import { useClock } from '@/clock';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';

const YOUTUBE_TERMS = 'https://www.youtube.com/t/terms';
const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';

/** The first screen: language, the 18+ question, and the terms that apply. */
export default function WelcomeScreen() {
  const t = useStrings();
  const router = useRouter();
  const clock = useClock();
  const { tokens } = useTheme();
  const { prefs, update } = usePrefs();
  const [adult, setAdult] = useState(false);

  const links = [
    { label: t.welcome.youtubeTerms, url: YOUTUBE_TERMS },
    { label: t.welcome.googlePrivacy, url: GOOGLE_PRIVACY },
    ...(config.siteUrl
      ? [
          { label: t.welcome.ourTerms, url: `${config.siteUrl}/terms` },
          { label: t.welcome.ourPrivacy, url: `${config.siteUrl}/privacy` },
        ]
      : []),
  ];

  return (
    <Screen gap={24} contentStyle={styles.content}>
      <View style={styles.intro}>
        <Svg width={88} height={88} viewBox="0 0 88 88" accessible={false}>
          <Circle cx="44" cy="40" r="40" fill={tokens.accent2} fillOpacity={0.3} />
          <Circle cx="44" cy="40" r="18" fill={tokens.accent} />
          <Path d="M8 62h72M18 72h52M30 82h28" stroke={tokens.accent2} strokeWidth={3} strokeLinecap="round" />
        </Svg>
        <Text variant="greeting" role="heading">
          {t.welcome.title}
        </Text>
        <Text variant="lead" color="muted">
          {t.welcome.tagline}
        </Text>
      </View>

      <View style={styles.group} role="radiogroup" accessibilityLabel={t.welcome.language}>
        <Text variant="eyebrow" color="muted">
          {t.welcome.language}
        </Text>
        <View style={styles.languages}>
          {(['en', 'hi'] as const).map((language) => (
            <View key={language} style={styles.language}>
              <Choice
                kind="radio"
                label={language === 'en' ? 'English' : 'हिन्दी'}
                checked={prefs.language === language}
                onPress={() => update({ language })}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Choice kind="checkbox" label={t.welcome.ageConfirm} checked={adult} onPress={() => setAdult(!adult)}>
          <Text variant="small" color="muted">
            {t.welcome.ageNote}
          </Text>
        </Choice>
        <Button
          label={t.welcome.next}
          disabled={!adult}
          onPress={() => {
            update({ ageConfirmedAt: clock().toISOString() });
            track('welcome_completed', { language: prefs.language });
            router.replace('/');
          }}
        />
      </View>

      <View style={styles.notes}>
        <Text variant="small" color="muted">
          {t.welcome.guidanceNote}
        </Text>
        <Text variant="small" color="muted">
          {t.welcome.youtubeNote}
        </Text>
        <View style={styles.links}>
          {links.map((link) => (
            <Text
              key={link.url}
              variant="small"
              color="accentText"
              role="link"
              onPress={() => openBrowserAsync(link.url)}
              style={styles.link}
            >
              {link.label}
            </Text>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  intro: { gap: 10 },
  group: { gap: 12 },
  languages: { flexDirection: 'row', gap: 10 },
  language: { flex: 1 },
  notes: { gap: 6 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  link: { textDecorationLine: 'underline', paddingVertical: 6 },
});
