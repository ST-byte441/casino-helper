import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FFD700', headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Games' }} />
      <Tabs.Screen name="sandbox" options={{ title: 'Sandbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
