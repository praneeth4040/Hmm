import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import ChannelDashboardScreen from '../screens/ChannelDashboardScreen';
import VideoDetailScreen from '../screens/VideoDetailScreen';
import PersonaEditorScreen from '../screens/PersonaEditorScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Dashboard"        component={DashboardScreen} />
      <Stack.Screen name="ChannelDashboard" component={ChannelDashboardScreen} />
      <Stack.Screen name="VideoDetail"      component={VideoDetailScreen} />
      <Stack.Screen name="PersonaEditor"    component={PersonaEditorScreen} />
    </Stack.Navigator>
  );
}
