#!/usr/bin/env python3
"""Comprovacions estàtiques de regressió PBSV; no modifiquen cap fitxer."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
checks = 0

def check(ok, message):
    global checks
    checks += 1
    if not ok:
        errors.append(message)
    print(("OK  " if ok else "FAIL ") + message)

def read(name):
    p = ROOT / name
    check(p.is_file(), "Existeix " + name)
    return p.read_text(encoding="utf-8") if p.is_file() else ""

index = read("index.html")
check(len(index) >= 50000, "La portada no està truncada")
for token in ("<html", "</html>", "<body", "</body>", "pbsv-news-carousel", "pbsvBell"):
    check(token in index, "Portada conserva " + token)

for name in ("admin.html", "editor-noticies.html", "editor-partits.html",
             "editor-equips.html", "editor-patrocinadors.html",
             "manifest.webmanifest", "pbsv-sw.js", "install-invite.js",
             "news-carousel-enhancement.js", "weekend-matches.js",
             "results-standings.js"):
    read(name)

for name, field in (("noticies.json", "noticias"),
                    ("equips.json", "teams"),
                    ("patrocinadors.json", "sponsors"),
                    ("club.json", "sections")):
    path = ROOT / "data" / name
    check(path.is_file(), "Dades disponibles: " + name)
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            check(isinstance(data.get(field), list), "Format vàlid: " + name)
        except (ValueError, OSError) as exc:
            check(False, "JSON invàlid: " + name + " (" + str(exc) + ")")

for name in ("partits-cap-setmana.json", "proxims-partits.json"):
    path = ROOT / "data" / name
    check(path.is_file(), "Dades de partits disponibles: " + name)
    if path.is_file():
        try:
            check(isinstance(json.loads(path.read_text(encoding="utf-8")), dict),
                  "JSON de partits vàlid: " + name)
        except (ValueError, OSError):
            check(False, "JSON de partits invàlid: " + name)

# Només comprova recursos locals explícits; exclou rutes dinàmiques, dades base64 i URLs externes.
for attr, value in re.findall(r"""\b(src|href)=["']([^"'<>]+)["']""", index, flags=re.I):
    value = value.strip()
    if not value or value.startswith(("#", "data:", "mailto:", "tel:", "//")):
        continue
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or "{" in parsed.path or "}" in parsed.path:
        continue
    local = unquote(parsed.path).removeprefix("./")
    if not local or local.startswith("/") or ".." in Path(local).parts:
        continue
    # No confondre enllaços a rutes SPA amb recursos de fitxer.
    if Path(local).suffix.lower() in (".js", ".css", ".png", ".jpg", ".jpeg", ".svg",
                                      ".webp", ".ico", ".html", ".webmanifest"):
        check((ROOT / local).is_file(), "Recurs local disponible: " + local)

news_js = read("news-carousel-enhancement.js")
check("data/noticies.json" in news_js and "portada!==false" in news_js,
      "El carrusel consumeix notícies publicades i respecta visibilitat")
editor = read("editor-noticies.html")
check("data/noticies.json" in editor and "exportData()" in editor,
      "L'editor de notícies conserva la càrrega i exportació")
publisher = read("publicar-github.js")
check("/api/publish" in publisher and "editor-noticies.html" in publisher,
      "El publicador conserva l'edició de notícies")
install = read("install-invite.js")
check("navigator.standalone" in install and "data-install-help" in install,
      "La invitació d'instal·lació conserva instruccions per a iPhone")
sw = read("pbsv-sw.js")
check("notificationclick" in sw and "showNotification" in sw,
      "El service worker conserva les notificacions")

print(f"\\n{checks} comprovacions, {len(errors)} errors")
if errors:
    sys.exit(1)
