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

router = APIRouter()

GROQ_MODEL          = "llama-3.3-70b-versatile"
GROQ_MODEL_FALLBACK = "llama-3.1-8b-instant"
GROQ_API            = "https://api.groq.com/openai/v1/chat/completions"

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
REGRA: "consigo desenhar com precisão usando só linhas/polígonos?" → sim=svg, não=imagem_wiki. Em dúvida → imagem_wiki.

grafico_funcao → SOMENTE tópicos que SÃO f(x): seno, cosseno, parábola, reta, log, exp.
{"tipo":"grafico_funcao","dados":{"label":"sen(x)","funcao":"Math.sin(x)","dominio":[-6.28,6.28]}}
⛔ NÃO USE para reações químicas, processos biológicos, ou qualquer coisa que não seja y=f(x).

grafico_barras → comparações numéricas reais.
{"tipo":"grafico_barras","dados":{"titulo":"Título","labels":["A","B"],"datasets":[{"label":"Série","valores":[10,25]}]}}

grafico_pizza → proporções/porcentagens com dados reais.
{"tipo":"grafico_pizza","dados":{"titulo":"Título","labels":["X","Y"],"valores":[78,22]}}

imagem_wiki → estruturas que SVG não reproduz: moléculas, organelas, anatomia, mapas, eventos históricos.
{"tipo":"imagem_wiki","busca":"termo específico 3-5 palavras"}
⚠️ QUÍMICA ORGÂNICA: NUNCA svg para moléculas. SEMPRE imagem_wiki com termo específico.
BONS: "propano estrutura molecular", "mitocôndria estrutura interna"
RUINS: "carbono", "célula"

svg → SOMENTE geometria simples: triângulo com ângulos, vetor, circunferência.
{"tipo":"svg","codigo":"<svg viewBox=\"0 0 220 170\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>"}
Elementos: line, polygon, circle, rect, text. stroke="#964B00" fill="#F9F5F0". Coordenadas calculadas.

─── FORMATO FINAL (JSON sem markdown) ───
{"blocos":[{"titulo":"Nome","explicacao":"6-8 linhas","dica_prova":"Cai em: X. Cuidado: Y.","exemplo":{"tipo":"pratico","rotulo":"💡 Exemplo Resolvido","texto":"dados → resultado"},"visual":{"tipo":"grafico_funcao","dados":{"label":"sen(x)","funcao":"Math.sin(x)","dominio":[-6.28,6.28]}}}],"resumo_geral":"4-5 linhas conectando tópicos. Sem repetir o que já foi dito."}
""".strip()


async def call_groq(system: str, user: str, max_tokens: int = 4500, model: str = GROQ_MODEL) -> Any:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(503, "Serviço de IA não configurado no servidor.")

    payload = {
        "model":    model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "temperature": 0.25,
        "max_tokens":  max_tokens,
    }

    # Tentativa 1: modelo principal
    # Tentativa 2: modelo fallback (após 15s de espera)
    for attempt, current_model in enumerate([model, GROQ_MODEL_FALLBACK]):
        if attempt > 0:
            print(f"[AI2] Rate limit. Aguardando 15s → tentando {current_model}...")
            await asyncio.sleep(15)
            payload["model"] = current_model

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                GROQ_API,
                headers={
                    "Content-Type":  "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
            )

        if resp.status_code == 429:
            if attempt == 0:
                continue  # tenta fallback
            raise HTTPException(
                429,
                "Limite de uso da IA atingido. Aguarde cerca de 1 minuto e tente novamente."
            )

        if resp.status_code != 200:
            print(f"[AI2] Groq error {resp.status_code}: {resp.text[:300]}")
            raise HTTPException(502, f"Groq retornou {resp.status_code}.")

        break  # sucesso — sai do loop

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

    result = await call_groq(SYS_SHEET, prompt)

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result