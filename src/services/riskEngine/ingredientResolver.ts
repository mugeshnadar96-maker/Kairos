// Resolves ingredient mentions in scanned text against the ingredient
// knowledge base. Kept as its own module so future evidence sources
// (packaged-food OCR ingredient lists) can plug in without touching the
// rest of the pipeline.
import { resolveIngredientMentions, IngredientMatch } from '../../data/ingredientKnowledgeBase';
import { InformationStatus } from '../../types/risk';

export type IngredientEvidenceSource = 'ingredient_list' | 'allergen_declaration' | 'dish_description';

export interface ResolvedIngredient extends IngredientMatch {
  evidenceSource: IngredientEvidenceSource;
  /** How certain we are this ingredient is actually present, given where the text came from. */
  status: InformationStatus;
}

/**
 * A real, scanned ingredient list (packaged food label) or allergen
 * declaration ("Contains: Milk, Soy") is treated as CONFIRMED evidence.
 * A dish name/description produced by the VLM/menu parser is NOT a
 * verified ingredient declaration — matches from it are only LIKELY and
 * must be surfaced as such, never presented as confirmed.
 */
export function resolveIngredients(text: string, source: IngredientEvidenceSource): ResolvedIngredient[] {
  if (!text || !text.trim()) return [];
  const matches = resolveIngredientMentions(text);
  const status: InformationStatus = source === 'dish_description' ? 'likely' : 'confirmed';
  return matches.map(m => ({ ...m, evidenceSource: source, status }));
}
