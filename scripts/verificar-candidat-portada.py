#!/usr/bin/env python3
"""Compara la portada candidata amb l'original, byte a byte, després de restaurar les imatges."""
from pathlib import Path
import base64
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "index.html"
CANDIDATE = ROOT / "dist/portada-optimitzada/index.html"
ASSETS = ROOT / "dist/portada-optimitzada/assets/optimized"
DATA_URI = re.compile(r'''data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+''', re.I)

def main():
    original = ORIGINAL.read_text(encoding="utf-8")
    candidate = CANDIDATE.read_text(encoding="utf-8")
    matches = list(DATA_URI.finditer(original))
    if len(matches) != 15:
        raise SystemExit(f"Nombre d'imatges inesperat: {len(matches)}")
    references = {}
    for match in matches:
        uri = match.group()
        header, encoded = uri.split(",", 1)
        binary = base64.b64decode(encoded, validate=True)
        ext = header.split("/")[1].split(";")[0].lower().replace("jpeg", "jpg")
        name = f"embedded-{hashlib.sha256(binary).hexdigest()[:16]}.{ext}"
        relative = f"assets/optimized/{name}"
        target = ASSETS / name
        if not target.is_file() or target.read_bytes() != binary:
            raise SystemExit(f"Imatge absent o diferent: {relative}")
        references[relative] = uri
    if len(references) != 11:
        raise SystemExit("Nombre de fitxers únics inesperat")
    restored = candidate
    for relative, uri in references.items():
        restored = restored.replace(relative, uri)
    if restored != original:
        raise SystemExit("ERROR: la portada candidata té canvis aliens a les imatges")
    if DATA_URI.search(candidate):
        raise SystemExit("ERROR: queden imatges incrustades")
    print("OK: restaurar les 11 imatges recupera exactament l'HTML original.")
    print("OK: les 15 referències coincideixen i tots els fitxers tenen els bytes originals.")
    print("OK: cap altre fragment HTML, CSS o JavaScript s'ha alterat.")
    print("La portada pública continua sense modificacions.")

if __name__ == "__main__":
    main()
