// Groq API — Image-based menu parsing using Llama-4-Scout (vision model)
import { ParsedDish, PackagedFoodScanResult, MacroInfo } from '../types';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
// Configurable via env so a model swap (e.g. once vision access is enabled
// on the Groq account) never requires a code change — just set
// EXPO_PUBLIC_GROQ_VISION_MODEL in .env and restart the dev server.
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Per-attempt network timeout. Without this, a stalled/slow connection hangs
// indefinitely instead of failing — this is what made scans feel like they
// were "taking very long" with no eventual error.
const REQUEST_TIMEOUT_MS = 25000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callGroqVision(promptText: string, imageBase64: string): Promise<string> {
  const payload = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      },
    ],
    temperature: 0.1,
  };

  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await delay(4000 * attempt);

      const response = await fetchWithTimeout(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, REQUEST_TIMEOUT_MS);

      if (response.status === 429) {
        lastError = 'Rate limit reached. Retrying...';
        continue;
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const code = errData?.error?.code;
        const message = errData?.error?.message || `HTTP ${response.status}`;
        // Any other 4xx is a permanent request problem (bad/missing model,
        // a model that doesn't support image input, malformed payload,
        // auth error, etc.) — retrying identical input 3 times can't fix
        // it, so fail fast instead of burning ~12s of dead retry delay.
        // Only 429 (handled above) and 5xx (transient server issues,
        // handled by falling through to the retry below) are worth retrying.
        if (response.status >= 400 && response.status < 500) {
          const hint = code === 'model_not_found' || code === 'model_decommissioned'
            ? 'the configured AI vision model is unavailable'
            : /image/i.test(message)
              ? 'the configured AI model does not support image input'
              : message;
          throw new Error(`Photo scanning is unavailable right now (${hint}). Try "Select Manually" for now.`);
        }
        lastError = message;
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } catch (error: any) {
      if (error.message?.startsWith('Photo scanning is unavailable right now')) throw error;
      lastError = error.message || 'Unknown error';
    }
  }
  throw new Error(`Vision scan failed after 3 attempts: ${lastError}`);
}

// LLM JSON output for numeric fields is occasionally a numeric string, and
// the nutrition panel is very often just not in the same photo as the
// ingredients list. Treat anything without a positive calorie figure as
// "not legible" rather than silently returning zeroed-out macros that look
// like a real (if bad) reading.
function sanitizeMacros(raw: any): MacroInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const calories = Number(raw.calories);
  if (!Number.isFinite(calories) || calories <= 0) return undefined;
  const num = (v: any) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
  return { calories: Math.round(calories), protein: num(raw.protein), carbs: num(raw.carbs), fat: num(raw.fat), fiber: num(raw.fiber) };
}

/**
 * Extracts a packaged-food ingredient list and allergen declaration from a
 * scanned label photo. Returns raw scanned text — it never infers or
 * fabricates ingredients/allergens beyond what is legible on the label.
 */
export async function parseIngredientLabel(imageBase64: string): Promise<PackagedFoodScanResult> {
  const promptText = `You are reading a packaged food product's label. Extract exactly what is printed — do not infer or guess ingredients that aren't legible. Return ONLY valid JSON, no markdown/code fences: {"productName": "string or empty if not legible", "ingredientsText": "the full ingredients list as printed, verbatim, or empty string if not visible", "allergenText": "any 'Contains:' or 'May contain:' allergen statement as printed, verbatim, or empty string if not present", "macros": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0} or null if the nutrition facts panel isn't legible, "servingSize": "string or empty"}. If any field cannot be read, use an empty string (or null for macros) rather than guessing.`;

  const cleaned = await callGroqVision(promptText, imageBase64);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      productName: parsed.productName || 'Scanned Product',
      ingredientsText: parsed.ingredientsText || '',
      allergenText: parsed.allergenText || '',
      macros: sanitizeMacros(parsed.macros),
      servingSize: parsed.servingSize || undefined,
    };
  } catch {
    throw new Error('Could not parse the label. Try a clearer, well-lit photo of the ingredients panel.');
  }
}

export async function parseMenuImage(imageBase64: string, scanType: 'menu' | 'dish' = 'menu'): Promise<ParsedDish[]> {
  const promptText = scanType === 'dish'
    ? `You are an expert food analyzer. Look at this photo of food and identify what dish it is. Provide its name, a brief description, and estimated nutritional macros. Return ONLY a valid JSON array with no markdown formatting, no code fences: [{"name": "dish name", "description": "brief description", "macros": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0}}]. If multiple dishes are visible, list them all.`
    : `You are a menu parser. Look at this restaurant menu image and extract every dish name and its description. Ignore prices, section headers, and non-food text. Return ONLY a valid JSON array with no markdown formatting, no code fences: [{"name": "dish name", "description": "brief description"}]. If you cannot read the menu clearly, do your best to extract what you can.`;

  const cleaned = await callGroqVision(promptText, imageBase64);
  try {
    const parsed: ParsedDish[] = JSON.parse(cleaned || '[]');
    return parsed.filter((d: any) => d.name && typeof d.name === 'string');
  } catch {
    throw new Error('Could not parse the scan result. Try a clearer photo or select dishes manually.');
  }
}
