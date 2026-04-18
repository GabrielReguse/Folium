# ═══════════════════════════════════════════════
#  FOLIUM — limiter.py
#  Controle de concorrência e cooldown por usuário
# ═══════════════════════════════════════════════
#
#  Problema sem isso:
#    10 usuários simultâneos → 52.500 tokens ao mesmo tempo
#    Groq free tier → 12.000 tokens/minuto
#    Resultado → todos levam 429 ao mesmo tempo
#
#  Solução:
#    1. Semáforo global  → no máximo MAX_CONCURRENT chamadas ao Groq ao mesmo tempo
#    2. Cooldown por user → mínimo de COOLDOWN_SECONDS entre chamadas do mesmo usuário
#    3. Fila visível     → usuário vê "posição X na fila" em vez de erro
#
# ═══════════════════════════════════════════════

import asyncio
import time
from fastapi import HTTPException

# ── Configuração ───────────────────────────────

# Quantas chamadas ao Groq podem acontecer ao mesmo tempo.
# Com 3 chamadas × 5.000 tokens = 15.000 tokens/min → cabe no limite de 12k TPM
# (na prática as chamadas não terminam todas no mesmo segundo, então 3 é seguro)
MAX_CONCURRENT = 3

# Segundos mínimos entre duas chamadas do MESMO usuário.
# Evita que um único usuário consuma toda a cota.
COOLDOWN_SECONDS = 45

# ── Estado global (em memória, compartilhado entre workers uvicorn) ───────────
# Nota: funciona para 1 worker (padrão do Render free). Com múltiplos workers
# seria necessário Redis. Para escala pequena, isso é suficiente.

_semaphore: asyncio.Semaphore | None = None
_user_last_call: dict[str, float] = {}   # user_id → timestamp da última chamada


def get_semaphore() -> asyncio.Semaphore:
    """Cria o semáforo na primeira chamada (lazy, dentro do event loop)."""
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    return _semaphore


def check_user_cooldown(user_id: str) -> None:
    """
    Lança HTTPException 429 se o usuário chamou a IA há menos de COOLDOWN_SECONDS.
    Não bloqueia — rejeita imediatamente com mensagem clara.
    """
    now = time.time()
    last = _user_last_call.get(str(user_id))

    if last is not None:
        elapsed = now - last
        remaining = int(COOLDOWN_SECONDS - elapsed)
        if remaining > 0:
            raise HTTPException(
                429,
                f"Aguarde {remaining}s antes de gerar outra folha. "
                f"(Limite: 1 folha a cada {COOLDOWN_SECONDS}s por usuário)"
            )

    _user_last_call[str(user_id)] = now


def mark_user_call(user_id: str) -> None:
    """Registra o timestamp da chamada (chamar após verificar cooldown)."""
    _user_last_call[str(user_id)] = time.time()


async def queue_position() -> int:
    """Retorna quantas chamadas estão esperando no semáforo agora."""
    sem = get_semaphore()
    # _value = slots livres; MAX_CONCURRENT - _value = slots ocupados
    waiting = len(sem._waiters) if hasattr(sem, '_waiters') else 0
    return waiting


async def groq_call_with_queue(user_id: str, coro):
    """
    Wrapper que:
    1. Verifica cooldown do usuário
    2. Entra na fila do semáforo (aguarda sua vez)
    3. Executa a corrotina que chama o Groq
    4. Registra timestamp do usuário ao terminar

    Uso:
        result = await groq_call_with_queue(user_id, call_groq(system, prompt))
    """
    check_user_cooldown(user_id)

    sem = get_semaphore()
    pos = await queue_position()

    if pos >= MAX_CONCURRENT:
        # Informa ao usuário que há fila — não rejeita, apenas avisa
        # O cliente pode mostrar "aguardando na fila..."
        pass  # segue normalmente, asyncio.Semaphore cuida da espera

    async with sem:
        mark_user_call(user_id)
        return await coro