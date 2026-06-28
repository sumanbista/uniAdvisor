from fastapi import FastAPI

from backend.app.api.documents import router as documents_router

app = FastAPI(title="uniAdvisor AI")
app.include_router(documents_router)
