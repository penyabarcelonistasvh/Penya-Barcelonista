#!/usr/bin/env python3
"""Audita el pes de la portada sense modificar fitxers ni dades."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html_path = ROOT / "index.html"
if not html_path.is_file():
    raise SystemExit("No s'ha trobat index.html")
html = html_path.read_text(encoding="utf-8")
total = html_path.stat().st_size
data_uris = re.findall(r'''data:image/[^\s"'<>)]{20,}''', html, re.I)
inline_scripts = re.findall(r"<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script\s*>", html, re.I | re.S)
inline_styles = re.findall(r"<style\b[^>]*>(.*?)</style\s*>", html, re.I | re.S)
sizes = {
    "Imatges incrustades (data URI)": sum(len(x.encode("utf-8")) for x in data_uris),
    "Scripts en línia": sum(len(x.encode("utf-8")) for x in inline_scripts),
    "Estils en línia": sum(len(x.encode("utf-8")) for x in inline_styles),
}
print(f"Portada: {total:,} bytes ({total / 1024 / 1024:.2f} MiB)")
for name, size in sizes.items():
    print(f"{name}: {size:,} bytes ({size / max(total, 1) * 100:.1f}%)")
print(f"Imatges data URI detectades: {len(data_uris)}")
print(f"Scripts en línia: {len(inline_scripts)}; blocs CSS: {len(inline_styles)}")
print("Nota: les categories poden solapar-se; no se sumen com a parts exclusives.")

# Inventari segur: mida, tipus i ubicació aproximada; mai imprimir dades base64.
print("\nDetall de les imatges incrustades (sense contingut):")
for index, match in enumerate(re.finditer(r'''data:image/[^\s"'<>)]{20,}''', html, re.I), 1):
    uri = match.group()
    mime = uri.split(";", 1)[0].removeprefix("data:")
    line = html.count("\n", 0, match.start()) + 1
    context = html[max(0, match.start() - 220):match.start()].lower()
    location = ("script" if "<script" in context else
                "style" if "<style" in context else
                "atribut o contingut HTML")
    print(f"  {index:02d}. {len(uri):>10,} bytes | {mime[:40]:<18} | línia {line} | {location}")
print("Cap imatge s'ha extret ni modificat.")

# Detectar duplicats exactes amb hash, sense revelar contingut ni modificar recursos.
import hashlib
from collections import defaultdict
groups = defaultdict(list)
for index, match in enumerate(re.finditer(r'''data:image/[^\s"'<>)]{20,}''', html, re.I), 1):
    uri = match.group()
    groups[hashlib.sha256(uri.encode("utf-8")).hexdigest()].append((index, len(uri)))
duplicates = [group for group in groups.values() if len(group) > 1]
print("\nDuplicats exactes per SHA-256:")
if not duplicates:
    print("  Cap duplicat exacte detectat.")
for group in duplicates:
    indexes = ", ".join(f"{i:02d}" for i, _ in group)
    print(f"  Imatges {indexes} | {group[0][1]:,} bytes cadascuna")
print(f"Estalvi teòric de referenciar una sola còpia per grup: {sum((len(g)-1)*g[0][1] for g in duplicates):,} bytes")
