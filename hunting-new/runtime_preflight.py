#!/usr/bin/env python3
"""Operator preflight adapter; CyberStrike remains the execution runtime."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parent
def check():
    required=[ROOT/"AGENTS.md",ROOT/"config"/"scope.yaml",ROOT/"config"/"skills.yaml",ROOT/"runtime"/"registry"/"registry.json"]
    missing=[str(p) for p in required if not p.exists()]
    return {"ok":not missing and shutil.which("cyberstrike") is not None,"missing":missing}
if __name__=="__main__":
    result=check()
    print(result)
