// ==========================================
// MenuMind — Type Definitions
// ==========================================
import { UserAllergy, MedicalCondition, DietaryPreference } from './risk';

export interface UserProfile {
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'keto' | 'diabetic_friendly' | 'heart_healthy';
  dietType: 'vegetarian' | 'vegan' | 'pescatarian' | 'anything';
  dailyCalories: number;
  proteinTarget: number;
  carbLimit: number;
  fiberLimit: number;
  /** Structured allergies with severity, used by the personalized risk engine. */
  allergies: UserAllergy[];
  /** Medical conditions relevant to condition-specific dietary risk rules. */
  conditions: MedicalCondition[];
  /** Additional dietary preferences beyond `dietType` (Jain, gluten-free, lactose-free). */
  dietaryPreferences: DietaryPreference[];
  cheatDayEnabled: boolean;
  onboardingComplete: boolean;
  /** User/clinician-configured daily hydration goal. Never auto-derived from medical conditions. */
  hydrationTargetMl: number;
  /** Body metrics, collected during onboarding for the BMR calculation and reused by the diet-recommendation matcher. */
  age: number;
  gender: 'male' | 'female';
  weightKg: number;
  heightCm: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
}

export interface MacroInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealEntry {
  id: string;
  name: string;
  macros: MacroInfo;
  timestamp: number;
  date: string; // YYYY-MM-DD
  restaurantName?: string;
  /** Snapshot of the personalized risk assessment at log time, if one was computed. */
  riskLevel?: import('./risk').RiskLevel;
  riskFactorSummaries?: string[];
}

export interface ParsedDish {
  name: string;
  description: string;
}

export interface DishWithMacros extends ParsedDish {
  macros: MacroInfo;
  matchType: 'exact' | 'partial' | 'keyword' | 'ai_estimated' | 'label_provided';
}

/** Raw extraction from a scanned packaged-food ingredient label. */
export interface PackagedFoodScanResult {
  productName: string;
  ingredientsText: string;
  allergenText: string;
  macros?: MacroInfo;
  servingSize?: string;
}

export interface HydrationLog {
  id: string;
  amountMl: number;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export type Verdict = 'top_pick' | 'good' | 'skip';

export interface RankedDish extends DishWithMacros {
  score: number;
  verdict: Verdict;
  reason: string; // Explainable AI reason
  warnings: string[]; // Things to avoid/watch out for
  customizationTip: string;
}

export interface RemainingBudget {
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CachedRestaurant {
  id: number;
  latitude: number;
  longitude: number;
  restaurantName: string;
  dishes: string; // JSON string of ParsedDish[]
  macros: string; // JSON string of DishWithMacros[]
  lastScanned: number;
}

export interface UserPreference {
  totalInteractions: number;
  loggedDishes: string[];   // dish names user accepted
  skippedDishes: string[];  // dish names user ignored
  preferenceNote: string;   // generated behavioral note
}

export * from './risk';
