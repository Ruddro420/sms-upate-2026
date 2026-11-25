export function hasPermission(user, ...required) {
  if (!user) return false;
  if (user.role_key === 'super_admin') return true;
  const perms = new Set(user.permissions || []);
  return required.some((p) => perms.has(p));
}
