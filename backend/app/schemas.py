from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, UUID4


class MessageCreate(BaseModel):
    content: str
    model_name: Optional[str] = "google/gemini-2.0-flash-001"


class MessageSchema(BaseModel):
    id: UUID4
    role: str
    content: str
    model_name: Optional[str]
    rating: Optional[int] = None
    answer_of: Optional[UUID4] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageRate(BaseModel):
    rating: Optional[int]


class PaginatedMessages(BaseModel):
    messages: List[MessageSchema]
    total: int


# --- SCHÉMAS THREADS ---

class ThreadCreate(BaseModel):
    title: str
    system_prompt: str


class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


class ThreadSchema(BaseModel):
    id: UUID4
    title: str
    system_prompt: str
    current_summary: Optional[str]
    created_at: datetime
    messages: List[MessageSchema] = []

    class Config:
        from_attributes = True


# --- SCHÉMAS MODELS ---

class ModelCreate(BaseModel):
    label: str
    description: str | None = None
    model: str
    is_free: bool


class ModelSchema(BaseModel):
    id: UUID4
    label: str
    description: str | None
    model: str
    is_free: bool
    created_at: datetime

    class Config:
        from_attributes = True
