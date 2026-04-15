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

CAMPO "rotulo" — OBRIGATÓRIO dentro de "exemplo". Escolha o mais adequado:
- "💡 Exemplo Resolvido" → quando tem cálculo ou processo passo a passo
- "📋 Tabela Comparativa" → quando é uma tabela de comparação
- "🔢 Fórmulas-chave" → quando a lista contém fórmulas ou equações
- "📝 Passo a Passo" → quando a lista mostra etapas de um processo
- "📌 Características" → quando a lista enumera propriedades ou atributos
- "📊 Dados e Valores" → quando a tabela mostra dados numéricos/estatísticos

TIPO "pratico" → use para tópicos com fórmula ou processo calculável.
FORMATO EXATO:
  "exemplo": {"tipo": "pratico", "rotulo": "💡 Exemplo Resolvido", "texto": "string com dados reais → cálculo passo a passo → resultado numérico"}
REGRA: "texto" NÃO pode ser vazio, genérico ou placeholder.
EXEMPLO CORRETO: "texto": "Triângulo com cateto oposto = 4 e hipotenusa = 5. sen(θ) = 4/5 = 0,8 → θ = arcsen(0,8) ≈ 53,13°"
EXEMPLO ERRADO: "texto": "Contexto prático de aplicação do conceito"

TIPO "tabela" → use para tópicos comparativos ou com múltiplos atributos.
FORMATO EXATO:
  "exemplo": {"tipo": "tabela", "rotulo": "📋 Tabela Comparativa", "colunas": ["Col A", "Col B", "Col C"], "linhas": [["v1","v2","v3"], ["v4","v5","v6"]]}
REGRA: "colunas" = array de strings. "linhas" = array de arrays de strings. Valores REAIS e específicos.
EXEMPLO CORRETO de colunas: ["Ângulo", "seno", "cosseno", "tangente"]
EXEMPLO CORRETO de linhas: [["30°","0,50","0,87","0,58"],["45°","0,71","0,71","1,00"],["60°","0,87","0,50","1,73"]]
EXEMPLO ERRADO de itens: ["Contexto prático de aplicação", "Relação com outros temas"]

TIPO "lista" → use para enumerações, passos, fórmulas derivadas.
FORMATO EXATO:
  "exemplo": {"tipo": "lista", "rotulo": "🔢 Fórmulas-chave", "itens": ["item 1 com dado real", "item 2 com dado real"]}
REGRA: cada item = string com conteúdo real e específico. NUNCA genérico.
EXEMPLO CORRETO: "itens": ["sen²(x) + cos²(x) = 1", "1 + tan²(x) = sec²(x)", "1 + cot²(x) = csc²(x)"]
EXEMPLO ERRADO: "itens": ["Contexto prático de aplicação do conceito", "Relação com outros temas da área"]

══════════════════════════════════
CAMPO "visual" — OBRIGATÓRIO quando o tópico se encaixa nos gatilhos abaixo
══════════════════════════════════
REGRA GERAL: se o tópico tem uma representação visual óbvia e útil, o campo "visual" é OBRIGATÓRIO.
Se não houver nenhum gatilho aplicável (ex: tópico puramente histórico ou definitório sem dados), omita.

━━ GATILHOS — quando o tópico for sobre: ━━

GRÁFICO DE PIZZA / CIRCULAR / PROPORÇÕES / PORCENTAGENS / COMPOSIÇÃO
  → OBRIGATÓRIO "grafico_pizza" com dados reais do tópico
  → Exemplos de gatilho: "gráfico circular", "gráfico de pizza", "composição do ar", "macronutrientes", "distribuição percentual"
  "visual": {"tipo": "grafico_pizza", "dados": {"titulo": "Título descritivo", "labels": ["Cat A","Cat B","Cat C"], "valores": [45, 30, 25]}}
  REGRA: valores representam proporção real. Use dados do próprio exemplo ou dados clássicos do tema.

GRÁFICO DE BARRAS / COMPARAÇÃO ENTRE CATEGORIAS / HISTOGRAMA
  → OBRIGATÓRIO "grafico_barras" com categorias e valores reais
  → Exemplos de gatilho: "gráfico de barras", "histograma", "comparação de frequências", "dados estatísticos"
  "visual": {"tipo": "grafico_barras", "dados": {"titulo": "Título", "labels": ["A","B","C"], "datasets": [{"label": "Série", "valores": [10, 25, 15]}]}}

FUNÇÕES MATEMÁTICAS / TRIGONOMETRIA / CURVAS / GRÁFICOS CARTESIANOS
  → OBRIGATÓRIO "grafico_funcao" com expressão JS válida
  → Exemplos de gatilho: seno, cosseno, tangente, parábola, função linear, exponencial, logarítmica, módulo
  "visual": {"tipo": "grafico_funcao", "dados": {"label": "f(x) = sen(x)", "funcao": "Math.sin(x)", "dominio": [-6.28, 6.28]}}
  FUNÇÕES JS VÁLIDAS: Math.sin(x), Math.cos(x), Math.tan(x), Math.sqrt(x), Math.pow(x,2),
                      Math.log(x), Math.abs(x), Math.exp(x), x*x, 2*x+1, Math.PI, Math.E

GEOMETRIA / TRIÂNGULOS / ÂNGULOS / VETORES / FIGURAS PLANAS
  → OBRIGATÓRIO "svg" com diagrama preciso e coordenadas exatas
  → Exemplos de gatilho: triângulo retângulo, ângulos, circunferência, polígono, vetor
  "visual": {"tipo": "svg", "codigo": "<svg viewBox=\"0 0 220 170\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>"}
  Use APENAS: line, polygon, circle, rect, text. stroke="#964B00" fill="#F9F5F0" ou fill="none"
  COORDENADAS EXATAS — calcule os vértices matematicamente antes de escrever.

BIOLOGIA / ANATOMIA / ORGANISMOS / ESTRUTURAS CELULARES / MAPAS / QUÍMICA ESTRUTURAL / EVENTOS HISTÓRICOS
  → OBRIGATÓRIO "imagem_wiki" com termo de busca específico
  → Exemplos de gatilho: mitose, organelas, fotossíntese, sistema digestório, mapa geográfico, estrutura molecular
  "visual": {"tipo": "imagem_wiki", "busca": "termo específico de 3-5 palavras em português ou inglês"}
  TERMO BOM: "mitose celular fases diagrama", "cloroplasto estrutura", "sistema digestório humano"
  TERMO RUIM: "célula", "biologia", "organismo"
  NÃO USE para: conceitos abstratos sem imagem visual clara (ex: "homeostase", "evolução")

══════════════════════════════════
FORMATO FINAL — JSON VÁLIDO, SEM MARKDOWN
══════════════════════════════════
{
  "blocos": [
    {
      "titulo": "Nome exato do tópico",
      "explicacao": "Explicação densa e específica. 6-8 linhas adaptadas ao nível. Com fórmula se existir.",
      "dica_prova": "frase ESPECÍFICA ao tópico — formato: Cai em: [questão concreta]. Cuidado: [erro real]. EXEMPLOS: 'Cai em: calcular hipotenusa dados 2 catetos. Cuidado: esquecer de tirar raiz.' ou 'Cai em: identificar a fase da mitose por imagem. Cuidado: confundir prófase com telófase.'",
      "exemplo": {
        "tipo": "pratico",
        "rotulo": "💡 Exemplo Resolvido",
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