import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MealEntry, UserPreference, HydrationLog } from '../types';
import { UserAllergy, DietaryPreference } from '../types/risk';

const KEYS = {
  PROFILE: '@menumind_profile',
  MEALS: '@menumind_meals',
  PREFERENCES: '@menumind_preferences',
  HYDRATION: '@menumind_hydration',
};

export const DEFAULT_PROFILE: UserProfile = {
  goal: 'maintenance',
  dietType: 'anything',
  dailyCalories: 2000,
  proteinTarget: 120,
  carbLimit: 250,
  fiberLimit: 30,
  allergies: [],
  conditions: [],
  dietaryPreferences: [],
  cheatDayEnabled: false,
  onboardingComplete: false,
  hydrationTargetMl: 2000,
  age: 30,
  gender: 'male',
  weightKg: 70,
  heightCm: 170,
  activityLevel: 'moderate',
};

/**
 * Migrates a profile persisted before the personalized risk engine existed
 * (flat `restrictions: string[]` of 'dairy'/'gluten'/'nuts'/'soy') into the
 * new structured `allergies`/`dietaryPreferences` shape. Old restriction
 * chips were labeled "Allergies & Avoidances" in the UI, so they migrate
 * into moderate-severity allergies (the user can adjust severity in the
 * new profile screen) plus the matching dietary preference where relevant.
 */
function migrateProfile(raw: any): UserProfile {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROFILE };

  if (Array.isArray(raw.allergies) && Array.isArray(raw.conditions) && Array.isArray(raw.dietaryPreferences)) {
    // Already in the new shape.
    return { ...DEFAULT_PROFILE, ...raw };
  }

  const legacyRestrictions: string[] = Array.isArray(raw.restrictions) ? raw.restrictions : [];
  const allergies: UserAllergy[] = [];
  const dietaryPreferences: DietaryPreference[] = [];

  if (legacyRestrictions.includes('dairy')) {
    allergies.push({ allergen: 'milk', severity: 'moderate' });
    dietaryPreferences.push('lactose_free');
  }
  if (legacyRestrictions.includes('gluten')) {
    allergies.push({ allergen: 'wheat', severity: 'moderate' });
    dietaryPreferences.push('gluten_free');
  }
  if (legacyRestrictions.includes('nuts')) {
    allergies.push({ allergen: 'peanut', severity: 'moderate' });
    allergies.push({ allergen: 'tree_nut', severity: 'moderate' });
  }
  if (legacyRestrictions.includes('soy')) {
    allergies.push({ allergen: 'soy', severity: 'moderate' });
  }

  const { restrictions, ...rest } = raw;
  return { ...DEFAULT_PROFILE, ...rest, allergies, conditions: [], dietaryPreferences };
}

const DEFAULT_PREFERENCES: UserPreference = {
  totalInteractions: 0,
  loggedDishes: [],
  skippedDishes: [],
  preferenceNote: '',
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    if (data) {
      const migrated = migrateProfile(JSON.parse(data));
      // Persist the migration so we don't have to re-derive it every load.
      await saveProfile(migrated);
      return migrated;
    }
    return DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function getTodayMeals(): Promise<MealEntry[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEALS);
    if (!data) return [];
    const all: MealEntry[] = JSON.parse(data);
    const today = new Date().toISOString().split('T')[0];
    return all.filter((m) => m.date === today);
  } catch {
    return [];
  }
}

export async function getAllMeals(): Promise<MealEntry[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEALS);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function logMeal(meal: MealEntry): Promise<void> {
  const all = await getAllMeals();
  all.push(meal);
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(all));
}

export async function removeMeal(mealId: string): Promise<void> {
  const all = await getAllMeals();
  const filtered = all.filter((m) => m.id !== mealId);
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(filtered));
}

export async function getPreferences(): Promise<UserPreference> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PREFERENCES);
    if (data) return JSON.parse(data);
    return DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: UserPreference): Promise<void> {
  await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
}

export async function trackInteraction(dishName: string, accepted: boolean): Promise<void> {
  const prefs = await getPreferences();
  prefs.totalInteractions += 1;
  if (accepted) {
    prefs.loggedDishes.push(dishName);
  } else {
    prefs.skippedDishes.push(dishName);
  }
  if (prefs.totalInteractions >= 20) {
    const notes: string[] = [];
    const logCount = prefs.loggedDishes.length;
    const skipCount = prefs.skippedDishes.length;
    if (skipCount > logCount * 0.6) {
      notes.push('This user is very selective and skips most dishes.');
    }
    notes.push('Weight your ranking to favor protein-dense, lower-fat options based on their history.');
    prefs.preferenceNote = notes.join(' ');
  }
  await savePreferences(prefs);
}

export async function seedMockHistory(): Promise<void> {
  const existing = await getAllMeals();
  if (existing.length > 5) return; // Already seeded

  const mockMeals: MealEntry[] = [];
  const dishNames = ['Butter Chicken', 'Palak Paneer', 'Masala Dosa', 'Chicken Biryani', 'Chole Bhature', 'Dal Makhani', 'Tandoori Chicken', 'Aloo Gobi'];
  
  const today = new Date();
  
  // Generate 30 days of history
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 1 to 3 meals a day
    const mealsToday = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < mealsToday; j++) {
      const dish = dishNames[Math.floor(Math.random() * dishNames.length)];
      const isHealthy = Math.random() > 0.5;
      
      mockMeals.push({
        id: `mock_${i}_${j}`,
        name: dish,
        macros: {
          calories: isHealthy ? Math.floor(Math.random() * 300) + 200 : Math.floor(Math.random() * 600) + 400,
          protein: Math.floor(Math.random() * 30) + 10,
          carbs: Math.floor(Math.random() * 60) + 20,
          fat: Math.floor(Math.random() * 40) + 10,
          fiber: Math.floor(Math.random() * 10) + 2,
        },
        date: dateStr,
        timestamp: date.getTime(),
        restaurantName: 'Mock Restaurant',
      });
    }
  }
  
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify([...existing, ...mockMeals]));
}

// ---------- Hydration ----------
// Target is always user/clinician-configured (UserProfile.hydrationTargetMl).
// This module never infers or auto-adjusts a target from medical conditions.

export async function getAllHydrationLogs(): Promise<HydrationLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.HYDRATION);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getTodayHydrationMl(): Promise<number> {
  const all = await getAllHydrationLogs();
  const today = new Date().toISOString().split('T')[0];
  return all.filter(h => h.date === today).reduce((sum, h) => sum + h.amountMl, 0);
}

export async function logHydration(amountMl: number): Promise<void> {
  const all = await getAllHydrationLogs();
  all.push({
    id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
    amountMl,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
  });
  await AsyncStorage.setItem(KEYS.HYDRATION, JSON.stringify(all));
}
