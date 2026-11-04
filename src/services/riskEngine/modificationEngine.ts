// Generates template-based, non-medical modification suggestions from
// structured risk factors. Never claims a modification "makes the food
// safe" — only that it may reduce an identified concern.
import { RiskFactor, AllergenFinding, ALLERGEN_LABEL } from '../../types/risk';
import { DishWithMacros } from '../../types';

export function generateModifications(dish: DishWithMacros, riskFactors: RiskFactor[], allergens: AllergenFinding[]): string[] {
  const mods: string[] = [];

  for (const a of allergens) {
    mods.push(`Ask whether ${a.ingredient} (${ALLERGEN_LABEL[a.allergen].toLowerCase()}) can be omitted or substituted. This may reduce the identified allergen concern, but verify with the restaurant/manufacturer before eating.`);
  }

  for (const f of riskFactors) {
    if (f.category === 'dietary_preference' && f.detectedIngredient) {
      mods.push(`Ask if ${f.detectedIngredient} can be left out or swapped to better match your dietary preference.`);
    }
    if (f.category === 'condition' && /sodium|salt/i.test(f.summary)) {
      mods.push('Ask for the dish to be prepared with less added salt, if the kitchen can accommodate it.');
    }
    if (f.category === 'condition' && /carbohydrate|sugar/i.test(f.summary)) {
      mods.push('Consider a smaller portion or pairing with a lower-carbohydrate side.');
    }
  }

  if (dish.macros.fat > 25 && !mods.some(m => m.includes('oil'))) {
    mods.push('Ask for less oil/ghee or a grilled preparation instead of fried, if available.');
  }

  return Array.from(new Set(mods)).slice(0, 5);
}
