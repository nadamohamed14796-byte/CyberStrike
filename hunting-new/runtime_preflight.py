#!/usr/bin/env python3
"""Static/runtime preflight for the CyberStrike hunting integration."""
from pathlib import Path
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
REQUIRED_CONFIG = ("agents.yaml", "policies.yaml", "scope.yaml", "skills.yaml", "sources.yaml", "reference-sources.yaml")


def check(static_only=False):
    missing = [str(ROOT / "config" / name) for name in REQUIRED_CONFIG if not (ROOT / "config" / name).is_file()]
    registry_path = ROOT / "runtime" / "registry" / "registry.json"
    registry_errors = []
    registry = {}
    if not registry_path.is_file():
        registry_errors.append("missing-runtime-registry")
    else:
        try:
            registry = json.loads(registry_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            registry_errors.append("invalid-runtime-registry: " + str(exc))
    if registry:
        if registry.get("runtime") != "cyberstrike":
            registry_errors.append("unsupported-runtime")
        package_rel = registry.get("runtime_package")
        if not package_rel:
            registry_errors.append("missing-runtime-package")
        elif not (REPO / package_rel / "package.json").is_file():
            registry_errors.append("missing-runtime-package-file: " + package_rel)
        for group in ("hunting_layer", "entrypoints"):
            for name, target in (registry.get(group) or {}).items():
                if not (REPO / target).is_file():
                    registry_errors.append("missing-" + group + "-target: " + name + ": " + target)
        for key in ("session", "agents", "skills", "browser", "mcp"):
            if not (registry.get("adapters") or {}).get(key):
                registry_errors.append("missing-adapter: " + key)
    policies_path = ROOT / "config" / "policies.yaml"
    policies = policies_path.read_text(encoding="utf-8") if policies_path.is_file() else ""
    for key in ("require_provenance", "require_scope_gate", "require_authorization_gate",
                "require_rate_limit_gate", "require_risk_gate", "never_store_secrets"):
        if not any(line.strip() == key + ": true" for line in policies.splitlines()):
            registry_errors.append("unsafe-policy: " + key)
    if not any(line.strip() == "rewrite_skills: false" for line in policies.splitlines()):
        registry_errors.append("unsafe-policy: rewrite_skills")
    scope_path = ROOT / "config" / "scope.yaml"
    scope_text = scope_path.read_text(encoding="utf-8") if scope_path.is_file() else ""
    if not any(line.strip() == "unknown_target: block" for line in scope_text.splitlines()):
        registry_errors.append("unsafe-policy: unknown_target")
    runtime_available = shutil.which("cyberstrike") is not None
    return {"ok": not missing and not registry_errors and (static_only or runtime_available),
            "missing": missing, "registry_errors": registry_errors,
            "runtime_available": runtime_available, "static_only": static_only}


if __name__ == "__main__":
    result = check(static_only="--static" in sys.argv[1:])
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["ok"] else 1)
