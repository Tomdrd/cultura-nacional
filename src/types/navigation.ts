export type AuthStackParamList = {
  Login:         undefined;
  Register:      undefined;
  ResetPassword: undefined;
};

export type AppStackParamList = {
  HomeTabs:     undefined;
  Estados:      undefined;
  Categorias:   undefined;
  Musica:       undefined;
  CityQuiz:     { cityId: string; cityName: string };
  Quiz: {
    stateId?:     string;
    stateName?:   string;
    subcategory?: string;
    mode?:        'relampago';
  };
  Duel:          undefined;
  Subscription:  undefined;
  Missions:      undefined;
  Achievements:  undefined;
  CidadeSetup:   undefined;
  Profile:       undefined;
  ViralMode: {
    stateId?:     string;
    stateName?:   string;
    subcategory?: string;
  };
  PublicProfile: { userId: string };
};

export type HomeTabsParamList = {
  Home:          undefined;
  Ranking:       undefined;
  Notifications: undefined;
  Settings:      undefined;
};
