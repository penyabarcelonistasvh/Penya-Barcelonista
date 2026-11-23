/* Política central de permisos. No autentica ni autoriza por sí sola.
   El Worker debe verificar estos permisos en CADA endpoint protegido. */
export const PERMISSIONS=Object.freeze({
 news:'Gestionar notícies',
 matches:'Gestionar partits i cartells',
 notifications:'Enviar notificacions',
 teams:'Gestionar equips',
 sponsors:'Gestionar patrocinadors',
 club:'Modificar informació del club',
 users:'Gestionar administradors'
});
export const DEFAULT_EDITOR_PERMISSIONS=Object.freeze(['news','matches','notifications']);
export const ALL_PERMISSIONS=Object.freeze(Object.keys(PERMISSIONS));
export const ENDPOINT_PERMISSIONS=Object.freeze({
 '/api/publish:noticies.json':'news',
 '/api/publish:partits-cap-setmana.json':'matches',
 '/api/publish:proxims-partits.json':'matches',
 '/api/publish:equips.json':'teams',
 '/api/publish:patrocinadors.json':'sponsors',
 '/api/publish:club.json':'club',
 '/api/push/send':'notifications',
 '/api/push/test':'notifications',
 '/api/push/schedule':'notifications',
 '/api/push/schedule/cancel':'notifications',
 '/api/push/schedule/health':'notifications',
 '/api/push/history':'notifications',
 '/api/push/subscribers':'notifications',
 '/api/push/batches':'notifications',
 '/api/push/audience':'notifications',
 '/api/admin/users':'users'
});
export function hasPermission(user,permission){
 return !!user&&user.active===true&&
 (user.role==='owner'||(Array.isArray(user.permissions)&&user.permissions.includes(permission)));
}
export function validPermissions(values){
 return Array.isArray(values)&&new Set(values).size===values.length&&values.every(p=>ALL_PERMISSIONS.includes(p));
}
