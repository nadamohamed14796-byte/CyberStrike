#!/usr/bin/env python3
"""Fail-closed static/runtime preflight for the CyberStrike Hunting Layer."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
CONFIG_FILES = (
    "agents.yaml",
    "policies.yaml",
    "scope.yaml",
    "skills.yaml",
    "sources.yaml",
    "reference-sources.yaml",
)
REQUIRED_ADAPTERS = ("session", "agents", "skills", "browser", "mcp")
REQUIRED_AGENT_PROFILES = ("recon", "javascript", "api", "authorization", "verifier", "reporter")
REQUIRED_TRUE_POLICIES = (
    "require_provenance",
    "require_scope_gate",
    "require_authorization_gate",
    "require_rate_limit_gate",
    "require_risk_gate",
    "never_store_secrets",
)


def _inside_repo(relative: str) -> Path | None:
    if not isinstance(relative, str) or not relative.strip():
        return None
    candidate = (REPO / relative).resolve()
    if not candidate.is_relative_to(REPO.resolve()):
        return None
    return candidate


def _has_scalar(text: str, key: str, value: str) -> bool:
    return re.search(
        rf"^\s*{re.escape(key)}:\s*{re.escape(value)}\s*(?:#.*)?$",
        text,
        re.MULTILINE,
    ) is not None


def check(require_runtime: bool = True) -> dict[str, Any]:
    errors: list[str] = []
    missing = [str(ROOT / "AGENTS.md")] if not (ROOT / "AGENTS.md").is_file() else []
    for name in CONFIG_FILES:
        if not (ROOT / "config" / name).is_file():
            missing.append(str(ROOT / "config" / name))
    if missing:
        errors.extend("missing-required-file:" + item for item in missing)

    registry_path = ROOT / "runtime" / "registry" / "registry.json"
    registry: dict[str, Any] = {}
    if not registry_path.is_file():
        errors.append("missing-runtime-registry:" + str(registry_path))
    else:
        try:
            loaded = json.loads(registry_path.read_text(encoding="utf-8"))
            if not isinstance(loaded, dict):
                raise ValueError("registry root must be an object")
            registry = loaded
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            errors.append("invalid-runtime-registry:" + str(exc))

    if registry:
        if registry.get("runtime") != "cyberstrike":
            errors.append("unsupported-runtime:" + str(registry.get("runtime")))
        adapters = registry.get("adapters")
        for name in REQUIRED_ADAPTERS:
            if not isinstance(adapters, dict) or not adapters.get(name):
                errors.append("missing-adapter:" + name)

        for group in ("hunting_layer", "entrypoints"):
            entries = registry.get(group)
            if not isinstance(entries, dict) or not entries:
                errors.append("missing-registry-group:" + group)
                continue
            for name, value in entries.items():
                target = _inside_repo(value)
                if target is None or not target.is_file():
                    errors.append(f"broken-registry-link:{group}:{name}:{value}")

        package_rel = registry.get("runtime_package")
        package_dir = _inside_repo(package_rel)
        package_json = package_dir / "package.json" if package_dir else None
        if package_json is None or not package_json.is_file():
            errors.append("missing-runtime-package:" + str(package_rel))
        else:
            try:
                package = json.loads(package_json.read_text(encoding="utf-8"))
                if registry.get("version") and package.get("version") and registry["version"] != package["version"]:
                    errors.append(f"runtime-version-mismatch:{registry['version']}!={package['version']}")
            except (OSError, json.JSONDecodeError) as exc:
                errors.append("invalid-runtime-package:" + str(exc))

    agents_path = ROOT / "config" / "agents.yaml"
    agent_ids: list[str] = []
    if agents_path.is_file():
        agents_text = agents_path.read_text(encoding="utf-8")
        agent_ids = re.findall(r"^\s+agent_id:\s*([A-Za-z0-9_-]+)\s*$", agents_text, re.MULTILINE)
        for profile in REQUIRED_AGENT_PROFILES:
            if not re.search(rf"^  {re.escape(profile)}:\s*$", agents_text, re.MULTILINE):
                errors.append("missing-agent-profile:" + profile)
        if not agent_ids:
            errors.append("missing-agent-ids")
        agent_file = REPO / "packages" / "cyberstrike" / "src" / "agent" / "agent.ts"
        if not agent_file.is_file():
            errors.append("missing-agent-runtime:" + str(agent_file))
        else:
            agent_source = agent_file.read_text(encoding="utf-8")
            for agent_id in agent_ids:
                if f'"{agent_id}": {{' not in agent_source:
                    errors.append("unknown-runtime-agent:" + agent_id)

    policies_text = (ROOT / "config" / "policies.yaml").read_text(encoding="utf-8") if (ROOT / "config" / "policies.yaml").is_file() else ""
    for key in REQUIRED_TRUE_POLICIES:
        if not _has_scalar(policies_text, key, "true"):
            errors.append("unsafe-or-missing-policy:" + key)
    if not _has_scalar(policies_text, "rewrite_skills", "false"):
        errors.append("unsafe-or-missing-policy:rewrite_skills")

    scope_text = (ROOT / "config" / "scope.yaml").read_text(encoding="utf-8") if (ROOT / "config" / "scope.yaml").is_file() else ""
    if not _has_scalar(scope_text, "unknown_target", "block"):
        errors.append("unsafe-or-missing-scope-policy:unknown_target")

    research_text = (ROOT / "config" / "sources.yaml").read_text(encoding="utf-8") if (ROOT / "config" / "sources.yaml").is_file() else ""
    if not re.search(r"^\s+enabled:\s*true\s*$", research_text, re.MULTILINE):
        errors.append("missing-enabled-research-source")

    reference_text = (ROOT / "config" / "reference-sources.yaml").read_text(encoding="utf-8") if (ROOT / "config" / "reference-sources.yaml").is_file() else ""
    if not re.search(r"^\s+url:\s*https?://\S+\s*$", reference_text, re.MULTILINE):
        errors.append("missing-reference-source-url")

    runtime_available = shutil.which("cyberstrike") is not None
    if require_runtime and not runtime_available:
        errors.append("cyberstrike-cli-not-found")

    return {
        "ok": not errors,
        "mode": "runtime" if require_runtime else "static",
        "runtime_available": runtime_available,
        "errors": errors,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--static", action="store_true", help="validate repository wiring without requiring an installed CyberStrike CLI")
    args = parser.parse_args()
    result = check(require_runtime=not args.static)
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["ok"] else 1)
