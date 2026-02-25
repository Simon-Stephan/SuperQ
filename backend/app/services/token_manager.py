import json
import re
from typing import Optional

import tiktoken

from app.core.config import settings


def get_optimized_context(thread_summary: str, messages: list):
    """
        Calculate the sliding window of messages that fit within the token limit.

        This function uses tiktoken to measure the token weight of the current summary
        and recent messages. It prioritizes keeping the most recent messages in the
        active context and identifies older messages that should be offloaded to
        the summarization process to stay within the MAX_WINDOW_SIZE.

        Args:
            thread_summary (str): The existing summary text or JSON string.
            messages (list): The list of message objects to be evaluated, from oldest to newest.

        Returns:
            tuple (list, list):
                - kept_messages: List of messages that fit in the current context window.
                - to_be_summarized: List of messages that exceed the limit and need summarization.
    """
    encoding = tiktoken.encoding_for_model("gpt-4o")
    safe_summary = thread_summary if thread_summary else ""

    # Utilisation de la taille de fenêtre des settings
    current_tokens = len(encoding.encode(safe_summary))
    max_tokens = settings.MAX_WINDOW_SIZE

    kept_messages = []
    to_be_summarized = []

    for msg in reversed(messages):
        content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
        msg_tokens = len(encoding.encode(content))

        if current_tokens + msg_tokens < max_tokens:
            kept_messages.insert(0, msg)
            current_tokens += msg_tokens
        else:
            to_be_summarized.insert(0, msg)

    return kept_messages, to_be_summarized


def parse_summary_json(raw_content: str) -> Optional[dict]:
    """
        Robustly extract and parse JSON data from a potentially noisy LLM response.

        LLMs often surround JSON with conversational filler or Markdown code blocks.
        This utility uses a multi-step recovery strategy:
        1. Direct parsing of the raw string.
        2. Extraction of content within Markdown '```json' blocks.
        3. Heuristic extraction by locating the outermost curly braces.

        Args:
            raw_content (str): The raw string returned by the AI agent.

        Returns:
            Optional[dict]: The successfully parsed dictionary, or None if no
                valid JSON structure could be recovered.
    """
    if not raw_content:
        return None

    # Nettoyage simple des espaces
    raw_content = raw_content.strip()

    # 1. Tentative de parse direct
    try:
        return json.loads(raw_content)
    except json.JSONDecodeError:
        pass

    # 2. Extraction via Regex pour les blocs ```json { ... } ```
    match = re.search(r"```json\s*(.*?)\s*```", raw_content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3. Extraction par détection de accolades { ... }
    # Utile si le LLM a écrit : "Voici votre JSON : { ... }"
    start = raw_content.find("{")
    end = raw_content.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_content[start:end + 1])
        except json.JSONDecodeError:
            pass

    return None
