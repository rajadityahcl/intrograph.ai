"""
Thin wrapper around the official Neo4j Python driver, pointed at CognoDB's
Bolt endpoint. CognoDB speaks openCypher over Bolt 5.0-5.4 and is driver
compatible, so no custom SDK is needed here -- this is exactly the same
driver you'd use against Neo4j itself.

All queries in this app go through `run_query`, which always uses
parameterised Cypher (never string-concatenated queries) and translates
driver-level connectivity failures into a single, predictable
`DatabaseUnavailableError` that the API layer turns into a clean 503
instead of a stack trace.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

from neo4j import Driver, GraphDatabase
from neo4j.exceptions import Neo4jError, ServiceUnavailable, AuthError

from .config import get_settings

logger = logging.getLogger("intrograph.db")

_driver: Driver | None = None


class DatabaseUnavailableError(RuntimeError):
    """Raised whenever the graph database cannot be reached or authenticated."""


def get_driver() -> Driver:
    global _driver
    if _driver is None:
        settings = get_settings()
        _driver = GraphDatabase.driver(
            settings.cognodb_uri,
            auth=(settings.cognodb_user, settings.cognodb_password),
        )
    return _driver


def close_driver() -> None:
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def verify_connectivity() -> tuple[bool, str | None]:
    """Used by the /health endpoint. Never raises."""
    try:
        get_driver().verify_connectivity()
        return True, None
    except Exception as exc:  # noqa: BLE001 - health check must never crash
        logger.warning("CognoDB connectivity check failed: %s", exc)
        return False, str(exc)


@contextmanager
def session() -> Iterator[Any]:
    try:
        with get_driver().session() as s:
            yield s
    except (ServiceUnavailable, AuthError) as exc:
        logger.error("CognoDB unreachable: %s", exc)
        raise DatabaseUnavailableError(str(exc)) from exc


def run_query(query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Run a single parameterised Cypher query and return a list of plain dicts.

    `parameters` are always passed as a driver-level parameter map -- never
    interpolated into the query string -- so user input can never change the
    shape of the query.
    """
    parameters = parameters or {}
    try:
        with session() as s:
            result = s.run(query, parameters)
            return [record.data() for record in result]
    except DatabaseUnavailableError:
        raise
    except Neo4jError as exc:
        logger.error("Cypher query failed: %s", exc)
        raise
    except (ServiceUnavailable, AuthError) as exc:
        raise DatabaseUnavailableError(str(exc)) from exc


def run_write(query: str, parameters: dict[str, Any] | None = None) -> None:
    parameters = parameters or {}
    try:
        with session() as s:
            s.run(query, parameters).consume()
    except (ServiceUnavailable, AuthError) as exc:
        raise DatabaseUnavailableError(str(exc)) from exc
