# ═══════════════════════════════════════════════
#  FOLIUM — routes/ai.py
#  IA 1: Curadoria de tópicos e verificação
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
  "fundamental_1": "Ensino Fundamental I (1º ao 5º ano) — linguagem simples, conceitos básicos, sem abstrações",
  "fundamental_2": "Ensino Fundamental II (6º ao 9º ano) — conceitos intermediários, linguagem acessível",
  "medio":         "Ensino Médio — nível padrão vestibular, conteúdo completo da grade curricular",
  "vestibular":    "Vestibular/ENEM — foco no que mais cai, profundidade média-alta, atenção a pegadinhas",
  "tecnico":       "Ensino Técnico — foco aplicado e prático, linguagem técnica moderada",
  "superior":      "Ensino Superior — linguagem acadêmica, profundidade alta, pode incluir teoria avançada",
  "pos":           "Pós-graduação — nível especialista, terminologia técnica, profundidade máxima",
}

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

SYS_GENERATE = """
Você é a IA 1 do Folium — curador de tópicos de estudo para estudantes brasileiros.

Recebe matéria, tema e nível escolar. Retorna tópicos relevantes adaptados ao nível.

REGRAS:
- Responda APENAS com JSON válido — sem texto antes, sem depois, sem markdown
- Entre 5 e 8 tópicos
- Nomes concisos, máximo 6 palavras, em português
- Adapte profundidade ao nível: fundamental = concreto/básico, médio = completo, superior = aprofundado
- O campo "foco" deve descrever EXATAMENTE o que explicar sobre AQUELE tópico específico, não uma frase genérica

FORMATO:
{
  "topicos": [
    {
      "txt": "Nome do tópico",
      "plano_pesquisa": {
        "foco": "Descrição específica do que explicar sobre este tópico concreto",
        "profundidade": "basico",
        "formato_exemplo": "tabela_comparativa",
        "palavras_chave": ["termo1", "termo2", "termo3"]
      }
    }
  ]
}

Valores para profundidade: basico | intermediario | avancado
Valores para formato_exemplo: tabela_comparativa | lista_numerada | caso_pratico | formula
""".strip()

SYS_CHECK = """
Você é a IA 1 do Folium — avaliador de compatibilidade de tópicos.

O usuário adicionou manualmente um tópico à lista. Sua tarefa é:
1. Verificar se é compatível com a matéria/tema
2. Gerar um plano de pesquisa REAL sobre o que aquele tópico realmente é

REGRA CRÍTICA SOBRE plano_pesquisa:
- O plano deve ser sobre o TÓPICO ADICIONADO, não sobre a matéria principal
- Se o usuário adicionou "Fotossíntese" numa lista de Trigonometria, o plano deve explicar fotossíntese de verdade, não tentar encaixar no tema de trigonometria
- NÃO force o tópico para se encaixar no tema. Explique o que ele realmente é.
- O campo "foco" deve ser específico: "Como a fotossíntese converte luz em glicose" — NUNCA "O tópico no contexto da matéria"

CRITÉRIOS DE COMPATIBILIDADE:
- compativel: true → tópico relacionado à matéria/tema
- compativel: false → tópico claramente de outra área
- aviso: null se compatível sem ressalvas
- aviso: mensagem curta se incompatível (ex: "Fotossíntese pertence à Biologia, não à Trigonometria. A IA 2 vai explicar o tópico como ele é.")

FORMATO (JSON válido, sem markdown):
{
  "compativel": true,
  "aviso": null,
  "plano_pesquisa": {
    "foco": "Descrição específica e real do que este tópico aborda",
    "profundidade": "basico",
    "formato_exemplo": "lista_numerada",
    "palavras_chave": ["termo real 1", "termo real 2"]
  }
}
""".strip()

async def call_groq(system: str, user: str, max_tokens: int = 1024) -> Any:
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
                "temperature": 0.5,
                "max_tokens":  max_tokens,
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

class TopicsBody(BaseModel):
    materia: str
    tema:    str = ""
    nivel:   str = ""

class CheckBody(BaseModel):
    novoTopico:        str
    materia:           str
    tema:              str = ""
    nivel:             str = ""
    topicosExistentes: list[str] = []

@router.post("/topics")
async def topics(body: TopicsBody, user=Depends(require_auth)):
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')

    nivel_desc = NIVEL_MAP.get(body.nivel, "Ensino Médio — nível padrão")

    prompt = (
        f"Matéria: {body.materia.strip()}\n"
        f"Tema(s): {body.tema.strip() or 'geral — principais tópicos da matéria'}\n"
        f"Nível escolar: {nivel_desc}"
    )

    print(f"[AI1] /topics — user:{user.get('id')} materia:\"{body.materia}\" nivel:\"{body.nivel}\"")

    result = await call_groq(SYS_GENERATE, prompt, max_tokens=1500)

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

@router.post("/check-topic")
async def check_topic(body: CheckBody, user=Depends(require_auth)):
    if not body.novoTopico.strip():
        raise HTTPException(400, 'Campo "novoTopico" é obrigatório.')
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')

    existentes = ", ".join(body.topicosExistentes) or "nenhum ainda"
    nivel_desc = NIVEL_MAP.get(body.nivel, "Ensino Médio")

    prompt = (
        f"Matéria da folha: {body.materia.strip()}\n"
        f"Tema da folha: {body.tema.strip() or 'geral'}\n"
        f"Nível escolar: {nivel_desc}\n"
        f"Tópicos já na lista: {existentes}\n"
        f"Novo tópico adicionado pelo usuário: \"{body.novoTopico.strip()}\"\n\n"
        f"Gere o plano_pesquisa sobre o que \"{body.novoTopico.strip()}\" REALMENTE é, independentemente de ser compatível ou não com o tema."
    )

    print(f"[AI1] /check-topic — user:{user.get('id')} topico:\"{body.novoTopico}\"")

    try:
        result = await call_groq(SYS_CHECK, prompt, max_tokens=600)
        return {
            "compativel":     result.get("compativel", True),
            "aviso":          result.get("aviso"),
            "plano_pesquisa": result.get("plano_pesquisa"),
        }
    except HTTPException:
        return {"compativel": True, "aviso": None, "plano_pesquisa": None}
