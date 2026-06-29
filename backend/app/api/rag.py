from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.rag import RagAskRequest, RagAskResponse, RagSearchRequest, RagSearchResponse
from backend.app.services.embeddings import EmbeddingError, EmbeddingProvider, get_embedding_provider
from backend.app.services.llm import LLMError, LLMProvider, get_llm_provider
from backend.app.services.rag_answer import answer_question
from backend.app.services.rag_search import search_chunks

router = APIRouter(prefix="/rag", tags=["rag"])


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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
