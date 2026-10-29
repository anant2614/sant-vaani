import type { VerseRef } from '@sant-vaani/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useChapters, useVerseLookup } from '@/gita/GitaProvider';
import { neighbours, verseRefFrom, verseSaveRef } from '@/gita/reader';
import { useStrings } from '@/i18n/strings';
import { usePrefs } from '@/prefs/PrefsProvider';
import { fontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';
import { isSaved, MAX_NOTE_LENGTH, noteFor } from '@/user/localStore';
import { useUserData, useUserStore } from '@/user/UserDataProvider';

/** One verse: Sanskrit, transliteration and meaning, with a save and the person's own note. */
export default function VerseScreen() {
  const params = useLocalSearchParams<{ chapter: string; verse: string }>();
  const ref = verseRefFrom(params.chapter, params.verse);
  // A new verse starts with a fresh note draft.
  return <Reader key={ref ? `${ref.chapter}.${ref.verse}` : 'none'} verseRef={ref} />;
}

function Reader({ verseRef }: { verseRef: VerseRef | null }) {
  const t = useStrings();
  const router = useRouter();
  const { tokens } = useTheme();
  const { prefs } = usePrefs();
  const verse = useVerseLookup(verseRef);
  const chapters = useChapters();
  const store = useUserStore();
  const data = useUserData();
  const [draft, setDraft] = useState<string | null>(null);

  if (!verseRef || verse === null) {
    return (
      <Screen>
        <BackHeader backLabel={t.back} />
        <Text variant="title" role="heading">
          {t.gita.notInGita}
        </Text>
      </Screen>
    );
  }

  const reference = t.gitaRef(verseRef.chapter, verseRef.verse);
  const saveRef = verseSaveRef(verseRef);
  const saved = isSaved(data, 'verse', saveRef);
  const note = noteFor(data, verseRef.chapter, verseRef.verse);
  const text = draft ?? note?.body ?? '';
  const changed = text.trim() !== (note?.body ?? '');
  const around = chapters ? neighbours(chapters, verseRef) : { previous: null, next: null };
  const meaning = verse && (prefs.language === 'hi' ? verse.meaningHi ?? verse.meaningEn : verse.meaningEn ?? verse.meaningHi);
  const goTo = (to: VerseRef) => router.setParams({ chapter: String(to.chapter), verse: String(to.verse) });

  return (
    <Screen gap={22}>
      <BackHeader label={reference} backLabel={t.back} />

      {verse ? (
        <View style={styles.verse}>
          {verse.speaker ? (
            <Text variant="sanskrit" color="muted" style={styles.speaker}>
              {verse.speaker}
            </Text>
          ) : null}
          <Text variant="sanskrit" style={styles.sanskrit} role="heading">
            {verse.sanskrit}
          </Text>
          <Text variant="lead" color="muted">
            {verse.transliteration}
          </Text>
          {meaning ? (
            <Text variant="lead">{meaning}</Text>
          ) : (
            <Text variant="small" color="muted">
              {t.gita.meaningSoon}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.loading} />
      )}

      <Pressable
        role="button"
        accessibilityLabel={saved ? t.gita.unsave : t.gita.save}
        accessibilityState={{ selected: saved }}
        onPress={() => store.setSaved('verse', saveRef, !saved)}
        style={({ pressed }) => [
          styles.saveButton,
          { borderColor: saved ? tokens.accentText : tokens.line },
          pressed && { backgroundColor: tokens.surface2 },
        ]}
      >
        <Icon name="bookmark" color={tokens.accentText} size={18} filled={saved} />
        <Text variant="strong" color={saved ? 'accentText' : 'ink'}>
          {saved ? t.gita.saved : t.gita.save}
        </Text>
      </Pressable>

      <View style={styles.note}>
        <Text variant="eyebrow" color="muted">
          {t.gita.yourNote}
        </Text>
        <TextInput
          value={text}
          onChangeText={setDraft}
          placeholder={t.gita.notePlaceholder}
          placeholderTextColor={tokens.muted}
          multiline
          maxLength={MAX_NOTE_LENGTH}
          accessibilityLabel={t.gita.yourNote}
          textAlignVertical="top"
          style={[styles.input, { color: tokens.ink, backgroundColor: tokens.surface, borderColor: tokens.line }]}
        />
        {/* A saved note needs no button until it is edited. */}
        {changed || !note ? (
          <Button
            label={t.gita.saveNote}
            disabled={!changed}
            onPress={async () => {
              await store.saveNote({ ...verseRef, body: text });
              setDraft(null);
            }}
          />
        ) : null}
        <View style={styles.noteFooter}>
          <Text variant="small" color="muted" style={styles.flex}>
            {t.gita.notePrivate}
          </Text>
          {note ? (
            <Text
              variant="small"
              color="accentText"
              role="button"
              onPress={async () => {
                await store.deleteNote(note.id);
                setDraft(null);
              }}
              style={styles.link}
            >
              {t.gita.deleteNote}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.pager}>
        {around.previous ? (
          <PagerButton
            icon="back"
            label={t.gitaRef(around.previous.chapter, around.previous.verse)}
            hint={t.gita.previous}
            onPress={() => around.previous && goTo(around.previous)}
          />
        ) : (
          <View />
        )}
        {around.next ? (
          <PagerButton
            icon="chevron"
            label={t.gitaRef(around.next.chapter, around.next.verse)}
            hint={t.gita.next}
            onPress={() => around.next && goTo(around.next)}
            trailing
          />
        ) : null}
      </View>
    </Screen>
  );
}

function PagerButton({
  icon,
  label,
  hint,
  onPress,
  trailing = false,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress(): void;
  trailing?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${hint}: ${label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pagerButton,
        { borderColor: tokens.line },
        pressed && { backgroundColor: tokens.surface2 },
      ]}
    >
      {trailing ? null : <Icon name={icon} color={tokens.ink} size={18} />}
      <Text variant="strong">{label}</Text>
      {trailing ? <Icon name={icon} color={tokens.ink} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  verse: { gap: 12 },
  speaker: { fontSize: 16, lineHeight: 26 },
  sanskrit: { fontSize: 22, lineHeight: 38 },
  loading: { minHeight: 220 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  note: { gap: 10 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  noteFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  link: { textDecorationLine: 'underline', paddingVertical: 6 },
  pager: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  pagerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
});
