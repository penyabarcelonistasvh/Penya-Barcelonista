# Desplegament independent per club

Cada club ha de tenir un repositori i una instal·lació independents. No copiar secrets, bases de dades, usuaris, subscripcions ni dades personals de la Penya.

## Inventari abans de desplegar

- Repositori GitHub del nou club i URL pública HTTPS (GitHub Pages o domini propi).
- Worker administratiu i Worker push amb noms exclusius.
- D1 ADMIN_DB i PUSH_DB noves, amb identificadors diferents dels de la Penya.
- OAuth GitHub propi, administrador autoritzat i token de publicació limitat al repositori nou.
- Secrets SESSION_KEY, PUSH_INTERNAL_TOKEN, ADMIN_PUBLISH_TOKEN i credencials OAuth independents; claus VAPID i Turnstile pròpies. No desar valors secrets al repositori.
- Secrets de GitHub CLOUDFLARE_API_TOKEN i CLOUDFLARE_ACCOUNT_ID del compte autoritzat.

## Fitxers a revisar abans d'activar els workflows

| Fitxer | Configuració |
|---|---|
| cloudflare/worker.js | OWNER, REPO, ADMIN_LOGIN, SITE, CLUB_BRAND |
| cloudflare/wrangler.toml | nom Worker, PUSH_SERVICE, ADMIN_DB |
| wrangler.toml | configuració alternativa del Worker administratiu; mantenir coherent |
| cloudflare/wrangler-push.toml | nom Worker, PUSH_DB, claus públiques VAPID i Turnstile |
| cloudflare/push-placeholder.js | ORIGIN i hostname de validació Turnstile |
| avisos.html | PUSH_API |
| club-brand.js | identitat, contactes, enllaços i federació |
| manifest.webmanifest | generar amb node scripts/generate-manifest.mjs --write |

Aquesta llista és un inventari inicial, no una garantia que no existeixin altres referències fixes. Cercar també els noms i dominis antics en tot el repositori, inclosos scripts, service workers i workflows.

## Ordre segur

1. Crear repositori privat de preparació amb Actions desactivades; copiar només codi i recursos genèrics. Substituir dades, imatges i continguts del club anterior.
2. Crear recursos Cloudflare nous i aplicar les migracions administratives i l'esquema push a les bases noves.
3. Configurar dominis, OAuth, secrets i bindings; mantenir LOCAL_LOGIN_ENABLED desactivat fins a completar la configuració.
4. Revisar que cap URL, identificador D1 ni credencial apunti a la Penya. Activar només els workflows necessaris del nou repositori.
5. Validar publicació, permisos, revocació, canvi de contrasenya, instal·lació PWA i notificació de prova exclusiva del nou club.
6. Publicar després de l'acceptació del club.

No executar desplegaments de prova contra els recursos de producció de la Penya. No exportar les bases de dades de producció per crear una instal·lació nova.

## Comprovació local obligatòria abans del desplegament nou

Executar `python3 scripts/validar-nou-club.py` des del repositori nou. Un resultat 1 bloqueja el procediment fins a revisar les coincidències. A la Penya original és normal que falli. No imprimeix els valors trobats, només fitxer, línia i tipus. No comprova secrets remots, permisos, dades personals ni recursos Cloudflare; cal revisar-los separadament. No s'executa automàticament en producció.

## Dades inicials netes

Executar `python3 scripts/preparar-dades-nou-club.py ../nou-club-dades` amb una destinació nova fora del repositori. Genera vuit JSON buits amb les estructures actuals, sense copiar dades personals ni imatges. No és una plantilla executable completa: encara cal netejar HTML, recursos, textos fixos, configuració i historial Git. No copiar l'historial Git original al client.

## Preparació de la plantilla funcional

Executar `python3 scripts/preparar-plantilla-nou-club.py ../club-demo` per crear l'esquelet local. No és desplegable.

Referències confirmades que cal substituir abans d'incorporar els fitxers:

| Fitxer | Dependència |
|---|---|
| publicar-github.js | URL manual d'edició del repositori; mai apuntar al club original |
| cloudflare/worker.js | propietari, repositori, administrador OAuth, URL pública i marca |
| cloudflare/push-placeholder.js | origen CORS i hostname Turnstile |
| pbsv-sw.js | icona local de notificació; substituir el recurs gràfic |
| club-brand.js | marca, textos, contactes, botiga, xarxes i recursos gràfics |

Generar les configuracions Wrangler amb `python3 scripts/preparar-infra-nou-club.py configuracio.json ../club-demo-infra`. La configuració JSON ha de contenir admin_worker, push_worker, admin_db_name, push_db_name, admin_db_id, push_db_id, turnstile_site_key i vapid_public_key. Només claus públiques, mai secrets. La destinació ha de ser nova. Les subscripcions push comencen desactivades.

Aquesta revisió és parcial: encara cal revisar totes les pàgines HTML, scripts, imatges i automatitzacions. No copiar els fitxers funcionals sense substituir les dependències i validar el resultat.
