#!/usr/bin/env python3
"""Generate empty club data in a NEW directory; never overwrite existing files."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAY = {"date": "", "title": "", "time": "", "comment": "", "image": ""}
DATA = {
    "equips.json": {"version": 1, "teams": []},
    "noticies.json": {"version": 1, "noticias": []},
    "patrocinadors.json": {"version": 1, "sponsors": []},
    "proxims-partits.json": {"version": 1, "source": "", "note": "", "matches": []},
    "partits-cap-setmana.json": {"version": 1, "saturday": DAY, "sunday": DAY},
    "directe-cap-setmana.json": {"version": 1, "enabled": False, "source": "", "updatedAt": None, "matches": []},
    "historia-club.json": {"chapters": [], "values": {"ca": [], "es": []}},
    "club.json": {"version": 1, "sections": [
        {"id": key, "name": name, "content": "", "url": "", "detail": detail}
        for key, name, detail in [
            ("history", "Història", ""), ("board", "Junta directiva", ""),
            ("sports", "Àrea esportiva", ""), ("honours", "Palmarès", ""),
            ("contact", "Contacte i instal·lacions", ""),
            ("pbsv-weekend-matches", "Partits del cap de setmana",
             json.dumps({"saturday": DAY, "sunday": DAY}))
        ]
    ]}
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path, help="New directory outside this repository")
    args = parser.parse_args()
    dest = args.destination.resolve()
    if dest == ROOT or ROOT in dest.parents:
        parser.error("Destination must be outside the source repository")
    if dest.exists():
        parser.error("Destination already exists; refusing to overwrite")
    dest.mkdir(parents=False, exist_ok=False)
    data = dest / "data"
    data.mkdir()
    for name, value in DATA.items():
        with (data / name).open("x", encoding="utf-8") as file:
            json.dump(value, file, ensure_ascii=False, indent=2)
            file.write("\n")
    print(f"Created {len(DATA)} empty data files in {data}. Not a deployable application.")

if __name__ == "__main__":
    main()
