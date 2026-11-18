#!/usr/bin/env python3
"""Genera una versió candidata en dist/; mai modifica la portada publicada."""
from pathlib import Path
from collections import defaultdict
import base64
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "index.html"
OUT = ROOT / "dist" / "portada-optimitzada"
ASSETS = OUT / "assets" / "optimized"
PATTERN = re.compile(r'''data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+''', re.I)

def main():
    original = SOURCE.read_text(encoding="utf-8")
    matches = list(PATTERN.finditer(original))
    if len(matches) != 15:
        raise SystemExit(f"Seguretat: s'esperaven 15 imatges, detectades {len(matches)}")
    mapping = {}
    payloads = {}
    references = defaultdict(int)
    for match in matches:
        uri = match.group()
        header, encoded = uri.split(",", 1)
        data = base64.b64decode(encoded, validate=True)
        digest = hashlib.sha256(data).hexdigest()
        ext = header.split("/")[1].split(";")[0].lower().replace("jpeg", "jpg")
        relative = f"assets/optimized/embedded-{digest[:16]}.{ext}"
        if relative in payloads and payloads[relative] != data:
            raise SystemExit("Col·lisió de nom d'imatge")
        payloads[relative] = data
        mapping[uri] = relative
        references[relative] += 1
    if len(payloads) != 11:
        raise SystemExit(f"Seguretat: s'esperaven 11 imatges úniques, detectades {len(payloads)}")
    candidate = PATTERN.sub(lambda m: mapping[m.group()], original)
    if PATTERN.search(candidate):
        raise SystemExit("Queden imatges incrustades sense substituir")
    if len(candidate.encode("utf-8")) >= 100_000:
        raise SystemExit("El fitxer resultant supera el llindar previst")
    for relative, count in references.items():
        if candidate.count(relative) != count:
            raise SystemExit(f"Nombre de referències inesperat: {relative}")
    if not all(marker in candidate.lower() for marker in ("<!doctype html", "<html", "<head", "</head>", "<body", "</body>", "</html>")):
        raise SystemExit("Estructura HTML incompleta")
    ASSETS.mkdir(parents=True, exist_ok=True)
    for relative, data in payloads.items():
        destination = OUT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        if hashlib.sha256(destination.read_bytes()).digest() != hashlib.sha256(data).digest():
            raise SystemExit(f"Imatge no verificada: {relative}")
    (OUT / "index.html").write_text(candidate, encoding="utf-8")
    print(f"Portada original: {len(original.encode('utf-8')):,} bytes")
    print(f"Portada candidata: {len(candidate.encode('utf-8')):,} bytes")
    print(f"Imatges exportades i verificades: {len(payloads)}")
    print(f"Referències conservades: {len(matches)}")
    print("ATENCIÓ: artefacte de prova; no s'ha publicat ni s'ha modificat index.html.")

if __name__ == "__main__":
    main()
