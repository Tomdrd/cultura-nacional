import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList, HomeTabsParamList } from '../types/navigation';
import { Home, Trophy, User, Settings } from 'lucide-react-native';
import { HomeScreen }            from '../screens/home/HomeScreen';
import { RankingScreen }         from '../screens/ranking/RankingScreen';
import { ProfileScreen }         from '../screens/profile/ProfileScreen';
import { PublicProfileScreen }   from '../screens/profile/PublicProfileScreen';
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
import { useTheme }              from '../hooks/useTheme';
import { HomeTheme }             from '../constants/colors';
import { useAuthStore }          from '../store/authStore';

const Tab   = createBottomTabNavigator<HomeTabsParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function HomeTabs() {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home')     return <Home     size={size} color={color} />;
          if (route.name === 'Ranking')  return <Trophy   size={size} color={color} />;
          if (route.name === 'Profile')  return <User     size={size} color={color} />;
          if (route.name === 'Settings') return <Settings size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}    options={{ title: 'Explorar' }} />
      <Tab.Screen name="Ranking"  component={RankingScreen} options={{ title: 'Ranking' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Config' }} />
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
    </Stack.Navigator>
  );
}
