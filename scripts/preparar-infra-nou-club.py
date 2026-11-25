#!/usr/bin/env python3
"""Genera configuracions Wrangler noves fora del repositori, sense desplegar."""
import argparse
import json
import re
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument("config", type=Path)
p.add_argument("destination", type=Path)
args = p.parse_args()
c = json.loads(args.config.read_text(encoding="utf-8"))
dest = args.destination.resolve()
if dest == root or root in dest.parents or dest.exists():
    p.error("La destinació ha de ser nova i fora del repositori")
keys = ("admin_worker", "push_worker", "admin_db_name", "push_db_name")
for key in keys:
    if not re.fullmatch(r"[a-z][a-z0-9-]{2,50}", c[key]) or "pbsv" in c[key]:
        p.error("Nom no vàlid o reservat: " + key)
if c["admin_worker"] == c["push_worker"] or c["admin_db_name"] == c["push_db_name"]:
    p.error("Els recursos han de ser independents")
ids = [str(uuid.UUID(c[k])) for k in ("admin_db_id", "push_db_id")]
if len(set(ids)) != 2 or set(ids) & {"524a30f0-b842-45b4-ad05-f3948f281601", "72cfee2a-b047-43f9-8834-5e605b413bbf"}:
    p.error("Identificadors D1 repetits o de producció")
for key in ("turnstile_site_key", "vapid_public_key"):
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,200}", c[key]):
        p.error("Clau pública no vàlida: " + key)
def q(v):
    return json.dumps(v)
def admin(main):
    return f'''name = {q(c["admin_worker"])}
main = {q(main)}
compatibility_date = "2026-11-01"
workers_dev = true
keep_vars = true

[[services]]
binding = "PUSH_SERVICE"
service = {q(c["push_worker"])}

[[d1_databases]]
binding = "ADMIN_DB"
database_name = {q(c["admin_db_name"])}
database_id = {q(ids[0])}
'''
push = f'''name = {q(c["push_worker"])}
main = "push-placeholder.js"
compatibility_date = "2026-11-01"
workers_dev = true
keep_vars = true

[[d1_databases]]
binding = "PUSH_DB"
database_name = {q(c["push_db_name"])}
database_id = {q(ids[1])}

[vars]
PUSH_SUBSCRIPTIONS_ENABLED = "false"
PUSH_TURNSTILE_SITE_KEY = {q(c["turnstile_site_key"])}
PUSH_VAPID_PUBLIC_KEY = {q(c["vapid_public_key"])}

[triggers]
crons = ["* * * * *"]
'''
dest.mkdir()
(dest / "cloudflare").mkdir()
for path, value in (("wrangler.toml", admin("cloudflare/worker.js")), ("cloudflare/wrangler.toml", admin("worker.js")), ("cloudflare/wrangler-push.toml", push)):
    with (dest / path).open("x", encoding="utf-8") as f:
        f.write(value)
print("Configuracions generades. No s'ha desplegat cap recurs.")
