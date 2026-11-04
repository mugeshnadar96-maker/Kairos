// Local chat service — no API needed
// Answers menu questions using template-based logic
import { DishWithMacros, RemainingBudget } from '../types';
import { RiskAssessment, RISK_LEVEL_LABEL, ALLERGEN_LABEL } from '../types/risk';

function findAssessmentForQuery(
  q: string,
  dishes: DishWithMacros[],
  riskAssessments: Record<string, RiskAssessment>
): RiskAssessment | undefined {
  for (const dish of dishes) {
    if (q.includes(dish.name.toLowerCase()) && riskAssessments[dish.name]) {
      return riskAssessments[dish.name];
    }
  }
  // No dish named in the question — fall back to the most concerning one, if any.
  const flagged = Object.values(riskAssessments).filter(a => a.overallStatus !== 'green');
  return flagged[0];
}

/**
 * Answers questions about the structured personalized risk assessment.
 * This NEVER invents a risk level or ingredient relationship — it only
 * reads back what the deterministic risk engine already computed.
 */
function answerCompareQuestion(dishes: DishWithMacros[], riskAssessments: Record<string, RiskAssessment>): string | null {
  const assessed = dishes.filter(d => riskAssessments[d.name]);
  if (assessed.length < 2) {
    return "I need at least two scanned dishes with an assessment to compare. Select dishes on the Results screen (or ask about specific dish names) and try again.";
  }
  const lines = assessed.map(d => {
    const a = riskAssessments[d.name];
    const allergyCount = a.allergens.length;
    const verifyCount = a.recommendedVerification.length;
    return `**${d.name}** — ${RISK_LEVEL_LABEL[a.overallStatus]}${allergyCount ? `, ${allergyCount} allergen finding(s)` : ''}${verifyCount ? `, ${verifyCount} item(s) to verify` : ''}`;
  });
  return `Comparing based on your profile (factors only, not an overall ranking):\n${lines.join('\n')}\n\nOpen the Compare screen from Results for a full side-by-side breakdown.`;
}

function answerRiskQuestion(question: string, dishes: DishWithMacros[], riskAssessments: Record<string, RiskAssessment>): string | null {
  const q = question.toLowerCase();

  if (/compare (these|the|my)? ?dishes|compare.*profile/.test(q)) {
    return answerCompareQuestion(dishes, riskAssessments);
  }

  const isRiskQuestion = /why.*(flag|alert|concern)|derived|allerg|confirmed or inferred|what.*missing|what.*verify|how can i modify|modify this|ask the restaurant|cross.?contact/.test(q);
  if (!isRiskQuestion) return null;
  if (Object.keys(riskAssessments).length === 0) {
    return "I don't have a personalized risk assessment loaded yet — scan a menu or dish first.";
  }

  const assessment = findAssessmentForQuery(q, dishes, riskAssessments);
  if (!assessment) {
    return "I didn't find any flagged concerns for the currently loaded dishes based on your profile.";
  }

  if (/why.*(flag|alert|concern)/.test(q)) {
    if (assessment.riskFactors.length === 0) {
      return `**${assessment.foodName}**: ${RISK_LEVEL_LABEL[assessment.overallStatus]} — no specific risk factors matched your profile.`;
    }
    return `**${assessment.foodName}** (${RISK_LEVEL_LABEL[assessment.overallStatus]}):\n` +
      assessment.riskFactors.map(f => `• ${f.summary} — relevant to your ${f.userFactor}.`).join('\n');
  }

  if (/derived|allerg/.test(q)) {
    if (assessment.allergens.length === 0) {
      return `No allergen-relevant ingredients were detected in **${assessment.foodName}** for your declared allergies.`;
    }
    return assessment.allergens.map(a =>
      `${a.ingredient} → ${a.relation === 'derived' ? `${ALLERGEN_LABEL[a.allergen]}-derived` : ALLERGEN_LABEL[a.allergen]} (your ${a.severity} ${ALLERGEN_LABEL[a.allergen].toLowerCase()} allergy)`
    ).join('\n');
  }

  if (/confirmed or inferred/.test(q)) {
    if (assessment.riskFactors.length === 0) return `No findings to classify for **${assessment.foodName}**.`;
    return assessment.riskFactors.map(f => `${f.summary} — status: ${f.status.replace('_', ' ').toUpperCase()}`).join('\n');
  }

  if (/what.*missing|what.*don.?t know/.test(q)) {
    return `What we don't know about **${assessment.foodName}**:\n` + assessment.unknowns.map(u => `? ${u}`).join('\n');
  }

  if (/what.*verify/.test(q)) {
    if (assessment.recommendedVerification.length === 0) return `Nothing specific to verify for **${assessment.foodName}** based on the current assessment.`;
    return assessment.recommendedVerification.map(v => `• ${v}`).join('\n');
  }

  if (/how can i modify|modify this/.test(q)) {
    if (assessment.possibleModifications.length === 0) return `No specific modification suggestions for **${assessment.foodName}**.`;
    return assessment.possibleModifications.map(m => `• ${m}`).join('\n') +
      '\n\nNote: a modification may reduce an identified concern, but always verify with the restaurant if it involves an allergy.';
  }

  if (/ask the restaurant|cross.?contact/.test(q)) {
    if (assessment.questionsToAsk.length === 0) return `No specific questions generated for **${assessment.foodName}**.`;
    return 'Questions to ask before eating:\n' + assessment.questionsToAsk.map(qq => `• ${qq}`).join('\n');
  }

  return null;
}

