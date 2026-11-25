#!/usr/bin/env python3
"""Read-only preflight for a NEW club, never for deploying PBSV itself."""
import argparse
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
RULES = {
    "repositori original": r"penyabarcelonistasvh|cristiangarciajura",
    "serveis Cloudflare originals": r"\bpbsv-(?:admin(?:-db)?|push|notificacions)\b",
    "bases D1 originals": r"524a30f0-b842-45b4-ad05-f3948f281601|72cfee2a-b047-43f9-8834-5e605b413bbf",
    "clau publica Turnstile original": r"0x4AAAAAAF-mcLi7GeJKKQC0",
    "clau publica VAPID original": r"BJjGnlbUUGYW8xz6yFsuES4uQgmC9Qy3ooP-xUEb54zPKF_2OnTRfuRRvwS3eoZkM_rGNBFKLo6T-3F2l2YRcxs",
}
EXTENSIONS = {".js", ".mjs", ".html", ".json", ".toml", ".yaml", ".yml", ".py", ".sql", ".webmanifest", ".css", ".svg", ".sh", ".md", ".txt"}
SELF = "scripts/validar-nou-club.py"

def scan(root):
    raw = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=root)
    hits = []
    for name in sorted(set(raw.decode("utf-8").split("\0"))):
        if not name or name == SELF:
            continue
        path = root / name
        if path.suffix.lower() not in EXTENSIONS or not path.is_file() or path.is_symlink():
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            for label, pattern in RULES.items():
                if re.search(pattern, line, re.IGNORECASE):
                    hits.append((name, number, label))
    return hits

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=pathlib.Path, default=ROOT)
    args = parser.parse_args()
    hits = scan(args.root.resolve())
    for name, number, label in hits:
        print(f"{name}:{number}: {label}")
    if hits:
        print(f"BLOQUEIG: {len(hits)} coincidencies. Revisar abans de desplegar un club nou.")
        return 1
    print("OK: no s'han trobat les referencies originals conegudes. Cal validar secrets i recursos externs manualment.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
