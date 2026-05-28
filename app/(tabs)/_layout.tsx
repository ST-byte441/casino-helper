import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FFD700', tabBarInactiveTintColor: '#aaa', headerShown: false, sceneStyle: { backgroundColor: '#13131f' }, tabBarStyle: { backgroundColor: '#13131f', borderTopColor: '#2a2a3e' } }}>
      <Tabs.Screen name="index" options={{ title: 'Games' }} />
      <Tabs.Screen name="sandbox" options={{ title: 'Sandbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
