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
