import re
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.tools.base import BaseTool, ToolResult
from app.services.tools.datetime_tool import DateTimeTool
from app.services.tools.weather_tool import WeatherTool
from .base import BaseAgent
from .chat import ChatAgent
from .summary import SummaryAgent


class OrchestratorAgent(BaseAgent):
    """
    Point d'entrée unique pour toutes les requêtes utilisateur.
    Dispatch vers l'agent approprié selon la commande slash, le routage LLM,
    ou le fallback vers ChatAgent.
    """

    def __init__(self):
        super().__init__()
        self.chat_agent = ChatAgent()
        self.summary_agent = SummaryAgent()

        # Registre : clé slash -> (agent, description)
        self.agent_registry: dict[str, tuple[BaseAgent, str]] = {
            "chat": (self.chat_agent, "Conversation générale"),
            "summary": (self.summary_agent, "Résumé de la conversation"),
        }

        # Registre des tools utilitaires (par name, ex: "get_weather")
        self.tool_registry: dict[str, BaseTool] = {}

        # Registre /[tool] (par slash_command, ex: "meteo" -> WeatherTool)
        self.tool_slash_registry: dict[str, BaseTool] = {}
        self._register_tool(DateTimeTool())
        self._register_tool(WeatherTool())

    def _register_tool(self, tool: BaseTool):
        """Enregistre un tool dans les deux registres."""
        self.tool_registry[tool.name] = tool
        if tool.slash_command:
            self.tool_slash_registry[tool.slash_command] = tool

    async def process(
        self,
        thread,
        context_messages: list,
        user_prompt: str,
        model_name: str,
        db: Session,
    ) -> str:
        """
        Point d'entrée principal. Parse la commande slash, route via LLM
        si activé, ou fallback vers ChatAgent.

        Returns:
            str: La réponse générée par l'agent sélectionné.
        """
        key, remaining_prompt = self._parse_slash_command(user_prompt)

        print("---- 1. Slash agent ----")
        # 1. Slash -> agent (ex: /summary, /chat)
        if key and key in self.agent_registry:
            return await self._dispatch(
                key, thread, context_messages, remaining_prompt, model_name, db
            )

        print("---- 2. Slash tools ----")
        # 2. Slash -> tool (ex: /meteo Agadir, /heure)
        if key and key in self.tool_slash_registry:
            tool = self.tool_slash_registry[key]
            result = await tool.execute(remaining_prompt)
            enriched_prompt = self._enrich_prompt(user_prompt, [result])
            return await self.chat_agent.process(
                thread=thread,
                context_messages=context_messages,
                user_prompt=enriched_prompt,
                model_name=model_name,
            )

        # 3. Langage naturel -> sélection de tools via LLM (si activé)
        print("---- 3. Natural Language ----")
        if key is None and settings.AGENT_ROUTER_ENABLED:
            tool_selections = await self._select_tools(user_prompt)
            tool_results = await self._execute_tools(tool_selections)
            enriched_prompt = self._enrich_prompt(user_prompt, tool_results)
            return await self.chat_agent.process(
                thread=thread,
                context_messages=context_messages,
                user_prompt=enriched_prompt,
                model_name=model_name,
            )

        # 4. Fallback -> ChatAgent direct (slash inconnue ou routage désactivé)
        print("---- 4. (Fallback) Appel Chat ----")
        return await self.chat_agent.process(
            thread=thread,
            context_messages=context_messages,
            user_prompt=remaining_prompt if key else user_prompt,
            model_name=model_name,
        )

    async def _dispatch(
        self,
        key: str,
        thread,
        context_messages: list,
        prompt: str,
        model_name: str,
        db: Session,
    ) -> str:
        """Dispatch vers l'agent correspondant à la clé."""
        if key == "summary":
            return await self._handle_summary(
                thread, context_messages, prompt, model_name, db
            )

        # Pour tout autre agent (chat, futurs agents...)
        return await self.chat_agent.process(
            thread=thread,
            context_messages=context_messages,
            user_prompt=prompt,
            model_name=model_name,
        )

    async def _handle_summary(
        self,
        thread,
        context_messages: list,
        user_instruction: str,
        model_name: str,
        db: Session,
    ) -> str:
        """
        Gère la commande /summary :
        1. Met à jour le résumé JSON via SummaryAgent
        2. Sauvegarde le résumé en DB
        3. Envoie le JSON + l'instruction utilisateur au LLM pour générer
           une explication en langage naturel
        4. Retourne la réponse du LLM
        """
        current_summary = str(thread.current_summary) if thread.current_summary else ""

        # 1. Mise à jour du résumé JSON
        new_json_summary = await self.summary_agent.process(
            messages_to_summarize=context_messages,
            current_summary_json=current_summary,
            model_name=model_name,
            extra_instruction=user_instruction.strip(),
        )

        if new_json_summary:
            thread.current_summary = new_json_summary
            db.add(thread)
            db.commit()

        if not new_json_summary:
            return "Aucun résumé disponible pour cette conversation."

        # 2. Appel LLM pour transformer le JSON en réponse naturelle
        instruction = user_instruction.strip() if user_instruction.strip() else "Fais un résumé clair de notre conversation."

        messages = [
            {
                "role": "system",
                "content": (
                    "Tu es un assistant. L'utilisateur te demande des informations sur votre conversation. "
                    "Tu disposes du résumé structuré (JSON) de cette conversation. "
                    "Réponds en langage naturel, de façon claire et bien structurée."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Voici le résumé JSON de notre conversation :\n{new_json_summary}\n\n"
                    f"Requête : {instruction}"
                ),
            },
        ]

        response = await self._call_llm(messages, model=model_name)
        return response or "Impossible de générer le résumé."

    async def _select_tools(self, user_prompt: str) -> list[tuple[str, str]]:
        """
        Demande au LLM quels tools sont pertinents pour ce prompt.
        Retourne une liste de tuples (tool_name, argument).
        """
        if not self.tool_registry:
            return []

        tools_list = "\n".join(
            f"- {name}: {tool.description}"
            for name, tool in self.tool_registry.items()
        )

        system_prompt = (
            "Tu es un sélecteur d'outils. Selon la requête utilisateur, détermine quels outils appeler.\n"
            f"Outils disponibles :\n{tools_list}\n\n"
            "Réponds UNIQUEMENT avec le format : outil(argument), séparés par des virgules.\n"
            "Si un outil n'a pas besoin d'argument, écris : outil()\n"
            "Si aucun outil n'est nécessaire, réponds : none\n\n"
            "Exemples :\n"
            "- 'Quelle heure est-il ?' -> datetime()\n"
            "- 'Météo à Paris ?' -> get_weather(Paris)\n"
            "- 'Quelle heure et météo à Lyon ?' -> datetime(), get_weather(Lyon)"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = await self._call_llm(messages, model=settings.DEFAULT_ROUTER_MODEL)
        if not response or response.strip().lower() == "none":
            return []

        return self._parse_tool_selections(response)

    def _parse_tool_selections(self, response: str) -> list[tuple[str, str]]:
        """
        Parse la réponse du LLM au format 'tool(arg), tool2(arg2)'.
        Retourne une liste de (tool_name, argument).
        """
        selections = []
        for part in response.split(","):
            part = part.strip()
            match = re.match(r"(\w+)\(([^)]*)\)", part)
            if match:
                name = match.group(1).lower()
                arg = match.group(2).strip()
                if name in self.tool_registry:
                    selections.append((name, arg))
            else:
                # Fallback : nom seul sans parenthèses
                name = part.strip().lower()
                if name in self.tool_registry:
                    selections.append((name, ""))
        return selections

    async def _execute_tools(self, tool_selections: list[tuple[str, str]]) -> list[ToolResult]:
        """Exécute les tools sélectionnés avec leurs arguments."""
        results = []
        for name, argument in tool_selections:
            tool = self.tool_registry[name]
            result = await tool.execute(argument)
            results.append(result)
        return results

    @staticmethod
    def _enrich_prompt(user_prompt: str, tool_results: list[ToolResult]) -> str:
        """Enrichit le prompt utilisateur avec les résultats des tools."""
        if not tool_results:
            return user_prompt

        info_block = ", ".join(
            "{'" + r.tool_name + "' : '" + r.content + "'}" for r in tool_results
        )
        return (
            f"[DATAS]\n{info_block.strip(', ')}\n[/DATA]\n\n"
            f"[PROMPT]\n{user_prompt}\n[/PROMPT]\n\n"
        )

    @staticmethod
    def _parse_slash_command(user_prompt: str) -> tuple[Optional[str], str]:
        """
        Parse une commande slash dans le prompt utilisateur.

        Returns:
            tuple: (clé_commande ou None, texte restant)
            - "/summary Focus technique" -> ("summary", "Focus technique")
            - "Bonjour" -> (None, "Bonjour")
            - "/xyz test" -> ("xyz", "test")
        """
        stripped = user_prompt.strip()
        if stripped.startswith("/"):
            match = re.match(r"^/(\w+)\s*(.*)", stripped, re.DOTALL)
            if match:
                return match.group(1).lower(), match.group(2).strip()
        return None, stripped

