# ═══════════════════════════════════════════════
#  FOLIUM — routes/ai2.py
#  IA 2: Geradora da Folha de Estudos
# ═══════════════════════════════════════════════
#
# Multi-provider chain (tudo 100% gratuito, sem cartão):
#   Primário  Gemini 2.5 Pro     — qualidade máxima, 5 RPM / 100 RPD / 250k TPM
#   Fallback  Gemini 2.5 Flash   — cota mais ampla, 10 RPM / 250 RPD / 250k TPM
#   Último    Cerebras Llama 3.3 — 30 RPM / 1M tok dia (mesma família do antigo Groq)
#
# Todos os provedores usam a API OpenAI-compatível, então o client é comum.
# Usamos response_format=json_object para forçar JSON válido na saída
# (elimina boa parte dos erros "IA retornou resposta inválida").

import os, json, asyncio
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from jose import jwt, JWTError

from limiter import ai2_call_with_queue, queue_position_ai2, MAX_CONCURRENT_AI2

router = APIRouter()

# ── Cadeia de modelos ─────────────────────────────────────────
# A ordem é: melhor qualidade → mais generoso → mais rápido.
# Cada entrada inclui o teto de output tokens e o timeout adequado
# (Gemini Pro é mais lento; Cerebras é quase instantâneo).
PROVIDER_CHAIN = [
    {"provider": "gemini",   "model": "gemini-2.5-pro",    "max_tokens": 8000, "timeout": 120.0},
    {"provider": "gemini",   "model": "gemini-2.5-flash",  "max_tokens": 6500, "timeout": 90.0},
    {"provider": "cerebras", "model": "llama-3.3-70b",     "max_tokens": 4500, "timeout": 60.0},
]

# Endpoints OpenAI-compatíveis e variáveis de ambiente por provedor.
PROVIDER_CONFIG: dict[str, dict[str, str]] = {
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "env": "GEMINI_API_KEY",
    },
    "cerebras": {
        "url": "https://api.cerebras.ai/v1/chat/completions",
        "env": "CEREBRAS_API_KEY",
    },
}

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


def _parse_json_response(raw: str) -> Any:
    """Limpa markdown fencing e faz json.loads. Levanta 502 se inválido."""
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


async def _call_provider(
    provider: str,
    model: str,
    system: str,
    user: str,
    max_tokens: int,
    timeout: float,
) -> httpx.Response:
    """Faz a chamada HTTP para um provedor OpenAI-compatível."""
    config  = PROVIDER_CONFIG[provider]
    api_key = os.getenv(config["env"])
    if not api_key:
        # Esta entrada da cadeia não está configurada; pula.
        return None  # type: ignore[return-value]

    payload = {
        "model":    model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "temperature":     0.25,
        "max_tokens":      max_tokens,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.post(
            config["url"],
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
        )


async def call_ai2(system: str, user: str) -> Any:
    """
    Percorre PROVIDER_CHAIN até obter uma resposta 200 válida.
    Pula entradas sem chave configurada. Cai para o próximo em 429/413/5xx.
    """
    last_error: str | None = None
    tried_any = False

    for attempt, entry in enumerate(PROVIDER_CHAIN):
        provider = entry["provider"]
        model    = entry["model"]

        if not os.getenv(PROVIDER_CONFIG[provider]["env"]):
            print(f"[AI2] {provider}/{model} pulado (env {PROVIDER_CONFIG[provider]['env']} não configurada)")
            continue

        tried_any = True

        if attempt > 0 and last_error:
            print(f"[AI2] {last_error} — aguardando 3s e tentando {provider}/{model}...")
            await asyncio.sleep(3)

        try:
            resp = await _call_provider(
                provider   = provider,
                model      = model,
                system     = system,
                user       = user,
                max_tokens = entry["max_tokens"],
                timeout    = entry["timeout"],
            )
        except httpx.TimeoutException:
            last_error = f"timeout em {provider}/{model}"
            print(f"[AI2] ⏱ {last_error}")
            continue
        except httpx.HTTPError as e:
            last_error = f"erro de rede em {provider}/{model}: {type(e).__name__}"
            print(f"[AI2] ⚠ {last_error}")
            continue

        if resp is None:
            continue

        if resp.status_code == 200:
            print(f"[AI2] ✓ Sucesso com {provider}/{model}")
            data = resp.json()
            try:
                raw = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError):
                last_error = f"resposta malformada de {provider}/{model}"
                print(f"[AI2] ⚠ {last_error}")
                continue
            return _parse_json_response(raw)

        # Rate limit / quota → tenta o próximo da cadeia
        if resp.status_code in (429, 503):
            last_error = f"{resp.status_code} rate-limit em {provider}/{model}"
            print(f"[AI2] {last_error}")
            continue

        # Request muito grande → tenta o próximo (que tem max_tokens menor)
        if resp.status_code == 413:
            last_error = f"413 request-too-large em {provider}/{model}"
            print(f"[AI2] {last_error}")
            continue

        # Erros de autenticação/autorização são específicos da chave,
        # não faz sentido ficar tentando mais daquele provedor.
        if resp.status_code in (401, 403):
            last_error = f"{resp.status_code} autenticação falhou em {provider}/{model}"
            print(f"[AI2] ⚠ {last_error}: {resp.text[:200]}")
            continue

        # Outro erro → loga e tenta o próximo
        last_error = f"{resp.status_code} em {provider}/{model}"
        print(f"[AI2] ⚠ {last_error}: {resp.text[:200]}")
        continue

    if not tried_any:
        raise HTTPException(503, "Serviço de IA não configurado no servidor.")

    # Esgotou a cadeia inteira sem sucesso
    if last_error and "rate-limit" in last_error:
        raise HTTPException(429, "Limite de uso da IA atingido. Aguarde cerca de 1 minuto e tente novamente.")
    raise HTTPException(502, f"Todas as IAs falharam. Último erro: {last_error}.")


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
    waiting = await queue_position_ai2()
    return {
        "waiting":   waiting,
        "max_slots": MAX_CONCURRENT_AI2,
        "busy":      waiting > 0,
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
            if kw: extras.append(f"kw: {', '.join(kw[:4])}")
            sub = p.get("sub_topicos", [])
            if sub: extras.append(f"sub: {', '.join(sub[:4])}")
            form = p.get("formulas_chave", [])
            if form: extras.append(f"fórmulas: {', '.join(form[:3])}")
            anc = p.get("ancora_visual")
            if anc: extras.append(f"visual: {anc}")
            peg = p.get("armadilha")
            if peg: extras.append(f"pegadinha: {peg}")
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

    # Entra na fila global — no máximo MAX_CONCURRENT_AI2 chamadas simultâneas
    # e cooldown de COOLDOWN_SECONDS por usuário
    result = await ai2_call_with_queue(
        user.get("id", "anon"),
        call_ai2(SYS_SHEET, prompt),
    )

    if not result.get("blocos"):
        raise HTTPException(502, "IA não gerou conteúdo válido. Tente novamente.")

    return result
