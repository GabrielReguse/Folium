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
  "fundamental_1": "Ensino Fundamental I — linguagem extremamente simples, analogias do cotidiano, sem fórmulas, frases curtas",
  "fundamental_2": "Ensino Fundamental II — linguagem acessível, conceitos introdutórios, exemplos concretos e visuais",
  "medio":         "Ensino Médio — linguagem clara, inclui fórmulas básicas, exemplos numéricos simples",
  "vestibular":    "Vestibular/ENEM — foco no que cai em prova, fórmulas completas, exemplos resolvidos, dicas de pegadinhas",
  "tecnico":       "Ensino Técnico — linguagem técnica aplicada, foco prático, procedimentos passo a passo",
  "superior":      "Ensino Superior — linguagem acadêmica, teoria aprofundada, notação formal",
  "pos":           "Pós-graduação — nível especialista, terminologia avançada, profundidade máxima",
}

# ── Auth ──────────────────────────────────────
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

# ── System Prompt ──────────────────────────────
SYS_SHEET = """
Você é um professor experiente criando uma folha de estudos densa e objetiva.
Padrão: bom cursinho — direto, sem enrolação, conteúdo real.

MISSÃO: o estudante lê a folha e consegue resolver exercícios. Conteúdo específico, não genérico.

O NÍVEL ESCOLAR define vocabulário, profundidade e complexidade. Respeite rigorosamente.

══════════════════════════════════
PROIBIÇÕES ABSOLUTAS
══════════════════════════════════
- NUNCA use frases genéricas: "é um conceito central", "seu entendimento é essencial",
  "proporciona uma visão estruturada", "permite compreender", "é amplamente utilizado"
- NUNCA repita entre tópicos
- NUNCA use placeholders: "valor X", "contexto prático", "exemplo real observado"
- NUNCA deixe "itens", "colunas" ou "linhas" com conteúdo genérico ou vazio

══════════════════════════════════
CAMPO "explicacao" — OBRIGATÓRIO
══════════════════════════════════
6 a 8 linhas DENSAS com:
- Definição precisa do conceito
- Fórmula (se existir) com notação correta
- Quando/como usar
- Relação com outros tópicos da lista (quando relevante)
Adaptado ao nível escolar fornecido.

══════════════════════════════════
CAMPO "exemplo" — OBRIGATÓRIO, ESCOLHA O TIPO MAIS ADEQUADO
══════════════════════════════════

TIPO "pratico" → use para tópicos com fórmula ou processo calculável.
FORMATO EXATO:
  "exemplo": {"tipo": "pratico", "texto": "string com dados reais → cálculo passo a passo → resultado numérico"}
REGRA: "texto" NÃO pode ser vazio, genérico ou placeholder.
EXEMPLO CORRETO: "texto": "Triângulo com cateto oposto = 4 e hipotenusa = 5. sen(θ) = 4/5 = 0,8 → θ = arcsen(0,8) ≈ 53,13°"
EXEMPLO ERRADO: "texto": "Contexto prático de aplicação do conceito"

TIPO "tabela" → use para tópicos comparativos ou com múltiplos atributos.
FORMATO EXATO:
  "exemplo": {"tipo": "tabela", "colunas": ["Col A", "Col B", "Col C"], "linhas": [["v1","v2","v3"], ["v4","v5","v6"]]}
REGRA: "colunas" = array de strings. "linhas" = array de arrays de strings. Valores REAIS e específicos.
EXEMPLO CORRETO de colunas: ["Ângulo", "seno", "cosseno", "tangente"]
EXEMPLO CORRETO de linhas: [["30°","0,50","0,87","0,58"],["45°","0,71","0,71","1,00"],["60°","0,87","0,50","1,73"]]
EXEMPLO ERRADO de itens: ["Contexto prático de aplicação", "Relação com outros temas"]

TIPO "lista" → use para enumerações, passos, fórmulas derivadas.
FORMATO EXATO:
  "exemplo": {"tipo": "lista", "itens": ["item 1 com dado real", "item 2 com dado real"]}
REGRA: cada item = string com conteúdo real e específico. NUNCA genérico.
EXEMPLO CORRETO: "itens": ["sen²(x) + cos²(x) = 1", "1 + tan²(x) = sec²(x)", "1 + cot²(x) = csc²(x)"]
EXEMPLO ERRADO: "itens": ["Contexto prático de aplicação do conceito", "Relação com outros temas da área"]

══════════════════════════════════
CAMPO "visual" — OPCIONAL, USE QUANDO AJUDA
══════════════════════════════════
Inclua APENAS quando o visual realmente auxilia a compreensão.

TIPO "grafico_funcao" → funções matemáticas de x (seno, cosseno, polinômios, log, exp).
  "visual": {"tipo": "grafico_funcao", "dados": {"label": "f(x) = sen(x)", "funcao": "Math.sin(x)", "dominio": [-6.28, 6.28]}}
  REGRA: "funcao" deve ser expressão JavaScript válida usando x.
  Use: Math.sin, Math.cos, Math.tan, Math.sqrt, Math.pow, Math.log, Math.abs, Math.PI, Math.E

TIPO "grafico_barras" → comparações numéricas entre categorias.
  "visual": {"tipo": "grafico_barras", "dados": {"titulo": "Título", "labels": ["A","B"], "datasets": [{"label": "Série", "valores": [1.5, 2.0]}]}}

TIPO "grafico_pizza" → proporções ou composição percentual.
  "visual": {"tipo": "grafico_pizza", "dados": {"titulo": "Título", "labels": ["X","Y"], "valores": [78, 22]}}

TIPO "imagem_wiki" → Biologia, Química, História, Geografia — quando existe imagem clara no Wikipedia.
  "visual": {"tipo": "imagem_wiki", "busca": "termo específico em português ou inglês"}
  USE PARA: organelas, estruturas celulares, animais, plantas, mapas, eventos históricos, anatomia, estruturas químicas.
  TERMO ESPECÍFICO: "mitose celular fases diagrama" e não apenas "célula".
  NÃO USE PARA: conceitos puramente matemáticos ou abstratos sem imagem visual clara.

TIPO "svg" → diagramas geométricos SIMPLES (triângulos, vetores, ângulos).
  "visual": {"tipo": "svg", "codigo": "<svg viewBox=\"0 0 200 160\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>"}
  Use APENAS: line, polygon, circle, rect, text. Coordenadas exatas. NÃO use para estruturas complexas.

══════════════════════════════════
FORMATO FINAL — JSON VÁLIDO, SEM MARKDOWN
══════════════════════════════════
{
  "blocos": [
    {
      "titulo": "Nome exato do tópico",
      "explicacao": "Explicação densa e específica. 6-8 linhas adaptadas ao nível. Com fórmula se existir.",
      "dica_prova": "Cai muito em: [tipo de questão]. Atenção: [erro comum específico].",
      "exemplo": {
        "tipo": "pratico",
        "texto": "Dado: cateto oposto = 3, hipotenusa = 5. Cálculo: sen(θ) = 3/5 = 0,6. Resultado: θ ≈ 36,87°."
      },
      "visual": {
        "tipo": "grafico_funcao",
        "dados": {"label": "sen(x)", "funcao": "Math.sin(x)", "dominio": [-6.28, 6.28]}
      }
    }
  ],
  "resumo_geral": "Parágrafo conectando os tópicos. Como se relacionam e em que ordem aparecem nas provas. 4-5 linhas, sem repetir o que já foi dito nos blocos."
}
""".strip()

