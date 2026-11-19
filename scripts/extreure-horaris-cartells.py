#!/usr/bin/env python3
"""Extract unverified poster text for admin review. Never publishes fixture guesses."""
import base64
import hashlib
import io
import json
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
club = json.loads((ROOT / 'data/club.json').read_text(encoding='utf-8'))
entry = next((x for x in club.get('sections', []) if x.get('id') == 'pbsv-weekend-matches'), None)
if not entry or not entry.get('detail'):
    raise SystemExit('No hi ha cartells publicats')
posters = json.loads(entry['detail'])
out = {'version': 1, 'source': 'data/club.json / pbsv-weekend-matches', 'status': 'pending_review', 'days': {}}
for day in ('saturday', 'sunday'):
    item = posters.get(day) or {}
    source = item.get('image') or ''
    record = {'date': item.get('date', ''), 'title': item.get('title', ''), 'image_hash': '', 'ocr_lines': [], 'needs_review': True}
    if source.startswith('data:image/'):
        match = re.fullmatch(r'data:image/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)', source, re.I | re.S)
        if not match:
            record['error'] = 'Imatge incrustada no reconeguda'
            out['days'][day] = record
            continue
        raw = base64.b64decode(match.group(1), validate=True)
    elif source.startswith('./assets/') or source.startswith('assets/'):
        path = (ROOT / source.removeprefix('./')).resolve()
        if not path.is_relative_to(ROOT / 'assets') or not path.is_file():
            record['error'] = 'Imatge local no disponible'
            out['days'][day] = record
            continue
        raw = path.read_bytes()
    else:
        record['error'] = 'Imatge externa: revisio manual necessaria'
        out['days'][day] = record
        continue
    record['image_hash'] = hashlib.sha256(raw).hexdigest()
    with tempfile.TemporaryDirectory() as directory:
        image = Path(directory) / 'poster.png'
        image.write_bytes(raw)
        result = subprocess.run(['tesseract', str(image), 'stdout', '-l', 'cat+spa', '--psm', '11'], capture_output=True, text=True, check=False)
    if result.returncode:
        record['error'] = 'OCR no disponible per aquest cartell'
    else:
        record['ocr_lines'] = [line.strip()[:220] for line in result.stdout.splitlines() if line.strip()][:180]
        if not record['ocr_lines']:
            record['error'] = 'No s’ha pogut llegir text'
    out['days'][day] = record
target = ROOT / 'data/revisio-horaris-cartells.json'
serialized = json.dumps(out, ensure_ascii=False, indent=2) + '\n'
if not target.exists() or target.read_text(encoding='utf-8') != serialized:
    target.write_text(serialized, encoding='utf-8')
print('Lectura preparada; els horaris no es publiquen fins a revisar-los.')
