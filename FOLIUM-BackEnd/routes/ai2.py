# ═══════════════════════════════════════════════
#  FOLIUM — routes/ai2.py
#  IA 2: Geradora da Folha de Estudos
# ═══════════════════════════════════════════════

import os, json, asyncio
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from jose import jwt, JWTError

from fastapi.responses import JSONResponse
from limiter import groq_call_with_queue, queue_position, MAX_CONCURRENT

router = APIRouter()

GROQ_API = "https://api.groq.com/openai/v1/chat/completions"

# Cadeia de modelos: tenta na ordem, passa pro próximo se der 429 ou 413
# llama-3.3-70b-versatile → qualidade máxima (principal)
# gemma2-9b-it           → ~15k TPM no plano free, bom fallback de qualidade
# llama-3.1-8b-instant   → último recurso, bem mais rápido mas menos preciso
MODEL_CHAIN = [
    {"model": "llama-3.3-70b-versatile", "max_tokens": 4500},
    {"model": "gemma2-9b-it",            "max_tokens": 3500},
    {"model": "llama-3.1-8b-instant",    "max_tokens": 2500},
]

# Alias pra compatibilidade com partes do código que referenciam GROQ_MODEL
GROQ_MODEL = MODEL_CHAIN[0]["model"]

NIVEL_MAP = {
  "fundamental_1": "Fundamental I — linguagem simples, sem fórmulas, analogias do cotidiano",
  "fundamental_2": "Fundamental II — conceitos introdutórios, exemplos concretos",
  "medio":         "Ensino Médio — linguagem clara, fórmulas básicas, exemplos numéricos",
  "vestibular":    "Vestibular/ENEM — fórmulas completas, exemplos resolvidos, dicas de pegadinhas",
  "tecnico":       "Técnico — linguagem aplicada, foco prático",
  "superior":      "Superior — linguagem acadêmica, teoria aprofundada",
  "pos":           "Pós-graduação — especialista, terminologia avançada",
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
Professor de cursinho gerando folha de estudos densa. Direto, sem enrolação, conteúdo real.
O NÍVEL ESCOLAR define vocabulário, profundidade e complexidade — respeite rigorosamente.

PROIBIÇÕES: "é um conceito central", "seu entendimento é essencial", "proporciona uma visão estruturada", "permite compreender", placeholders como "valor X" ou "contexto prático".

─── CAMPO "explicacao" ───
6-8 linhas densas: definição precisa + fórmula (se existir) + quando usar + relação com outros tópicos.

─── CAMPO "exemplo" (OBRIGATÓRIO) ───
Rótulos: "💡 Exemplo Resolvido" | "📋 Tabela Comparativa" | "🔢 Fórmulas-chave" | "📝 Passo a Passo" | "📌 Características"

tipo "pratico" → fórmula ou processo calculável.
{"tipo":"pratico","rotulo":"💡 Exemplo Resolvido","texto":"dados reais → cálculo → resultado numérico"}
ERRADO: "texto":"Contexto prático de aplicação do conceito"
CERTO:  "texto":"Triângulo: cateto=4, hipotenusa=5. sen(θ)=4/5=0,8 → θ≈53,13°"

tipo "tabela" → comparativo.
{"tipo":"tabela","rotulo":"📋 Tabela Comparativa","colunas":["Ângulo","seno","cosseno"],"linhas":[["30°","0,50","0,87"],["45°","0,71","0,71"]]}

tipo "lista" → enumerações, fórmulas derivadas.
{"tipo":"lista","rotulo":"🔢 Fórmulas-chave","itens":["sen²x+cos²x=1","1+tan²x=sec²x"]}
ERRADO: "itens":["Contexto prático","Relação com outros temas"]

─── CAMPO "dica_prova" ───
"Cai em: [questão concreta]. Cuidado: [erro real específico]."

─── CAMPO "visual" ───
REGRA DE OURO: antes de escolher svg, faça o TESTE ABAIXO.

TESTE DO SVG (execute mentalmente antes de usar svg):
  1. O que eu vou desenhar tem valores NUMÉRICOS para posicionar? (ângulos, comprimentos, coordenadas)
  2. O resultado vai parecer um DIAGRAMA GEOMÉTRICO, não uma ilustração com texto descritivo?
  3. Se eu apagar todos os textos do SVG, ainda resta um desenho útil?
  Se NÃO para qualquer uma: USE imagem_wiki, não svg.

SINAL DE ALERTA — se o seu SVG fosse conter qualquer uma dessas coisas, PARE e use imagem_wiki:
  ✗ Um rect ou circle com o nome do conceito escrito dentro (ex: "Cromossomo X", "Mitocôndria")
  ✗ Texto descritivo sendo o conteúdo principal (o texto não é rótulo, é o "desenho")
  ✗ Qualquer estrutura biológica, anatômica, química ou molecular
  ✗ Qualquer coisa que exige gradiente, curvas de Bézier complexas ou múltiplas camadas

grafico_funcao → SOMENTE tópicos que SÃO f(x): seno, cosseno, parábola, reta, log, exp.
{"tipo":"grafico_funcao","dados":{"label":"sen(x)","funcao":"Math.sin(x)","dominio":[-6.28,6.28]}}
⛔ NÃO USE para reações químicas, processos biológicos, ou qualquer coisa que não seja y=f(x).

grafico_barras → comparações numéricas reais.
{"tipo":"grafico_barras","dados":{"titulo":"Título","labels":["A","B"],"datasets":[{"label":"Série","valores":[10,25]}]}}

grafico_pizza → proporções/porcentagens com dados reais.
{"tipo":"grafico_pizza","dados":{"titulo":"Título","labels":["X","Y"],"valores":[78,22]}}

imagem_wiki → USE PARA TUDO que envolve: biologia, anatomia, química, estruturas moleculares,
  organismos, células, órgãos, mapas, eventos históricos, processos naturais, qualquer ser vivo.
{"tipo":"imagem_wiki","busca":"termo específico 3-5 palavras"}
⚠️ GENÉTICA/BIOLOGIA: cromossomos, DNA, herança, células → SEMPRE imagem_wiki. NUNCA svg.
BONS: "cromossomo X estrutura", "herança ligada sexo diagrama", "mitocôndria estrutura"
RUINS: "cromossomo", "célula", "herança"

svg → SOMENTE geometria pura com valores numéricos: triângulo retângulo com medidas,
  vetor com ângulo e magnitude, circunferência com raio marcado, eixos cartesianos.
{"tipo":"svg","codigo":"<svg viewBox=\"0 0 220 170\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>"}
Elementos: line, polygon, circle, rect, text. stroke="#964B00" fill="#F9F5F0". Coordenadas calculadas.
EXEMPLO VÁLIDO: triângulo retângulo com lados 3, 4, 5 marcados e ângulo θ indicado.
EXEMPLO INVÁLIDO: retângulo com "Cromossomo X" escrito — isso é imagem_wiki.

─── FORMATO FINAL (JSON sem markdown) ───
{"blocos":[{"titulo":"Nome","explicacao":"6-8 linhas","dica_prova":"Cai em: X. Cuidado: Y.","exemplo":{"tipo":"pratico","rotulo":"💡 Exemplo Resolvido","texto":"dados → resultado"},"visual":{"tipo":"grafico_funcao","dados":{"label":"sen(x)","funcao":"Math.sin(x)","dominio":[-6.28,6.28]}}}],"resumo_geral":"4-5 linhas conectando tópicos. Sem repetir o que já foi dito."}
""".strip()


async def call_groq(system: str, user: str, max_tokens: int = 4500, model: str = GROQ_MODEL) -> Any:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(503, "Serviço de IA não configurado no servidor.")

    # Monta a cadeia a partir do modelo solicitado
    # Se pediram o principal, tenta toda a cadeia. Se pediram outro específico, começa dele.
    start_index = next((i for i, m in enumerate(MODEL_CHAIN) if m["model"] == model), 0)
    chain = MODEL_CHAIN[start_index:]

    resp = None
    last_error = None

    for attempt, entry in enumerate(chain):
        current_model      = entry["model"]
        current_max_tokens = entry["max_tokens"]

        if attempt > 0:
            print(f"[AI2] Modelo {chain[attempt-1]['model']} falhou ({last_error}). "
                  f"Aguardando 8s → tentando: {current_model} (max_tokens={current_max_tokens})...")
            await asyncio.sleep(8)

        payload = {
            "model":    current_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "temperature": 0.25,
            "max_tokens":  current_max_tokens,
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                GROQ_API,
                headers={
                    "Content-Type":  "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
            )

        # ── 200: sucesso ──────────────────────────────────────────
        if resp.status_code == 200:
            print(f"[AI2] ✓ Sucesso com: {current_model}")
            break

        # ── 429: rate limit → próximo modelo da cadeia ────────────
        if resp.status_code == 429:
            last_error = "429 rate-limit"
            print(f"[AI2] Rate limit em {current_model}.")
            if attempt < len(chain) - 1:
                continue
            raise HTTPException(429, "Limite de uso da IA atingido. Aguarde cerca de 1 minuto e tente novamente.")

        # ── 413: request muito grande → próximo modelo usa menos tokens ──
        if resp.status_code == 413:
            last_error = "413 request-too-large"
            print(f"[AI2] Request muito grande em {current_model} (max_tokens={current_max_tokens}).")
            if attempt < len(chain) - 1:
                continue
            raise HTTPException(413, "Conteúdo muito extenso para a IA processar. Reduza o número de tópicos e tente novamente.")

        # ── qualquer outro erro → para imediatamente ──────────────
        print(f"[AI2] Erro inesperado {resp.status_code} em {current_model}: {resp.text[:300]}")
        raise HTTPException(502, f"Erro ao comunicar com a IA (código {resp.status_code}).")

    data = resp.json()
    try:
        raw = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(502, "IA retornou resposta inválida.")

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


class TopicItem(BaseModel):
    txt:            str
    plano_pesquisa: dict | None = None

class SheetBody(BaseModel):
    materia: str
    tema:    str = ""
    nivel:   str = ""
    topicos: list[TopicItem]


@router.get("/queue")
async def get_queue_status(_=Depends(require_auth)):
    """
    Retorna quantas requisições estão na fila agora.
    O frontend faz polling desse endpoint enquanto o loading está ativo.
    """
    waiting  = await queue_position()
    occupied = MAX_CONCURRENT - (MAX_CONCURRENT - waiting)  # slots em uso
    return {
        "waiting":      waiting,
        "max_slots":    MAX_CONCURRENT,
        "busy":         waiting > 0,
    }


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
            extras = []
            if p.get("foco"):            extras.append(f"foco: {p['foco']}")
            if p.get("profundidade"):    extras.append(f"prof: {p['profundidade']}")
            if p.get("formato_exemplo"): extras.append(f"fmt: {p['formato_exemplo']}")
            kw = p.get("palavras_chave", [])
            if kw: extras.append(f"kw: {', '.join(kw[:3])}")
            if extras:
                line += f"  [{'; '.join(extras)}]"
        topicos_lines.append(line)

    prompt = (
        f"Nível: {nivel_desc}\n"
        f"Matéria: {body.materia.strip()}\n"
        f"Tema: {body.tema.strip() or 'geral'}\n"
        f"Tópicos:\n" + "\n".join(topicos_lines)
    )

    print(f"[AI2] /sheet — user:{user.get('id')} materia:\"{body.materia}\" nivel:\"{body.nivel}\" topicos:{len(body.topicos)}")

    # Entra na fila global — no máximo MAX_CONCURRENT chamadas simultâneas ao Groq
    # e cooldown de 45s por usuário para não monopolizar a cota
    result = await groq_call_with_queue(
        user.get("id", "anon"),
        call_groq(SYS_SHEET, prompt),
    )

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result