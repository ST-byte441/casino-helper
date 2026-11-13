import { Tabs } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const ACTIVE = '#FFD700'
const INACTIVE = '#aaa'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: ACTIVE, tabBarInactiveTintColor: INACTIVE, headerShown: false, sceneStyle: { backgroundColor: '#13131f' }, tabBarStyle: { backgroundColor: '#13131f', borderTopColor: '#2a2a3e' } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused, size }) => <MaterialCommunityIcons name="cards-playing-spade-multiple" size={size} color={focused ? ACTIVE : INACTIVE} />,
        }}
      />
      <Tabs.Screen
        name="sandbox"
        options={{
          title: 'Sandbox',
          tabBarIcon: ({ focused, size }) => <MaterialCommunityIcons name="pail" size={size} color={focused ? ACTIVE : INACTIVE} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, size }) => <MaterialCommunityIcons name="account" size={size} color={focused ? ACTIVE : INACTIVE} />,
        }}
      />
    </Tabs>
  )
}
