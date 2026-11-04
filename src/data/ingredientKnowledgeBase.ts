// ==========================================
// KAIROS — Ingredient Knowledge Base
// ==========================================
// A modular, extensible table of known ingredient/allergen/dietary
// relationships. This is NOT a list of ingredients present in any given
// dish — it is the reference ontology the risk engine uses to recognize
// a mention of an ingredient (by canonical name or alias) in scanned text
// (an ingredient label, a dish description, a menu line) and resolve what
// that ingredient is derived from and who it matters to.
//
// Adding a new relationship (e.g. a new allergen-derived ingredient) only
// requires a new entry here — no other file needs to change.
import { IngredientKnowledgeEntry } from '../types/risk';

export const ingredientKnowledgeBase: IngredientKnowledgeEntry[] = [
  // ---------- MILK ----------
  { canonicalName: 'milk', aliases: ['milk', 'dairy', 'doodh', 'full cream milk', 'skimmed milk'], parentSource: 'milk', category: 'dairy', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'casein', aliases: ['casein', 'caseinate', 'sodium caseinate'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'whey', aliases: ['whey', 'whey protein', 'whey powder'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'lactose', aliases: ['lactose'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'ghee', aliases: ['ghee', 'clarified butter'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'butter', aliases: ['butter', 'makhan'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'paneer', aliases: ['paneer', 'cottage cheese'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'curd', aliases: ['curd', 'dahi', 'yogurt', 'yoghurt', 'lassi'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'cream', aliases: ['cream', 'malai', 'fresh cream', 'heavy cream'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'khoya', aliases: ['khoya', 'khoa', 'mawa'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'milk powder', aliases: ['milk powder', 'milk solids'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'cheese', aliases: ['cheese', 'mozzarella', 'cheddar', 'processed cheese'], parentSource: 'milk', category: 'dairy_derivative', allergenRelationship: ['milk'], dietaryRelevance: ['lactose_free'], notVegan: true, evidenceStatus: 'confirmed' },

  // ---------- PEANUT ----------
  { canonicalName: 'peanut', aliases: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'moongphali', 'mungfali'], parentSource: 'peanut', category: 'legume', allergenRelationship: ['peanut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'peanut oil', aliases: ['peanut oil', 'groundnut oil'], parentSource: 'peanut', category: 'oil', allergenRelationship: ['peanut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'peanut flour', aliases: ['peanut flour', 'groundnut flour'], parentSource: 'peanut', category: 'flour', allergenRelationship: ['peanut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },

  // ---------- TREE NUT ----------
  { canonicalName: 'cashew', aliases: ['cashew', 'cashews', 'kaju'], parentSource: 'tree_nut', category: 'tree_nut', allergenRelationship: ['tree_nut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'almond', aliases: ['almond', 'almonds', 'badam'], parentSource: 'tree_nut', category: 'tree_nut', allergenRelationship: ['tree_nut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'walnut', aliases: ['walnut', 'walnuts', 'akhrot'], parentSource: 'tree_nut', category: 'tree_nut', allergenRelationship: ['tree_nut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'pistachio', aliases: ['pistachio', 'pistachios', 'pista'], parentSource: 'tree_nut', category: 'tree_nut', allergenRelationship: ['tree_nut'], dietaryRelevance: [], evidenceStatus: 'confirmed' },

  // ---------- EGG ----------
  { canonicalName: 'egg', aliases: ['egg', 'eggs', 'anda', 'albumin', 'egg white', 'egg yolk'], parentSource: 'egg', category: 'egg', allergenRelationship: ['egg'], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'mayonnaise', aliases: ['mayonnaise', 'mayo'], parentSource: 'egg', category: 'egg_derivative', allergenRelationship: ['egg'], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },

  // ---------- SOY ----------
  { canonicalName: 'soy', aliases: ['soy', 'soya', 'soybean'], parentSource: 'soy', category: 'legume', allergenRelationship: ['soy'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'soy lecithin', aliases: ['soy lecithin', 'soya lecithin', 'lecithin'], parentSource: 'soy', category: 'emulsifier', allergenRelationship: ['soy'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'soy sauce', aliases: ['soy sauce', 'soya sauce'], parentSource: 'soy', category: 'condiment', allergenRelationship: ['soy', 'wheat'], dietaryRelevance: [], evidenceStatus: 'confirmed' },
  { canonicalName: 'tofu', aliases: ['tofu', 'soya chunks', 'soy chunks', 'nutrela'], parentSource: 'soy', category: 'soy_derivative', allergenRelationship: ['soy'], dietaryRelevance: [], evidenceStatus: 'confirmed' },

  // ---------- WHEAT / GLUTEN ----------
  { canonicalName: 'wheat', aliases: ['wheat', 'gehun'], parentSource: 'wheat', category: 'grain', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'wheat flour', aliases: ['wheat flour', 'atta', 'maida', 'refined flour', 'all purpose flour'], parentSource: 'wheat', category: 'flour', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'semolina', aliases: ['semolina', 'suji', 'rava'], parentSource: 'wheat', category: 'grain_derivative', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'naan', aliases: ['naan'], parentSource: 'wheat', category: 'bread', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'roti', aliases: ['roti', 'chapati', 'phulka'], parentSource: 'wheat', category: 'bread', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'paratha', aliases: ['paratha'], parentSource: 'wheat', category: 'bread', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'kulcha', aliases: ['kulcha'], parentSource: 'wheat', category: 'bread', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },
  { canonicalName: 'puri', aliases: ['puri', 'poori', 'bhatura', 'bhature'], parentSource: 'wheat', category: 'bread', allergenRelationship: ['wheat'], dietaryRelevance: ['gluten_free'], evidenceStatus: 'confirmed' },

  // ---------- SHELLFISH ----------
  { canonicalName: 'shrimp', aliases: ['shrimp', 'prawn', 'prawns'], parentSource: 'shellfish', category: 'shellfish', allergenRelationship: ['shellfish'], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'crab', aliases: ['crab'], parentSource: 'shellfish', category: 'shellfish', allergenRelationship: ['shellfish'], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'lobster', aliases: ['lobster'], parentSource: 'shellfish', category: 'shellfish', allergenRelationship: ['shellfish'], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },

  // ---------- FISH ----------
  { canonicalName: 'fish', aliases: ['fish', 'machli', 'machhi'], parentSource: 'fish', category: 'fish', allergenRelationship: ['fish'], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },

  // ---------- SESAME ----------
  { canonicalName: 'sesame', aliases: ['sesame', 'til', 'sesame oil', 'sesame seeds', 'gingelly oil'], parentSource: 'sesame', category: 'seed', allergenRelationship: ['sesame'], dietaryRelevance: [], evidenceStatus: 'confirmed' },

  // ---------- MEAT (not allergen-related, but relevant to vegetarian/vegan/Jain preferences) ----------
  { canonicalName: 'chicken', aliases: ['chicken', 'murgh', 'murg'], parentSource: null, category: 'meat', allergenRelationship: [], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'mutton', aliases: ['mutton', 'gosht', 'lamb', 'goat meat'], parentSource: null, category: 'meat', allergenRelationship: [], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'beef', aliases: ['beef'], parentSource: null, category: 'meat', allergenRelationship: [], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'pork', aliases: ['pork', 'bacon', 'ham'], parentSource: null, category: 'meat', allergenRelationship: [], dietaryRelevance: [], notVegan: true, notVegetarian: true, evidenceStatus: 'confirmed' },
  { canonicalName: 'onion', aliases: ['onion', 'onions', 'pyaz'], parentSource: null, category: 'root_vegetable', allergenRelationship: [], dietaryRelevance: ['jain'], evidenceStatus: 'confirmed' },
  { canonicalName: 'garlic', aliases: ['garlic', 'lehsun'], parentSource: null, category: 'root_vegetable', allergenRelationship: [], dietaryRelevance: ['jain'], evidenceStatus: 'confirmed' },
  { canonicalName: 'potato', aliases: ['potato', 'potatoes', 'aloo'], parentSource: null, category: 'root_vegetable', allergenRelationship: [], dietaryRelevance: ['jain'], evidenceStatus: 'confirmed' },
];

export interface IngredientMatch {
  entry: IngredientKnowledgeEntry;
  matchedAlias: string;
  /** 'direct' when the matched text IS the allergen itself (e.g. "milk"), 'derived' when it's a source-derived ingredient (e.g. "casein"). */
  relation: 'direct' | 'derived';
}

/**
 * Scans free text (a dish name+description, a menu line, an ingredient
 * label line) for known ingredient mentions. Longest aliases are matched
 * first so e.g. "peanut oil" wins over the bare "peanut" entry.
 * Never invents a match — only returns ingredients whose alias text is
 * actually present in the given string.
 */
export function resolveIngredientMentions(text: string): IngredientMatch[] {
  const lower = ` ${text.toLowerCase()} `;
  const candidates: { entry: IngredientKnowledgeEntry; alias: string }[] = [];

  for (const entry of ingredientKnowledgeBase) {
    for (const alias of entry.aliases) {
      const pattern = new RegExp(`(?<![a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i');
      if (pattern.test(lower)) {
        candidates.push({ entry, alias });
      }
    }
  }

  // Longest alias match wins per canonical entry (avoids "peanut" firing
  // separately from "peanut oil" on the same phrase).
  candidates.sort((a, b) => b.alias.length - a.alias.length);
  const seen = new Set<string>();
  const results: IngredientMatch[] = [];
  for (const c of candidates) {
    if (seen.has(c.entry.canonicalName)) continue;
    seen.add(c.entry.canonicalName);
    // "direct" = the matched ingredient IS the allergen itself (e.g. "milk", "peanut", "egg").
    // "derived" = a named ingredient with a known relationship to the allergen/source (e.g. "casein" -> milk).
    const relation: 'direct' | 'derived' = c.entry.canonicalName === c.entry.parentSource ? 'direct' : 'derived';
    results.push({ entry: c.entry, matchedAlias: c.alias, relation });
  }
  return results;
}
