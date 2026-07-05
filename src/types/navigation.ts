export type AuthStackParamList = {
  Login:         undefined;
  Register:      undefined;
  Onboarding:    undefined;
  ResetPassword: undefined;
};

export type AppStackParamList = {
  HomeTabs:     undefined;
  Onboarding:   { fromProfile?: boolean };
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
  Duel:         undefined;
  Subscription: undefined;
  Missions:     undefined;
  Achievements: undefined;
  CidadeSetup: undefined;
  ViralMode: {
    stateId?:     string;
    stateName?:   string;
    subcategory?: string;
  };
};

export type HomeTabsParamList = {
  Home:     undefined;
  Ranking:  undefined;
  Profile:  undefined;
  Settings: undefined;
};
