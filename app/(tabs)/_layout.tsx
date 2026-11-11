import { Tabs } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FFD700', tabBarInactiveTintColor: '#aaa', headerShown: false, sceneStyle: { backgroundColor: '#13131f' }, tabBarStyle: { backgroundColor: '#13131f', borderTopColor: '#2a2a3e' } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Games',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cards-playing-spade-multiple" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sandbox"
        options={{
          title: 'Sandbox',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="pail" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
