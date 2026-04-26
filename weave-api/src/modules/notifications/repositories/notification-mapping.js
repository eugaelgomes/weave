/**
 * Normaliza uma linha de `notifications` (com dados opcionais do ator).
 * @param {object|null|undefined} row
 * @returns {object|null}
 */
function mapNotificationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    actor_id: row.actor_id,
    actor: row.actor_id
      ? {
          id: row.actor_id,
          name: row.actor_name,
          username: row.actor_username,
          email: row.actor_email,
          avatar_url: row.actor_avatar_url,
        }
      : null,
    type: row.type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    title: row.title,
    content: row.content || {},
    is_read: row.is_read,
    read_at: row.read_at,
    in_trash: row.in_trash,
    trashed_at: row.trashed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = { mapNotificationRow };
