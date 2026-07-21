import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList, HomeTabsParamList } from '../types/navigation';
import Home from 'lucide-react-native/dist/esm/icons/house';
import Trophy from 'lucide-react-native/dist/esm/icons/trophy';
import Bell from 'lucide-react-native/dist/esm/icons/bell';
import Settings from 'lucide-react-native/dist/esm/icons/settings';
import { scaleFont } from '../constants/layout';
import { HomeScreen }            from '../screens/home/HomeScreen';
import { RankingScreen }         from '../screens/ranking/RankingScreen';
import { ProfileScreen }         from '../screens/profile/ProfileScreen';
import { PublicProfileScreen }   from '../screens/profile/PublicProfileScreen';
import { FollowListScreen }      from '../screens/profile/FollowListScreen';
import { SettingsScreen }        from '../screens/settings/SettingsScreen';
import { QuizScreen }            from '../screens/quiz/QuizScreen';
import { DuelScreen }            from '../screens/duel/DuelScreen';
import { SubscriptionScreen }    from '../screens/subscription/SubscriptionScreen';
import { MissionsScreen }        from '../screens/missions/MissionsScreen';
import { AchievementsScreen }    from '../screens/achievements/AchievementsScreen';
import { ViralModeScreen }       from '../screens/viral/ViralModeScreen';
import { EstadosScreen }         from '../screens/estados/EstadosScreen';
import { CategoriasScreen }      from '../screens/categorias/CategoriasScreen';
import { MusicaScreen }          from '../screens/musica/MusicaScreen';
import { CidadeSetupScreen }     from '../screens/onboarding/CidadeSetupScreen';
import { AppEntryScreen }        from '../screens/AppEntryScreen';
import { NotificationsScreen }   from '../screens/notifications/NotificationsScreen';
import { useTheme }              from '../hooks/useTheme';
import { HomeTheme }             from '../constants/colors';
import { useAuthStore }          from '../store/authStore';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

const Tab   = createBottomTabNavigator<HomeTabsParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function NotificationBadge({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  return (
    <View style={{
      position: 'absolute', top: -4, right: -6,
      backgroundColor: '#E24B4A',
      borderRadius: 8, minWidth: 16, height: 16,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3,
    }}>
      <Text style={{ color: '#FFF', fontSize: scaleFont(9), fontWeight: '700', lineHeight: 17 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

function HomeTabs() {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const { count } = useUnreadNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor:  C.border,
          borderTopWidth:  0.5,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: scaleFont(11), fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home')          return <Home     size={size} color={color} />;
          if (route.name === 'Ranking')       return <Trophy   size={size} color={color} />;
          if (route.name === 'Settings')      return <Settings size={size} color={color} />;
          if (route.name === 'Notifications') return (
            <View style={{ position: 'relative' }}>
              <Bell size={size} color={color} />
              <NotificationBadge count={count} color={color} />
            </View>
          );
          return null;
        },
      })}
    >
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ title: 'Explorar' }} />
      <Tab.Screen name="Ranking"       component={RankingScreen}       options={{ title: 'Ranking' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notif.' }} />
      <Tab.Screen name="Settings"      component={SettingsScreen}      options={{ title: 'Config' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { cityNatalId } = useAuthStore();

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={cityNatalId === null ? 'CidadeSetup' : 'HomeTabs'}
    >
      <Stack.Screen name="HomeTabs"     component={HomeTabs} />
      <Stack.Screen name="AppEntry"     component={AppEntryScreen} />
      <Stack.Screen name="Quiz"         component={QuizScreen} />
      <Stack.Screen name="Duel"         component={DuelScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Missions"     component={MissionsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Estados"      component={EstadosScreen} />
      <Stack.Screen name="Categorias"   component={CategoriasScreen} />
      <Stack.Screen name="Musica"       component={MusicaScreen} />
      <Stack.Screen name="ViralMode"    component={ViralModeScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="CidadeSetup"  component={CidadeSetupScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="Profile"      component={ProfileScreen} />
      <Stack.Screen name="FollowList"    component={FollowListScreen} />
    </Stack.Navigator>
  );
}
