from fastapi import FastAPI

from backend.app.api.documents import router as documents_router
from backend.app.api.rag import router as rag_router

app = FastAPI(title="uniAdvisor AI")
app.include_router(documents_router)
app.include_router(rag_router)
