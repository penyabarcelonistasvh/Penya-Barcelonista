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
data_uris = re.findall(r"data:image/[^\s\\"'<>)]{20,}", html, re.I)
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
