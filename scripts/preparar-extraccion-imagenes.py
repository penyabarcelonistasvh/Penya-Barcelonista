#!/usr/bin/env python3
"""Simula la externalització d'imatges data URI sense escriure cap fitxer."""
from pathlib import Path
from collections import defaultdict
import base64
import hashlib
import re

root = Path(__file__).resolve().parents[1]
original = (root / "index.html").read_text(encoding="utf-8")
pattern = re.compile(r'''data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+''', re.I)
matches = list(pattern.finditer(original))
unique = {}
groups = defaultdict(list)
for index, match in enumerate(matches, 1):
    uri = match.group()
    header, encoded = uri.split(",", 1)
    binary = base64.b64decode(encoded, validate=True)
    digest = hashlib.sha256(binary).hexdigest()
    ext = header.split("/")[1].split(";")[0].lower().replace("jpeg", "jpg")
    path = f"assets/optimized/embedded-{digest[:16]}.{ext}"
    unique.setdefault(uri, (path, len(binary)))
    groups[path].append(index)

candidate = pattern.sub(lambda m: unique[m.group()][0], original)
assert len(matches) == sum(len(x) for x in groups.values())
assert all(candidate.count(path) == len(indexes) for path, indexes in groups.items())
assert pattern.search(candidate) is None
print(f"Imatges referenciades: {len(matches)}")
print(f"Fitxers únics necessaris: {len(unique)}")
print(f"Referències duplicades eliminables: {len(matches)-len(unique)}")
print(f"HTML original: {len(original.encode('utf-8')):,} bytes")
print(f"HTML simulat: {len(candidate.encode('utf-8')):,} bytes")
print(f"Reducció simulada: {len(original.encode('utf-8'))-len(candidate.encode('utf-8')):,} bytes")
print("Validació: les substitucions apunten a fitxers únics i preserven el nombre de referències.")
print("Mode de prova: NO s'ha escrit cap imatge ni s'ha modificat index.html.")
