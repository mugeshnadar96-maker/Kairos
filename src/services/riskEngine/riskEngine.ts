// ==========================================
// KAIROS Personalized Risk Engine (orchestrator)
// ==========================================
// Deterministic pipeline:
//   resolveIngredients -> resolveAllergens -> evaluateConditionFactors
//   -> evaluateDietaryFactors -> collectEvidence -> identifyUnknowns
//   -> calculateRiskStatus -> generateVerificationActions
//   -> generateModificationOptions
//
// The LLM/chatbot is never called here and never decides a risk level —
// it may only narrate this structured output afterwards.
import { DishWithMacros, UserProfile } from '../../types';
import {
  RiskAssessment, RiskFactor, RiskLevel, EvidenceItem, AllergenFinding, ConditionFactor,
  ALLERGEN_LABEL, CONDITION_LABEL,
} from '../../types/risk';
import { resolveIngredients, ResolvedIngredient } from './ingredientResolver';
import { resolveAllergens, scanAllergenDeclaration } from './allergenResolver';
import { evaluateConditionFactors } from './conditionRuleEngine';
import { evaluateDietaryFactors } from './dietaryPreferenceResolver';
import { generateModifications } from './modificationEngine';
import { generateVerificationActions, generateQuestions } from './verificationEngine';

// grey ("insufficient information") ranks above green ("no concern identified")
// so an explicit data gap on a condition the user actually has (e.g. no sodium
// data for a hypertensive user) is never silently masked by a falsely
// reassuring green status.
const LEVEL_RANK: Record<RiskLevel, number> = { green: 0, grey: 1, yellow: 2, orange: 3, red: 4 };

function allergenFindingLevel(finding: AllergenFinding): RiskLevel {
  // "May contain" / cross-contact is explicitly a possibility, never a
  // confirmed presence — it must never be escalated to RED regardless of
  // how confidently the label declaration itself was read.
  if (finding.presence === 'may_contain' || finding.presence === 'cross_contact') {
    return finding.severity === 'severe' ? 'orange' : 'yellow';
  }
  const status = finding.evidence.status;
  if (status === 'confirmed') {
    return finding.severity === 'mild' ? 'orange' : 'red';
  }
  if (status === 'likely') {
    return finding.severity === 'severe' ? 'orange' : 'yellow';
  }
  return 'yellow'; // needs_verification / unknown
}

let counter = 0;
function nextId() { counter += 1; return `risk_${Date.now()}_${counter}`; }

interface BuildInput {
  foodId: string;
  foodName: string;
  dish: DishWithMacros;
  allergenFindings: AllergenFinding[];
  conditionFactors: ConditionFactor[];
  dietaryFactors: RiskFactor[];
  baseUnknowns: string[];
  now: number;
}

function buildAssessment(input: BuildInput): RiskAssessment {
  const { foodId, foodName, dish, allergenFindings, conditionFactors, dietaryFactors, baseUnknowns, now } = input;

  const allergyRiskFactors: RiskFactor[] = allergenFindings.map(a => ({
    id: nextId(),
    category: 'allergy' as const,
    level: allergenFindingLevel(a),
    summary: `${ALLERGEN_LABEL[a.allergen]}-relevant ingredient detected: ${a.ingredient}${a.relation === 'derived' ? ` (${a.ingredient} is ${ALLERGEN_LABEL[a.allergen].toLowerCase()}-derived)` : ''}${a.presence === 'may_contain' ? ' — labeled "may contain" (possible cross-contact, not confirmed)' : ''}`,
    detectedIngredient: a.ingredient,
    relation: a.relation,
    userFactor: `${ALLERGEN_LABEL[a.allergen]} allergy (${a.severity})`,
    evidence: [a.evidence],
    status: a.evidence.status,
  }));

  // Turn condition factors that carry actual signal (not the boilerplate
  // "no concern" ones) into risk factors too, for display.
  const conditionRiskFactors: RiskFactor[] = conditionFactors
    .filter(cf => cf.status !== 'confirmed' || !/no .*concern/i.test(cf.factor))
    .map(cf => ({
      id: nextId(),
      category: 'condition' as const,
      level: (cf.status === 'unknown' ? 'grey' : cf.status === 'likely' ? 'yellow' : 'green') as RiskLevel,
      summary: cf.factor,
      userFactor: CONDITION_LABEL[cf.condition],
      evidence: [cf.evidence],
      status: cf.status,
    }));

  const riskFactors = [...allergyRiskFactors, ...conditionRiskFactors, ...dietaryFactors];
  const evidence: EvidenceItem[] = riskFactors.flatMap(f => f.evidence);

  const unknowns = [...baseUnknowns];
  const unknownConditionFactors = conditionFactors.filter(cf => cf.status === 'unknown');
  for (const cf of unknownConditionFactors) {
    unknowns.push(`${CONDITION_LABEL[cf.condition]}: ${cf.factor}`);
  }

  let overallStatus: RiskLevel = 'green';
  for (const f of riskFactors) {
    if (LEVEL_RANK[f.level] > LEVEL_RANK[overallStatus]) overallStatus = f.level;
  }

  const recommendedVerification = generateVerificationActions(allergenFindings, riskFactors, unknowns);
  const possibleModifications = generateModifications(dish, riskFactors, allergenFindings);
  const questionsToAsk = generateQuestions(allergenFindings, conditionFactors);

  return {
    foodId,
    foodName,
    overallStatus,
    riskFactors,
    allergens: allergenFindings,
    conditionFactors,
    evidence,
    unknowns,
    recommendedVerification,
    possibleModifications,
    questionsToAsk,
    generatedAt: now,
  };
}

