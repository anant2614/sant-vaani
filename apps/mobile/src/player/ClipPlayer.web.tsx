import { StyleSheet, View } from 'react-native';

import { embedUrl, type ClipTiming } from './embed';

/** On the web the player is the plain YouTube embed, with the same rules as on phones. */
export function ClipPlayer({ clip, title }: { clip: ClipTiming; title: string }) {
  return (
    <View style={styles.player}>
      <iframe
        src={embedUrl(clip)}
        title={title}
        allow="encrypted-media; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    minHeight: 200,
    minWidth: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
