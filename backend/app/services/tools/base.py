from dataclasses import dataclass


@dataclass
class ToolResult:
    """Résultat d'exécution d'un tool."""
    tool_name: str
    content: str


class BaseTool:
    """
    Classe de base pour tous les tools.
    Chaque tool fournit un name, une description (pour le LLM),
    un slash_command optionnel (ex: "meteo" pour /meteo),
    et une méthode execute() qui retourne un ToolResult.
    """
    name: str = ""
    description: str = ""
    slash_command: str = ""

    async def execute(self, argument: str) -> ToolResult:
        raise NotImplementedError
