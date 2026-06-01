"""
Redis-кэш для ML-инференса.

Использование:
    from cache import redis_cache

    @redis_cache(name="ml:yield", ttl_seconds=86400)
    def predict_yield(...): ...

Особенности:
  - Ключ строится из имени функции + JSON-сериализации позиционных и именованных аргументов
    (с сортировкой ключей для детерминизма) + sha256.
  - Значение сериализуется в JSON (для типичных pydantic/dict/list/float ответов).
    Если требуется кэшировать numpy/dataframe, использовать pickle-режим.
  - Graceful degradation: если Redis недоступен — функция выполняется без кэша,
    в лог пишется WARN (но не на каждый вызов, а раз в 30 сек).
  - Префикс ключей: ``agro:ml:<name>:<sha>``.
"""

from __future__ import annotations

import functools
import hashlib
import json
import logging
import os
import time
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
_REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
_REDIS_DB = int(os.getenv("REDIS_DB", "0"))
_KEY_PREFIX = "agro:ml:"

# Один общий клиент на процесс. Подключение ленивое, при первой операции.
_client: Optional[Any] = None
_last_warn_ts: float = 0.0


def _get_client():
    """Ленивая инициализация Redis-клиента."""
    global _client
    if _client is not None:
        return _client
    try:
        import redis  # type: ignore
        _client = redis.Redis(
            host=_REDIS_HOST,
            port=_REDIS_PORT,
            db=_REDIS_DB,
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=False,  # храним bytes (JSON)
        )
        # Не пингуем здесь — пусть упадёт на первой операции и graceful degrade.
        return _client
    except ImportError:
        logger.warning("redis-py не установлен — кэш отключён")
        return None


def _warn_throttled(msg: str) -> None:
    """Логирует WARN не чаще раза в 30 секунд (чтобы не засорять при недоступности Redis)."""
    global _last_warn_ts
    now = time.time()
    if now - _last_warn_ts > 30:
        logger.warning(msg)
        _last_warn_ts = now


def _normalize(value: Any) -> Any:
    """Рекурсивно преобразовать pydantic-объекты в dict для детерминированной сериализации."""
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return {k: _normalize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_normalize(v) for v in value]
    return value


def _build_key(name: str, args: tuple, kwargs: dict) -> str:
    """Детерминированный ключ из имени и аргументов."""
    norm_args = [_normalize(a) for a in args]
    norm_kwargs = {k: _normalize(v) for k, v in kwargs.items()}
    try:
        payload = json.dumps([norm_args, sorted(norm_kwargs.items())], sort_keys=True, default=str)
    except (TypeError, ValueError):
        payload = repr((norm_args, sorted(norm_kwargs.items())))
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]
    return f"{_KEY_PREFIX}{name}:{digest}"


def redis_cache(name: str, ttl_seconds: int = 3600) -> Callable:
    """
    Декоратор: кэширует возвращаемое JSON-сериализуемое значение функции в Redis.

    :param name: логическое имя кэша (используется в ключе и для дебаггинга).
    :param ttl_seconds: TTL в секундах.
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            client = _get_client()
            if client is None:
                return fn(*args, **kwargs)

            key = _build_key(name, args, kwargs)

            # 1. Попытка чтения из кэша
            try:
                raw = client.get(key)
                if raw is not None:
                    try:
                        return json.loads(raw)
                    except (TypeError, ValueError) as e:
                        logger.warning("Cache hit '%s' но JSON broken: %s — пересчитываем", name, e)
            except Exception as e:
                _warn_throttled(f"Redis GET failed for cache='{name}': {e}")

            # 2. Вычисление
            result = fn(*args, **kwargs)

            # 3. Сохранение
            try:
                # pydantic.BaseModel → dict через model_dump(); остальное — как есть
                if hasattr(result, "model_dump"):
                    serializable = result.model_dump()
                else:
                    serializable = result
                payload = json.dumps(serializable, default=str)
                client.setex(key, ttl_seconds, payload)
            except Exception as e:
                _warn_throttled(f"Redis SET failed for cache='{name}': {e}")

            return result

        return wrapper
    return decorator
