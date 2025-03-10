import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Expense Tracker',
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 