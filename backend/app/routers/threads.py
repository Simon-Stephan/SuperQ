from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/threads", tags=["Threads"])


@router.post("", response_model=schemas.ThreadSchema)
def create_thread(thread_data: schemas.ThreadCreate, db: Session = Depends(get_db)):
    """
        Initialize a new conversation thread.

        This endpoint creates a thread session which acts as a container for messages.
        It stores the core identity of the AI agent (via the system prompt) and
        initializes an empty long-term memory summary.

        Args:
            thread_data (schemas.ThreadCreate): The initial data including title and system instructions.
            db (Session): Database session provided by dependency injection.

        Returns:
            models.Thread: The newly created thread object with its generated UUID.
    """
    new_thread = models.Thread(
        title=thread_data.title,
        system_prompt=thread_data.system_prompt,
        current_summary=""
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)
    return new_thread


@router.get("", response_model=List[schemas.ThreadSchema])
def get_threads(
        db: Session = Depends(get_db),
        limit: int = 10,
        offset: int = 0
):
    """
        Retrieve a paginated list of all conversation threads.

        Fetches available threads ordered by creation date (most recent first).
        Useful for displaying a sidebar or history list in the user interface.

        Args:
            db (Session): Database session provided by dependency injection.
            limit (int, optional): Maximum number of threads to return. Defaults to 10.
            offset (int, optional): Number of threads to skip for pagination. Defaults to 0.

        Returns:
            List[models.Thread]: A list of thread objects.
    """
    return (db.query(models.Thread)
            .order_by(models.Thread.created_at.desc())  # Plus récents en premier
            .offset(offset)
            .limit(limit)
            .all())


@router.get("/{thread_id}", response_model=schemas.ThreadSchema)
def get_thread(thread_id: str, db: Session = Depends(get_db)):
    """
        Fetch the details of a specific thread by its ID.

        Args:
            thread_id (str): The unique identifier of the thread.
            db (Session): Database session provided by dependency injection.

        Returns:
            models.Thread: The thread object containing its configuration and current summary.

        Raises:
            HTTPException: 404 error if the thread ID does not exist.
    """
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread non trouvé")
    return thread


@router.patch("/{thread_id}", response_model=schemas.ThreadSchema)
def update_thread(thread_id: str, thread_data: schemas.ThreadUpdate, db: Session = Depends(get_db)):
    """
        Update the metadata or system instructions of an existing thread.

        Allows modifying the thread's title or the system prompt instructions
        dynamically. Partial updates are supported (fields not provided remain unchanged).

        Args:
            thread_id (str): The unique identifier of the thread to update.
            thread_data (schemas.ThreadUpdate): The fields to be updated (title and/or system_prompt).
            db (Session): Database session provided by dependency injection.

        Returns:
            models.Thread: The updated thread object.

        Raises:
            HTTPException: 404 error if the thread ID does not exist.
    """
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread non trouvé")
    if thread_data.title is not None:
        thread.title = thread_data.title
    if thread_data.system_prompt is not None:
        thread.system_prompt = thread_data.system_prompt
    db.commit()
    db.refresh(thread)
    return thread


@router.delete("/{thread_id}", status_code=204)
def delete_thread(thread_id: str, db: Session = Depends(get_db)):
    """
        Permanently delete a thread and all its associated messages.

        This method handles complex cleanup by first nullifying self-referencing
        Foreign Keys (`answer_of`) within the messages to prevent database
        integrity violations during the cascade deletion of the thread.

        Args:
            thread_id (str): The unique identifier of the thread to delete.
            db (Session): Database session provided by dependency injection.

        Returns:
            None: Returns a 204 No Content status code on success.

        Raises:
            HTTPException: 404 error if the thread ID does not exist.
    """
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread non trouvé")
    # Nullifier les FK answer_of pour éviter les conflits de suppression en cascade
    db.query(models.Message).filter(
        models.Message.thread_id == thread_id,
        models.Message.answer_of.isnot(None)
    ).update({models.Message.answer_of: None})
    db.flush()
    db.delete(thread)
    db.commit()
    return None
