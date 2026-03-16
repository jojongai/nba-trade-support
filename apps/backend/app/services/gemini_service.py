"""Gemini LLM service for trade analysis."""
import os

from google import genai
from google.genai import types


def get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment")
    return genai.Client(api_key=api_key)


def generate(prompt: str, model: str = "gemini-2.0-flash") -> str:
    """Send a prompt to Gemini and return the text response."""
    client = get_client()
    response = client.models.generate_content(
        model=model,
        contents=prompt,
    )
    return response.text or ""


def generate_with_search(
    prompt: str,
    model: str = "gemini-2.5-flash",
    thinking_budget: int = 0,
    stream: bool = False,
):
    """
    Send a prompt to Gemini with Google Search tool.
    Uses structured Content, GenerateContentConfig, and optional streaming.
    """
    client = get_client()
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        ),
    ]
    tools = [types.Tool(google_search=types.GoogleSearch())]
    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=thinking_budget),
        tools=tools,
    )

    if stream:
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield chunk.text
    else:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        yield response.text or ""
