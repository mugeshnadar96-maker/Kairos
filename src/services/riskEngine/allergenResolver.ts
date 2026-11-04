// Cross-references resolved ingredients against the user's declared
// allergies. Deterministic — severity + relation decide the finding, no
// LLM involved.
import { ResolvedIngredient } from './ingredientResolver';
import { AllergenFinding, EvidenceItem, UserAllergy, ALLERGEN_LABEL } from '../../types/risk';

const EVIDENCE_SOURCE_LABEL: Record<string, string> = {
  ingredient_list: 'Scanned ingredient list',
  allergen_declaration: 'Scanned allergen declaration',
  dish_description: 'Dish name/description (AI-parsed from image, not a verified ingredient list)',
};

export function resolveAllergens(
  resolvedIngredients: ResolvedIngredient[],
  allergies: UserAllergy[],
  now: number = Date.now()
): AllergenFinding[] {
  if (allergies.length === 0) return [];
  const findings: AllergenFinding[] = [];

  for (const allergy of allergies) {
    for (const ing of resolvedIngredients) {
      if (!ing.entry.allergenRelationship.includes(allergy.allergen)) continue;

      const evidence: EvidenceItem = {
        finding: `${ALLERGEN_LABEL[allergy.allergen]} allergen relevance: "${ing.matchedAlias}"`,
        source: EVIDENCE_SOURCE_LABEL[ing.evidenceSource] || ing.evidenceSource,
        evidenceText: `Detected "${ing.matchedAlias}" (${ing.entry.canonicalName})`,
        status: ing.status,
        timestamp: now,
      };

      findings.push({
        allergen: allergy.allergen,
        presence: ing.status === 'confirmed' ? (ing.relation === 'direct' ? 'contains' : 'derived_from') : 'unknown',
        ingredient: ing.entry.canonicalName,
        relation: ing.relation,
        severity: allergy.severity,
        evidence,
      });
    }
  }

  return findings;
}

/**
 * Detects explicit "may contain X" / "contains X" style declaration
 * phrases in scanned label text. Kept strictly separate from ingredient
 * inference — this NEVER upgrades a "may contain" phrase into a
 * confirmed "contains" finding, and vice versa.
 */
export function scanAllergenDeclaration(text: string): { contains: string[]; mayContain: string[] } {
  const lower = text.toLowerCase();
  const contains: string[] = [];
  const mayContain: string[] = [];

  const containsMatch = lower.match(/\bcontains\s*:?\s*([a-z,\s&]+?)(?:\.|;|$)/);
  if (containsMatch) {
    containsMatch[1].split(/,|&|\band\b/).map(s => s.trim()).filter(Boolean).forEach(s => contains.push(s));
  }
  const mayContainMatch = lower.match(/\bmay contain(?:s)?\s*:?\s*([a-z,\s&]+?)(?:\.|;|$)/);
  if (mayContainMatch) {
    mayContainMatch[1].split(/,|&|\band\b/).map(s => s.trim()).filter(Boolean).forEach(s => mayContain.push(s));
  }

  return { contains, mayContain };
}
