import os

from dotenv import load_dotenv

# Charger le fichier .env s'il existe
load_dotenv()


class Settings:
    """
        Centralized configuration management for the SuperQ application.

        This class aggregates all environment variables and constant settings used
        across the project, including API credentials, database connection strings,
        and LLM orchestration parameters such as context window limits and
        summarization triggers.

        Attributes:
            PROJECT_NAME (str): The official name of the application.
            OPENROUTER_API_KEY (str): API key for the OpenRouter service.
            DATABASE_URL (str): SQLAlchemy-compatible connection string for PostgreSQL.
            MAX_WINDOW_SIZE (int): The maximum token limit for the short-term memory
                buffer before messages are considered for summarization.
            SUMMARY_INTERVAL (int): The frequency (in number of messages) at which
                the long-term memory summary is updated.
            DEFAULT_CHAT_MODEL (str): The default LLM identifier used for
                standard conversational responses.
            DEFAULT_SUMMARY_MODEL (str): The specific LLM identifier optimized
                for text synthesis and JSON structuring.
            TIMEOUTS (list): A list of progressive duration values (in seconds)
                used by the retry logic to handle API latencies or rate limits.
    """
    PROJECT_NAME: str = "SuperQ Multi-Agent API"

    # --- AUTHENTICATION & API ---
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

    # --- DATABASE ---
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/superq"
    )

    # --- LOGIQUE LLM & CONTEXTE ---

    # Taille maximale de la fenêtre de messages récents (en tokens)
    MAX_WINDOW_SIZE: int = int(os.getenv("MAX_WINDOW_SIZE", 2000))

    # Intervalle de messages avant de déclencher un résumé (mémoire long terme)
    SUMMARY_INTERVAL: int = int(os.getenv("SUMMARY_INTERVAL", 6))

    # Modèles par défaut
    DEFAULT_CHAT_MODEL: str = "google/gemini-2.0-flash-001"
    DEFAULT_SUMMARY_MODEL: str = "google/gemini-2.0-flash-001"

    # --- ROUTAGE AGENT ---

    # Active le routage intelligent via LLM (sinon fallback direct vers ChatAgent)
    AGENT_ROUTER_ENABLED: bool = os.getenv("AGENT_ROUTER_ENABLED", "false").lower() == "true"

    # Modèle léger utilisé pour le routage LLM
    DEFAULT_ROUTER_MODEL: str = "google/gemini-2.0-flash-001"

    # --- TIMEOUTS API ---

    # Timeouts progressifs pour la logique de retry (en secondes)
    TIMEOUTS: list = [60.0, 120.0, 300.0]


# Instanciation pour export
settings = Settings()
