import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useState } from 'react';

import { track } from '@/analytics';
import { IconButton } from '@/components/IconButton';
import { useStrings } from '@/i18n/strings';
import type { AppLanguage } from '@/prefs/prefs';

function recognitionAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/**
 * Speak-your-question with the phone's own speech recognition, in Hindi or
 * Indian English to match the app. Words fill the question box as they are
 * heard; the person still reads them and presses Ask. Hidden where the
 * phone offers no recognition.
 */
export function VoiceButton({
  language,
  onText,
  onBlocked,
}: {
  language: AppLanguage;
  onText(text: string): void;
  /** The microphone or speech permission was refused. */
  onBlocked(): void;
}) {
  const t = useStrings();
  const [available] = useState(recognitionAvailable);
  const [listening, setListening] = useState(false);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript;
    if (text) onText(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error === 'not-allowed') onBlocked();
  });

  if (!available) return null;

  const toggle = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      onBlocked();
      return;
    }
    track('ask_voice_used', {});
    ExpoSpeechRecognitionModule.start({
      lang: language === 'hi' ? 'hi-IN' : 'en-IN',
      interimResults: true,
      continuous: false,
    });
  };

  return (
    <IconButton icon="mic" label={listening ? t.ask.stopListening : t.ask.speak} selected={listening} onPress={toggle} />
  );
}
