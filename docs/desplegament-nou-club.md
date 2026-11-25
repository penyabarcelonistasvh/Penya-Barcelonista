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
