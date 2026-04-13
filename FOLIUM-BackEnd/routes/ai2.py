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
Você é um professor experiente criando uma folha de estudos para prova. Seu padrão é o de um bom cursinho — direto, denso, sem enrolação.

MISSÃO: o estudante deve bater o olho na folha e conseguir resolver exercícios. Não é pra entender o mundo — é pra passar na prova.

PROIBIÇÕES ABSOLUTAS (se usar qualquer uma dessas, a folha falhou):
- NUNCA escreva: "é fundamental", "é essencial", "é importante", "é um conceito", "permite compreender", "é amplamente utilizado"
- NUNCA repita conteúdo que já foi explicado em outro tópico da mesma folha
- NUNCA use placeholders ou exemplos vagos como "valor X" ou "contexto prático"

REGRAS DE CONTEÚDO:
- Explicação: 6 a 8 linhas. Defina, dê a fórmula se existir, explique quando usar. Nada além disso.
- Todo exemplo deve ter NÚMEROS REAIS e resultado final calculado
- Se o tópico tem fórmula → mostre a fórmula E um exemplo numérico resolvido
- Se o tópico é comparativo → use tabela com dados reais, não descrições
- Se o tópico é processo/sequência → use lista com passos concretos e objetivos
- Ao final de cada bloco, adicione "dica_prova": uma frase curta do tipo "Cai muito em: [tipo de questão]" ou "Atenção: [erro comum]"

REGRAS DE FORMATO:
- Responda APENAS com JSON válido — sem texto antes, sem depois, sem markdown
- Escolha o tipo de exemplo mais adequado para cada tópico:
  * "tabela": comparação real com dados concretos — "colunas" e "linhas" preenchidos com valores reais
  * "lista": fórmulas, passos ou características — "itens" com conteúdo real e específico
  * "pratico": exemplo resolvido passo a passo — "texto" com números reais e resultado final

FORMATO EXATO:
{
  "blocos": [
    {
      "titulo": "Nome do tópico",
      "explicacao": "Definição precisa + fórmula se existir + quando usar. 6-8 linhas sem enrolação.",
      "dica_prova": "Cai muito em: cálculo direto com valores dados. Atenção: não confundir cateto com hipotenusa.",
      "exemplo": {
        "tipo": "pratico",
        "texto": "Dados: cateto oposto = 3, hipotenusa = 5. sen(θ) = 3/5 = 0,6 → θ = arcsen(0,6) ≈ 36,87°"
      }
    },
    {
      "titulo": "Outro tópico",
      "explicacao": "...",
      "dica_prova": "Atenção: ...",
      "exemplo": {
        "tipo": "tabela",
        "colunas": ["Ângulo", "seno", "cosseno", "tangente"],
        "linhas": [
          ["30°", "0,5", "√3/2 ≈ 0,87", "1/√3 ≈ 0,58"],
          ["45°", "√2/2 ≈ 0,71", "√2/2 ≈ 0,71", "1"],
          ["60°", "√3/2 ≈ 0,87", "0,5", "√3 ≈ 1,73"]
        ]
      }
    }
  ],
  "resumo_geral": "Visão macro conectando os tópicos. Como eles se relacionam e em que ordem aparecem nas provas. 4-5 linhas, sem repetir o que já foi dito nos blocos."
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
        f"Nível escolar: identifique pelo conteúdo (ensino médio, vestibular ou faculdade)\n"
        f"Tópicos:\n{topicos_str}"
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" topicos:{len(body.topicos)}")

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result