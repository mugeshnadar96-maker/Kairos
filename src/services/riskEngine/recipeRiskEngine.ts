// ==========================================
// Cook at Home — Recipe Risk Engine
// ==========================================
// Unlike a menu/dish photo scan (only a name + AI description), a recipe
// carries a REAL, explicit ingredient list — so matches here are treated
// as confirmed, not merely likely. This engine flags only the specific
// ingredients relevant to the user's allergies/diet/conditions and
// attaches a practical substitute where one exists. It never invents an
// ingredient that isn't in the recipe's own list.
import { UserProfile } from '../../types';
import { RecipeEntry, getRecipeIngredientList } from '../../data/recipeDB';
import { resolveIngredientMentions } from '../../data/ingredientKnowledgeBase';
import { INGREDIENT_SUBSTITUTIONS } from '../../data/ingredientSubstitutions';
import { RecipeAssessment, RecipeIngredientFlag, RiskLevel, ALLERGEN_LABEL } from '../../types/risk';

const LEVEL_RANK: Record<RiskLevel, number> = { green: 0, grey: 1, yellow: 2, orange: 3, red: 4 };

export function assessRecipe(recipe: RecipeEntry, profile: UserProfile): RecipeAssessment {
  const ingredientTokens = getRecipeIngredientList(recipe);
  const matches = resolveIngredientMentions(recipe.cleanedIngredients);
  const flags: RecipeIngredientFlag[] = [];

  for (const m of matches) {
    let severity: RiskLevel = 'green';
    const reasons: string[] = [];
    const userFactors: string[] = [];
    const bump = (lvl: RiskLevel) => { if (LEVEL_RANK[lvl] > LEVEL_RANK[severity]) severity = lvl; };

    for (const allergy of profile.allergies) {
      if (m.entry.allergenRelationship.includes(allergy.allergen)) {
        bump(allergy.severity === 'mild' ? 'orange' : 'red');
        reasons.push(m.relation === 'derived'
          ? `${m.entry.canonicalName} is ${ALLERGEN_LABEL[allergy.allergen].toLowerCase()}-derived`
          : `Contains ${ALLERGEN_LABEL[allergy.allergen].toLowerCase()}`);
        userFactors.push(`${ALLERGEN_LABEL[allergy.allergen]} allergy (${allergy.severity})`);
      }
    }

    if (profile.dietType === 'vegan' && (m.entry.notVegan || m.entry.notVegetarian)) {
      bump('orange');
      reasons.push('Not vegan');
      userFactors.push('Vegan diet preference');
    } else if (profile.dietType === 'vegetarian' && m.entry.notVegetarian) {
      bump('orange');
      reasons.push('Not vegetarian');
      userFactors.push('Vegetarian diet preference');
    }

    if (profile.dietaryPreferences.includes('jain') && m.entry.dietaryRelevance.includes('jain')) {
      bump('orange');
      reasons.push('Commonly avoided in a Jain diet');
      userFactors.push('Jain dietary preference');
    }
    if (profile.dietaryPreferences.includes('gluten_free') && m.entry.dietaryRelevance.includes('gluten_free')) {
      bump('orange');
      reasons.push('Wheat/gluten-derived');
      userFactors.push('Gluten-free preference');
    }
    if (profile.dietaryPreferences.includes('lactose_free') && m.entry.dietaryRelevance.includes('lactose_free')) {
      bump('orange');
      reasons.push('Milk-derived');
      userFactors.push('Lactose-free preference');
    }

    // Condition rules that are ingredient-based (recipes carry no macro
    // data, so calorie/carb/fat-based condition rules don't apply here).
    if (profile.conditions.includes('celiac') && m.entry.dietaryRelevance.includes('gluten_free')) {
      bump('yellow');
      reasons.push('Wheat/gluten-derived — relevant to celiac disease');
      userFactors.push('Celiac Disease');
    }
    if (profile.conditions.includes('lactose_intolerance') && m.entry.dietaryRelevance.includes('lactose_free')) {
      bump('yellow');
      reasons.push('Milk-derived — relevant to lactose intolerance');
      userFactors.push('Lactose Intolerance');
    }
    if (profile.conditions.includes('gout') && (m.entry.category === 'meat' || m.entry.allergenRelationship.includes('shellfish') || m.entry.allergenRelationship.includes('fish'))) {
      bump('yellow');
      reasons.push('Commonly considered purine-rich — relevant to gout');
      userFactors.push('Gout');
    }
    if (profile.conditions.includes('ibs') && (m.entry.dietaryRelevance.includes('lactose_free') || m.entry.dietaryRelevance.includes('gluten_free') || m.entry.canonicalName === 'onion' || m.entry.canonicalName === 'garlic')) {
      bump('yellow');
      reasons.push('Commonly reported IBS trigger food for some people');
      userFactors.push('IBS');
    }

    if (severity === 'green') continue;

    flags.push({
      ingredient: m.matchedAlias,
      canonicalName: m.entry.canonicalName,
      severity,
      reason: reasons.join('; '),
      relation: m.relation,
      userFactor: Array.from(new Set(userFactors)).join(', '),
      alternative: INGREDIENT_SUBSTITUTIONS[m.entry.canonicalName],
    });
  }

  let overallStatus: RiskLevel = 'green';
  for (const f of flags) {
    if (LEVEL_RANK[f.severity] > LEVEL_RANK[overallStatus]) overallStatus = f.severity;
  }

  return {
    recipeName: recipe.name,
    overallStatus,
    totalIngredients: ingredientTokens.length,
    flaggedIngredients: flags,
    unknowns: [
      'This is a reference recipe — your actual home preparation, brand choices, and quantities may differ from what is listed here.',
    ],
  };
}
