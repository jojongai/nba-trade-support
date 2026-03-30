"""OpenAI LLM service for trade analysis."""
import json
import os
import re

from openai import OpenAI


def get_client() -> OpenAI:
    api_key = (
        os.environ.get("OPENAI_API_KEY") or os.environ.get("OPEN_AI_API_KEY") or ""
    ).strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set in environment")
    return OpenAI(api_key=api_key)


def generate(prompt: str, model: str = "gpt-4o") -> str:
    """Send a prompt to OpenAI and return the text response."""
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""


def generate_stream(prompt: str, model: str = "gpt-4o"):
    """Send a prompt to OpenAI and stream the response."""
    client = get_client()
    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for chunk in stream:
        content = chunk.choices[0].delta.content if chunk.choices else ""
        if content:
            yield content


_TRADE_JSON_SCHEMA_HINT = """You must respond with a single JSON object only, no markdown, no code fences. Keys:
- verdict: one of "accept", "reject", "neutral"
- verdict_score: number from 0 to 100 (confidence / strength of recommendation)
- summary: string, 2-4 sentences
- pros: array of short strings (2-5 items)
- cons: array of short strings (2-5 items)
- recommendation: string, one clear sentence for the fantasy manager
- insights: array of strings (3-6 bullet-style insights)
- category_impacts: optional object mapping stat category names to short impact strings

Perspective: The person reading your answer is the manager on team_a in the JSON. In every string you write (summary, pros, cons, recommendation, insights, category_impacts values), address them as You / your / your roster / your team — never "Team A". For team_b, say your trade partner, the other manager, or the other side — never "Team B".

Base your analysis only on the trade context JSON. Be specific to the players and numbers given."""


def _strip_json_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, count=1, flags=re.IGNORECASE)
        t = re.sub(r"\s*```\s*$", "", t, count=1)
    return t.strip()


def generate_trade_analysis_json(trade_context_json: str, model: str = "gpt-4o") -> str:
    """Return a JSON string matching the frontend LLMTradeResponse schema."""
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert NBA fantasy basketball analyst writing directly to the user. "
                    + _TRADE_JSON_SCHEMA_HINT
                ),
            },
            {
                "role": "user",
                "content": (
                    "Analyze this fantasy basketball trade. Context (JSON):\n"
                    + trade_context_json
                ),
            },
        ],
    )
    raw = response.choices[0].message.content or ""
    cleaned = _strip_json_fences(raw)
    # Validate JSON early so the router can return a clear error
    json.loads(cleaned)
    return cleaned


_TEAM_IDENTITY_JSON_HINT = """You must respond with a single JSON object only, no markdown, no code fences. Keys:
- team_identity: string, a short label for the build (e.g. "Guard-heavy finesse", "Balanced punt-FG%")
- narrative_summary: string, 2-4 sentences for the user
- strengths: array of short strings (2-5)
- weaknesses: array of short strings (2-5)
- top_improvements: array of 2-3 prioritized strings
- recommended_move_types: array of strings (e.g. "trade guard depth for a C", "waiver stream for blocks")
- insights: array of strings (3-6)

Use only the structured diagnosis JSON. Address the reader as You / your team. Do not invent players or stats not implied by the input."""


def generate_team_identity_json(team_analysis_json: str, model: str = "gpt-4o") -> str:
    """Return JSON for roster identity / priorities after deterministic team analysis."""
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert NBA fantasy basketball analyst writing directly to the user. "
                    + _TEAM_IDENTITY_JSON_HINT
                ),
            },
            {
                "role": "user",
                "content": (
                    "Here is deterministic analysis of the user's roster vs a synthetic league "
                    "(JSON). Summarize identity, why they are strong or weak, prioritize 2-3 "
                    "improvements, and recommend realistic move types.\n"
                    + team_analysis_json
                ),
            },
        ],
    )
    raw = response.choices[0].message.content or ""
    cleaned = _strip_json_fences(raw)
    json.loads(cleaned)
    return cleaned


_TEAM_AND_TRADE_TARGETS_LLM_HINT = """You must respond with a single JSON object only, no markdown, no code fences.

Team overview (from profile, league_comparison, flags, candidate_actions, and trade_targets when present):
- team_identity: string, a short label for the build (e.g. "Guard-heavy finesse", "Balanced punt-FG%")
- narrative_summary: string, 2-4 sentences for the user
- strengths: array of short strings (2-5)
- weaknesses: array of short strings (2-5)
- top_improvements: array of 2-3 prioritized strings
- recommended_move_types: array of strings (e.g. "trade guard depth for a C", "waiver stream for blocks")
- insights: array of strings (3-6)

Trade targets (only when input includes trade_targets with curated_for_llm / candidates):
- top_three_targets: array of up to 3 objects (fewer if fewer candidates; use [] if trade_targets is null or there are no valid candidates), each object with:
  - name: string (must exactly match a name from curated_for_llm in the input when present)
  - rank: integer starting at 1
  - why_fit: string
  - trade_construction: string (1-2 sentences; reference trade_assets / tradeable players by name where relevant)
- summary: string, 2-4 sentences on trade direction and how targets address needs (still write useful trade-oriented summary even if top_three_targets is empty)
- constraint_acknowledgment: string, one sentence: either that every named target appears in the provided candidate list, or that no candidates were available to rank

Rules:
1. Base team overview on profile, league_comparison, flags, and candidate_actions. Address the reader as You / your team.
2. For trade targets, use only names from curated_for_llm / candidates in top_three_targets when those lists exist and are non-empty.
3. Never invent players or stats not supported by the input JSON.
4. If fewer than three valid candidates exist, return fewer than three objects in top_three_targets (or none)."""


def generate_trade_targets_llm_json(team_analysis_json: str, model: str = "gpt-4o") -> str:
    """LLM layer: team overview + ranked trade targets from full POST /team/analyze JSON."""
    client = get_client()
    task = """
### Task (required)
1. Summarize this team's identity, strengths, weaknesses, improvements, move types, and insights from the deterministic analysis.
2. Rank up to 3 trade targets (or fewer) using names from trade_targets.curated_for_llm when present; otherwise return an empty top_three_targets.
3. Add a short trade-focused summary and a constraint sentence as specified.

### Input JSON (full team analysis from POST /team/analyze)
"""
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert NBA fantasy basketball analyst and trade strategist writing to the user. "
                    + _TEAM_AND_TRADE_TARGETS_LLM_HINT
                ),
            },
            {
                "role": "user",
                "content": task + team_analysis_json,
            },
        ],
    )
    raw = response.choices[0].message.content or ""
    cleaned = _strip_json_fences(raw)
    json.loads(cleaned)
    return cleaned
