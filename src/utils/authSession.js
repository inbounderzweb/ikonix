const accountId = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Keep one verified customer identity across login, storage, and API payloads.
// An empty record or the shared guest ID must never become a customer session.
export function normalizeAuthUser(value) {
  const user = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
  const ids = [user.id, user.userid, user.user_id].map(accountId).filter((id) => id !== null);
  if (!ids.length || ids.some((id) => id !== ids[0])) return null;
  return { ...user, id: ids[0] };
}
