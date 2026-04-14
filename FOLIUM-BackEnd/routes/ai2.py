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
  "fundamental_1": "Ensino Fundamental I — linguagem muito simples, analogias do cotidiano, sem fórmulas",
  "fundamental_2": "Ensino Fundamental II — linguagem acessível, conceitos introdutórios, exemplos concretos",
  "medio":         "Ensino Médio — linguagem clara, inclui fórmulas básicas, exemplos numéricos",
  "vestibular":    "Vestibular/ENEM — fórmulas completas, exemplos resolvidos, foco em questões de prova",
  "tecnico":       "Ensino Técnico — linguagem técnica aplicada, foco prático, procedimentos passo a passo",
  "superior":      "Ensino Superior — linguagem acadêmica, teoria aprofundada, notação formal",
  "pos":           "Pós-graduação — nível especialista, terminologia avançada, profundidade máxima",
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

SYS_SHEET = """
Você é um professor de cursinho criando uma folha de estudos. Direto, denso, sem enrolação.

MISSÃO: o aluno deve conseguir resolver exercícios olhando só para esta folha.

═══════════════════════════════════════
REGRA #1 — CADA TÓPICO É ÚNICO
═══════════════════════════════════════
Cada bloco fala sobre SEU tópico específico. Exemplos:
- Tópico "Teorema de Pitágoras" → exemplo com a² + b² = c², com números reais (ex: a=3, b=4, c=5)
- Tópico "Mitose" → exemplo com as fases (prófase, metáfase, anáfase, telófase) e o que ocorre em cada uma
- Tópico "Segunda Guerra Mundial" → exemplo com datas e eventos reais (1939-1945, invasão da Polônia, etc.)
NÃO repita o mesmo exemplo para tópicos diferentes. Cada exemplo deve ser 100% específico ao seu tópico.

═══════════════════════════════════════
REGRA #2 — EXEMPLOS COM DADOS REAIS
═══════════════════════════════════════
PROIBIDO: "valor X", "dado A", "contexto prático", "exemplo real", textos genéricos
OBRIGATÓRIO: números, nomes, datas, fórmulas reais específicas ao tópico

EXEMPLOS DE COMO FAZER CERTO:

Tópico "Seno e Cosseno" → tipo "lista":
  itens: ["sen(30°) = 0,5", "cos(30°) = √3/2 ≈ 0,866", "sen(45°) = cos(45°) = √2/2 ≈ 0,707", "sen(60°) = √3/2, cos(60°) = 0,5"]

Tópico "Célula Procariótica vs Eucariótica" → tipo "tabela":
  colunas: ["Característica", "Procariótica", "Eucariótica"]
  linhas: [["Núcleo", "Ausente (nucleoide)", "Presente com membrana"], ["Organelas", "Ausentes", "Ribossomos, mitocôndrias, etc."], ["Exemplos", "Bactérias, arqueas", "Fungos, plantas, animais"], ["Tamanho", "1–10 μm", "10–100 μm"]]

Tópico "Lei de Newton" → tipo "pratico":
  texto: "Carro de 1000 kg acelera a 2 m/s². F = m × a → F = 1000 × 2 = 2000 N. Se dobrar a força (4000 N), a aceleração dobra: a = F/m = 4000/1000 = 4 m/s²."

EXEMPLOS DE COMO NÃO FAZER (ERRADO):
  texto: "Considere um valor X aplicado a um contexto prático desta área de estudo."
  itens: ["Contexto prático de aplicação do conceito", "Relação com outros temas da área"]

═══════════════════════════════════════
REGRA #3 — VISUAL ADEQUADO
═══════════════════════════════════════
Inclua "visual" quando realmente ajuda. Tipos:

"grafico_funcao" → funções matemáticas (seno, polinômios, exponenciais)
  {"tipo":"grafico_funcao","dados":{"label":"f(x) = sen(x)","funcao":"Math.sin(x)","dominio":[-6.28,6.28]}}
  REGRA: "funcao" é expressão JS válida com x. Use Math.sin, Math.cos, Math.sqrt, Math.pow, Math.log, Math.PI

"grafico_barras" → comparações numéricas
  {"tipo":"grafico_barras","dados":{"titulo":"Título","labels":["A","B","C"],"datasets":[{"label":"Série","valores":[10,25,15]}]}}

"grafico_pizza" → proporções/percentuais
  {"tipo":"grafico_pizza","dados":{"titulo":"Título","labels":["X","Y"],"valores":[70,30]}}

"svg" → geometria SIMPLES (triângulos, círculos, vetores — apenas rect, circle, line, polygon, text)
  {"tipo":"svg","codigo":"<svg viewBox=\"0 0 200 160\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>"}

"imagem_wiki" → Biologia, Química, História, Geografia — imagens reais do Wikipedia
  {"tipo":"imagem_wiki","busca":"termo específico"}
  USE PARA: organelas, animais, mapas, estruturas químicas, eventos históricos, anatomia
  NÃO USE PARA: conceitos abstratos, matemática pura

═══════════════════════════════════════
REGRA #4 — PROIBIÇÕES
═══════════════════════════════════════
NUNCA escreva: "é fundamental", "é essencial", "é importante", "é um conceito", "permite compreender"
NUNCA repita conteúdo já explicado em outro bloco
NUNCA use "visual" para conceitos que não têm representação visual clara

═══════════════════════════════════════
FORMATO JSON (sem markdown, sem texto fora)
═══════════════════════════════════════
{
  "blocos": [
    {
      "titulo": "Nome exato do tópico",
      "explicacao": "6-8 linhas densas e específicas ao tópico. Definição + fórmula se existir + quando usar.",
      "dica_prova": "Cai muito em: [tipo específico de questão]. Atenção: [erro comum específico deste tópico].",
      "exemplo": {
        "tipo": "pratico|lista|tabela",
        "texto": "...",
        "itens": [...],
        "colunas": [...],
        "linhas": [...]
      },
      "visual": { "tipo": "...", "dados": {...} }
    }
  ],
  "resumo_geral": "4-5 linhas conectando os tópicos. Como se relacionam e em que ordem aparecem nas provas."
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
                "temperature": 0.2,
                "max_tokens":  7000,
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
        print(f"[AI2] JSON inválido: {clean[:300]}")
        raise HTTPException(502, "IA retornou resposta inválida. Tente novamente.")

class TopicItem(BaseModel):
    txt:            str
    plano_pesquisa: dict | None = None

class SheetBody(BaseModel):
    materia: str
    tema:    str = ""
    nivel:   str = ""
    topicos: list[TopicItem]

@router.post("/sheet")
async def generate_sheet(body: SheetBody, user=Depends(require_auth)):
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')
    if not body.topicos:
        raise HTTPException(400, 'Lista de tópicos não pode estar vazia.')

    nivel_desc = NIVEL_MAP.get(body.nivel, "Ensino Médio — nível padrão")

    topicos_lines = []
    for t in body.topicos:
        line = f"- {t.txt}"
        if t.plano_pesquisa:
            p = t.plano_pesquisa
            foco     = p.get("foco", "")
            palavras = ", ".join(p.get("palavras_chave", []))
            if foco:     line += f"  [foco: {foco}]"
            if palavras: line += f"  [palavras-chave: {palavras}]"
        topicos_lines.append(line)

    topicos_str = "\n".join(topicos_lines)

    prompt = (
        f"Nível escolar: {nivel_desc}\n"
        f"Matéria: {body.materia.strip()}\n"
        f"Tema: {body.tema.strip() or 'geral'}\n\n"
        f"Tópicos (gere um bloco ESPECÍFICO para cada um):\n{topicos_str}\n\n"
        f"LEMBRE: cada exemplo deve usar dados REAIS e ESPECÍFICOS do seu próprio tópico. "
        f"Nunca use o mesmo texto de exemplo para tópicos diferentes."
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" nivel:\"{body.nivel}\" topicos:{len(body.topicos)}")

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result
