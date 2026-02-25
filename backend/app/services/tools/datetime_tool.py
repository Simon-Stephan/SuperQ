from datetime import datetime
from zoneinfo import ZoneInfo

from .base import BaseTool, ToolResult


class DateTimeTool(BaseTool):
    name = "datetime"
    description = "Fournit la date et l'heure actuelles"
    slash_command = "heure"

    async def execute(self, argument: str) -> ToolResult:
        now = datetime.now(ZoneInfo("Europe/Paris"))
        return ToolResult(
            tool_name=self.name,
            content=now.strftime("%A %d %B %Y, %H:%M:%S (Europe/Paris)"),
        )
