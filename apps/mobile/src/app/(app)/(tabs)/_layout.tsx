import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useStrings } from '@/i18n/strings';
import { useTheme } from '@/theme/useTheme';

export default function TabsLayout() {
  const t = useStrings();
  const { tokens } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.today }} />
      <Tabs.Screen name="ask" options={{ title: t.tabs.ask }} />
      <Tabs.Screen name="scriptures" options={{ title: t.tabs.scriptures }} />
      <Tabs.Screen name="saints" options={{ title: t.tabs.saints }} />
      <Tabs.Screen name="paths" options={{ title: t.tabs.paths }} />
    </Tabs>
  );
}
