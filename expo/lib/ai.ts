/**
 * SHEREHE AI module — lightweight wrapper around the Rork AI proxy.
 *
 * Uses the Vercel AI Gateway via the Rork toolkit proxy so the app only
 * needs the public toolkit secret — no provider API keys on the client.
 *
 * Current model: openai/gpt-4.1-nano
 *   - Fastest & cheapest GPT-4.1 variant
 *   - 1M+ context, 32k max output
 *   - ~$0.0000001/input token, $0.0000004/output token
 *   - Latency: p50 ~550ms
 *
 * Why this model: invitation messages are short (50-150 words) and need
 * creative flair, not deep reasoning. nano delivers solid prose at the
 * lowest cost/lowest latency in the GPT-4 family.
 *
 * Rate limiting: 15 requests per hour per device. Tracked via AsyncStorage
 * using a sliding-window of timestamps. Excess requests return null silently
 * so the caller falls back to template-based messages.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "";
const SECRET_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

const MODEL_ID = "openai/gpt-4.1-nano";
const ENDPOINT = `${TOOLKIT_URL}/v2/vercel/v1/chat/completions`;
const TIMEOUT_MS = 15_000;

// Rate limit: max requests per hour
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_STORAGE_KEY = "sherehe.ai_rate_limits.v1";

/**
 * Check and update rate limit. Returns true if the request is allowed,
 * false if the rate limit has been exceeded.
 */
async function checkRateLimit(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(RATE_STORAGE_KEY);
    const timestamps: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Prune expired entries
    const active = timestamps.filter((t) => t > windowStart);

    if (active.length >= RATE_LIMIT_MAX) {
      console.log(`[ai] Rate limit reached (${active.length}/${RATE_LIMIT_MAX} in last hour)`);
      return false;
    }

    active.push(now);
    await AsyncStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(active));
    return true;
  } catch (e) {
    // If storage fails, allow the request — fail open
    console.log("[ai] Rate limit check failed, allowing request", e);
    return true;
  }
}

interface AiInvitationInput {
  /** Event type (wedding, birthday, baby, etc.) */
  eventType: string;
  /** Custom label if type is "custom" */
  customLabel?: string;
  /** Host's name */
  hostName: string;
  /** Event name / title */
  eventName: string;
  /** Venue or location */
  venue: string;
  /** Current draft the user typed (for rewrite) */
  existing?: string;
}

/**
 * Generate a fresh invitation message using AI.
 * Falls back to returning null if the AI call fails — the caller should
 * use its own template-based fallback in that case.
 */
export async function generateInvitationMessage(
  input: AiInvitationInput,
): Promise<string | null> {
  if (!TOOLKIT_URL || !SECRET_KEY) {
    console.log("[ai] Toolkit URL or secret key not configured");
    return null;
  }

  // Enforce rate limit before making the API call
  const allowed = await checkRateLimit();
  if (!allowed) return null;

  const label = input.eventType === "custom" && input.customLabel
    ? input.customLabel
    : input.eventType;

  const systemPrompt = [
    "You are a warm, personal invitation writer. Write messages that feel handwritten — not corporate.",
    "Rules:",
    "- 2-4 sentences max (50-120 words)",
    "- Never use clichés like \"You're cordially invited\" or \"Save the date\"",
    "- Match the tone to the event type naturally",
    "- Address the recipient as a valued guest, not a crowd",
    "- Use the host's name naturally if it fits",
    "- Avoid exclamation marks unless the event is genuinely high-energy",
    "- Write in plain, modern English — no formality for formality's sake",
  ].join("\n");

  const userPrompt = input.existing
    ? [
        `Rewrite this invitation message to be fresher and more personal. Keep the same length and key details.`,
        ``,
        `Event: ${input.eventName} (${label})`,
        `Host: ${input.hostName}`,
        `Venue: ${input.venue}`,
        ``,
        `Current draft:`,
        input.existing,
      ].join("\n")
    : [
        `Write a short, warm invitation message for this event:`,
        ``,
        `Event: ${input.eventName}`,
        `Type: ${label}`,
        `Host: ${input.hostName}`,
        `Venue: ${input.venue}`,
      ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("AI request timed out")), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: 250,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.log(`[ai] API error ${response.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.log("[ai] Empty response from AI");
      return null;
    }

    // Clean up: strip quotes, trim whitespace, normalize newlines
    return content
      .replace(/^["']|["']$/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log("[ai] Generation failed:", msg);
    return null;
  }
}
