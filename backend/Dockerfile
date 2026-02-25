FROM python:3.11-slim

# Empêche Python de générer des fichiers .pyc et permet l'affichage direct des logs
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Dépendances système pour psycopg2 (Postgres)
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie tout le contenu du dossier local backend vers /app dans le conteneur
COPY . .

# On lance uvicorn en pointant sur le dossier app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]