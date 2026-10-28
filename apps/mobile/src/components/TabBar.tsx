import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { fontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const ROUTE_ICONS: Record<string, IconName> = {
  index: 'today',
  ask: 'ask',
  scriptures: 'scriptures',
  saints: 'saints',
  paths: 'paths',
};

/** The five tabs from the design: line icons, with the warm accent only on the current one. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { tokens } = useTheme();
  return (
    <View
      role="tablist"
      style={[
        styles.bar,
        { backgroundColor: tokens.navBg, borderTopColor: tokens.line, paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const options = descriptors[route.key]?.options;
        const label = typeof options?.title === 'string' ? options.title : route.name;
        const color = focused ? tokens.accentText : tokens.muted;
        return (
          <Pressable
            key={route.key}
            role="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
          >
            <Icon name={ROUTE_ICONS[route.name] ?? 'today'} color={color} />
            <Text variant="tab" style={[{ color }, focused && styles.focusedLabel]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  tab: { alignItems: 'center', gap: 3, width: 66, minHeight: 48, paddingTop: 4 },
  focusedLabel: { fontFamily: fontFamily.bodySemiBold },
});
