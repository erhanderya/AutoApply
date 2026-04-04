from __future__ import annotations

from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


CONFIG_DIR = Path(__file__).resolve().parent / "config"


@lru_cache(maxsize=1)
def _load_yaml(filename: str) -> dict[str, Any]:
    with (CONFIG_DIR / filename).open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    if not isinstance(payload, dict):
        raise RuntimeError(f"Invalid YAML config: {filename}")
    return payload


def get_agent_config(name: str) -> dict[str, Any]:
    config = _load_yaml("agents.yaml").get(name)
    if not isinstance(config, dict):
        raise RuntimeError(f"Agent config not found: {name}")
    return deepcopy(config)


def get_task_config(name: str) -> dict[str, Any]:
    config = _load_yaml("tasks.yaml").get(name)
    if not isinstance(config, dict):
        raise RuntimeError(f"Task config not found: {name}")
    return deepcopy(config)
