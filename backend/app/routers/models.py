from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("/models", response_model=List[schemas.ModelSchema])
def get_models(db: Session = Depends(get_db)):
    """
        Retrieve all available AI models from the database.

        This endpoint returns a list of all configured models (e.g., GPT-4, Gemini, etc.),
        ordered by their creation date in descending order to show the newest models first.

        Args:
            db (Session): Database session provided by dependency injection.

        Returns:
            List[models.Model]: A list of all model objects found in the database.
    """
    return db.query(models.Model).order_by(models.Model.created_at.desc()).all()


@router.post("/models", response_model=schemas.ModelSchema, status_code=201)
def create_model(payload: schemas.ModelCreate, db: Session = Depends(get_db)):
    """
        Register a new AI model configuration.

        This endpoint allows administrators to add a new model to the platform by
        specifying its display label, technical identifier, description, and
        whether it is available for free.

        Args:
            payload (schemas.ModelCreate): Data for the new model (label, identifier, etc.).
            db (Session): Database session provided by dependency injection.

        Returns:
            models.Model: The newly created model object.
    """
    new_model = models.Model(
        label=payload.label,
        description=payload.description,
        model=payload.model,
        is_free=payload.is_free,
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model


@router.delete("/models/{model_id}", status_code=204)
def delete_model(model_id: str, db: Session = Depends(get_db)):
    """
        Permanently delete a specific model configuration.

        This endpoint removes a model from the available list based on its ID.
        Note: Deleting a model currently in use by active threads might cause
        historical reference issues depending on database constraints.

        Args:
            model_id (str): The unique identifier of the model to delete.
            db (Session): Database session provided by dependency injection.

        Returns:
            None: Returns a 204 No Content status code on success.

        Raises:
            HTTPException: 404 error if the model identifier is not found.
    """
    model = db.query(models.Model).filter(models.Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    db.delete(model)
    db.commit()
    return None
