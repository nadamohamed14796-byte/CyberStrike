#!/usr/bin/env python3
"""Structural audit of .cyberstrike/skill/ SKILL.md corpus.
Checks: frontmatter completeness, duplicate skill names, dangling
chains_with references, lowercase-named skill.md files (loader risk),
and files: references that don't exist on disk.
"""
import os, re, sys, json, argparse
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description="Audit CyberStrike SKILL.md metadata and references.")
parser.add_argument("--root", type=Path, default=REPO_ROOT / ".cyberstrike" / "skill")
parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "skill_audit_raw_results.json")
args = parser.parse_args()
ROOT = args.root.resolve()
OUT = args.output.resolve()

def parse_frontmatter(text):
    m = re.match(r'^---\n(.*?)\n---\n', text, re.DOTALL)
    if not m:
        return None, text
    fm_text = m.group(1)
    rest = text[m.end():]
    # minimal YAML parse (flat keys + simple lists)
    data = {}
    lines = fm_text.split('\n')
    i = 0
    cur_key = None
    while i < len(lines):
        line = lines[i]
        if re.match(r'^\s+-\s', line) and cur_key:
            data.setdefault(cur_key, [])
            if isinstance(data[cur_key], list):
                data[cur_key].append(line.strip('- ').strip())
            i += 1
            continue
        km = re.match(r'^([A-Za-z_]+):\s*(.*)$', line)
        if km:
            key, val = km.group(1), km.group(2).strip()
            cur_key = key
            if val == '':
                data[key] = []  # likely a following list
            elif val.startswith('[') and val.endswith(']'):
                inner = val[1:-1]
                data[key] = [x.strip() for x in inner.split(',') if x.strip()]
            else:
                data[key] = val
        i += 1
    return data, rest

skill_files = []
misnamed_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    for fn in filenames:
        if fn.lower() == 'skill.md':
            full_path = os.path.join(dirpath, fn)
            skill_files.append(full_path)
            if fn != 'SKILL.md':
                misnamed_files.append(os.path.relpath(full_path, REPO_ROOT))

print(f"Total SKILL.md files found: {len(skill_files)}")
print(f"Misnamed skill.md files found: {len(misnamed_files)}")

REQUIRED_FIELDS = ['name', 'description', 'category']
names_seen = defaultdict(list)
missing_fm = []
missing_fields = defaultdict(list)
all_names = set()
records = {}

for path in skill_files:
    rel = os.path.relpath(path, REPO_ROOT)
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception as e:
        missing_fm.append((rel, f"read error: {e}"))
        continue
    fm, body = parse_frontmatter(text)
    if fm is None:
        missing_fm.append((rel, "no frontmatter block"))
        continue
    records[rel] = fm
    name = fm.get('name')
    if name:
        names_seen[name].append(rel)
        all_names.add(name)
    for field in REQUIRED_FIELDS:
        if field not in fm or not fm[field]:
            missing_fields[field].append(rel)

# Duplicate names
dupes = {n: paths for n, paths in names_seen.items() if len(paths) > 1}

# Dangling chains_with references
dangling = []
for rel, fm in records.items():
    chains = fm.get('chains_with', [])
    if isinstance(chains, str):
        chains = [chains]
    for target in chains:
        target = target.strip()
        if target and target not in all_names:
            dangling.append((rel, target))

# files: references that don't exist
bad_files_refs = []
for rel, fm in records.items():
    files_field = fm.get('files', [])
    if isinstance(files_field, str):
        files_field = [files_field]
    skill_dir = os.path.dirname(rel)
    for fref in files_field:
        fref = fref.strip()
        if not fref:
            continue
        full = os.path.join(str(REPO_ROOT), skill_dir, fref)
        if not os.path.exists(full):
            bad_files_refs.append((rel, fref))

print(f"\nMissing/unparseable frontmatter: {len(missing_fm)}")
for r, reason in missing_fm[:20]:
    print(f"  {r}: {reason}")

print(f"\nMissing required fields:")
for field, paths in missing_fields.items():
    print(f"  {field}: {len(paths)} files missing")
    for p in paths[:5]:
        print(f"    - {p}")

print(f"\nDuplicate skill names: {len(dupes)}")
for n, paths in list(dupes.items())[:20]:
    print(f"  '{n}': {len(paths)} occurrences")
    for p in paths:
        print(f"    - {p}")

print(f"\nDangling chains_with references: {len(dangling)}")
for rel, target in dangling[:30]:
    print(f"  {rel} -> '{target}' (not found)")

print(f"\nBad files: references: {len(bad_files_refs)}")
for rel, fref in bad_files_refs[:20]:
    print(f"  {rel} -> files: [{fref}] (missing on disk)")

# Save full results to JSON for the report
out = {
    "total_skill_md": len(skill_files),
    "missing_frontmatter": missing_fm,
    "missing_fields": {k: v for k, v in missing_fields.items()},
    "duplicate_names": dupes,
    "dangling_chains_with": dangling,
    "bad_files_refs": bad_files_refs,
    "misnamed_files": sorted(misnamed_files),
}
OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
print(f"\nFull results written to {OUT}")
