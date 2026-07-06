import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.rag import RagAskRequest, RagAskResponse, RagSearchRequest, RagSearchResponse
from backend.app.services.embeddings import EmbeddingError, EmbeddingProvider, get_embedding_provider
from backend.app.services.llm import LLMError, LLMProvider, get_llm_provider
from backend.app.services.rag_answer import RagAnswerDatabaseError, answer_question
from backend.app.services.rag_search import RagFilterError, search_chunks

router = APIRouter(prefix="/rag", tags=["rag"])
logger = logging.getLogger(__name__)

EMBEDDING_UNAVAILABLE_DETAIL = "Embedding service is unavailable. Please try again."
DATABASE_UNAVAILABLE_DETAIL = "Advising data is unavailable. Please try again."
LLM_UNAVAILABLE_DETAIL = "Answer generation service is unavailable. Please try again."
UNEXPECTED_ASK_FAILURE_DETAIL = "Ask request failed. Please try again."


@router.post("/search", response_model=RagSearchResponse)
def search_rag(
    request: RagSearchRequest,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
) -> RagSearchResponse:
    try:
        results = search_chunks(
            db=db,
            query=request.query,
            filters=request.filters,
            top_k=request.top_k,
            embedding_provider=embedding_provider,
        )
    except EmbeddingError as exc:
        logger.exception("rag.search.embedding_failure")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=EMBEDDING_UNAVAILABLE_DETAIL,
        ) from exc
    except RagFilterError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        logger.exception("rag.search.database_failure")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DATABASE_UNAVAILABLE_DETAIL,
        ) from exc

    return RagSearchResponse(query=request.query, results=results)


@router.post("/ask", response_model=RagAskResponse)
def ask_rag(
    request: RagAskRequest,
    db: Session = Depends(get_db),
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
    llm_provider: LLMProvider = Depends(get_llm_provider),
) -> RagAskResponse:
    try:
        return answer_question(
            db=db,
            question=request.question,
            filters=request.filters,
            top_k=request.top_k,
            embedding_provider=embedding_provider,
            llm_provider=llm_provider,
        )
    except EmbeddingError as exc:
        logger.exception("rag.ask.embedding_failure")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=EMBEDDING_UNAVAILABLE_DETAIL,
        ) from exc
    except LLMError as exc:
        logger.exception("rag.ask.llm_failure")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=LLM_UNAVAILABLE_DETAIL,
        ) from exc
    except RagFilterError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RagAnswerDatabaseError as exc:
        logger.exception("rag.ask.database_failure stage=%s", exc.stage)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DATABASE_UNAVAILABLE_DETAIL,
        ) from exc
    except SQLAlchemyError as exc:
        logger.exception("rag.ask.database_failure stage=unknown")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DATABASE_UNAVAILABLE_DETAIL,
        ) from exc
    except Exception as exc:
        logger.exception("rag.ask.unexpected_failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=UNEXPECTED_ASK_FAILURE_DETAIL,
        ) from exc
