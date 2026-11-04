// Maps a UserProfile to the diet-recommendation dataset's query shape,
// gets a deterministic recommendation from the local kNN lookup, and asks
// Groq's text model (NOT the vision model — this is text-only) to explain
// that already-decided result in plain language. Groq never picks the
// recommendation itself.
import { UserProfile } from '../types';
import {
  recommendDiet, DietQuery, DietRecommendationResult, DIET_RECOMMENDATION_DESCRIPTION,
} from '../data/dietRecommendationDB';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TEXT_MODEL = process.env.EXPO_PUBLIC_GROQ_TEXT_MODEL || 'openai/gpt-oss-120b';

export function profileToDietQuery(profile: UserProfile): DietQuery {
  const heightM = (profile.heightCm || 170) / 100;
  const bmi = (profile.weightKg || 70) / (heightM * heightM);

  // The dataset only has a single Disease_Type per case. A user can have
  // multiple conditions, so we pick the one most likely to dominate dietary
  // guidance. This is a deliberate simplification of a multi-label reality
  // into the dataset's single-label schema, not a medical priority claim.
  let diseaseType: DietQuery['diseaseType'] = 'None';
  if (profile.conditions.includes('diabetes')) diseaseType = 'Diabetes';
  else if (profile.conditions.includes('hypertension')) diseaseType = 'Hypertension';
  else if (bmi >= 30) diseaseType = 'Obesity';

  // Dataset only has 3 activity tiers; our profile has 4 ('light' folds into 'Moderate').
  const activityLevel: DietQuery['activityLevel'] =
    profile.activityLevel === 'sedentary' ? 'Sedentary' :
    profile.activityLevel === 'active' ? 'Active' : 'Moderate';

  return {
    age: profile.age || 30,
    gender: profile.gender === 'female' ? 'Female' : 'Male',
    bmi,
    diseaseType,
    activityLevel,
    hasGlutenAllergy: profile.allergies.some(a => a.allergen === 'wheat'),
    hasPeanutAllergy: profile.allergies.some(a => a.allergen === 'peanut'),
  };
}

export function getDietRecommendation(profile: UserProfile): DietRecommendationResult {
  return recommendDiet(profileToDietQuery(profile));
}

/**
 * Falls back to a template sentence (no network call) if Groq is
 * unavailable — the recommendation itself never depends on this call
 * succeeding.
 */
function templateExplanation(query: DietQuery, result: DietRecommendationResult): string {
  const desc = DIET_RECOMMENDATION_DESCRIPTION[result.recommendation];
  const diseasePart = query.diseaseType !== 'None' ? ` given your ${query.diseaseType.toLowerCase()} profile factor` : '';
  return `Based on ${result.matchCount} similar reference cases${diseasePart}, a ${result.recommendation.replace('_', ' ').toLowerCase()} approach was the most common pattern (${Math.round(result.confidence * 100)}% agreement). ${desc}`;
}

export async function explainDietRecommendation(profile: UserProfile, query: DietQuery, result: DietRecommendationResult): Promise<string> {
  if (!GROQ_API_KEY) return templateExplanation(query, result);

  const prompt = `You are explaining an ALREADY-DECIDED diet recommendation to a user. Do not change, question, or suggest a different recommendation. Do not diagnose, prescribe, or invent any medical claim. Write 2-3 short, friendly sentences explaining why this recommendation fits, based only on the factors given.

Decided recommendation: ${result.recommendation.replace('_', ' ')}
Recommendation meaning: ${DIET_RECOMMENDATION_DESCRIPTION[result.recommendation]}
User's relevant factors: age ${query.age}, gender ${query.gender}, BMI ${query.bmi.toFixed(1)}, condition-relevant factor: ${query.diseaseType}, activity level: ${query.activityLevel}.
This was chosen by matching ${result.matchCount} similar reference cases; ${Math.round(result.confidence * 100)}% of the closest matches agreed on this recommendation.

Write only the explanation, no preamble, no headings.`;

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.4,
        reasoning_effort: 'low',
      }),
    });

    if (!response.ok) return templateExplanation(query, result);

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content?.trim();
    return text || templateExplanation(query, result);
  } catch {
    return templateExplanation(query, result);
  }
}
