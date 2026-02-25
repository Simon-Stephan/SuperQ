import json
import re
from typing import List, Optional

from .base import BaseAgent


class SummaryAgent(BaseAgent):
    """
        Agent specialized in data synthesis and long-term memory management.

        This agent processes conversation segments to update a structured JSON summary.
        It acts as a data processor that merges new exchanges into existing context,
        extracting key points, tone, and conversational direction to maintain
        continuity without exceeding LLM token limits.
    """

    async def process(self, messages_to_summarize: List, current_summary_json: str = "", model_name: str = "google/gemini-2.0-flash-001", extra_instruction: str = "") -> Optional[str]:
        """
            Summarize a list of messages and merge them into the existing thread summary.

            This asynchronous method:
            1. Builds a specific prompt for data fusion.
            2. Calls the LLM to generate a new JSON object.
            3. Cleans the output (removing Markdown blocks) and validates the JSON structure.
            4. Provides a fallback mechanism to return the previous summary if parsing fails.

            Args:
                messages_to_summarize (List): The new message objects to be added to the memory.
                current_summary_json (str, optional): The existing JSON summary string. Defaults to "".
                model_name (str, optional): The model used for synthesis. Defaults to "google/gemini-2.0-flash-001".

            Returns:
                Optional[str]: A valid JSON string containing keys: context, keywords, tone, and direction.
        """
        if not messages_to_summarize and not current_summary_json:
            return None

        # 1. Préparation du prompt
        api_messages = self._build_summary_prompt(messages_to_summarize, current_summary_json, extra_instruction)

        # 2. Appel au LLM
        raw_response = await self._call_llm(api_messages, model=model_name)

        if not raw_response:
            return current_summary_json

        # 3. Nettoyage de la réponse (Suppression des balises Markdown ```json)
        clean_json = re.sub(r"```json\s?|\s?```", "", raw_response).strip()

        try:
            parsed_json = json.loads(clean_json)

            # Validation de la structure
            validated_summary = {
                "context": parsed_json.get("context", "Résumé non disponible"),
                "keywords": parsed_json.get("keywords", []),
                "tone": parsed_json.get("tone", "neutre"),
                "direction": parsed_json.get("direction", "continuer"),
            }
            return json.dumps(validated_summary, ensure_ascii=False)

        except json.JSONDecodeError:
            print(f"Échec parsing JSON. Réponse brute : {raw_response[:100]}...")
            # En cas d'échec, on essaie de garder l'ancien résumé ou on renvoie tel quel
            return current_summary_json if current_summary_json else raw_response

    def _build_summary_prompt(self, messages: List, old_summary: str, extra_instruction: str = "") -> List[dict]:
        """
            Construct the specific prompt to instruct the LLM for JSON summarization.

            Transforms message objects into a plain text dialogue and formats the
            system instructions to enforce strict JSON output without conversational filler.

            Args:
                messages (List): List of message objects or dictionaries to process.
                old_summary (str): The previous state of the long-term memory.

            Returns:
                List[dict]: A formatted payload for the chat completion API.
        """

        # Sécurisation de l'accès aux attributs des messages
        exchanges = []
        for msg in messages:
            # On vérifie si msg est un objet ou un dict pour éviter les crashs
            role = getattr(msg, 'role', 'user')
            content = getattr(msg, 'content', '')
            exchanges.append(f"{role}: {content}")

        new_exchanges = "\n".join(exchanges)

        system_instruction = (
            "Tu es un processeur de données. Ta tâche est de fusionner les nouveaux messages dans le résumé JSON existant. "
            "Réponds EXCLUSIVEMENT avec un objet JSON valide, sans balises Markdown, sans texte avant ou après."
        )

        user_content = (
            f"ANCIEN RÉSUMÉ JSON : {old_summary if old_summary else '{}'}\n\n"
            f"NOUVEAUX MESSAGES :\n{new_exchanges}\n\n"
            "Mets à jour le JSON avec ces clés : context, keywords, tone, direction."
        )

        if extra_instruction:
            user_content += f"\n\nINSTRUCTION SUPPLÉMENTAIRE : {extra_instruction}"

        return [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_content}
        ]
