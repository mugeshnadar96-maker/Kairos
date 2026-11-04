// ==========================================
// Diet Recommendation Reference Dataset
// ==========================================
// A bundled reference table of 1000 profile -> diet-recommendation cases
// (source: diet_recommendations_dataset). Recommendations are produced
// deterministically by finding the most similar reference cases to the
// user's profile and taking the majority vote — this is a k-nearest-
// neighbors lookup, not a live model call, so the result is reproducible
// and inspectable (the matched cases are returned as evidence). An LLM
// may only explain this result afterwards, never override it.
import raw from './dietRecommendationData.json';

export type DiseaseType = 'Diabetes' | 'Hypertension' | 'Obesity' | 'None';
export type Severity = 'Mild' | 'Moderate' | 'Severe';
export type ActivityLevel = 'Sedentary' | 'Moderate' | 'Active';
export type DietRecommendationLabel = 'Balanced' | 'Low_Carb' | 'Low_Sodium';

export interface DietCaseRecord {
  age: number;
  gender: 'Male' | 'Female';
  weightKg: number;
  heightCm: number;
  bmi: number;
  diseaseType: DiseaseType;
  severity: Severity;
  activityLevel: ActivityLevel;
  dailyCaloricIntake: number;
  cholesterol: number;
  bloodPressure: number;
  glucose: number;
  dietaryRestrictions: 'Low_Sodium' | 'Low_Sugar' | 'None';
  allergies: 'Gluten' | 'Peanuts' | 'None';
  weeklyExerciseHours: number;
  adherence: number;
  imbalanceScore: number;
  dietRecommendation: DietRecommendationLabel;
}

const dataset: DietCaseRecord[] = (raw as any[]).map(r => ({
  age: Number(r.Age),
  gender: r.Gender,
  weightKg: Number(r.Weight_kg),
  heightCm: Number(r.Height_cm),
  bmi: Number(r.BMI),
  diseaseType: r.Disease_Type,
  severity: r.Severity,
  activityLevel: r.Physical_Activity_Level,
  dailyCaloricIntake: Number(r.Daily_Caloric_Intake),
  cholesterol: Number(r['Cholesterol_mg/dL']),
  bloodPressure: Number(r.Blood_Pressure_mmHg),
  glucose: Number(r['Glucose_mg/dL']),
  dietaryRestrictions: r.Dietary_Restrictions,
  allergies: r.Allergies,
  weeklyExerciseHours: Number(r.Weekly_Exercise_Hours),
  adherence: Number(r.Adherence_to_Diet_Plan),
  imbalanceScore: Number(r.Dietary_Nutrient_Imbalance_Score),
  dietRecommendation: r.Diet_Recommendation,
}));

export interface DietQuery {
  age: number;
  gender: 'Male' | 'Female';
  bmi: number;
  diseaseType: DiseaseType;
  activityLevel: ActivityLevel;
  hasGlutenAllergy: boolean;
  hasPeanutAllergy: boolean;
}

export interface DietRecommendationResult {
  recommendation: DietRecommendationLabel;
  /** Fraction of the top-K nearest cases that agreed on this recommendation (0-1). */
  confidence: number;
  matchCount: number;
  breakdown: Partial<Record<DietRecommendationLabel, number>>;
  nearestCases: DietCaseRecord[];
}

const K = 25;

/**
 * Deterministic k-nearest-neighbor lookup against the bundled reference
 * dataset. Same query always produces the same result — no randomness, no
 * live call. Weights are fixed constants, not tuned/invented thresholds
 * for a medical claim; they only rank which reference cases are "most
 * similar" for the vote.
 */
export function recommendDiet(query: DietQuery): DietRecommendationResult {
  const scored = dataset.map(row => {
    let score = 0;
    if (row.diseaseType === query.diseaseType) score += 40;
    if (row.activityLevel === query.activityLevel) score += 15;
    if (row.gender === query.gender) score += 5;
    score += Math.max(0, 20 - Math.abs(row.bmi - query.bmi) * 2);
    score += Math.max(0, 10 - Math.abs(row.age - query.age) * 0.3);
    if (query.hasGlutenAllergy && row.allergies === 'Gluten') score += 10;
    if (query.hasPeanutAllergy && row.allergies === 'Peanuts') score += 10;
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, K);

  const breakdown: Partial<Record<DietRecommendationLabel, number>> = {};
  for (const { row } of top) {
    breakdown[row.dietRecommendation] = (breakdown[row.dietRecommendation] || 0) + 1;
  }
  const ranked = (Object.entries(breakdown) as [DietRecommendationLabel, number][]).sort((a, b) => b[1] - a[1]);
  const [bestRec, bestCount] = ranked[0];

  return {
    recommendation: bestRec,
    confidence: bestCount / top.length,
    matchCount: top.length,
    breakdown,
    nearestCases: top.slice(0, 5).map(t => t.row),
  };
}

export const DIET_RECOMMENDATION_DESCRIPTION: Record<DietRecommendationLabel, string> = {
  Balanced: 'A general balanced macronutrient split with no specific restriction emphasized.',
  Low_Carb: 'Emphasize reducing refined carbohydrates relative to protein and fat.',
  Low_Sodium: 'Emphasize reducing sodium/salt intake.',
};
