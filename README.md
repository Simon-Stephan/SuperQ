# SuperQ — Multi-Agent Contextual AI Platform

SuperQ is a full-stack AI chat platform featuring a multi-agent architecture with tool integration and hybrid memory management. It goes beyond simple chat: the orchestrator understands user intent, calls external tools when needed, and maintains long-term memory across conversations.

## Table of Contents

- [How It Works](#how-it-works)
- [User Guide](#user-guide)
  - [Conversations](#conversations)
  - [Slash Commands](#slash-commands)
  - [Natural Language Tool Usage](#natural-language-tool-usage)
  - [Memory & Context](#memory--context)
  - [Models](#models)
- [Architecture](#architecture)
  - [High-Level Overview](#high-level-overview)
  - [Orchestrator Flow](#orchestrator-flow)
  - [Agents](#agents)
  - [Tools](#tools)
  - [Memory System](#memory-system)
  - [Frontend Architecture](#frontend-architecture)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Launch](#launch)
  - [Development](#development)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

---

## How It Works

SuperQ doesn't just relay messages to an LLM. Every user message goes through an **orchestrator** that decides the best course of action before generating a response.

```mermaid
flowchart LR
    U[User] -->|message| O[Orchestrator]
    O -->|needs data?| T[Tools]
    T -->|weather, time...| O
    O -->|enriched prompt| C[ChatAgent]
    C -->|response| U
    O -->|every N messages| S[SummaryAgent]
    S -->|JSON summary| DB[(Database)]
    DB -->|long-term memory| C
```

When you ask *"What's the weather in Paris?"*, the orchestrator detects that external data is needed, calls the weather tool, injects the result into the prompt, and the ChatAgent formulates a natural response using that real data.

When you ask *"Explain quantum computing"*, no tool is needed — the orchestrator passes the prompt directly to the ChatAgent.

---

## User Guide

### Conversations

SuperQ organizes chats into **threads**. Each thread is an independent conversation with its own message history, memory, and optional system prompt.

- **Create a thread** using the sidebar button — give it a title and optionally a system prompt to define the assistant's behavior (e.g., *"You are a Python expert"*)
- **Switch between threads** via the left sidebar
- **Rate responses** to provide feedback on AI answers
- **Delete messages** individually or delete entire threads
- **Choose AI models** from the model selector in the input area

### Slash Commands

Slash commands let you directly trigger specific actions:

| Command | Description | Example |
|---------|-------------|---------|
| `/meteo <city>` | Get current weather for a city | `/meteo Paris` |
| `/heure` | Get current date and time | `/heure` |
| `/summary` | Get a natural language summary of the conversation | `/summary` |
| `/summary <instruction>` | Get a focused summary | `/summary Focus on technical decisions` |
| `/chat <message>` | Force direct chat (bypass tool selection) | `/chat Hello!` |

Slash commands bypass the LLM-based tool selection — they execute the tool immediately and pass the result to the ChatAgent for a natural response.

### Natural Language Tool Usage

When `AGENT_ROUTER_ENABLED=true`, the orchestrator uses a lightweight LLM call to detect tool needs from natural language:

```
"What time is it?"              → automatically calls datetime tool
"Weather in Tokyo?"             → automatically calls weather tool
"What time is it and weather?"  → calls both tools
"Tell me a joke"                → no tool needed, direct to ChatAgent
```

The system can call **multiple tools** in a single request and combine their results before generating a response.

### Memory & Context

SuperQ automatically manages conversation memory:

- **Short-term memory**: The most recent messages (within a configurable token window) are sent with each request
- **Long-term memory**: Every few messages, a SummaryAgent creates a structured JSON summary that captures context, keywords, tone, and conversation direction
- **Seamless**: You don't need to do anything — memory management happens transparently in the background

You can inspect the current memory state at any time with the `/summary` command.

### Models

SuperQ connects to multiple AI models through [OpenRouter](https://openrouter.ai/). You can:

- **Switch models** on the fly using the model selector in the input area
- **Add/remove models** from the models management page
- Models support both free and paid tiers

---

## Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js 16)"]
        UI[React Components]
        CTX[ChatContext Provider]
        API[API Client]
    end

    subgraph Backend["Backend (FastAPI)"]
        R[Routers]
        OA[OrchestratorAgent]
        CA[ChatAgent]
        SA[SummaryAgent]
        TM[TokenManager]
        TR[Tool Registry]
    end

    subgraph Tools["Tools"]
        DT[DateTimeTool]
        WT[WeatherTool]
        FT[Future Tools...]
    end

    subgraph External["External Services"]
        OR[OpenRouter API]
        WA[Open-Meteo API]
    end

    subgraph Storage["Storage"]
        DB[(PostgreSQL)]
    end

    UI --> CTX --> API
    API -->|HTTP| R
    R --> OA
    OA --> CA
    OA --> SA
    OA --> TR
    TR --> DT & WT & FT
    CA & SA -->|LLM calls| OR
    WT -->|weather data| WA
    R --> TM
    R & SA --> DB
```

### Orchestrator Flow

The orchestrator is the brain of the system. Here's how it processes every incoming message:

```mermaid
flowchart TD
    START([User sends message]) --> PARSE[Parse slash command]

    PARSE -->|"/summary ..."| SUMMARY[SummaryAgent updates JSON summary]
    SUMMARY --> LLM_SUMMARY[LLM transforms JSON into natural language]
    LLM_SUMMARY --> RESPOND([Return response])

    PARSE -->|"/meteo Paris"| TOOL_SLASH[Lookup tool_slash_registry]
    TOOL_SLASH --> EXEC_DIRECT[Execute tool with argument]
    EXEC_DIRECT --> ENRICH1[Enrich prompt with tool result]
    ENRICH1 --> CHAT1[ChatAgent generates response]
    CHAT1 --> RESPOND

    PARSE -->|"/chat ..." or unknown slash| CHAT_DIRECT[ChatAgent with raw prompt]
    CHAT_DIRECT --> RESPOND

    PARSE -->|No slash command| ROUTER{AGENT_ROUTER_ENABLED?}

    ROUTER -->|true| SELECT[LLM selects tools + extracts arguments]
    SELECT --> EXEC_TOOLS[Execute selected tools]
    EXEC_TOOLS --> ENRICH2[Enrich prompt with results]
    ENRICH2 --> CHAT2[ChatAgent generates response]
    CHAT2 --> RESPOND

    ROUTER -->|false| CHAT_FALLBACK[ChatAgent with raw prompt]
    CHAT_FALLBACK --> RESPOND
```

### Agents

SuperQ uses three cooperating agents, all extending a common `BaseAgent`:

```mermaid
classDiagram
    class BaseAgent {
        -api_key: str
        -url: str
        +_call_llm(messages, model) str
    }

    class OrchestratorAgent {
        -chat_agent: ChatAgent
        -summary_agent: SummaryAgent
        -tool_registry: dict
        -tool_slash_registry: dict
        +process(thread, context, prompt, model, db) str
        -_select_tools(prompt) list
        -_execute_tools(selections) list
        -_enrich_prompt(prompt, results) str
        -_parse_slash_command(prompt) tuple
    }

    class ChatAgent {
        +process(thread, context, prompt, model) str
        -_build_messages(thread, context, prompt) list
    }

    class SummaryAgent {
        +process(messages, summary, model, instruction) str
        -_clean_llm_response(response) str
    }

    BaseAgent <|-- OrchestratorAgent
    BaseAgent <|-- ChatAgent
    BaseAgent <|-- SummaryAgent
    OrchestratorAgent o-- ChatAgent
    OrchestratorAgent o-- SummaryAgent
```

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **OrchestratorAgent** | Routes requests, selects tools, enriches prompts | Raw user message | Delegates to ChatAgent or SummaryAgent |
| **ChatAgent** | Generates natural language responses | Prompt (raw or enriched) + context + memory | Text response |
| **SummaryAgent** | Compresses conversation into structured JSON | Recent messages + current summary | JSON summary (context, keywords, tone, direction) |

### Tools

Tools provide external data that the LLM doesn't have natively. They follow a simple interface:

```mermaid
classDiagram
    class BaseTool {
        +name: str
        +description: str
        +slash_command: str
        +execute(argument: str) ToolResult
    }

    class ToolResult {
        +tool_name: str
        +content: str
    }

    class DateTimeTool {
        +name = "datetime"
        +slash_command = "heure"
        +execute(argument) ToolResult
    }

    class WeatherTool {
        +name = "get_weather"
        +slash_command = "meteo"
        +execute(argument) ToolResult
    }

    BaseTool <|-- DateTimeTool
    BaseTool <|-- WeatherTool
    BaseTool ..> ToolResult : returns
```

**Adding a new tool** requires:

1. Create a class extending `BaseTool` in `backend/app/services/tools/`
2. Define `name`, `description`, and optionally `slash_command`
3. Implement `async execute(self, argument: str) -> ToolResult`
4. Register it in `OrchestratorAgent.__init__()` with `self._register_tool(YourTool())`

The `description` field is critical — it's what the LLM-based selector reads to decide whether to call your tool.

**Tool ideas**: web search, file reader, calendar integration, database queries, code execution, API calls, batch jobs...

### Memory System

SuperQ implements a hybrid memory architecture to handle long conversations without losing context:

```mermaid
flowchart TD
    subgraph ShortTerm["Short-Term Memory (Token Window)"]
        M1[Message N]
        M2[Message N-1]
        M3[Message N-2]
        M4[...]
    end

    subgraph LongTerm["Long-Term Memory (JSON Summary)"]
        CTX[Context & Topics]
        KW[Keywords]
        TONE[Tone & Style]
        DIR[Direction & Next Steps]
    end

    NEW([New message arrives]) --> TM[TokenManager]
    TM -->|count tokens via tiktoken| CHECK{Total tokens > MAX_WINDOW_SIZE?}
    CHECK -->|yes| TRIM[Oldest messages moved out of window]
    CHECK -->|no| KEEP[All messages kept]

    TRIM --> COUNT{Message count >= SUMMARY_INTERVAL?}
    COUNT -->|yes| SA[SummaryAgent merges into JSON summary]
    SA --> DB[(Save to database)]
    COUNT -->|no| WAIT[Wait for next interval]

    ShortTerm --> PROMPT[Final prompt to LLM]
    LongTerm --> PROMPT
```

**How the ChatAgent builds its prompt:**

```
┌─────────────────────────────────────────┐
│ System Prompt (from thread config)      │
├─────────────────────────────────────────┤
│ Long-Term Memory (JSON summary)         │
│ → context, keywords, tone, direction    │
├─────────────────────────────────────────┤
│ Recent Messages (within token window)   │
│ → user/assistant message pairs          │
├─────────────────────────────────────────┤
│ Current User Prompt                     │
│ (raw or enriched with tool results)     │
└─────────────────────────────────────────┘
```

**Configuration:**

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_WINDOW_SIZE` | 2000 | Maximum tokens for the short-term message window |
| `SUMMARY_INTERVAL` | 6 | Number of messages before triggering a summary update |

### Frontend Architecture

The frontend follows Next.js App Router conventions with a centralized state via React Context:

```mermaid
graph TD
    subgraph Pages["Pages (App Router)"]
        LP["/ (Chat Home)"]
        TP["/thread/[id] (Thread View)"]
        MP["/models (Model Management)"]
    end

    subgraph Components
        SB[Sidebar + ThreadList]
        CA[ChatArea + MessageList]
        CI[ChatInput + ModelSelector]
        MB[MessageBubble + Markdown]
    end

    subgraph State["State Management"]
        CC[ChatContext + Reducer]
    end

    subgraph Hooks
        UT[useThreads]
        UM[useMessages]
        US[useSidebar]
    end

    Pages --> Components
    Components --> Hooks
    Hooks --> CC
    Hooks -->|fetch/send| API[API Client]
    API -->|HTTP| BE[Backend]
```

**Key UI features:**
- Dual sidebar layout (threads on the left, settings on the right)
- Markdown rendering with syntax highlighting (GitHub Dark theme)
- Skeleton loaders and loading states
- Infinite scroll for message history
- Per-message rating system
- Responsive design with dark mode support

---

## API Reference

### Threads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/threads` | Create a new thread |
| `GET` | `/threads` | List all threads (paginated) |
| `GET` | `/threads/{thread_id}` | Get a specific thread |
| `PATCH` | `/threads/{thread_id}` | Update thread title or system prompt |
| `DELETE` | `/threads/{thread_id}` | Delete thread and all its messages |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/threads/{thread_id}/messages` | Get messages (paginated, newest first) |
| `POST` | `/threads/{thread_id}/messages` | Send a message and receive AI response |
| `PATCH` | `/threads/{thread_id}/messages/{id}/rate` | Rate an assistant response |
| `DELETE` | `/threads/{thread_id}/messages/{id}` | Delete a user-assistant message pair |

### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/models/models` | List all registered AI models |
| `POST` | `/models/models` | Register a new model |
| `DELETE` | `/models/models/{id}` | Remove a model |

Interactive documentation available at `http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc` (ReDoc).

---

## Database Schema

```mermaid
erDiagram
    threads {
        UUID id PK
        String title
        Text system_prompt
        Text current_summary
        DateTime created_at
    }

    messages {
        UUID id PK
        UUID thread_id FK
        String role
        Text content
        String model_name
        Integer rating
        UUID answer_of FK
        DateTime created_at
    }

    models {
        UUID id PK
        String label
        String description
        String model
        Boolean is_free
        DateTime created_at
    }

    threads ||--o{ messages : "has many"
    messages ||--o| messages : "answer_of"
```

- **threads**: Each conversation with its own system prompt and long-term memory summary
- **messages**: User and assistant messages linked by `answer_of` (pairs), with optional rating
- **models**: Available LLM configurations pulled from OpenRouter

---

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose**
- An **[OpenRouter](https://openrouter.ai/) API key**

### Configuration

Create a `.env` file:

```env
# --- API ---
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# --- Database ---
DB_USER=postgres
DB_PASSWORD=change_this_password
DB_NAME=superq_db
DB_HOST=db
DB_PORT=5432

# --- Agent Routing ---
AGENT_ROUTER_ENABLED=true

# --- Frontend ---
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Launch

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Database | localhost:5432 |

### Development

**Backend** (without Docker):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (without Docker):

```bash
cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy, Python 3.11 |
| Database | PostgreSQL 15 |
| LLM Provider | OpenRouter (Gemini, GPT, Claude...) |
| Token Counting | tiktoken |
| HTTP Client | httpx (async, with retry logic) |
| Infrastructure | Docker & Docker Compose |
| Markdown | react-markdown, rehype-highlight, remark-gfm |

---

## Project Structure

```
SuperQ/
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env
│   └── app/
│       ├── main.py                          # FastAPI entry point
│       ├── models.py                        # SQLAlchemy ORM models
│       ├── schemas.py                       # Pydantic schemas
│       ├── database.py                      # DB engine & sessions
│       ├── core/
│       │   └── config.py                    # Centralized settings
│       ├── routers/
│       │   ├── threads.py                   # Thread CRUD endpoints
│       │   ├── messages.py                  # Message endpoints + orchestration
│       │   └── models.py                    # Model management endpoints
│       └── services/
│           ├── token_manager.py             # Token counting & context optimization
│           ├── agents/
│           │   ├── base.py                  # BaseAgent (LLM calls + retry)
│           │   ├── orchestrator.py          # Routing, tool selection, dispatch
│           │   ├── chat.py                  # Conversation & prompt building
│           │   └── summary.py              # JSON summary generation
│           └── tools/
│               ├── base.py                  # BaseTool + ToolResult
│               ├── datetime_tool.py         # Date/time tool
│               └── weather_tool.py          # Weather tool (Open-Meteo API)
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx                   # Root layout
        │   ├── globals.css                  # Tailwind + theme
        │   ├── (chat)/
        │   │   ├── page.tsx                 # Chat home
        │   │   └── thread/[id]/page.tsx     # Thread view
        │   └── models/page.tsx              # Model management
        ├── components/
        │   ├── sidebar/                     # Sidebar, thread list, modals
        │   ├── chat/                        # Chat area, messages, markdown
        │   ├── input/                       # Chat input, model selector
        │   └── ui/                          # Modal, spinner, skeleton...
        ├── contexts/
        │   └── chat-context.tsx             # Global state (React Context + Reducer)
        ├── hooks/
        │   ├── use-threads.ts               # Thread CRUD logic
        │   ├── use-messages.ts              # Message loading & sending
        │   └── use-sidebar.ts               # Sidebar toggle state
        ├── lib/
        │   ├── api.ts                       # HTTP client functions
        │   └── constants.ts                 # App constants
        └── types/
            └── index.ts                     # TypeScript interfaces
```
