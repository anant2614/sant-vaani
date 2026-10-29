import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Whether a screen may keep its player: only while the screen is in front
 * and the app is open. Screens unmount the player otherwise, because that
 * is what stops the sound, and YouTube clips may not play in the
 * background.
 */
export function usePlayerAllowed(): boolean {
  const [focused, setFocused] = useState(true);
  const [open, setOpen] = useState(AppState.currentState !== 'background');

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setOpen(state !== 'background'));
    return () => subscription.remove();
  }, []);

  return focused && open;
}
