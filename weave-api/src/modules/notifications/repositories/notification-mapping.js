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
    actor: row.actor_id
      ? {
          avatar_url: row.actor_avatar_url,
          email: row.actor_email,
          id: row.actor_id,
          name: row.actor_name,
          username: row.actor_username,
        }
      : null,
    actor_id: row.actor_id,
    content: row.content || {},
    created_at: row.created_at,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    id: row.id,
    in_trash: row.in_trash,
    is_read: row.is_read,
    read_at: row.read_at,
    title: row.title,
    trashed_at: row.trashed_at,
    type: row.type,
    updated_at: row.updated_at,
    user_id: row.user_id,
  };
}

module.exports = { mapNotificationRow };
