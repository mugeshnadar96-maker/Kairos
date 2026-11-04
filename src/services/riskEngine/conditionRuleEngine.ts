// Configurable, deterministic condition-specific rules.
// IMPORTANT: KAIROS's nutrition data (src/data/indianFoodDB.ts) only has
// calories/protein/carbs/fat/fiber — it has NO sodium, potassium,
// phosphorus, purine, or added-sugar breakdown. Rules that would need
// those values MUST return an honest "insufficient information" factor
// rather than a fabricated threshold-based verdict. This is a deliberate,
// spec-required limitation — do not "estimate" sodium/purine from calories
// or any other proxy.
import { ConditionFactor, EvidenceItem, MedicalCondition, CONDITION_LABEL } from '../../types/risk';
import { DishWithMacros } from '../../types';
import { ResolvedIngredient } from './ingredientResolver';

// Configurable thresholds/patterns — clearly-labeled attention signals only,
// never a medical threshold or diagnosis. Named constants so they can be
// tuned without touching the rule logic.
const DIABETES_HIGH_CARB_G = 60;
const DIABETES_MODERATE_CARB_G = 40;
const SWEET_NAME_PATTERN = /(jamun|jalebi|halwa|sweet|ladoo|laddu|kheer|payasam|barfi|rasgulla|gulab)/i;
const FRIED_NAME_PATTERN = /(fried|pakora|bhaji|samosa|vada|tempura|crispy)/i;
const SPICY_NAME_PATTERN = /(spicy|chilli|chili|masala|vindaloo|hot\b)/i;
const CITRUS_CAFFEINE_PATTERN = /(lemon|lime|tamarind|coffee|cola|chocolate|cocoa|mint)/i;
const HIGH_FAT_G = 25;