export function localChatResponse(
  question: string,
  dishes: DishWithMacros[],
  budget: RemainingBudget,
  goal: string,
  riskAssessments: Record<string, RiskAssessment> = {}
): string {
  const riskAnswer = answerRiskQuestion(question, dishes, riskAssessments);
  if (riskAnswer) return riskAnswer;

  const q = question.toLowerCase();

  // Most protein
  if (q.includes('most protein') || q.includes('highest protein') || q.includes('protein rich')) {
    const sorted = [...dishes].sort((a, b) => b.macros.protein - a.macros.protein);
    const top3 = sorted.slice(0, 3);
    return `Here are the highest protein dishes:\n${top3.map((d, i) => `${i + 1}. **${d.name}** — ${d.macros.protein}g protein (${d.macros.calories} kcal)`).join('\n')}\n\nI'd recommend **${top3[0].name}** with ${top3[0].macros.protein}g protein.`;
  }

  // Lowest calorie
  if (q.includes('lowest calorie') || q.includes('least calorie') || q.includes('low cal') || q.includes('fewest cal')) {
    const sorted = [...dishes].sort((a, b) => a.macros.calories - b.macros.calories);
    const top3 = sorted.slice(0, 3);
    return `Lowest calorie options:\n${top3.map((d, i) => `${i + 1}. **${d.name}** — ${d.macros.calories} kcal (${d.macros.protein}g protein)`).join('\n')}`;
  }

  // Low carb
  if (q.includes('low carb') || q.includes('least carb') || q.includes('keto')) {
    const sorted = [...dishes].sort((a, b) => a.macros.carbs - b.macros.carbs);
    const top3 = sorted.slice(0, 3);
    return `Lowest carb options:\n${top3.map((d, i) => `${i + 1}. **${d.name}** — ${d.macros.carbs}g carbs (${d.macros.calories} kcal)`).join('\n')}`;
  }

  // Can I eat two dishes
  if (q.includes('two dishes') || q.includes('2 dishes') || q.includes('eat both') || q.includes('combo')) {
    const affordable = dishes.filter(d => d.macros.calories <= budget.calories / 2);
    if (affordable.length >= 2) {
      const best2 = affordable.sort((a, b) => b.macros.protein - a.macros.protein).slice(0, 2);
      const totalCal = best2[0].macros.calories + best2[1].macros.calories;
      const totalPro = best2[0].macros.protein + best2[1].macros.protein;
      return `Yes! You can fit two dishes. Best combo:\n• **${best2[0].name}** (${best2[0].macros.calories} kcal)\n• **${best2[1].name}** (${best2[1].macros.calories} kcal)\n\nTotal: ${totalCal} kcal, ${totalPro}g protein — within your ${budget.calories} kcal budget.`;
    }
    return `With ${budget.calories} kcal remaining, it's tight for two full dishes. Try picking one main dish and one side/appetizer.`;
  }

  // Skip rice
  if (q.includes('skip the rice') || q.includes('without rice') || q.includes('no rice')) {
    return `Skipping rice saves roughly 200-250 kcal and 44g+ carbs. Great move for ${goal === 'low_carb' ? 'your low-carb goal' : 'staying within budget'}! Pair your curry with a roti (120 kcal) instead, or eat the curry by itself.`;
  }

  // Skip naan/bread
  if (q.includes('skip the naan') || q.includes('without naan') || q.includes('no bread')) {
    return `Skipping naan saves 260-320 kcal and ~42g carbs. Switch to plain roti (120 kcal) or go bread-free — your curry still tastes great without it!`;
  }

  // Best combo under X kcal
  const comboMatch = q.match(/under\s*(\d+)\s*kcal/);
  if (comboMatch || q.includes('best combo')) {
    const limit = comboMatch ? parseInt(comboMatch[1]) : budget.calories;
    const affordable = dishes.filter(d => d.macros.calories <= limit * 0.6);
    if (affordable.length >= 2) {
      const combo = affordable.sort((a, b) => b.macros.protein - a.macros.protein).slice(0, 2);
      return `Best combo under ${limit} kcal:\n• **${combo[0].name}** (${combo[0].macros.calories} kcal, ${combo[0].macros.protein}g protein)\n• **${combo[1].name}** (${combo[1].macros.calories} kcal, ${combo[1].macros.protein}g protein)\n\nTotal: ${combo[0].macros.calories + combo[1].macros.calories} kcal`;
    }
    return `Hard to fit a combo under ${limit} kcal from these options. Pick a single dish that's under ${limit} kcal.`;
  }

  // What should I order / recommend
  if (q.includes('recommend') || q.includes('what should') || q.includes('suggest') || q.includes('best')) {
    const fits = dishes.filter(d => d.macros.calories <= budget.calories).sort((a, b) => b.macros.protein - a.macros.protein);
    if (fits.length > 0) {
      return `Based on your ${budget.calories} kcal budget and ${goal.replace('_', ' ')} goal, I'd recommend **${fits[0].name}** — ${fits[0].macros.calories} kcal with ${fits[0].macros.protein}g protein. It fits your budget perfectly.`;
    }
    return `You have ${budget.calories} kcal left. Look for the lightest options — soups, salads, or grilled items.`;
  }

  // Specific dish question
  for (const dish of dishes) {
    if (q.includes(dish.name.toLowerCase())) {
      const fitsInBudget = dish.macros.calories <= budget.calories;
      return `**${dish.name}** has:\n• ${dish.macros.calories} kcal\n• ${dish.macros.protein}g protein\n• ${dish.macros.carbs}g carbs\n• ${dish.macros.fat}g fat\n\n${fitsInBudget ? `✅ This fits within your ${budget.calories} kcal budget.` : `⚠️ At ${dish.macros.calories} kcal, this exceeds your ${budget.calories} kcal remaining.`}`;
    }
  }

  // Default
  return `You have ${budget.calories} kcal and ${budget.protein}g protein remaining. There are ${dishes.length} dishes loaded. Try asking about specific dishes, "most protein", "lowest calorie", or "can I eat two dishes?"`;
}