/**
 * Assesses a dish scanned from a menu or a single-dish photo. The only
 * evidence available is the dish name + an AI-generated description — NOT
 * a verified ingredient list — so ingredient matches are always surfaced
 * as "likely", never "confirmed".
 */
export function assessDish(dish: DishWithMacros, profile: UserProfile, now: number = Date.now()): RiskAssessment {
  const text = `${dish.name} ${dish.description || ''}`;
  const ingredients = resolveIngredients(text, 'dish_description');
  const allergenFindings = resolveAllergens(ingredients, profile.allergies, now);
  const conditionFactors = evaluateConditionFactors(dish, profile.conditions, ingredients, now);
  const dietaryFactors = evaluateDietaryFactors(ingredients, profile, now);

  const baseUnknowns: string[] = [
    'Full ingredient list is not available — this assessment is based on the dish name and an AI-generated description only, not a verified ingredient list.',
    'Cross-contact/shared-equipment information is unknown.',
    'Exact ingredient quantities are unknown.',
  ];
  if (dish.matchType === 'ai_estimated') {
    baseUnknowns.push('Nutrition values are estimated — no exact database match was found for this dish.');
  }

  return buildAssessment({
    foodId: dish.name, foodName: dish.name, dish,
    allergenFindings, conditionFactors, dietaryFactors, baseUnknowns, now,
  });
}

export function assessDishes(dishes: DishWithMacros[], profile: UserProfile): Record<string, RiskAssessment> {
  const map: Record<string, RiskAssessment> = {};
  const now = Date.now();
  for (const dish of dishes) {
    map[dish.name] = assessDish(dish, profile, now);
  }
  return map;
}

/**
 * Assesses a packaged-food product from a scanned ingredient list +
 * allergen declaration. Unlike `assessDish`, ingredient mentions found in
 * the actual scanned ingredient list ARE treated as confirmed evidence.
 * Explicit "Contains"/"May contain" declaration phrases are handled
 * completely separately and never conflated with each other.
 */
export function assessPackagedFood(
  product: DishWithMacros,
  ingredientsText: string,
  allergenText: string,
  profile: UserProfile,
  now: number = Date.now()
): RiskAssessment {
  const ingredients: ResolvedIngredient[] = resolveIngredients(ingredientsText, 'ingredient_list');
  const kbAllergenFindings = resolveAllergens(ingredients, profile.allergies, now);

  // Explicit "Contains: X" / "May contain: X" declaration phrases.
  const declaration = scanAllergenDeclaration(allergenText);
  const declarationFindings: AllergenFinding[] = [];
  for (const allergy of profile.allergies) {
    const label = ALLERGEN_LABEL[allergy.allergen].toLowerCase();
    if (declaration.contains.some(c => c.includes(label))) {
      declarationFindings.push({
        allergen: allergy.allergen,
        presence: 'contains',
        ingredient: label,
        relation: 'direct',
        severity: allergy.severity,
        evidence: {
          finding: `${ALLERGEN_LABEL[allergy.allergen]} declared as contained`,
          source: 'Scanned allergen declaration',
          evidenceText: allergenText,
          status: 'confirmed',
          timestamp: now,
        },
      });
    } else if (declaration.mayContain.some(c => c.includes(label))) {
      declarationFindings.push({
        allergen: allergy.allergen,
        presence: 'may_contain',
        ingredient: label,
        relation: 'unknown',
        severity: allergy.severity,
        evidence: {
          finding: `${ALLERGEN_LABEL[allergy.allergen]} possible cross-contact declared`,
          source: 'Scanned allergen declaration',
          evidenceText: allergenText,
          status: 'confirmed',
          timestamp: now,
        },
      });
    }
  }

  // Keep both: the declaration confirms overall presence of the allergen,
  // while a matching KB finding (e.g. "casein") explains which specific
  // ingredient it comes from — both facts are useful together and neither
  // should silently replace the other. Only avoid an exact duplicate (same
  // allergen + same ingredient string from both sources).
  const seenPairs = new Set(declarationFindings.map(d => `${d.allergen}:${d.ingredient}`));
  const allergenFindings = [
    ...declarationFindings,
    ...kbAllergenFindings.filter(f => !seenPairs.has(`${f.allergen}:${f.ingredient}`)),
  ];

  const conditionFactors = evaluateConditionFactors(product, profile.conditions, ingredients, now);
  const dietaryFactors = evaluateDietaryFactors(ingredients, profile, now);

  const baseUnknowns: string[] = [
    'Cross-contact/shared-equipment information beyond what is explicitly declared on the label is unknown.',
    'Exact ingredient quantities/proportions are unknown.',
  ];
  if (!ingredientsText.trim()) {
    baseUnknowns.unshift('The ingredient list could not be read from the label — please verify the original packaging.');
  }
  if (!allergenText.trim()) {
    baseUnknowns.push('No explicit allergen declaration ("Contains"/"May contain") was found on the scanned label.');
  }
  if (product.matchType === 'ai_estimated') {
    baseUnknowns.push('Nutrition values could not be read from the label and are estimated.');
  }

  return buildAssessment({
    foodId: product.name, foodName: product.name, dish: product,
    allergenFindings, conditionFactors, dietaryFactors, baseUnknowns, now,
  });
}
