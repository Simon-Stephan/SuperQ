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
            recent_messages=context_messages,
            user_prompt=user_prompt
        )

        print("---- Payload ----")
        print(messages_payload)

        # 2. Appel à la classe mère BaseAgent pour la gestion de l'API et des retries
        return await self._call_llm(messages_payload, model_name)

    def _build_payload(self, system_prompt: str, summary_json: str, recent_messages: List, user_prompt: str) -> List[dict]:
        """
        Construit le payload final pour OpenRouter en respectant l'alternance des rôles
        et en intégrant la mémoire long terme (résumé) et court terme (historique).
        """
        payload = []

        # 1. Préparation du bloc SYSTEM unique (Instructions + Résumé)
        # On regroupe tout au début pour que le modèle ait ses consignes et sa mémoire globale
        full_system_content = "[SYSTEM PROMPT]\n"
        full_system_content += system_prompt if system_prompt else "Tu es un assistant utile."
        full_system_content += "[/SYSTEM PROMPT]\n\n"

        if summary_json:
            parsed = parse_summary_json(summary_json)
            if parsed:
                summary_display = (
                    f"[MEMORY]\n"
                    f"CONTEXTE : {parsed.get('context', 'N/A')}\n"
                    f"KEYPOINTS : {', '.join(parsed.get('keywords', [])) if parsed.get('keywords') else 'N/A'}\n"
                    f"TONE : {parsed.get('tone', 'neutre')}"
                    f"[/MEMORY]"
                )
                full_system_content += summary_display
            else:
                full_system_content += f"[MEMORY]\n{summary_json}\n[/MEMORY]"

        # Ajout du bloc SYSTEM unique
        payload.append({"role": "system", "content": full_system_content})

        # 2. Ajout de la Mémoire Court Terme (Messages récents de la DB)
        for msg in recent_messages:
            # On extrait les données de l'objet SQLAlchemy Message
            role = getattr(msg, 'role', 'user')
            content = getattr(msg, 'content', '')

            # On ignore les messages vides
            if not str(content).strip():
                continue

            # Sécurité : Si le rôle précédent est identique au rôle actuel, on fusionne les contenus pour éviter l'erreur 400 d'OpenRouter.
            if payload and payload[-1]["role"] == role:
                payload[-1]["content"] += f"\n{content}"
            else:
                payload.append({"role": role, "content": content})

        # 3. Ajout du dernier message USER (Le Prompt Actuel)
        # On s'assure que le dernier message est bien 'user' pour déclencher la réponse
        final_user_content = user_prompt.strip()

        if payload and payload[-1]["role"] == "user":
            # Si le dernier message historique était déjà un 'user', on concatène
            payload[-1]["content"] += f"\n\n[PROMPT]\n{final_user_content}\n[PROMPT]"
        else:
            payload.append({"role": "user", "content": final_user_content})

        return payload
