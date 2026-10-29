import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useChapters, useChapterVerses } from '@/gita/GitaProvider';
import { verseSaveRef } from '@/gita/reader';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';
import { isSaved, noteFor } from '@/user/localStore';
import { useUserData } from '@/user/UserDataProvider';

/** A chapter's verses, each opening the reader. */
export default function ChapterScreen() {
  const params = useLocalSearchParams<{ chapter: string }>();
  const number = Number(params.chapter);
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const chapters = useChapters();
  const verses = useChapterVerses(number);
  const data = useUserData();
  const chapter = chapters?.find((c) => c.number === number);
  const hindi = prefs.language === 'hi';

  return (
    <Screen>
      <BackHeader label={chapter ? t.gita.chapter(chapter.number) : undefined} backLabel={t.back} />
      {chapter ? (
        <View style={styles.heading}>
          <Text variant="title" role="heading">
            {hindi ? chapter.nameSa : chapter.nameEn}
          </Text>
          <Text color="muted">
            {hindi ? t.gita.verseCount(chapter.verseCount) : `${chapter.nameIast} · ${t.gita.verseCount(chapter.verseCount)}`}
          </Text>
        </View>
      ) : chapters ? (
        <Text variant="title" role="heading">
          {t.notFound}
        </Text>
      ) : null}

      <View style={styles.list}>
        {chapter &&
          verses?.map((verse) => {
            const saved = isSaved(data, 'verse', verseSaveRef(verse));
            const noted = noteFor(data, verse.chapter, verse.verse) !== null;
            return (
              <Pressable
                key={verse.verse}
                role="button"
                accessibilityLabel={t.gitaRef(verse.chapter, verse.verse)}
                onPress={() => router.push(`/gita/${verse.chapter}/${verse.verse}`)}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: tokens.line, backgroundColor: pressed ? tokens.surface2 : tokens.surface },
                ]}
              >
                <Text variant="reference" color="accentText" style={styles.verseNumber}>
                  {String(verse.verse)}
                </Text>
                <Text variant="sanskrit" style={styles.firstLine} numberOfLines={2}>
                  {verse.sanskrit.split('\n')[0]}
                </Text>
                {noted ? <Icon name="note" color={tokens.muted} size={16} /> : null}
                {saved ? <Icon name="bookmark" color={tokens.accentText} size={16} filled /> : null}
              </Pressable>
            );
          })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  verseNumber: { minWidth: 24 },
  firstLine: { flex: 1, fontSize: 16, lineHeight: 26 },
});
