// Indian Food Nutrition Database — 250+ dishes
// Source: Anuvaad Indian Nutrient Database (INDB) via Kaggle
// Values are per 100g serving
import rawData from './indianFoodData.json';

export interface FoodEntry {
  name: string;
  keywords: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

// Generate keywords automatically from dish name
function generateKeywords(name: string): string[] {
  const words = name.toLowerCase().split(/\s+/);
  const keywords = [...words];

  // Add common aliases
  const aliases: Record<string, string[]> = {
    'chicken': ['murgh', 'murg'],
    'mutton': ['gosht', 'goat', 'lamb'],
    'paneer': ['cottage', 'cheese'],
    'aloo': ['potato'],
    'gobi': ['cauliflower'],
    'palak': ['spinach', 'saag'],
    'dal': ['daal', 'lentil'],
    'naan': ['nan'],
    'roti': ['chapati', 'chapatti', 'phulka'],
    'biryani': ['biriyani', 'briyani'],
    'dosa': ['dosai'],
    'idli': ['idly'],
    'vada': ['vadai', 'medu'],
    'samosa': ['singara'],
    'paratha': ['parantha', 'prantha'],
    'kebab': ['kabab', 'kabob'],
    'korma': ['kurma'],
    'bhaji': ['sabzi', 'sabji'],
    'chana': ['chole', 'chickpea'],
    'rajma': ['kidney', 'bean'],
    'masala': ['spiced'],
    'tandoori': ['tandoor'],
    'fried': ['tala', 'tawa'],
    'curry': ['gravy', 'rassa'],
    'prawn': ['shrimp', 'jhinga'],
    'fish': ['machhi', 'meen', 'machli'],
    'egg': ['anda'],
    'rice': ['chawal', 'chaval'],
    'puri': ['poori'],
    'halwa': ['halva', 'sheera'],
    'lassi': ['chaas'],
    'kulfi': ['ice cream'],
    'kheer': ['payasam'],
    'momos': ['dumpling'],
    'bhatura': ['bhature'],
  };

  for (const word of words) {
    if (aliases[word]) {
      keywords.push(...aliases[word]);
    }
  }

  return [...new Set(keywords)];
}

// Parse compact JSON into FoodEntry objects
// Format: [name, calories, protein, carbs, fat]
export const indianFoodDB: FoodEntry[] = (rawData as any[]).map(
  ([name, calories, protein, carbs, fat]: [string, number, number, number, number]) => ({
    name,
    keywords: generateKeywords(name),
    calories,
    protein,
    carbs,
    fat,
    fiber: Math.round(carbs * 0.15), // Estimate: 15% of carbs is fiber
  })
);

// Three-tier matching algorithm
export function findNutrition(
  dishName: string
): { entry: FoodEntry; matchType: 'exact' | 'partial' | 'keyword' } | null {
  const normalized = dishName.toLowerCase().trim();

  // Tier 1: Exact match
  const exact = indianFoodDB.find(
    (f) => f.name.toLowerCase() === normalized
  );
  if (exact) return { entry: exact, matchType: 'exact' };

  // Tier 2: Partial / contains match
  const partial = indianFoodDB.find(
    (f) =>
      normalized.includes(f.name.toLowerCase()) ||
      f.name.toLowerCase().includes(normalized)
  );
  if (partial) return { entry: partial, matchType: 'partial' };

  // Tier 3: Keyword match (best score wins, min 1 keyword)
  let bestMatch: FoodEntry | null = null;
  let bestScore = 0;
  const words = normalized.split(/\s+/);

  for (const food of indianFoodDB) {
    let score = 0;
    for (const kw of food.keywords) {
      if (words.some((w) => w.includes(kw) || kw.includes(w))) {
        score++;
      }
    }
    if (score > bestScore && score >= 1) {
      bestScore = score;
      bestMatch = food;
    }
  }
  if (bestMatch) return { entry: bestMatch, matchType: 'keyword' };

  return null;
}
