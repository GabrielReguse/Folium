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

REGRAS DO CAMPO VISUAL (opcional por bloco):
Inclua "visual" APENAS quando ele realmente ajuda o aluno a visualizar o conteúdo. Não force.

Tipos disponíveis e quando usar:
1. "grafico_funcao" → Matemática/Física com função de x: sen, cos, tan, raiz, polinômios, etc.
   Formato: {"tipo": "grafico_funcao", "dados": {"label": "f(x) = sen(x)", "funcao": "Math.sin(x)", "dominio": [-6.28, 6.28]}}
   - funcao DEVE ser uma expressão JavaScript válida em x. Use: Math.sin, Math.cos, Math.sqrt, Math.abs, Math.pow, Math.log, Math.PI, Math.E
   - dominio DEVE ter dois números reais: [x_minimo, x_maximo]

2. "grafico_barras" → comparar valores numéricos entre categorias (triângulos especiais, tabelas de seno/cosseno, velocidade x tempo, etc.)
   Formato: {"tipo": "grafico_barras", "dados": {"titulo": "Título", "labels": ["A","B","C"], "datasets": [{"label": "Série", "valores": [1.0, 2.0, 3.0]}]}}
   - valores DEVEM ser arrays de números reais

3. "grafico_pizza" → proporções ou composição percentual (composição do ar, macronutrientes, etc.)
   Formato: {"tipo": "grafico_pizza", "dados": {"titulo": "Título", "labels": ["X","Y"], "valores": [70, 30]}}
   - valores DEVEM somar 100 (ou ser proporcionais)

4. "svg" → diagramas geométricos SIMPLES: triângulos com ângulos, circunferências, vetores, células básicas
   Formato: {"tipo": "svg", "codigo": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>"}
   - Use APENAS: rect, circle, ellipse, line, path, polygon, polyline, text, g
   - Coordenadas EXATAS — sem aproximações. Triângulo reto: calcule os vértices.
   - cores: stroke="#964B00" fill="#F9F5F0" ou fill="none"
   - NÃO use SVG se não tiver certeza das coordenadas — prefira omitir

5. "imagem_wiki" → Biologia, Química (estruturas), História, Geografia — quando existe uma imagem real e clara no Wikipedia
   Formato: {"tipo": "imagem_wiki", "busca": "termo de busca em português ou inglês, específico"}
   - Use termos específicos: "mitose celular fases" em vez de "célula"
   - NÃO use para conceitos abstratos sem representação visual clara

QUANDO NÃO INCLUIR VISUAL:
- Tópicos puramente conceituais (definições, história)
- Quando o exemplo textual já é suficiente
- Quando não tem certeza qual tipo usar → OMITA o campo "visual"

REGRAS DE FORMATO:
- Responda APENAS com JSON válido — sem texto antes, sem depois, sem markdown
- O campo "visual" é opcional. Se não se aplicar, simplesmente não inclua no bloco.

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
      },
      "visual": {
        "tipo": "grafico_funcao",
        "dados": {
          "label": "f(x) = sen(x)",
          "funcao": "Math.sin(x)",
          "dominio": [-6.28, 6.28]
        }
      }
    },
    {
      "titulo": "Tópico sem visual",
      "explicacao": "...",
      "dica_prova": "Atenção: ...",
      "exemplo": {
        "tipo": "tabela",
        "colunas": ["Coluna A", "Coluna B"],
        "linhas": [["valor 1", "valor 2"]]
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