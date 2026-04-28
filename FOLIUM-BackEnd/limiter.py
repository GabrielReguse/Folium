# ═══════════════════════════════════════════════
#  FOLIUM — limiter.py
#  Controle de concorrência e cooldown por usuário
# ═══════════════════════════════════════════════
#
# A IA 1 (tópicos) e a IA 2 (folha) usam fornecedores diferentes e
# portanto têm cotas independentes. Cada uma tem seu próprio semáforo.
#
# IA 1 — Groq Llama 3.3 70B (~12k TPM no free tier)
#   Sem a IA 2 competindo pela cota, 3 chamadas paralelas são seguras.
#
# IA 2 — Gemini 2.5 Pro → Flash → Cerebras 70B
#   Gemini 2.5 Pro é o gargalo: 5 RPM no free tier. Com concorrência de 2 e
#   respostas levando 15-30s, ficamos confortavelmente dentro do limite.
#
# Cooldown por usuário: impede que um único usuário monopolize a cota da
# IA 2 (que é a mais cara/lenta). 30s dá margem para acordar o Render
# (primeiro request demora ~30s) e gerar a próxima folha.


import asyncio
import time
from fastapi import HTTPException

# ── Configuração ───────────────────────────────

MAX_CONCURRENT_AI1 = 3     # IA 1 (tópicos) — Groq
MAX_CONCURRENT_AI2 = 2     # IA 2 (folha)   — Gemini/Cerebras
COOLDOWN_SECONDS   = 30    # mínimo entre duas folhas do mesmo usuário

# Alias mantido para compatibilidade com código externo
MAX_CONCURRENT = MAX_CONCURRENT_AI2

# ── Estado global (em memória) ─────────────────
_sem_ai1: asyncio.Semaphore | None = None
_sem_ai2: asyncio.Semaphore | None = None
_user_last_call: dict[str, float] = {}


def _get_sem_ai1() -> asyncio.Semaphore:
    global _sem_ai1
    if _sem_ai1 is None:
        _sem_ai1 = asyncio.Semaphore(MAX_CONCURRENT_AI1)
    return _sem_ai1


def _get_sem_ai2() -> asyncio.Semaphore:
    global _sem_ai2
    if _sem_ai2 is None:
        _sem_ai2 = asyncio.Semaphore(MAX_CONCURRENT_AI2)
    return _sem_ai2


def check_user_cooldown(user_id: str) -> None:
    """
    Lança HTTPException 429 se o usuário gerou folha há menos de
    COOLDOWN_SECONDS. O timestamp só é registrado dentro do semáforo
    (mark_user_call), para não penalizar quem nem chegou a executar.
    """
    now  = time.time()
    last = _user_last_call.get(str(user_id))

    if last is not None:
        remaining = int(COOLDOWN_SECONDS - (now - last))
        if remaining > 0:
            raise HTTPException(
                429,
                f"Aguarde {remaining}s antes de gerar outra folha. "
                f"(Limite: 1 folha a cada {COOLDOWN_SECONDS}s por usuário)"
            )


def mark_user_call(user_id: str) -> None:
    """Registra timestamp (chamado após entrar no semáforo da IA 2)."""
    _user_last_call[str(user_id)] = time.time()


async def queue_position_ai2() -> int:
    """Retorna quantas requisições esperam no semáforo da IA 2."""
    sem     = _get_sem_ai2()
    waiters = getattr(sem, '_waiters', None)
    return len(waiters) if waiters else 0


# Alias mantido para compatibilidade
async def queue_position() -> int:
    return await queue_position_ai2()


async def ai2_call_with_queue(user_id: str, coro):
    """
    IA 2 (geração da folha) — aplica cooldown + semáforo próprio.
    Verifica cooldown ANTES da fila para falhar rápido.
    Registra timestamp DENTRO do semáforo, só após garantir execução.
    """
    check_user_cooldown(user_id)

    async with _get_sem_ai2():
        mark_user_call(user_id)
        return await coro


async def ai1_call(coro):
    """
    IA 1 (curadoria de tópicos) — sem cooldown por usuário.
    Usa semáforo próprio para não sobrecarregar o Groq.
    """
    async with _get_sem_ai1():
        return await coro


# Aliases mantidos para compatibilidade com código legado
groq_call_with_queue = ai2_call_with_queue
groq_topics_call     = ai1_call
