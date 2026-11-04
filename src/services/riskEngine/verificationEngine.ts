// Generates "what should I verify" items and practical vendor questions
// from the structured findings — never invented, always tied to an
// actual unknown or flagged factor.
import { AllergenFinding, ConditionFactor, RiskFactor, ALLERGEN_LABEL } from '../../types/risk';

export function generateVerificationActions(
  allergens: AllergenFinding[],
  riskFactors: RiskFactor[],
  unknowns: string[]
): string[] {
  const actions: string[] = [];

  for (const a of allergens) {
    if (a.severity === 'severe' || a.relation === 'derived' || a.presence === 'unknown') {
      actions.push(`Verify with the restaurant/manufacturer whether this dish actually contains ${a.ingredient} (${ALLERGEN_LABEL[a.allergen].toLowerCase()}) before eating.`);
    }
  }

  if (unknowns.length > 0) {
    actions.push('Confirm the full ingredient list, as this assessment is based on limited available information.');
  }

  for (const f of riskFactors) {
    if (f.status === 'needs_verification' || f.status === 'unknown') {
      actions.push(`Verify: ${f.summary}`);
    }
  }

  return Array.from(new Set(actions)).slice(0, 6);
}

export function generateQuestions(allergens: AllergenFinding[], conditionFactors: ConditionFactor[]): string[] {
  const questions: string[] = [];

  for (const a of allergens) {
    questions.push(`Does this dish contain ${a.ingredient} or ${ALLERGEN_LABEL[a.allergen].toLowerCase()}-derived ingredients?`);
    if (a.severity === 'severe') {
      questions.push(`Is this prepared using the same oil, utensils, or surfaces as ${ALLERGEN_LABEL[a.allergen].toLowerCase()}-containing dishes?`);
    }
  }

  for (const cf of conditionFactors) {
    if (/sodium|salt/i.test(cf.factor)) {
      questions.push('Can this be prepared with less added salt?');
    }
    if (/sugar/i.test(cf.factor)) {
      questions.push('Is any sugar or sweetener added during preparation, and can it be reduced?');
    }
  }

  return Array.from(new Set(questions)).slice(0, 6);
}
