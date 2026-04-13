# ═══════════════════════════════════════════════
#  FOLIUM — routes/ai.py
#  IA 1: Curadoria de tópicos e verificação
#  Usando Groq (gratuito)
# ═══════════════════════════════════════════════

import os, json
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from jose import jwt, JWTError

router = APIRouter()

GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API   = "https://api.groq.com/openai/v1/chat/completions"

# ── Auth Dependency ───────────────────────────
def require_auth(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token não fornecido.")
    try:
        return jwt.decode(
            authorization.split(" ")[1],
            os.getenv("JWT_SECRET", "dev_secret"),
            algorithms=["HS256"],
        )
    except JWTError:
        raise HTTPException(401, "Token inválido ou expirado.")

# ── System Prompts ────────────────────────────
SYS_GENERATE = """
Você é a IA 1 do Folium — um curador inteligente de tópicos de estudo para estudantes brasileiros.

Analise a matéria e os temas fornecidos e retorne uma lista de tópicos relevantes para estudo,
priorizando o que realmente cai em provas, vestibulares e concursos.

Para cada tópico, elabore um plano de pesquisa que a IA 2 (geradora de resumos) usará.

REGRAS OBRIGATÓRIAS:
- Responda APENAS com JSON válido — sem texto antes, sem texto depois, sem markdown
- Entre 5 e 8 tópicos por resposta
- Nomes de tópicos: concisos, máximo 6 palavras, em português
- O campo "foco" do plano deve guiar uma explicação didática de 6 a 8 linhas

FORMATO EXATO DE SAÍDA:
{
  "topicos": [
    {
      "txt": "Nome do tópico",
      "plano_pesquisa": {
        "foco": "O que explicar de forma clara e didática sobre este tópico",
        "profundidade": "basico",
        "formato_exemplo": "tabela_comparativa",
        "palavras_chave": ["termo1", "termo2", "termo3"]
      }
    }
  ]
}

Valores possíveis para profundidade: basico | intermediario | avancado
Valores possíveis para formato_exemplo: tabela_comparativa | lista_numerada | caso_pratico | formula
""".strip()

SYS_CHECK = """
Você é a IA 1 do Folium — avaliador de compatibilidade de tópicos de estudo.

Analise se o novo tópico inserido pelo usuário é compatível com a matéria,
o tema e os tópicos já existentes na lista.

CRITÉRIOS:
- compativel: true  → tópico dentro do escopo da matéria/tema
- compativel: false → tópico claramente fora do escopo
- Em caso de dúvida, prefira compativel: true com aviso em português

REGRAS:
- Responda APENAS com JSON válido — sem texto antes, sem texto depois, sem markdown
- aviso: null quando compatível sem ressalvas
- Mesmo incompatível, gere plano_pesquisa

FORMATO EXATO DE SAÍDA:
{
  "compativel": true,
  "aviso": null,
  "plano_pesquisa": {
    "foco": "O que explicar sobre este tópico",
    "profundidade": "basico",
    "formato_exemplo": "lista_numerada",
    "palavras_chave": ["termo1", "termo2"]
  }
}
""".strip()

# ── Helper: chama o Groq ──────────────────────
async def call_groq(system: str, user: str) -> Any:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(503, "Serviço de IA não configurado no servidor.")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            GROQ_API,
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                "temperature": 0.7,
                "max_tokens":  1024,
            },
        )

    if resp.status_code != 200:
        print(f"[AI] Groq error {resp.status_code}: {resp.text[:200]}")
        raise HTTPException(502, f"Groq retornou {resp.status_code}.")

    data = resp.json()
    try:
        raw = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(502, "IA retornou resposta inválida.")

    clean = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        print(f"[AI] JSON inválido: {clean[:200]}")
        raise HTTPException(502, "IA retornou resposta inválida. Tente novamente.")

# ── Schemas ───────────────────────────────────
class TopicsBody(BaseModel):
    materia: str
    tema:    str = ""

class CheckBody(BaseModel):
    novoTopico:        str
    materia:           str
    tema:              str = ""
    topicosExistentes: list[str] = []

# ── POST /api/ai/topics ───────────────────────
@router.post("/topics")
async def topics(body: TopicsBody, user=Depends(require_auth)):
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')

    prompt = (
        f"Matéria: {body.materia.strip()}\n"
        f"Tema(s): {body.tema.strip() or 'geral — aborde os principais tópicos da matéria'}"
    )

    print(f"[AI1] /topics — user:{user.get('id')} materia:\"{body.materia}\" tema:\"{body.tema}\"")

    result = await call_groq(SYS_GENERATE, prompt)

    topicos = [
        {
            "txt":            str(t.get("txt", "")).strip(),
            "on":             True,
            "plano_pesquisa": t.get("plano_pesquisa"),
            "aviso":          None,
        }
        for t in result.get("topicos", [])
        if str(t.get("txt", "")).strip()
    ]

    if not topicos:
        raise HTTPException(502, "IA não retornou tópicos válidos. Tente novamente.")

    return {"topicos": topicos}

# ── POST /api/ai/check-topic ──────────────────
@router.post("/check-topic")
async def check_topic(body: CheckBody, user=Depends(require_auth)):
    if not body.novoTopico.strip():
        raise HTTPException(400, 'Campo "novoTopico" é obrigatório.')
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')

    existentes = ", ".join(body.topicosExistentes) or "nenhum ainda"
    prompt = (
        f"Matéria: {body.materia.strip()}\n"
        f"Tema(s): {body.tema.strip() or 'geral'}\n"
        f"Tópicos já na lista: {existentes}\n"
        f'Novo tópico adicionado pelo usuário: "{body.novoTopico.strip()}"'
    )

    print(f"[AI1] /check-topic — user:{user.get('id')} topico:\"{body.novoTopico}\"")

    try:
        result = await call_groq(SYS_CHECK, prompt)
        return {
            "compativel":     result.get("compativel", True),
            "aviso":          result.get("aviso"),
            "plano_pesquisa": result.get("plano_pesquisa"),
        }
    except HTTPException:
        return {"compativel": True, "aviso": None, "plano_pesquisa": None}