# ── Groq helper ────────────────────────────────
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
                "temperature": 0.25,   # baixo = mais determinístico e fiel ao formato
                "max_tokens":  7000,
            },
        )

    if resp.status_code != 200:
        print(f"[AI2] Groq error {resp.status_code}: {resp.text[:300]}")
        raise HTTPException(502, f"Groq retornou {resp.status_code}.")

    data = resp.json()
    try:
        raw = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(502, "IA retornou resposta inválida.")

    # remove possíveis blocos de código markdown
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```", 2)[1]
        if clean.startswith("json"):
            clean = clean[4:]
        clean = clean.rsplit("```", 1)[0].strip()

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        print(f"[AI2] JSON inválido:\n{clean[:400]}")
        raise HTTPException(502, "IA retornou resposta inválida. Tente novamente.")

# ── Schemas ────────────────────────────────────
class TopicItem(BaseModel):
    txt:            str
    plano_pesquisa: dict | None = None   # contexto gerado pela IA 1 — NÃO descartar

class SheetBody(BaseModel):
    materia: str
    tema:    str = ""
    nivel:   str = ""
    topicos: list[TopicItem]

# ── POST /api/ai2/sheet ────────────────────────
@router.post("/sheet")
async def generate_sheet(body: SheetBody, user=Depends(require_auth)):
    if not body.materia.strip():
        raise HTTPException(400, 'Campo "materia" é obrigatório.')
    if not body.topicos:
        raise HTTPException(400, 'Lista de tópicos não pode estar vazia.')

    nivel_desc = NIVEL_MAP.get(body.nivel, "Ensino Médio — nível padrão")

    # Monta lista de tópicos com contexto do plano_pesquisa quando disponível
    topicos_lines = []
    for t in body.topicos:
        line = f"- {t.txt}"
        if t.plano_pesquisa:
            p = t.plano_pesquisa
            extras = []
            if p.get("foco"):            extras.append(f"foco: {p['foco']}")
            if p.get("profundidade"):    extras.append(f"profundidade: {p['profundidade']}")
            if p.get("formato_exemplo"): extras.append(f"formato sugerido: {p['formato_exemplo']}")
            kw = p.get("palavras_chave", [])
            if kw: extras.append(f"palavras-chave: {', '.join(kw)}")
            if extras:
                line += f"  [{'; '.join(extras)}]"
        topicos_lines.append(line)

    topicos_str = "\n".join(topicos_lines)

    prompt = (
        f"Nível escolar: {nivel_desc}\n"
        f"Matéria: {body.materia.strip()}\n"
        f"Tema: {body.tema.strip() or 'geral'}\n"
        f"Tópicos:\n{topicos_str}"
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" nivel:\"{body.nivel}\" topicos:{len(body.topicos)}")

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result