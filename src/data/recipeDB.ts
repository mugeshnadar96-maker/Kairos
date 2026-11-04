// ==========================================
// Cook at Home — Recipe Dataset
// ==========================================
// Bundled from the Indian Food 101 recipe dataset. Each recipe carries a
// REAL, explicit ingredient list (not an AI-inferred dish description),
// which is exactly the kind of evidence the risk engine treats as
// confirmed rather than merely "likely" — cook-at-home mode can therefore
// give more confident risk flags than a restaurant photo scan can.
import raw from './recipeData.json';

export interface RecipeEntry {
  name: string;
  cuisine: string;
  ingredientsText: string; // human-readable, with quantities
  cleanedIngredients: string; // comma-separated, lowercase, for matching
}

const recipes: RecipeEntry[] = (raw as [string, string, string, string][]).map(([name, cuisine, ingredientsText, cleanedIngredients]) => ({
  name, cuisine, ingredientsText, cleanedIngredients,
}));

export function searchRecipes(query: string, limit: number = 30): RecipeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return recipes.slice(0, limit);

  const results: { recipe: RecipeEntry; score: number }[] = [];
  for (const recipe of recipes) {
    const name = recipe.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (recipe.cleanedIngredients.includes(q)) score = 20;
    if (score > 0) results.push({ recipe, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(r => r.recipe);
}

export function getRecipeIngredientList(recipe: RecipeEntry): string[] {
  return recipe.cleanedIngredients.split(',').map(s => s.trim()).filter(Boolean);
}