export function evaluateConditionFactors(
  dish: DishWithMacros,
  conditions: MedicalCondition[],
  ingredients: ResolvedIngredient[] = [],
  now: number = Date.now()
): ConditionFactor[] {
  const factors: ConditionFactor[] = [];
  const name = dish.name.toLowerCase();
  const text = `${dish.name} ${dish.description || ''}`.toLowerCase();

  for (const condition of conditions) {
    if (condition === 'diabetes') {
      const evidenceBase = `${dish.macros.carbs}g carbohydrates (from ${dish.matchType === 'ai_estimated' ? 'an estimated' : 'a nutrition-database'} match)`;
      if (SWEET_NAME_PATTERN.test(name)) {
        factors.push(mk(condition, 'Dish name suggests a sugar-heavy sweet — relevant to blood sugar management', 'likely', evidenceBase, now));
      } else if (dish.macros.carbs >= DIABETES_HIGH_CARB_G) {
        factors.push(mk(condition, `Carbohydrate content (${dish.macros.carbs}g) is on the higher side`, 'likely', evidenceBase, now));
      } else if (dish.macros.carbs >= DIABETES_MODERATE_CARB_G) {
        factors.push(mk(condition, `Moderate carbohydrate content (${dish.macros.carbs}g)`, 'likely', evidenceBase, now));
      } else {
        factors.push(mk(condition, 'No elevated-carbohydrate concern identified from available data', 'confirmed', evidenceBase, now));
      }
      factors.push(mk(condition, 'Exact added-sugar content is not available in the current nutrition data', 'unknown', 'No added-sugar breakdown in nutrition database', now));
    }

    if (condition === 'hypertension' || condition === 'ckd') {
      factors.push(mk(condition, 'Sodium content is not available in the current nutrition data — cannot assess salt-related risk', 'unknown', 'Nutrition database does not track sodium', now));
      if (condition === 'ckd') {
        factors.push(mk(condition, 'Potassium and phosphorus content are not available in the current nutrition data', 'unknown', 'Nutrition database does not track potassium/phosphorus', now));
        if (dish.macros.protein > 30) {
          factors.push(mk(condition, `Relatively high protein content (${dish.macros.protein}g) — protein intake is often a relevant factor for CKD diets`, 'likely', `${dish.macros.protein}g protein`, now));
        }
      }
      if (FRIED_NAME_PATTERN.test(name) || dish.macros.fat > HIGH_FAT_G) {
        factors.push(mk(condition, 'Dish appears fried or high in fat, which can correlate with higher sodium preparation', 'likely', `${dish.macros.fat}g fat; dish name pattern`, now));
      }
    }

    if (condition === 'pcos') {
      factors.push(mk(condition, 'No PCOS-specific nutrient data (e.g. glycemic load, added sugar) is available for this dish', 'unknown', 'Not tracked by current nutrition database', now));
      if (SWEET_NAME_PATTERN.test(name) || dish.macros.carbs >= DIABETES_HIGH_CARB_G) {
        factors.push(mk(condition, 'Refined-carbohydrate/sugar content may be relevant to manage given PCOS', 'likely', `${dish.macros.carbs}g carbohydrates; dish name pattern`, now));
      }
    }

    if (condition === 'high_cholesterol') {
      const evidenceBase = `${dish.macros.fat}g fat`;
      if (dish.macros.fat > HIGH_FAT_G || FRIED_NAME_PATTERN.test(name)) {
        factors.push(mk(condition, `Higher fat content or fried preparation (${dish.macros.fat}g fat) may be relevant to manage`, 'likely', evidenceBase, now));
      } else {
        factors.push(mk(condition, 'No elevated-fat concern identified from available data', 'confirmed', evidenceBase, now));
      }
      factors.push(mk(condition, 'Saturated fat / dietary cholesterol breakdown is not available in the current nutrition data', 'unknown', 'Not tracked by current nutrition database', now));
    }

    if (condition === 'gout') {
      factors.push(mk(condition, 'Purine content is not available in the current nutrition data', 'unknown', 'Not tracked by current nutrition database', now));
      const purineRichMatch = ingredients.find(i => i.entry.category === 'meat' || i.entry.allergenRelationship.includes('shellfish') || i.entry.allergenRelationship.includes('fish'));
      if (purineRichMatch) {
        factors.push(mk(condition, `Contains ${purineRichMatch.entry.canonicalName}, a food category commonly considered purine-rich`, 'likely', `Detected "${purineRichMatch.matchedAlias}"`, now));
      }
    }

    if (condition === 'celiac') {
      const glutenMatch = ingredients.find(i => i.entry.dietaryRelevance.includes('gluten_free'));
      if (glutenMatch) {
        factors.push(mk(condition, `Contains ${glutenMatch.entry.canonicalName}, which is wheat/gluten-derived`, glutenMatch.status === 'confirmed' ? 'confirmed' : 'likely', `Detected "${glutenMatch.matchedAlias}"`, now));
      } else {
        factors.push(mk(condition, 'No wheat/gluten-derived ingredient identified from available information', 'confirmed', 'No gluten-relevant ingredient matched', now));
      }
      factors.push(mk(condition, 'Cross-contact with gluten-containing ingredients during preparation is unknown', 'unknown', 'Not disclosed', now));
    }

    if (condition === 'lactose_intolerance') {
      const milkMatch = ingredients.find(i => i.entry.dietaryRelevance.includes('lactose_free'));
      if (milkMatch) {
        factors.push(mk(condition, `Contains ${milkMatch.entry.canonicalName}, which is milk-derived`, milkMatch.status === 'confirmed' ? 'confirmed' : 'likely', `Detected "${milkMatch.matchedAlias}"`, now));
      } else {
        factors.push(mk(condition, 'No milk-derived ingredient identified from available information', 'confirmed', 'No dairy-relevant ingredient matched', now));
      }
    }

    if (condition === 'ibs') {
      const triggerMatch = ingredients.find(i =>
        i.entry.dietaryRelevance.includes('lactose_free') ||
        i.entry.dietaryRelevance.includes('gluten_free') ||
        i.entry.canonicalName === 'onion' || i.entry.canonicalName === 'garlic'
      );
      if (triggerMatch) {
        factors.push(mk(condition, `Contains ${triggerMatch.entry.canonicalName}, a commonly reported IBS trigger food for some people`, 'likely', `Detected "${triggerMatch.matchedAlias}"`, now));
      }
      factors.push(mk(condition, 'IBS triggers vary significantly by individual — this only flags commonly reported categories, not a personalized threshold', 'unknown', 'Not individually calibrated', now));
    }

    if (condition === 'gerd') {
      if (FRIED_NAME_PATTERN.test(text)) {
        factors.push(mk(condition, 'Dish appears fried, a commonly reported acid-reflux trigger', 'likely', 'Dish name/description pattern', now));
      }
      if (SPICY_NAME_PATTERN.test(text)) {
        factors.push(mk(condition, 'Dish appears spicy, a commonly reported acid-reflux trigger', 'likely', 'Dish name/description pattern', now));
      }
      if (CITRUS_CAFFEINE_PATTERN.test(text)) {
        factors.push(mk(condition, 'Contains a citrus/caffeine/chocolate/mint ingredient, commonly reported acid-reflux triggers', 'likely', 'Dish name/description pattern', now));
      }
      if (!FRIED_NAME_PATTERN.test(text) && !SPICY_NAME_PATTERN.test(text) && !CITRUS_CAFFEINE_PATTERN.test(text)) {
        factors.push(mk(condition, 'No common acid-reflux trigger pattern identified from available information', 'confirmed', 'No fried/spicy/citrus/caffeine pattern matched', now));
      }
    }
  }

  return factors;
}

function mk(condition: MedicalCondition, factor: string, status: ConditionFactor['status'], evidenceText: string, now: number): ConditionFactor {
  return {
    condition,
    factor,
    status,
    evidence: {
      finding: `${CONDITION_LABEL[condition]}: ${factor}`,
      source: 'Existing KAIROS nutrition database',
      evidenceText,
      status,
      timestamp: now,
    },
  };
}
