# ═══════════════════════════════════════════════
#  FOLIUM — main.py
#  Servidor FastAPI — substitui o server.js
# ═══════════════════════════════════════════════

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.ai   import router as ai_router

load_dotenv()

app = FastAPI(title="Folium API", version="1.0.0")

# ── CORS ──────────────────────────────────────
allowed_origin = os.getenv("ALLOWED_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin] if allowed_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rotas ─────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth")
app.include_router(ai_router,   prefix="/api/ai")

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Folium API", "version": "1.0.0"}

@app.get("/")
def root():
    return {"message": "🍃 Folium API está no ar!", "docs": "/api/health"}
