// Checks resolved ingredients against the user's diet type (existing
// UserProfile.dietType: vegetarian/vegan/pescatarian) and the new
// structured dietary preferences (Jain/gluten-free/lactose-free).
import { ResolvedIngredient } from './ingredientResolver';
import { RiskFactor, EvidenceItem, DIETARY_PREFERENCE_LABEL, DietaryPreference } from '../../types/risk';
import { UserProfile } from '../../types';

const EVIDENCE_SOURCE_LABEL: Record<string, string> = {
  ingredient_list: 'Scanned ingredient list',
  allergen_declaration: 'Scanned allergen declaration',
  dish_description: 'Dish name/description (AI-parsed from image, not a verified ingredient list)',
};

let counter = 0;
function nextId() { counter += 1; return `dietary_${Date.now()}_${counter}`; }

export function evaluateDietaryFactors(
  ingredients: ResolvedIngredient[],
  profile: UserProfile,
  now: number = Date.now()
): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const dietType = profile.dietType;
  const prefs = profile.dietaryPreferences || [];

  for (const ing of ingredients) {
    const evidence: EvidenceItem = {
      finding: `Ingredient relevant to dietary preference: ${ing.entry.canonicalName}`,
      source: EVIDENCE_SOURCE_LABEL[ing.evidenceSource] || ing.evidenceSource,
      evidenceText: `Detected "${ing.matchedAlias}"`,
      status: ing.status,
      timestamp: now,
    };

    if ((dietType === 'vegan') && (ing.entry.notVegan || ing.entry.notVegetarian)) {
      factors.push(mkFactor('orange', `Contains ${ing.entry.canonicalName}, which is not vegan`, ing, 'Vegan diet preference', [evidence], now));
    } else if (dietType === 'vegetarian' && ing.entry.notVegetarian) {
      factors.push(mkFactor('orange', `Contains ${ing.entry.canonicalName}, which is not vegetarian`, ing, 'Vegetarian diet preference', [evidence], now));
    }

    if (prefs.includes('jain' as DietaryPreference) && ing.entry.dietaryRelevance.includes('jain')) {
      factors.push(mkFactor('orange', `Contains ${ing.entry.canonicalName}, commonly avoided in a Jain diet`, ing, DIETARY_PREFERENCE_LABEL.jain, [evidence], now));
    }
    if (prefs.includes('gluten_free' as DietaryPreference) && ing.entry.dietaryRelevance.includes('gluten_free')) {
      factors.push(mkFactor('orange', `Contains ${ing.entry.canonicalName}, which is wheat/gluten-derived`, ing, DIETARY_PREFERENCE_LABEL.gluten_free, [evidence], now));
    }
    if (prefs.includes('lactose_free' as DietaryPreference) && ing.entry.dietaryRelevance.includes('lactose_free')) {
      factors.push(mkFactor('orange', `Contains ${ing.entry.canonicalName}, which is milk-derived`, ing, DIETARY_PREFERENCE_LABEL.lactose_free, [evidence], now));
    }
  }

  return factors;
}

function mkFactor(
  level: RiskFactor['level'],
  summary: string,
  ing: ResolvedIngredient,
  userFactor: string,
  evidence: EvidenceItem[],
  now: number
): RiskFactor {
  return {
    id: nextId(),
    category: 'dietary_preference',
    level,
    summary,
    detectedIngredient: ing.entry.canonicalName,
    relation: ing.relation,
    userFactor,
    evidence,
    status: ing.status,
  };
}
