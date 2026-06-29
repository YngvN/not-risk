import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../src/components/layout/FloatingTabBar';

/**
 * Tab group layout.
 * The default tab bar is hidden; navigation is handled by FloatingTabBar —
 * a floating 3-dot button that opens a slide-up panel.
 */
export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index"      options={{ title: 'fRISKy' }} />
        <Tabs.Screen name="game"       options={{ title: 'Game' }} />
        <Tabs.Screen name="lobby"      options={{ title: 'LAN' }} />
        <Tabs.Screen name="map"        options={{ title: 'Map' }} />
        <Tabs.Screen name="settings"   options={{ title: 'Settings' }} />
        <Tabs.Screen name="components" options={{ title: 'Components' }} />
      </Tabs>

      <FloatingTabBar />
    </View>
  );
}
