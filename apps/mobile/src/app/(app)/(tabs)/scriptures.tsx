import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useChapters } from '@/gita/GitaProvider';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';
import { myVerses } from '@/user/localStore';
import { useUserData } from '@/user/UserDataProvider';

/** The Gita's chapters, with the verses the person saved or wrote about first. */
export default function ScripturesScreen() {
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const chapters = useChapters();
  const mine = myVerses(useUserData());
  const hindi = prefs.language === 'hi';
  const rowStyle = ({ pressed }: { pressed: boolean }) => [
    styles.row,
    { borderColor: tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
  ];

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="title" role="heading">
          {t.gita.title}
        </Text>
        <Text color="muted">{t.gita.summary}</Text>
      </View>

      {mine.length > 0 ? (
        <View style={styles.list} accessibilityLabel={t.gita.yourVerses}>
          <Text variant="eyebrow" color="muted">
            {t.gita.yourVerses}
          </Text>
          {mine.map((item) => {
            const reference = t.gitaRef(item.chapter, item.verse);
            return (
              <Pressable
                key={reference}
                role="button"
                accessibilityLabel={item.note ? `${reference}: ${item.note}` : reference}
                onPress={() => router.push(`/gita/${item.chapter}/${item.verse}`)}
                style={rowStyle}
              >
                <View style={styles.rowText}>
                  <Text variant="reference" color="accentText">
                    {reference}
                  </Text>
                  <Text variant="small" color="muted" numberOfLines={1}>
                    {item.note ?? t.gita.saved}
                  </Text>
                </View>
                <Icon name={item.note ? 'note' : 'bookmark'} color={tokens.muted} size={18} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.list}>
        {chapters?.map((chapter) => {
          const name = hindi ? chapter.nameSa : chapter.nameEn;
          const detail = `${hindi ? t.gita.chapter(chapter.number) : chapter.nameIast} · ${t.gita.verseCount(chapter.verseCount)}`;
          return (
            <Pressable
              key={chapter.number}
              role="button"
              accessibilityLabel={`${t.gita.chapter(chapter.number)}: ${name}`}
              onPress={() => router.push(`/gita/${chapter.number}`)}
              style={rowStyle}
            >
              <View style={[styles.number, { backgroundColor: tokens.surface2 }]}>
                <Text variant="strong" color="accentText">
                  {String(chapter.number)}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text variant="strong">{name}</Text>
                <Text variant="small" color="muted">
                  {detail}
                </Text>
              </View>
              <Icon name="chevron" color={tokens.muted} size={20} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  rowText: { flex: 1, gap: 2 },
  number: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
