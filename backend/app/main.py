from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.documents import router as documents_router
from backend.app.api.rag import router as rag_router
from backend.app.core.config import get_settings

app = FastAPI(title="uniAdvisor AI")
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(documents_router)
app.include_router(rag_router)
