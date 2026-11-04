import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MealEntry, RemainingBudget, RankedDish, DishWithMacros } from '../types';
import { RiskAssessment } from '../types/risk';
import {
  getProfile, saveProfile, getTodayMeals, logMeal as storageLogMeal, removeMeal, trackInteraction, DEFAULT_PROFILE,
  getTodayHydrationMl, logHydration as storageLogHydration,
} from '../services/storageService';
import { ThemeMode, setThemeMode as applyThemeMode } from '../theme/colors';

interface AppContextType {
  isAuthenticated: boolean;
  login: (username: string, pass: string, isLogin: boolean) => Promise<void>;
  logout: () => Promise<void>;
  profile: UserProfile;
  updateProfile: (p: UserProfile) => Promise<void>;
  themeMode: ThemeMode;
  toggleTheme: () => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
  todayMeals: MealEntry[];
  refreshMeals: () => Promise<void>;
  addMeal: (meal: MealEntry) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  budget: RemainingBudget;
  // Scan results
  scannedDishes: RankedDish[];
  setScannedDishes: (d: RankedDish[]) => void;
  dishesWithMacros: DishWithMacros[];
  setDishesWithMacros: (d: DishWithMacros[]) => void;
  restaurantName: string;
  setRestaurantName: (n: string) => void;
  // Personalized risk assessments, keyed by dish name
  riskAssessments: Record<string, RiskAssessment>;
  setRiskAssessments: (r: Record<string, RiskAssessment>) => void;
  // Hydration (target is user/clinician-configured via profile.hydrationTargetMl)
  hydrationToday: number;
  refreshHydration: () => Promise<void>;
  logWater: (amountMl: number) => Promise<void>;
  // Track
  trackDish: (name: string, accepted: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [scannedDishes, setScannedDishes] = useState<RankedDish[]>([]);
  const [dishesWithMacros, setDishesWithMacros] = useState<DishWithMacros[]>([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [riskAssessments, setRiskAssessments] = useState<Record<string, RiskAssessment>>({});
  const [hydrationToday, setHydrationToday] = useState(0);

  const budget: RemainingBudget = {
    calories: Math.max(0, profile.dailyCalories - todayMeals.reduce((s, m) => s + m.macros.calories, 0)),
    protein: Math.max(0, profile.proteinTarget - todayMeals.reduce((s, m) => s + m.macros.protein, 0)),
    carbs: Math.max(0, profile.carbLimit - todayMeals.reduce((s, m) => s + m.macros.carbs, 0)),
    fiber: Math.max(0, profile.fiberLimit - todayMeals.reduce((s, m) => s + m.macros.fiber, 0)),
  };

  useEffect(() => {
    (async () => {
      // Mock check auth
      const auth = await AsyncStorage.getItem('@menumind_auth');
      if (auth) setIsAuthenticated(true);

      const savedTheme = await AsyncStorage.getItem('@menumind_theme');
      const nextTheme: ThemeMode = savedTheme === 'light' ? 'light' : 'dark';
      setThemeModeState(nextTheme);
      applyThemeMode(nextTheme);

      const p = await getProfile();
      setProfile(p);
      const m = await getTodayMeals();
      setTodayMeals(m);
      const hydration = await getTodayHydrationMl();
      setHydrationToday(hydration);
    })();
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    applyThemeMode(mode);
    await AsyncStorage.setItem('@menumind_theme', mode);
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    await setTheme(nextMode);
  }, [setTheme, themeMode]);

  const login = useCallback(async (username: string, pass: string, isLogin: boolean) => {
    // Basic mock auth
    await AsyncStorage.setItem('@menumind_auth', JSON.stringify({ username }));
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('@menumind_auth');
    await AsyncStorage.removeItem('@menumind_profile');
    setIsAuthenticated(false);
    setProfile({ ...DEFAULT_PROFILE });
  }, []);

  const updateProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await saveProfile(p);
  }, []);

  const refreshMeals = useCallback(async () => {
    const m = await getTodayMeals();
    setTodayMeals(m);
  }, []);

  const addMeal = useCallback(async (meal: MealEntry) => {
    await storageLogMeal(meal);
    await refreshMeals();
  }, [refreshMeals]);

  const deleteMeal = useCallback(async (id: string) => {
    await removeMeal(id);
    await refreshMeals();
  }, [refreshMeals]);

  const trackDish = useCallback(async (name: string, accepted: boolean) => {
    await trackInteraction(name, accepted);
  }, []);

  const refreshHydration = useCallback(async () => {
    const ml = await getTodayHydrationMl();
    setHydrationToday(ml);
  }, []);

  const logWater = useCallback(async (amountMl: number) => {
    await storageLogHydration(amountMl);
    await refreshHydration();
  }, [refreshHydration]);

  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout,
      profile, updateProfile,
      themeMode, toggleTheme, setTheme,
      todayMeals, refreshMeals, addMeal, deleteMeal,
      budget,
      scannedDishes, setScannedDishes,
      dishesWithMacros, setDishesWithMacros,
      restaurantName, setRestaurantName,
      riskAssessments, setRiskAssessments,
      hydrationToday, refreshHydration, logWater,
      trackDish,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
