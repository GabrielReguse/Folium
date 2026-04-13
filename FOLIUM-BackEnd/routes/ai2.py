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
Você é um professor especialista gerando uma folha de estudos de alto nível para o Folium.

Seu objetivo é criar conteúdo que REALMENTE ensina — não um resumo genérico. O estudante deve conseguir responder questões de prova só com sua folha.

REGRAS DE QUALIDADE (OBRIGATÓRIAS):
- Cada explicação deve ter 8 a 10 linhas densas de conteúdo real
- Use linguagem direta e precisa, adequada ao nível escolar do conteúdo (ensino médio, vestibular ou início de faculdade)
- NUNCA use frases genéricas como "é um conceito importante" ou "é essencial para entender"
- Inclua fórmulas, definições exatas, valores, nomes técnicos sempre que existirem
- Os exemplos devem ser RESOLVIDOS e concretos — não placeholders

REGRAS DE FORMATO:
- Responda APENAS com JSON válido — sem texto antes, sem depois, sem markdown
- Para cada tópico escolha o exemplo mais adequado:
  * "tabela": quando há comparação entre 2 ou mais elementos — inclua "colunas" (array) e "linhas" (array de arrays com dados reais)
  * "lista": quando há enumeração de itens, fórmulas ou características — inclua "itens" com conteúdo real (ex: "sen(θ) = cateto oposto / hipotenusa")
  * "pratico": quando o tópico se beneficia de um exemplo resolvido passo a passo — inclua "texto" com o exemplo completo e resolvido

FORMATO EXATO:
{
  "blocos": [
    {
      "titulo": "Nome exato do tópico",
      "explicacao": "Explicação densa e real de 8-10 linhas com definições, fórmulas e contexto...",
      "exemplo": {
        "tipo": "tabela",
        "colunas": ["Elemento", "Característica 1", "Característica 2"],
        "linhas": [
          ["Dado real A", "Valor concreto", "Valor concreto"],
          ["Dado real B", "Valor concreto", "Valor concreto"]
        ]
      }
    },
    {
      "titulo": "Outro tópico",
      "explicacao": "...",
      "exemplo": {
        "tipo": "lista",
        "itens": ["Fórmula ou item real 1", "Fórmula ou item real 2"]
      }
    },
    {
      "titulo": "Tópico com exemplo resolvido",
      "explicacao": "...",
      "exemplo": {
        "tipo": "pratico",
        "texto": "Exemplo resolvido passo a passo: Se x=3 e y=4, então... resultado final: ..."
      }
    }
  ],
  "resumo_geral": "Parágrafo conectando todos os tópicos, mostrando como se relacionam e qual a visão macro do tema. Deve ter pelo menos 5 linhas."
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
                "temperature": 0.4,
                "max_tokens":  6000,
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
        f"Nível escolar estimado: identifique pelo conteúdo (ensino médio, vestibular ou faculdade)\n"
        f"Tópicos para gerar:\n{topicos_str}"
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" topicos:{len(body.topicos)}")

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result