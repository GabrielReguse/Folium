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

NIVEL_MAP = {
  "fundamental_1": "Ensino Fundamental I — linguagem extremamente simples, analogias do cotidiano, sem fórmulas complexas, frases curtas",
  "fundamental_2": "Ensino Fundamental II — linguagem acessível, conceitos introdutórios, exemplos concretos e visuais",
  "medio":         "Ensino Médio — linguagem clara, inclui fórmulas básicas, exemplos numéricos simples",
  "vestibular":    "Vestibular/ENEM — foco no que cai em prova, fórmulas completas, exemplos resolvidos, dicas de pegadinhas",
  "tecnico":       "Ensino Técnico — linguagem técnica aplicada, foco prático, procedimentos passo a passo",
  "superior":      "Ensino Superior — linguagem acadêmica, teoria aprofundada, notação formal, referências a modelos teóricos",
  "pos":           "Pós-graduação — nível especialista, terminologia avançada, discussão crítica, profundidade máxima",
}

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

SYS_SHEET = """
Você é um professor experiente criando uma folha de estudos para prova. Seu padrão é o de um bom cursinho — direto, denso, sem enrolação.

MISSÃO: o estudante deve bater o olho na folha e conseguir resolver exercícios. Não é pra entender o mundo — é pra passar na prova.

O NÍVEL ESCOLAR define TUDO: vocabulário, profundidade, tipo de exemplo, complexidade das fórmulas.
Fundamental I = analogias simples do dia a dia. Vestibular = fórmulas completas e exemplos resolvidos. Superior = linguagem acadêmica e teoria.

PROIBIÇÕES ABSOLUTAS:
- NUNCA escreva: "é fundamental", "é essencial", "é importante", "é um conceito", "permite compreender"
- NUNCA repita conteúdo já explicado em outro tópico
- NUNCA use placeholders como "valor X" ou "contexto prático"

REGRAS DE CONTEÚDO:
- Explicação: 6 a 8 linhas densas adaptadas ao nível escolar
- Todo exemplo deve ter dados/números REAIS com resultado calculado
- Se o tópico tem fórmula → mostre a fórmula E um exemplo resolvido
- Se comparativo → tabela com dados reais
- Se processo → lista com passos concretos
- Adicione "dica_prova" por tópico: uma frase curta tipo "Cai muito em: X" ou "Atenção: erro comum Y"

REGRAS DE FORMATO:
- Responda APENAS com JSON válido
- Tipos de exemplo:
  * "tabela": "colunas" e "linhas" com dados reais
  * "lista": "itens" com conteúdo específico e real
  * "pratico": "texto" com exemplo resolvido passo a passo com números reais

FORMATO EXATO:
{
  "blocos": [
    {
      "titulo": "Nome do tópico",
      "explicacao": "Explicação densa adaptada ao nível, 6-8 linhas.",
      "dica_prova": "Cai muito em: X. Atenção: erro comum Y.",
      "exemplo": {
        "tipo": "pratico",
        "texto": "Dados concretos → cálculo → resultado final."
      }
    }
  ],
  "resumo_geral": "Visão macro conectando os tópicos, 4-5 linhas, sem repetir o que já foi dito."
}
""".strip()

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
                "temperature": 0.3,
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

class SheetBody(BaseModel):
    materia: str
    tema:    str = ""
    nivel:   str = ""
    topicos: list[str]

@router.post("/sheet")
async def generate_sheet(body: SheetBody, user=Depends(require_auth)):
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')
    if not body.topicos:
        raise HTTPException(400, 'Lista de tópicos não pode estar vazia.')

    nivel_desc = NIVEL_MAP.get(body.nivel, "Ensino Médio — nível padrão")
    topicos_str = "\n".join(f"- {t}" for t in body.topicos)

    prompt = (
        f"Matéria: {body.materia.strip()}\n"
        f"Tema: {body.tema.strip() or 'geral'}\n"
        f"Nível escolar: {nivel_desc}\n"
        f"Tópicos:\n{topicos_str}"
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" nivel:\"{body.nivel}\" topicos:{len(body.topicos)}")

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result