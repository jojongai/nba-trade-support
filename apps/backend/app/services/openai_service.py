"""OpenAI LLM service for trade analysis."""
import os

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
