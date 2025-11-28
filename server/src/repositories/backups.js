const { executeQuery } = require("@/services/db/db-connection");

class GetAllDataRepository {
  // Querie para pegar todas as notas, blocos e colaboradores de um usuário
  // Reavaliar para segregar ou reduzir dados
  async getAllData(userId) {
    const query = `
    SELECT 
        u_owner.user_id::text AS owner_id,
        u_owner.name AS owner_name,
        u_owner.username AS owner_username,
        u_owner.email AS owner_email,
        u_owner.avatar_url AS owner_avatar_url,
        n.id::text AS note_id,
        n.title,
        n.description,
        n.tags,
        n.created_at,
        n.updated_at,
        n.user_id::text AS owner_id,
        json_build_object(
            'name', u_owner.name,
            'username', u_owner.username,
            'email', u_owner.email,
            'avatar_url', u_owner.avatar_url
        ) AS owner,
        COALESCE(
            (
                SELECT json_agg(collab_data ORDER BY collab_data.added_at)
                FROM (
                    SELECT DISTINCT
                        nc.user_id::text AS collaborator_id,
                        u_collab.name,
                        u_collab.username,
                        u_collab.email,
                        u_collab.avatar_url,
                        nc.added_at,
                        nc.removed,
                        nc.removed_at
                    FROM note_collaborators nc
                    JOIN users u_collab ON u_collab.user_id = nc.user_id
                    WHERE nc.note_id = n.id
                ) collab_data
            ), '[]'
        ) AS collaborators,
        COALESCE(
            (
                SELECT json_agg(block_data ORDER BY block_data.position, block_data.created_at)
                FROM (
                    SELECT DISTINCT
                        b.id::text AS block_id,
                        b.user_id::text AS user_id,
                        b.parent_id::text AS parent_id,
                        b.type,
                        b.text,
                        b.properties,
                        b.done,
                        b.deleted,
                        b.position,
                        b.created_at,
                        b.updated_at
                    FROM blocks b
                    WHERE b.note_id = n.id
                ) block_data
            ), '[]'
        ) AS blocks
    FROM notes n
    JOIN users u_owner ON n.user_id = u_owner.user_id
    WHERE n.user_id = $1
       OR EXISTS (
           SELECT 1
           FROM note_collaborators nc
           WHERE nc.note_id = n.id
             AND nc.user_id = $1
       )
    ORDER BY n.created_at ASC;
    `;
    return executeQuery(query, [userId]);
  }
}

module.exports = new GetAllDataRepository();
