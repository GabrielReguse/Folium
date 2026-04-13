# ═══════════════════════════════════════════════
#  FOLIUM — routes/ai2.py
#  IA 2: Geradora da Folha de Estudos
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

# ── System Prompt ─────────────────────────────
SYS_SHEET = """
Você é a IA 2 do Folium — geradora de folhas de estudo para estudantes brasileiros.

Você recebe uma matéria, um tema e uma lista de tópicos confirmados pelo usuário.
Para cada tópico, gere um bloco com:
1. "titulo": nome limpo do tópico
2. "explicacao": texto objetivo de 7 a 8 linhas, linguagem de ensino médio/início de faculdade, direto ao ponto
3. "exemplo": objeto com "tipo" e conteúdo:
   - tipo "tabela": use quando o tópico envolve comparação. Inclua "colunas" (array de strings) e "linhas" (array de arrays)
   - tipo "lista": use quando o tópico é enumeração de características. Inclua "itens" (array de strings)
   - tipo "pratico": use quando o tópico é abstrato e precisa de analogia. Inclua "texto" (string)

Ao final, gere um "resumo_geral": parágrafo conectando todos os tópicos, visão macro do tema.

REGRAS OBRIGATÓRIAS:
- Responda APENAS com JSON válido — sem texto antes, sem texto depois, sem markdown
- Escolha o tipo de exemplo mais adequado para cada tópico
- Linguagem clara, didática, sem termos enciclopédicos

FORMATO EXATO:
{
  "blocos": [
    {
      "titulo": "Nome do Tópico",
      "explicacao": "Texto explicativo de 7-8 linhas...",
      "exemplo": {
        "tipo": "tabela",
        "colunas": ["Coluna 1", "Coluna 2"],
        "linhas": [["dado1", "dado2"], ["dado3", "dado4"]]
      }
    },
    {
      "titulo": "Outro Tópico",
      "explicacao": "Explicação...",
      "exemplo": {
        "tipo": "lista",
        "itens": ["Item 1", "Item 2", "Item 3"]
      }
    },
    {
      "titulo": "Tópico Abstrato",
      "explicacao": "Explicação...",
      "exemplo": {
        "tipo": "pratico",
        "texto": "Imagine que..."
      }
    }
  ],
  "resumo_geral": "Parágrafo conectando todos os tópicos..."
}
""".strip()

# ── Helper: chama o Groq ──────────────────────
async def call_groq(system: str, user: str) -> Any:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(503, "Serviço de IA não configurado no servidor.")

    async with httpx.AsyncClient(timeout=90.0) as client:
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
                "max_tokens":  4096,
            },
        )

    if resp.status_code != 200:
        print(f"[AI2] Groq error {resp.status_code}: {resp.text[:200]}")
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
        print(f"[AI2] JSON inválido: {clean[:200]}")
        raise HTTPException(502, "IA retornou resposta inválida. Tente novamente.")

# ── Schema ────────────────────────────────────
class SheetBody(BaseModel):
    materia: str
    tema:    str = ""
    topicos: list[str]

# ── POST /api/ai2/sheet ───────────────────────
@router.post("/sheet")
async def generate_sheet(body: SheetBody, user=Depends(require_auth)):
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')
    if not body.topicos:
        raise HTTPException(400, 'Lista de tópicos não pode estar vazia.')

    topicos_str = "\n".join(f"- {t}" for t in body.topicos)
    prompt = (
        f"Matéria: {body.materia.strip()}\n"
        f"Tema: {body.tema.strip() or 'geral'}\n"
        f"Tópicos:\n{topicos_str}"
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" topicos:{len(body.topicos)}")

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result