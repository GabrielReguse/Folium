import asyncio
import time
from fastapi import HTTPException

MAX_CONCURRENT_AI1 = 3
MAX_CONCURRENT_AI2 = 2
COOLDOWN_SECONDS = 30

MAX_CONCURRENT = MAX_CONCURRENT_AI2

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
    now = time.time()
    last = _user_last_call.get(str(user_id))

    if last is not None:
        remaining = int(COOLDOWN_SECONDS - (now - last))
        if remaining > 0:
            raise HTTPException(
                429,
                f"Aguarde {remaining}s antes de gerar outra folha. "
                f"(Limite: 1 folha a cada {COOLDOWN_SECONDS}s por usuário)",
            )


def mark_user_call(user_id: str) -> None:
    """Registra timestamp (chamado após entrar no semáforo da IA 2)."""
    _user_last_call[str(user_id)] = time.time()


async def queue_position_ai2() -> int:
    """Retorna quantas requisições esperam no semáforo da IA 2."""
    sem = _get_sem_ai2()
    waiters = getattr(sem, "_waiters", None)
    return len(waiters) if waiters else 0


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


groq_call_with_queue = ai2_call_with_queue
groq_topics_call = ai1_call
