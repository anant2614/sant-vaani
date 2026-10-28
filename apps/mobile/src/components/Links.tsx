import { openBrowserAsync } from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { config } from '@/config';
import type { Strings } from '@/i18n/strings';
import { Text } from './Text';

const YOUTUBE_TERMS = 'https://www.youtube.com/t/terms';
const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';

/** YouTube's Terms and Google's Privacy Policy, which apply to every clip, then ours once the site is up. */
export function legalLinks(t: Strings): { label: string; url: string }[] {
  return [
    { label: t.welcome.youtubeTerms, url: YOUTUBE_TERMS },
    { label: t.welcome.googlePrivacy, url: GOOGLE_PRIVACY },
    ...(config.siteUrl
      ? [
          { label: t.welcome.ourTerms, url: `${config.siteUrl}/terms` },
          { label: t.welcome.ourPrivacy, url: `${config.siteUrl}/privacy` },
        ]
      : []),
  ];
}

/** Underlined links in a wrapping row, each opening in the in-app browser. */
export function Links({ links }: { links: { label: string; url: string }[] }) {
  return (
    <View style={styles.links}>
      {links.map((link) => (
        <Text
          key={link.url}
          variant="small"
          color="accentText"
          role="link"
          onPress={() => openBrowserAsync(link.url).catch(() => {})}
          style={styles.link}
        >
          {link.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  link: { textDecorationLine: 'underline', paddingVertical: 6 },
});
