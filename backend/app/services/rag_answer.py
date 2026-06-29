import re

from sqlalchemy.orm import Session

from backend.app.db.models import RagConfidence, RagQuery
from backend.app.schemas.rag import RagAskResponse, RagSearchResult, RagSourceReference
from backend.app.services.embeddings import EmbeddingProvider
from backend.app.services.llm import LLMProvider
from backend.app.services.rag_search import search_chunks


ADVISOR_NOTE = "This answer is based only on uploaded documents and is not an official degree audit."
REFUSAL_ANSWER = (
    "I cannot answer this from the uploaded documents. I can explain the listed Computer Science "
    "requirements, but official degree progress or graduation eligibility requires advisor or registrar review."
)
MIN_EVIDENCE_SCORE = 0.35
HIGH_IMPACT_PATTERNS = (
    "graduation eligibility",
    "degree completion",
    "official audit",
    "audit status",
    "guaranteed registration",
    "guaranteed to graduate",
    "can i graduate",
    "will i graduate",
    "am i eligible to graduate",
    "am i on track to graduate",
    "approve my course",
    "personalized course approval",
)


def answer_question(
    db: Session,
    question: str,
    filters: dict[str, object],
    top_k: int,
    embedding_provider: EmbeddingProvider,
    llm_provider: LLMProvider,
) -> RagAskResponse:
    retrieved_chunks = search_chunks(
        db=db,
        query=question,
        filters=filters,
        top_k=top_k,
        embedding_provider=embedding_provider,
    )
    evidence_chunks = [chunk for chunk in retrieved_chunks if chunk.text.strip()]
    refusal_reason = refusal_reason_for(question, evidence_chunks)

    if refusal_reason:
        response = RagAskResponse(
            question=question,
            answer=REFUSAL_ANSWER,
            confidence=RagConfidence.low.value,
            refused=True,
            sources=source_references(evidence_chunks),
            advisor_note=ADVISOR_NOTE,
        )
        log_query(db, question, response, evidence_chunks, refusal_reason)
        return response

    prompt = build_grounding_prompt(question, evidence_chunks)
    answer = llm_provider.generate(prompt).strip()
    if not answer:
        response = RagAskResponse(
            question=question,
            answer=REFUSAL_ANSWER,
            confidence=RagConfidence.low.value,
            refused=True,
            sources=source_references(evidence_chunks),
            advisor_note=ADVISOR_NOTE,
        )
        log_query(db, question, response, evidence_chunks, "LLM returned an empty answer")
        return response

    response = RagAskResponse(
        question=question,
        answer=answer,
        confidence=confidence_for(evidence_chunks),
        refused=False,
        sources=source_references(evidence_chunks),
        advisor_note=ADVISOR_NOTE,
    )
    log_query(db, question, response, evidence_chunks, None)
    return response


def refusal_reason_for(question: str, chunks: list[RagSearchResult]) -> str | None:
    normalized_question = normalize_question(question)
    if any(pattern in normalized_question for pattern in HIGH_IMPACT_PATTERNS):
        return "Question requires official or personalized academic decision logic"
    if not chunks:
        return "No chunks were retrieved"
    if all(not chunk.text.strip() for chunk in chunks):
        return "Retrieved chunks were empty"
    if max(chunk.score for chunk in chunks) < MIN_EVIDENCE_SCORE:
        return "Retrieved evidence score was below the minimum threshold"
    return None


def confidence_for(chunks: list[RagSearchResult]) -> str:
    strong_chunks = [chunk for chunk in chunks if chunk.score >= 0.75]
    if len(strong_chunks) >= 2:
        return RagConfidence.high.value
    if chunks:
        return RagConfidence.medium.value
    return RagConfidence.low.value


def source_references(chunks: list[RagSearchResult]) -> list[RagSourceReference]:
    return [
        RagSourceReference(
            source_number=index,
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            document_title=chunk.document_title,
            page_number=chunk.page_number,
            section_title=chunk.section_title,
            source_type=chunk.source_type,
        )
        for index, chunk in enumerate(chunks, start=1)
    ]


def build_grounding_prompt(question: str, chunks: list[RagSearchResult]) -> str:
    context = "\n\n".join(format_source(index, chunk) for index, chunk in enumerate(chunks, start=1))
    return f"""Answer the student's question using only the provided context.
Do not use outside knowledge.
Do not invent course requirements.
Cite source numbers when making claims, using bracketed citations like [Source 1].
Say when evidence is missing.
Add appropriate caution for academic decisions.
Keep the answer concise and student-friendly.

Question:
{question}

Context:
{context}

Answer:"""


def format_source(source_number: int, chunk: RagSearchResult) -> str:
    page = chunk.page_number if chunk.page_number is not None else "Unknown"
    section = chunk.section_title or "Unknown"
    return f"""[Source {source_number}]
Document: {chunk.document_title}
Page: {page}
Section: {section}
Text: {chunk.text}"""


def log_query(
    db: Session,
    question: str,
    response: RagAskResponse,
    chunks: list[RagSearchResult],
    refusal_reason: str | None,
) -> None:
    query_log = RagQuery(
        user_question=question,
        normalized_question=normalize_question(question),
        answer=response.answer,
        confidence=response.confidence,
        retrieved_chunk_ids=[chunk.chunk_id for chunk in chunks],
        source_count=len(chunks),
        refused=response.refused,
        refusal_reason=refusal_reason,
    )
    db.add(query_log)
    db.commit()


def normalize_question(question: str) -> str:
    return re.sub(r"\s+", " ", question.strip().lower())
