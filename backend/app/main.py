from fastapi import FastAPI

from app import models as db_models
from app.database import engine
from app.routers import threads, messages, models

# Initialisation DB
db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SuperQ Multi-Agent API")

# Inclusion des routeurs
app.include_router(threads.router)
app.include_router(messages.router)
app.include_router(models.router)
