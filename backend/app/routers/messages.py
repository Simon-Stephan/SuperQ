from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.config import settings
from app.database import get_db
from app.services.agents.orchestrator import OrchestratorAgent

router = APIRouter(prefix="/threads", tags=["Messages"])

# Initialisation de l'orchestrateur (point d'entrée unique)
orchestrator = OrchestratorAgent()


@router.get("/{thread_id}/messages", response_model=schemas.PaginatedMessages)
def get_messages(thread_id: str, db: Session = Depends(get_db), limit: int = 20, offset: int = 0):
    """
        Retrieve a paginated list of messages for a specific thread.

        This endpoint fetches messages associated with a given thread ID, ordered by
        creation date in descending order (newest first). It returns both the
        list of messages and the total count for pagination purposes.

        Args:
            thread_id (str): The unique identifier of the thread.
            db (Session): Database session provided by the dependency injection.
            limit (int, optional): The maximum number of messages to return. Defaults to 20.
            offset (int, optional): The number of messages to skip (for pagination). Defaults to 0.

        Returns:
            dict: A dictionary containing:
                - "messages": A list of models.Message objects.
                - "total": The total number of messages in the thread.

        Raises:
            HTTPException: 404 error if the thread does not exist.
    """
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread non trouvé")

    total = db.query(func.count(models.Message.id)).filter(models.Message.thread_id == thread_id).scalar()
    messages = (db.query(models.Message)
                .filter(models.Message.thread_id == thread_id)
                .order_by(models.Message.created_at.desc())
                .offset(offset).limit(limit).all())
    return {"messages": messages, "total": total}


@router.post("/{thread_id}/messages", response_model=schemas.MessageSchema)
async def send_message(
        thread_id: str,
        payload: schemas.MessageCreate,
        db: Session = Depends(get_db)
):
    """
        Process an incoming user message and generate an AI assistant response.

        This asynchronous endpoint performs the following steps:
        1. Validates the existence of the conversation thread.
        2. Persists the user's message to the database.
        3. Retrieves recent message history for short-term memory context.
        4. Delegates to the OrchestratorAgent, which routes the request to the
           appropriate agent (ChatAgent, SummaryAgent, etc.) based on slash commands,
           LLM-based routing, or fallback logic.
        5. Saves the assistant's response to the database.
        6. Triggers a background summarization process if a specific message count threshold
           is crossed, updating the thread's long-term memory (summary).

        Args:
            thread_id (str): The unique identifier of the thread.
            payload (schemas.MessageCreate): The user message content and preferred model.
            db (Session): Database session provided by dependency injection.

        Returns:
            models.Message: The newly created assistant message object.

        Raises:
            HTTPException:
                - 404: If the specified thread is not found.
                - 502: If the AI agent fails to return a valid content response.
    """
    # 1. Récupération du thread
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread non trouvé")

    # 2. Sauvegarde du message utilisateur
    user_msg = models.Message(
        thread_id=thread_id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # 3. Récupération des messages PRÉCÉDENTS
    previous_messages = (
        db.query(models.Message)
        .filter(models.Message.thread_id == thread_id)
        .filter(models.Message.id != user_msg.id)
        .order_by(models.Message.created_at.desc())
        .limit(settings.SUMMARY_INTERVAL - 1)
        .all()
    )[::-1]

    # 4. Appel de l'orchestrateur (routage intelligent)
    ai_content = await orchestrator.process(
        thread=thread,
        context_messages=previous_messages,
        user_prompt=payload.content,
        model_name=payload.model_name,
        db=db,
    )

    if not ai_content or ai_content.strip() == "":
        raise HTTPException(status_code=502, detail="L'IA n'a pas renvoyé de réponse.")

    # 5. Sauvegarde de la réponse assistant
    assistant_msg = models.Message(
        thread_id=thread_id,
        role="assistant",
        content=ai_content,
        model_name=payload.model_name,
        answer_of=user_msg.id
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    # 6. MISE À JOUR DU RÉSUMÉ (Logique de seuil robuste)
    total_msg_count = db.query(func.count(models.Message.id)).filter(
        models.Message.thread_id == thread_id
    ).scalar()

    # On déclenche si on a atteint ou dépassé l'intervalle
    threshold_reached = False

    # Vérifie si on a franchi une nouvelle centaine/dizaine définie par l'intervalle
    if (total_msg_count // settings.SUMMARY_INTERVAL) > ((total_msg_count - 2) // settings.SUMMARY_INTERVAL):
        threshold_reached = True

    if threshold_reached:

        # On récupère les messages pour le résumé
        messages_for_summary = previous_messages + [user_msg, assistant_msg]

        new_json_summary = await orchestrator.summary_agent.process(
            messages_to_summarize=messages_for_summary,
            current_summary_json=str(thread.current_summary) if thread.current_summary else "",
            model_name=payload.model_name,
        )

        if new_json_summary:
            thread.current_summary = new_json_summary
            db.add(thread)
            db.commit()
            print(f"DEBUG: Résumé mis à jour (Total messages: {total_msg_count})")

    return assistant_msg


@router.patch("/{thread_id}/messages/{message_id}/rate", response_model=schemas.MessageSchema)
def rate_message(message_id: str, payload: schemas.MessageRate, db: Session = Depends(get_db)):
    """
        Update the rating of a specific message.

        This endpoint allows users to assign or update a score/rating to an existing message
        (typically an assistant's response) for quality tracking or feedback purposes.

        Args:
            message_id (str): The unique identifier of the message to rate.
            payload (schemas.MessageRate): The rating data (e.g., an integer or boolean score).
            db (Session): Database session provided by dependency injection.

        Returns:
            models.Message: The updated message object with the new rating.

        Raises:
            HTTPException: 404 error if the message does not exist.
    """
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    message.rating = payload.rating
    db.commit()
    db.refresh(message)
    return message


@router.delete("/{thread_id}/messages/{message_id}", status_code=204)
def delete_message(message_id: str, db: Session = Depends(get_db)):
    """
        Delete a specific message and its associated counterpart.

        This endpoint performs a custom cascade deletion:
        - If an assistant message is deleted, its original user prompt is also removed.
        - If a user message is deleted, the corresponding assistant response is also removed.
        This ensures that the conversation pairs (Q&A) remain synchronized and consistent.

        Args:
            message_id (str): The unique identifier of the message to delete.
            db (Session): Database session provided by dependency injection.

        Returns:
            None: Returns a 204 No Content status code on success.

        Raises:
            HTTPException: 404 error if the target message does not exist.
    """
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")

    # Suppression en cascade du message lié
    if message.answer_of:
        # C'est un assistant → supprimer d'abord cet assistant (qui porte la FK), puis le user
        linked = db.query(models.Message).filter(models.Message.id == message.answer_of).first()
        db.delete(message)
        db.flush()
        if linked:
            db.delete(linked)
    else:
        # C'est un user → supprimer d'abord l'assistant (qui porte la FK), puis le user
        linked = db.query(models.Message).filter(models.Message.answer_of == message.id).first()
        if linked:
            db.delete(linked)
            db.flush()
        db.delete(message)

    db.commit()
    return None
