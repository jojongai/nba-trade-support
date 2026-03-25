# LLM Trade Analysis Response Schema

Expected JSON structure returned by the LLM when analyzing a trade. Use this to:

- Test the UI without calling the LLM (use `SAMPLE_LLM_RESPONSE` from `@/lib/llm-response`)
- Implement backend response parsing
- Design prompts that ask the LLM for structured JSON output

---

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `verdict` | `"accept"` \| `"reject"` \| `"neutral"` | Yes | Overall recommendation |
| `verdict_score` | number (0–100) | Yes | Confidence / favorability score |
| `summary` | string | Yes | 2–3 sentence trade summary |
| `pros` | string[] | Yes | Bullet points for advantages |
| `cons` | string[] | Yes | Bullet points for disadvantages |
| `recommendation` | string | Yes | Actionable recommendation |
| `insights` | string[] | Yes | Category-specific or general insights |
| `category_impacts` | Record<string, string> | No | Per-category label, e.g. `"ppg": "slight upgrade"` |

---

## Sample Output (for UI testing)

```json
{
  "verdict": "accept",
  "verdict_score": 72,
  "summary": "This trade slightly favors you. You give up a high-volume scorer and a reliable big for a balanced wing and an upside guard. Your assists and steals improve while scoring stays similar. Consider your playoff schedule before committing.",
  "pros": [
    "Assist production increases with the incoming point guard",
    "Steals improve — helps in category leagues",
    "Trade value is roughly even; no major overpay",
    "Reduces injury risk by moving an older player"
  ],
  "cons": [
    "Rebounding takes a hit with the center departure",
    "Blocks decrease slightly",
    "Turnovers may rise if the new guard is ball-dominant"
  ],
  "recommendation": "Accept if you are punting rebounds or already strong there. If blocks are a need, consider countering with a block specialist on your side.",
  "insights": [
    "Your PPG stays roughly the same (+0.3) while RPG drops (-1.2).",
    "APG improves by ~2.1 — good for assists-needy teams.",
    "SPG gets a boost of ~0.4; BPG drops ~0.3.",
    "This appears to be a relatively balanced trade with slight upside for you."
  ],
  "category_impacts": {
    "ppg": "slight upgrade",
    "rpg": "downgrade",
    "apg": "upgrade",
    "spg": "upgrade",
    "bpg": "slight downgrade",
    "fg3m": "neutral",
    "tov": "neutral",
    "fg_pct": "neutral",
    "ft_pct": "neutral"
  }
}
```

---

## TypeScript Usage

```ts
import { SAMPLE_LLM_RESPONSE, isLLMTradeResponse } from "@/lib/llm-response";

// For UI testing without API call
const response = SAMPLE_LLM_RESPONSE;

// Parse API response
const parsed = JSON.parse(apiResponseText);
if (isLLMTradeResponse(parsed)) {
  // Use parsed.verdict, parsed.summary, etc.
}
```

---

## Input (what we send to the LLM)

See `@/lib/trade-context` for the structure we build and send as the prompt context (`TradeContextForLLM`).

Computed **before** any LLM JSON response is produced or parsed:

- **`other_players_to_target`** — Up to 4 players **not** on your roster and **not** in the current trade whose trade-value score is closest to the **average** of players you’re receiving. Same league weights as `computeTradeValues`. Use this for “who else to ask about” in copy and analysis.
