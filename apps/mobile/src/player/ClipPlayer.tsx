import { Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { config } from '@/config';
import { playerHtml, type ClipTiming } from './embed';

/** The page the player sits on. YouTube identifies embeds by this origin. */
const BASE_URL = config.siteUrl ?? 'https://santvaani.app';

/**
 * One clip in YouTube's own player. Nothing is drawn over it, it waits for
 * the person to press play, and screens unmount it when they close or go
 * out of view, which stops the sound. Links inside it, such as the YouTube
 * logo, open in YouTube instead of replacing the player.
 */
export function ClipPlayer({ clip, title }: { clip: ClipTiming; title: string }) {
  return (
    <View style={styles.frame}>
      <WebView
        source={{ html: playerHtml(clip, title), baseUrl: BASE_URL }}
        style={styles.player}
        accessibilityLabel={title}
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        allowsPictureInPictureMediaPlayback={false}
        scrollEnabled={false}
        bounces={false}
        onShouldStartLoadWithRequest={(request) => {
          if (!request.isTopFrame || request.url === 'about:blank' || request.url.startsWith(BASE_URL)) return true;
          Linking.openURL(request.url).catch(() => {});
          return false;
        }}
        onOpenWindow={(event) => Linking.openURL(event.nativeEvent.targetUrl).catch(() => {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  // YouTube requires at least 200 by 200; the player fills the width at 16:9.
  player: { width: '100%', aspectRatio: 16 / 9, minHeight: 200, minWidth: 200, backgroundColor: '#000' },
});
