// ==========================================
// KAIROS — Personalized Dietary Risk Types
// ==========================================
// Structured types for the allergen/ingredient/condition risk engine.
// The risk engine is deterministic; the LLM/chatbot only narrates these
// structured results — it never invents a risk level on its own.

export type Allergen =
  | 'milk'
  | 'peanut'
  | 'tree_nut'
  | 'egg'
  | 'soy'
  | 'wheat'
  | 'shellfish'
  | 'fish'
  | 'sesame';

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface UserAllergy {
  allergen: Allergen;
  severity: AllergySeverity;
}

export type MedicalCondition =
  | 'diabetes'
  | 'hypertension'
  | 'ckd'
  | 'pcos'
  | 'high_cholesterol'
  | 'gout'
  | 'celiac'
  | 'lactose_intolerance'
  | 'ibs'
  | 'gerd';

export type DietaryPreference = 'jain' | 'gluten_free' | 'lactose_free';

// How an ingredient mention relates to the underlying source/allergen.
export type IngredientRelation = 'direct' | 'derived' | 'unknown';

// How certain the system is about a specific finding.
export type InformationStatus = 'confirmed' | 'likely' | 'needs_verification' | 'unknown';

// Overall / per-factor risk level. Never "safe" or "healthy" — always
// framed as "relevant concern identified from available information".
export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red' | 'grey';

// Distinct allergen-declaration semantics — never collapse these into each other.
export type AllergenPresence = 'contains' | 'derived_from' | 'may_contain' | 'cross_contact' | 'unknown';

export interface IngredientKnowledgeEntry {
  canonicalName: string;
  aliases: string[];
  parentSource: Allergen | null;
  category: string;
  allergenRelationship: Allergen[];
  dietaryRelevance: DietaryPreference[];
  notVegan?: boolean;
  notVegetarian?: boolean;
  evidenceStatus: InformationStatus;
}

export interface EvidenceItem {
  finding: string;
  source: string;
  evidenceText: string;
  status: InformationStatus;
  timestamp: number;
}

export interface AllergenFinding {
  allergen: Allergen;
  presence: AllergenPresence;
  ingredient: string;
  relation: IngredientRelation;
  severity: AllergySeverity;
  evidence: EvidenceItem;
}

export interface ConditionFactor {
  condition: MedicalCondition;
  factor: string;
  status: InformationStatus;
  evidence: EvidenceItem;
}

export interface RiskFactor {
  id: string;
  category: 'allergy' | 'condition' | 'dietary_preference' | 'uncertainty';
  level: RiskLevel;
  summary: string;
  detectedIngredient?: string;
  relation?: IngredientRelation;
  userFactor: string;
  evidence: EvidenceItem[];
  status: InformationStatus;
}

export interface RiskAssessment {
  foodId: string;
  foodName: string;
  overallStatus: RiskLevel;
  riskFactors: RiskFactor[];
  allergens: AllergenFinding[];
  conditionFactors: ConditionFactor[];
  evidence: EvidenceItem[];
  unknowns: string[];
  recommendedVerification: string[];
  possibleModifications: string[];
  questionsToAsk: string[];
  generatedAt: number;
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  green: 'No relevant concern identified',
  yellow: 'Attention recommended',
  orange: 'Significant dietary factor detected',
  red: 'High-priority concern',
  grey: 'Insufficient information',
};

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  milk: 'Milk',
  peanut: 'Peanut',
  tree_nut: 'Tree Nut',
  egg: 'Egg',
  soy: 'Soy',
  wheat: 'Wheat',
  shellfish: 'Shellfish',
  fish: 'Fish',
  sesame: 'Sesame',
};

export const CONDITION_LABEL: Record<MedicalCondition, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  ckd: 'Chronic Kidney Disease',
  pcos: 'PCOS',
  high_cholesterol: 'High Cholesterol',
  gout: 'Gout',
  celiac: 'Celiac Disease',
  lactose_intolerance: 'Lactose Intolerance',
  ibs: 'IBS',
  gerd: 'GERD / Acid Reflux',
};

export const DIETARY_PREFERENCE_LABEL: Record<DietaryPreference, string> = {
  jain: 'Jain',
  gluten_free: 'Gluten-Free',
  lactose_free: 'Lactose-Free',
};

// ---------- Cook at Home (recipe-level) ----------

export interface RecipeIngredientFlag {
  ingredient: string; // as it appears in the recipe's ingredient list
  canonicalName?: string;
  severity: RiskLevel;
  reason: string;
  relation?: IngredientRelation;
  userFactor: string;
  alternative?: string;
}

export interface RecipeAssessment {
  recipeName: string;
  overallStatus: RiskLevel;
  totalIngredients: number;
  flaggedIngredients: RecipeIngredientFlag[];
  unknowns: string[];
}
