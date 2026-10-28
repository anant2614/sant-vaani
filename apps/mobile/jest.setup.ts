import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// expo-crypto's native module has no Jest stand-in; Node's own random UUIDs do the same job.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

// Speech recognition is a native module with no Jest stand-in. Tests run as
// a phone without recognition, so the microphone button stays hidden.
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: () => false,
    requestPermissionsAsync: async () => ({ granted: false }),
    start() {},
    stop() {},
    abort() {},
  },
  useSpeechRecognitionEvent() {},
}));

// expo-notifications sets up listeners as soon as it is imported, which its
// native stand-ins cannot do. Tests get a quiet phone that allows nothing.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[test]' })),
  scheduleNotificationAsync: jest.fn(async () => 'path-reminder'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove() {} })),
}));

// The only web view in the app is the YouTube player. Tests see a plain view
// carrying the player's props, so they can read its page and settings.
jest.mock('react-native-webview', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { WebView: (props: object) => createElement(View, { testID: 'youtube-player', ...props }) };
});
