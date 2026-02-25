from typing import List

from app.services.token_manager import parse_summary_json
from .base import BaseAgent


class ChatAgent(BaseAgent):
    """
        Agent specialized in fluid conversation and context management.

        This agent orchestrates the interaction between the core system instructions,
        long-term memory (structured JSON summaries), and short-term memory (recent
        message window). It ensures the LLM receives a coherent payload where the
        user's current prompt is prioritized.
    """

    async def process(self, thread, context_messages: List, user_prompt: str, model_name: str):
        """
            Prepare the final conversation payload and execute the LLM call.

            Combines the thread's configuration, historical context, and the new
            user input into a structured list of messages for the API.

            Args:
                thread (models.Thread): The thread object containing system prompts
                    and the current summary.
                context_messages (List[models.Message]): A list of recent messages
                    to provide immediate conversational context.
                user_prompt (str): The new raw text input from the user.
                model_name (str): The technical identifier of the model to use.

            Returns:
                Optional[str]: The AI-generated response text or an error message.
        """
        # 1. On construit la base du contexte (System prompt + Résumé + Messages récents)
        messages_payload = self._build_payload(
            system_prompt=thread.system_prompt,
            summary_json=thread.current_summary,
            recent_messages=context_messages
        )

        # 2. On ajoute la QUESTION ACTUELLE en toute fin pour maximiser l'attention du modèle
        messages_payload.append({
            "role": "user",
            "content": f"PROMPT : {user_prompt}"
        })

        # 3. Appel à la classe mère BaseAgent pour la gestion de l'API et des retries
        return await self._call_llm(messages_payload, model_name)

    def _build_payload(self, system_prompt: str, summary_json: str, recent_messages: List) -> List[dict]:
        """
            Structure the hierarchical message list for the OpenRouter API.

            This method assembles the payload in a specific order to optimize model attention:
            1. Core System Instructions (Identity).
            2. Formatted Long-Term Memory (Context/Summary).
            3. Short-Term History (Recent exchanges).

            Args:
                system_prompt (str): The primary behavioral instructions for the AI.
                summary_json (str): The current thread summary in JSON format.
                recent_messages (List): A list of recent Message objects.

            Returns:
                List[dict]: A list of dictionaries with 'role' and 'content' keys,
                    ready for API consumption.
        """
        payload = []

        # A. Instructions de base (System Prompt)
        payload.append({"role": "system", "content": system_prompt})

        # B. Mémoire Long Terme (Résumé formaté s'il existe)
        if summary_json:
            parsed = parse_summary_json(summary_json)
            if parsed:
                # On transforme le JSON en un texte clair pour le modèle
                summary_display = (
                    f"--- MÉMOIRE DES ÉCHANGES PASSÉS ---\n"
                    f"CONTEXTE : {parsed.get('context', 'N/A')}\n"
                    f"KEYPOINTS : {', '.join(parsed.get('keywords', [])) if parsed.get('keywords') else 'N/A'}\n"
                    f"TONE : {parsed.get('tone', 'neutre')}\n"
                    f"------------------------------------"
                )
                payload.append({"role": "system", "content": summary_display})
            else:
                # Si le JSON est corrompu ou brut, on l'envoie tel quel en fallback
                payload.append({
                    "role": "system",
                    "content": f"RESUME : {summary_json}"
                })

        # C. Mémoire Court Terme (Messages récents pour la continuité)
        if recent_messages:
            # On indique au modèle qu'il s'agit du contexte récent
            payload.append({
                "role": "system",
                "content": "Ci-dessous les derniers messages échangés pour assurer la continuité du dialogue :"
            })
            for msg in recent_messages:
                payload.append({
                    "role": msg.role,
                    "content": msg.content
                })

        return payload
