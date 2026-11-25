#!/usr/bin/env python3
"""Create an offline staging skeleton, not a deployable club."""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Only reviewed structural resources; no HTML, branding, workflows or media.
FILES = (
    "admin-shared.css",
    "club-contact.css",
    "club-history.css",
    "club-honours.css",
    "home-quick-links.css",
    "install-invite.css",
    "news-carousel-enhancement.css",
    "weekend-matches.css",
    "cloudflare/migrations/0001_admin_users.sql",
    "cloudflare/migrations/0002_admin_credentials.sql",
    "cloudflare/push-schema.sql",
)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    dest = args.destination.resolve()
    if dest.exists() or dest == ROOT or ROOT in dest.parents:
        parser.error("Use a new directory outside the source repository")
    for name in FILES:
        source = ROOT / name
        if not source.is_file() or source.is_symlink() or ROOT not in source.resolve().parents:
            parser.error("Missing or unsafe source: " + name)
    subprocess.run([sys.executable, str(ROOT / "scripts/preparar-dades-nou-club.py"), str(dest)], check=True)
    for name in FILES:
        target = dest / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    (dest / "README.md").write_text(
        "# Preparació del nou club\n\n"
        "Esquelet local no desplegable. Dades inicials buides i recursos estructurals.\n"
        "Falten HTML, JavaScript, marca, imatges, infraestructura i proves.\n"
        "No activar Actions ni publicar fins a completar la revisió.\n",
        encoding="utf-8"
    )
    print("Offline staging skeleton created; no repository or deployment created.")

if __name__ == "__main__":
    main()
