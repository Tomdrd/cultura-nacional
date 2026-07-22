export interface State {
  id:       string;
  name:     string;
  uf:       string;
  region:   Region;
  capital:  string;
  flag_url: string | null;
}

export type Region =
  | 'Norte'
  | 'Nordeste'
  | 'Centro-Oeste'
  | 'Sudeste'
  | 'Sul';

export interface City {
  id:         string;
  name:       string;
  state_id:   string;
  state_uf:   string;
  latitude:   number;
  longitude:  number;
  population: number | null;
  is_capital: boolean;
}

export type Subcategory =
  | 'Cultura'
  | 'História'
  | 'Gastronomia'
  | 'Natureza'
  | 'Turismo'
  | 'Curiosidades'
  | 'Futebol';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id:           string;
  state_id:     string | null;
  city_id:      string | null;
  subcategory:  Subcategory;
  difficulty:   Difficulty;
  text:         string;
  options:      string[];
  answer_index: number;
  explanation:  string | null;
  image_url:    string | null;
}

export type Plan = 'free' | 'pro' | 'family' | 'education';

export interface Profile {
  id:               string;
  username:         string;
  avatar_url:       string | null;
  city_natal_id:    string | null;
  city_adoption_id: string | null;
  city_changed_at:  string | null;
  xp:               number;
  level:            number;
  streak:           number;
  last_played_at:   string | null;
  plan:             Plan;
  plan_expires_at:  string | null;
}

export interface Match {
  id:          string;
  player1_id:  string;
  player2_id:  string | null;
  state_id:    string | null;
  subcategory: Subcategory | null;
  status:      'waiting' | 'active' | 'finished';
  winner_id:   string | null;
  created_at:  string;
}

export interface MatchAnswer {
  id:           string;
  match_id:     string;
  user_id:      string;
  question_id:  string;
  answer_index: number;
  is_correct:   boolean;
  time_ms:      number;
}

export interface Badge {
  id:          string;
  name:        string;
  description: string;
  icon:        string;
  state_id:    string | null;
}

export interface CityRanking {
  city_id:  string;
  user_id:  string;
  xp:       number;
  position: number;
}

export type NavParamList = {
  Login:       undefined;
  Register:    undefined;
  Home:        undefined;
  Quiz:        { stateId: string; subcategory: Subcategory };
  QuizResult:  { correct: number; total: number; xp: number };
  Duel:        { matchId?: string };
  DuelResult:  { matchId: string };
  Profile:     { userId?: string };
  Settings:    undefined;
  Ranking:     { scope: 'city' | 'state' | 'national' };
  StateDetail: { stateId: string };
};
