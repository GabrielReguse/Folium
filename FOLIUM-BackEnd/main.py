import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.ai   import router as ai_router
from routes.ai2  import router as ai2_router

load_dotenv()

app = FastAPI(title="Folium API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth")
app.include_router(ai_router,   prefix="/api/ai")
app.include_router(ai2_router,  prefix="/api/ai2")

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Folium API", "version": "1.0.0"}

@app.get("/")
def root():
    return {"message": "🍃 Folium API está no ar!", "docs": "/api/health"}