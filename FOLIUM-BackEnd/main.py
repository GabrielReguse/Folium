import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.auth import router as auth_router
from routes.ai import router as ai_router
from routes.ai2 import router as ai2_router
from database import init_db

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        init_db()
    except Exception as e:
        print(f"[DB] ERRO ao inicializar banco no startup: {e}")
    yield


app = FastAPI(title="Folium API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor."},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
    )


app.include_router(auth_router, prefix="/api/auth")
app.include_router(ai_router, prefix="/api/ai")
app.include_router(ai2_router, prefix="/api/ai2")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Folium API", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "🍃 Folium API está no ar!", "docs": "/api/health"}
