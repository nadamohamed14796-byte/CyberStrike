#!/usr/bin/env python3
"""Inspection adapter; the TypeScript registry is canonical."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent
CONFIG=ROOT/"config"/"skills.yaml"
def names():
    text=CONFIG.read_text(encoding="utf-8") if CONFIG.exists() else ""
    return re.findall(r"^  ([A-Za-z0-9_-]+):\s*$",text,re.M)
if __name__=="__main__":
    print("\n".join(names()))
