# Administració multiusuari — pla d'implementació

Estat: **en preparació, no activat a producció**. El Worker actual continua acceptant únicament el compte GitHub propietari.

## Regles funcionals acordades
- El propietari pot gestionar els usuaris, els permisos i la desactivació.
- Nous editors: per defecte notícies, partits i notificacions; poden enviar avisos sense aprovació.
- Qualsevol permís es pot activar o retirar individualment pel propietari.
- Els editors no poden gestionar administradors ni elevar els seus permisos.
- Cada persona entra amb el seu correu, sense GitHub.

## Seguretat obligatòria abans d'activar
1. Identitat per correu amb un proveïdor de verificació (codi d'un sol ús o enllaç màgic); no enviar correus des del navegador ni exposar claus.
2. Emmagatzemar usuaris i permisos en un repositori privat de dades del Worker (p. ex. D1), no a GitHub Pages ni localStorage.
3. Autorització al servidor en **totes** les rutes de publicació i enviament, incloses les notificacions programades i els endpoints de consulta.
4. Per publicar sense GitHub: credencial de servei amb permisos mínims, guardada exclusivament com a secret de Cloudflare; mai passar-la al navegador.
5. Sessió signada, HttpOnly, Secure i SameSite; caducitat curta i revocació en desactivar un compte.
6. Limitar intents de verificació, caducitat i ús únic dels codis; protegir les operacions d'escriptura contra CSRF.
7. Registre d'auditoria amb usuari, acció, data i resultat, sense desar tokens ni codis.
8. Impedir retirar l'últim propietari; no permetre elevar-se permisos.
9. Proves negatives: usuari inactiu, permís absent, sessió caducada, URL directa, publicació manipulada i enviament push sense autorització.
10. Migració: conservar l'accés GitHub del propietari fins que el nou sistema estigui validat.

## Política de permisos
La definició de permisos i el mapa inicial de rutes són a `cloudflare/admin-permissions.js`.\nL'esquema D1 preparatori és a `cloudflare/migrations/0001_admin_users.sql`; encara no s'ha aplicat a cap base de dades.
És una **definició**, no un mecanisme d'autenticació. No s'ha de mostrar cap botó funcional d'alta d'usuaris fins que les rutes de gestió i la verificació d'identitat estiguin actives.

## Dependències pendents
- Escollir/configurar el servei de verificació per correu i les credencials corresponents.
- Crear i vincular D1 al Worker i aplicar la migració revisada.
- Implementar i desplegar el Worker actualitzat, amb comprovacions reals de permisos.
- Verificar que les publicacions i els avisos continuen funcionant per al propietari.
