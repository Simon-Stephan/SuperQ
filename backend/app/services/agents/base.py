import asyncio

import httpx

from app.core.config import settings


class BaseAgent:
    """
        Base class for all AI agents communicating with the OpenRouter API.

        This class handles the core logic for LLM interactions, including HTTP
        request construction, authentication, and a robust retry mechanism with
        progressive timeouts to handle network instability or rate limiting (429).

        Attributes:
            api_key (str): The API key used for OpenRouter authentication.
            url (str): The technical endpoint for OpenRouter chat completions.
    """

    def __init__(self):
        # Utilisation de la clé API centralisée
        self.api_key = settings.OPENROUTER_API_KEY
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    async def _call_llm(self, messages: list, model: str):
        """
            Execute a request to the LLM provider with error handling and retries.

            This method iterates through a predefined list of timeouts. If a rate
            limit (HTTP 429) is encountered, it applies an incremental backoff
            before retrying.

            Args:
                messages (list): A list of message dictionaries (role and content)
                    forming the conversation history.
                model (str): The technical identifier of the model to be called.

            Returns:
                Optional[str]: The text response from the AI if successful,
                    an error message string if all attempts fail, or None if
                    no response is received.

            Note:
                The retry logic uses the timeouts specified in settings.TIMEOUTS
                to progressively allow for longer generation times.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {"model": model, "messages": messages}

        # Utilisation des timeouts définis dans Settings
        async with httpx.AsyncClient() as client:
            for attempt, timeout in enumerate(settings.TIMEOUTS):
                try:
                    resp = await client.post(self.url, headers=headers, json=payload, timeout=timeout)
                    if resp.status_code == 429:
                        await asyncio.sleep((attempt + 1) * 2)
                        continue
                    resp.raise_for_status()
                    return resp.json()["choices"][0]["message"]["content"]
                except Exception as e:
                    if attempt == len(settings.TIMEOUTS) - 1:
                        return f"Erreur : {str(e)}"
        return None
