// Claude API — Nutrition estimation, ranking, and chat
import { DishWithMacros, RankedDish, MacroInfo, RemainingBudget, ChatMessage } from '../types';

const CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY'; // Replace with your key
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Claude API error:', errText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

export async function estimateMacros(
  dishName: string,
  description: string
): Promise<MacroInfo> {
  const system = `You are a nutritionist. Estimate the macronutrient content per serving of Indian restaurant dishes. Return ONLY valid JSON with no markdown: {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}. All values in grams except calories in kcal.`;
  const msg = `Dish: ${dishName}\nDescription: ${description}\nEstimate the macros for a standard restaurant serving.`;

  try {
    const text = await callClaude(system, msg);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { calories: 350, protein: 15, carbs: 30, fat: 15, fiber: 5 };
  }
}

export async function rankDishes(
  dishes: DishWithMacros[],
  budget: RemainingBudget,
  goal: string,
  cheatDay: boolean,
  preferenceNote: string
): Promise<RankedDish[]> {
  let system: string;

  if (cheatDay) {
    system = `You are a diet assistant. The user is on a cheat day. Do not enforce calorie limits. Instead, rank dishes by least total damage — lowest sugar, lowest trans fat, least processed. Find the least bad option. Return ONLY valid JSON array with no markdown: [{"name": "...", "score": 1-100, "verdict": "top_pick"|"good"|"skip", "reason": "one line", "customizationTip": "one tip"}]`;
  } else {
    system = `You are a diet assistant. Rank dishes based on how well they fit the user's remaining macro budget and goal. Return ONLY valid JSON array with no markdown: [{"name": "...", "score": 1-100, "verdict": "top_pick"|"good"|"skip", "reason": "one line", "customizationTip": "one tip"}]. Top picks should be dishes that fit within budget and align with the goal. Score from 100 (perfect) to 0 (worst).`;
  }

  if (preferenceNote) {
    system += `\n\nPersonalization note: ${preferenceNote}`;
  }

  const dishList = dishes.map(d => `${d.name}: ${d.macros.calories}kcal, ${d.macros.protein}g protein, ${d.macros.carbs}g carbs, ${d.macros.fat}g fat`).join('\n');

  const msg = `User's remaining budget: ${budget.calories} kcal, ${budget.protein}g protein, ${budget.carbs}g carbs.
Goal: ${goal}
${cheatDay ? 'CHEAT DAY MODE - find least damaging options' : ''}

Dishes:
${dishList}

Rank ALL dishes. Return the JSON array.`;

  try {
    const text = await callClaude(system, msg);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rankings: any[] = JSON.parse(cleaned);

    return dishes.map(dish => {
      const ranking = rankings.find(r => r.name.toLowerCase() === dish.name.toLowerCase()) || {
        score: 50,
        verdict: 'good',
        reason: 'Could not rank this dish',
        customizationTip: 'Ask about preparation method',
      };
      return { ...dish, ...ranking };
    }).sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Ranking failed:', error);
    return dishes.map(dish => ({
      ...dish,
      score: 80,
      verdict: 'good',
      reason: 'AI reasoning temporarily unavailable.',
      warnings: [],
      customizationTip: 'Ask the waiter for healthy modifications.',
    }));
  }
}

export async function chatWithMenu(
  messages: { role: 'user' | 'assistant'; content: string }[],
  menuContext: string,
  budget: RemainingBudget,
  goal: string,
  restaurantName: string
): Promise<string> {
  const system = `You are a diet assistant. The user is at ${restaurantName || 'a restaurant'}. Available dishes and their macros: ${menuContext}. User's remaining budget: ${budget.calories} kcal, ${budget.protein}g protein, ${budget.carbs}g carbs. Goal: ${goal}. Answer questions about this specific menu only. Be concise and helpful.`;

  const response = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!response.ok) throw new Error(`Claude chat error: ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text || 'Sorry, I could not process that question.';
}
