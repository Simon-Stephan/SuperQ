import httpx
from .base import BaseTool, ToolResult


class WeatherTool(BaseTool):
    name = "get_weather"
    description = "Fournit la météo actuelle d'une ville. L'argument doit être un nom de ville."
    slash_command = "meteo"

    async def execute(self, argument: str) -> ToolResult:
        """
        Fetches weather data for a given city.
        argument should be a city name (e.g. "Agadir", "Paris").
        """
        try:
            # 1. Geocoding (City name -> Lat/Long)
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={argument}&count=1&language=en&format=json"
            async with httpx.AsyncClient() as client:
                geo_res = await client.get(geo_url)
                geo_data = geo_res.json()

                if not geo_data.get("results"):
                    return ToolResult(self.name, f"Could not find coordinates for {argument}.")

                location = geo_data["results"][0]
                lat, lon = location["latitude"], location["longitude"]

                # 2. Weather Fetching
                weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
                weather_res = await client.get(weather_url)
                w_data = weather_res.json()

                temp = w_data["current_weather"]["temperature"]
                wind = w_data["current_weather"]["windspeed"]

                content = f"The current weather in {argument} is {temp}°C with a wind speed of {wind} km/h."
                return ToolResult(self.name, content)

        except Exception as e:
            return ToolResult(self.name, f"Error fetching weather: {str(e)}")