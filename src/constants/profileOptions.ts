// Shared option lists for the health/dietary profile UI (AIWizardScreen +
// OnboardingScreen), so both screens stay in sync instead of drifting.
import { Allergen, AllergySeverity, MedicalCondition, DietaryPreference } from '../types/risk';

export interface AllergenOption { key: Allergen; icon: string; }
export interface ConditionOption { key: MedicalCondition; icon: string; category: string; description: string; }
export interface DietaryPrefOption { key: DietaryPreference; icon: string; }

export const ALLERGEN_OPTIONS: AllergenOption[] = [
  { key: 'milk', icon: 'water' },
  { key: 'peanut', icon: 'alert-circle' },
  { key: 'tree_nut', icon: 'nutrition' },
  { key: 'egg', icon: 'restaurant' },
  { key: 'soy', icon: 'leaf-outline' },
  { key: 'wheat', icon: 'close-circle' },
  { key: 'shellfish', icon: 'fish' },
  { key: 'fish', icon: 'fish' },
  { key: 'sesame', icon: 'ellipse' },
];

export const CONDITION_OPTIONS: ConditionOption[] = [
  { key: 'diabetes', icon: 'medical', category: 'Metabolic', description: 'Flags refined-carb/sugar-heavy dishes' },
  { key: 'pcos', icon: 'medical', category: 'Metabolic', description: 'Flags refined-carb/sugar factors where relevant' },
  { key: 'high_cholesterol', icon: 'heart', category: 'Cardiovascular', description: 'Flags high-fat / fried dishes' },
  { key: 'hypertension', icon: 'pulse', category: 'Cardiovascular', description: 'Flags likely-high-sodium dishes' },
  { key: 'ckd', icon: 'water', category: 'Kidney', description: 'Flags sodium/protein-relevant dishes' },
  { key: 'gout', icon: 'body', category: 'Joint & Metabolic', description: 'Flags purine-rich foods (red meat, seafood)' },
  { key: 'celiac', icon: 'ban', category: 'Digestive', description: 'Flags any wheat/gluten-derived ingredient' },
  { key: 'lactose_intolerance', icon: 'water-outline', category: 'Digestive', description: 'Flags milk-derived ingredients' },
  { key: 'ibs', icon: 'body-outline', category: 'Digestive', description: 'Flags common trigger foods (onion, garlic, dairy, wheat)' },
  { key: 'gerd', icon: 'flame-outline', category: 'Digestive', description: 'Flags fried, spicy, or acidic trigger foods' },
];

export const DIETARY_PREF_OPTIONS: DietaryPrefOption[] = [
  { key: 'jain', icon: 'leaf' },
  { key: 'gluten_free', icon: 'leaf' },
  { key: 'lactose_free', icon: 'leaf' },
];

export const SEVERITY_ORDER: AllergySeverity[] = ['moderate', 'severe', 'mild'];
export const SEVERITY_ABBR: Record<AllergySeverity, string> = { mild: 'MILD', moderate: 'MOD', severe: 'SEVERE' };
