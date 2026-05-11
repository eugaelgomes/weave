const BaseRepository = require("./base.repository");

/**
 * Leitura de notas, estatísticas e processamento de URLs.
 */
class ReadNotesRepository extends BaseRepository {
  async getAllNotesByUserId(userId, orgWideOrganizationId = null) {
    const query = `
    SELECT 
      n.id::text,
      n.user_id::text,
      n.project_id::text,
      n.title,
      n.description,
      n.tags,
      n.status,
      n.created_at,
      n.updated_at,
      n.revision,
      n.properties,
      n.due_date,

      -- criador da nota
      u.name AS user_name,
      u.username AS user_username,
      u.email AS user_email,
      u.avatar_url AS user_avatar_url,

      -- projeto associado
      p.title AS project_name,

      tp.id AS priority_id,
      tp.name AS priority_name,
      tp.color_hex AS priority_color,
      
      -- resolved tags
      COALESCE(
        (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color_hex))
         FROM tags t WHERE t.id = ANY(n.tags)), '[]'::json
      ) AS resolved_tags,

      -- colaboradores em JSON (agregados via LATERAL, sem multiplicar linhas)
      COALESCE(collab.data, '[]'::json) AS collaborators

    FROM notes n
    INNER JOIN users u ON n.user_id = u.user_id
    LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
    LEFT JOIN task_priorities tp ON n.priority_id = tp.id AND tp.deleted = false
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', c.user_id,
          'name', c.name,
          'username', c.username,
          'email', c.email,
          'avatar_url', c.avatar_url,
          'added_at', nc.added_at
        )
      ) AS data
      FROM note_collaborators nc
      INNER JOIN users c ON nc.user_id = c.user_id
      WHERE nc.note_id = n.id
    ) collab ON true
    WHERE n.deleted = false
      AND (
        n.user_id = $1
        OR EXISTS (
          SELECT 1 FROM note_collaborators nc2
          WHERE nc2.note_id = n.id AND nc2.user_id = $1
        )
        OR (
          $2::uuid IS NOT NULL
          AND n.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM projects p_org
            WHERE p_org.id = n.project_id
              AND p_org.organization_id = $2::uuid
              AND p_org.deleted = false
          )
        )
      )
    ORDER BY n.updated_at DESC;
    `;
    const results = await this.executeQuery(query, [
      userId,
      orgWideOrganizationId,
    ]);
    return await this.processNotesWithSignedUrls(results);
  }

  async getAllNotesFormatted(userId, orgWideOrganizationId = null) {
    const query = `
      SELECT 
        n.id::text,
        n.user_id::text,
        n.project_id::text,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.created_at,
        n.updated_at,
        n.revision,
        n.deleted,
        n.properties,
        n.due_date,

        -- criador da nota
        u.name as user_name,
        u.username as user_username,
        u.email as user_email,
        u.avatar_url as user_avatar_url,

        -- projeto associado
        p.title as project_name,

        tp.id AS priority_id,
        tp.name AS priority_name,
        tp.color_hex AS priority_color,
        
        -- resolved tags
        COALESCE(
          (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color_hex))
           FROM tags t WHERE t.id = ANY(n.tags)), '[]'::json
        ) AS resolved_tags,
        
        COALESCE(
            json_agg(
                json_build_object(
                    'id', c.user_id,
                    'name', c.name,
                    'username', c.username,
                    'email', c.email,
                    'avatar_url', c.avatar_url,
                    'added_at', nc.added_at
                )
            ) FILTER (WHERE c.user_id IS NOT NULL), '[]'
        ) AS collaborators
      FROM notes n
      INNER JOIN users u ON n.user_id = u.user_id
      LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
    LEFT JOIN task_priorities tp ON n.priority_id = tp.id AND tp.deleted = false
      LEFT JOIN note_collaborators nc ON n.id = nc.note_id
      LEFT JOIN users c ON nc.user_id = c.user_id
      WHERE (
        n.user_id = $1 OR EXISTS (
          SELECT 1 FROM note_collaborators nc2 
          WHERE nc2.note_id = n.id AND nc2.user_id = $1
        )
        OR (
          $2::uuid IS NOT NULL
          AND n.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM projects p_org
            WHERE p_org.id = n.project_id
              AND p_org.organization_id = $2::uuid
              AND p_org.deleted = false
          )
        )
      )
        AND n.deleted = false
      GROUP BY n.id, u.user_id, p.id, tp.id
      ORDER BY n.updated_at DESC;
    `;
    const results = await this.executeQuery(query, [
      userId,
      orgWideOrganizationId,
    ]);
    return await this.processNotesWithSignedUrls(results);
  }

  /**
   * Paginação e filtros
   * @param {string} userId
   * @param {Object} options - Opções de paginação e filtros
   * @param {number} options.page - Página atual (default: 1)
   * @param {number} options.limit - Itens por página (default: 10)
   * @param {string} options.search - Termo de busca (opcional)
   * @param {Array} options.tags - Tags para filtrar (opcional)
   * @param {string} options.sortBy - Ordenação (default: "updated_at")
   * @param {string} options.sortOrder - Ordem: "asc" ou "desc" (default: "desc")
   * @returns {Object}
   */
  async getAllNotesWithPagination(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      tags = [],
      sortBy = "updated_at",
      sortOrder = "desc",
      orgWideOrganizationId = null,
    } = options;

    const offset = (page - 1) * limit;

    const whereConditions = [
      `(n.user_id = $1 OR EXISTS (SELECT 1 FROM note_collaborators nc2 WHERE nc2.note_id = n.id AND nc2.user_id = $1)
        OR ($2::uuid IS NOT NULL AND n.project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p_org
          WHERE p_org.id = n.project_id AND p_org.organization_id = $2::uuid AND p_org.deleted = false
        )))`,
      `n.deleted = false`,
    ];
    const queryParams = [userId, orgWideOrganizationId];
    let paramIndex = 3;

    if (search && search.trim()) {
      whereConditions.push(`(
        LOWER(n.title) LIKE LOWER($${paramIndex}) OR 
        LOWER(n.description) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      whereConditions.push(`n.tags @> $${paramIndex}::uuid[]`);
      queryParams.push(tags);
      paramIndex++;
    }

    const validSortFields = ["updated_at", "created_at", "title"];
    const validSortField = validSortFields.includes(sortBy)
      ? sortBy
      : "updated_at";
    const validSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    const notesQuery = `
      SELECT 
        n.id::text,
        n.title,
        n.description,
        n.status,
        n.properties,
        n.tags,
        n.created_at,
        n.updated_at,
        n.revision,
        n.deleted,
        n.due_date,
        tp.id AS priority_id,
        tp.name AS priority_name,
        tp.color_hex AS priority_color,
        -- criador da nota
        n.user_id::text,
        u.name as user_name,
        u.username as user_username,
        u.email as user_email,
        u.avatar_url as user_avatar_url,
        -- projeto associado
        n.project_id::text,
        p.title as project_name,
        -- organização associada
        p.organization_id::text AS org_id,
        o.org_name,
        o.unique_name as org_unique_name,
        o.logo_url as org_logo_url,
        -- colaboradores em JSON
        COALESCE(
            json_agg(
                json_build_object(
                    'id', c.user_id,
                    'name', c.name,
                    'username', c.username,
                    'email', c.email,
                    'avatar_url', c.avatar_url,
                    'added_at', nc.added_at
                )
            ) FILTER (WHERE c.user_id IS NOT NULL), '[]'
        ) AS collaborators
      FROM notes n
      INNER JOIN users u ON n.user_id = u.user_id
      LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
    LEFT JOIN task_priorities tp ON n.priority_id = tp.id AND tp.deleted = false
      LEFT JOIN note_collaborators nc ON n.id = nc.note_id
      LEFT JOIN users c ON nc.user_id = c.user_id
      LEFT JOIN organizations o ON p.organization_id = o.id AND o.deleted = false
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY 
        n.id,
        u.user_id,
        p.id,
        o.id,
        tp.id
      ORDER BY 
        n.${validSortField} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM notes n
      WHERE ${whereConditions.join(" AND ")};
    `;

    const notes = await this.executeQuery(notesQuery, [
      ...queryParams,
      limit,
      offset,
    ]);
    const [countResult] = await this.executeQuery(countQuery, queryParams);
    const total = parseInt(countResult.total);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const processedNotes = await this.processNotesWithSignedUrls(notes);

    return {
      notes: processedNotes,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        hasMore: hasNextPage, // Para compatibilidade com scroll infinito
      },
    };
  }

  async getNoteById(noteId) {
    const query = `
    SELECT 
        n.id::text,
        n.title,
        n.description,
        n.status,
        n.properties,
        n.tags,
        n.created_at,
        n.updated_at,
        n.revision,
        n.deleted,
        n.due_date,
        COALESCE(n.organization_id, p.organization_id)::text AS scope_organization_id,
        -- criador da nota
        n.user_id::text,
        u.name AS user_name,
        u.username AS user_username,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url,
        -- projeto associado
        n.project_id::text,
        p.title AS project_name,
        n.project_stage_id::text,
        pst.name AS project_stage_name,

        tp.id AS priority_id,
        tp.name AS priority_name,
        tp.color_hex AS priority_color,
        
        -- resolved tags
        COALESCE(
          (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color_hex))
           FROM tags t WHERE t.id = ANY(n.tags)), '[]'::json
        ) AS resolved_tags,
        -- organização associada
        p.organization_id::text AS org_id,
        o.org_name,
        o.unique_name AS org_unique_name,
        o.logo_url AS org_logo_url,
        -- colaboradores em JSON
        COALESCE(
            json_agg(
                json_build_object(
                    'id', c.user_id,
                    'username', c.username,
                    'avatar_url', c.avatar_url
                )
            ) FILTER (WHERE c.user_id IS NOT NULL), '[]'
        ) AS collaborators
    FROM notes n
    INNER JOIN users u ON n.user_id = u.user_id
    LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
    LEFT JOIN project_stages pst
      ON pst.id = n.project_stage_id
      AND pst.project_id = n.project_id
    LEFT JOIN task_priorities tp ON n.priority_id = tp.id AND tp.deleted = false
    LEFT JOIN note_collaborators nc ON n.id = nc.note_id
    LEFT JOIN users c ON nc.user_id = c.user_id
    LEFT JOIN organizations o ON p.organization_id = o.id AND o.deleted = false
    WHERE n.id = $1 AND n.deleted = false
    GROUP BY 
        n.id, 
        u.user_id, 
        p.id,
        p.organization_id,
        o.id,
        tp.id,
        pst.id
    LIMIT 1;
    `;
    const results = await this.executeQuery(query, [noteId]);
    if (results[0]) {
      const processed = await this.processNotesWithSignedUrls([results[0]]);
      return processed[0];
    }
    return null;
  }

  /**
   * Versão enxuta para validação de acesso em caminhos quentes de escrita.
   * @param {string} noteId
   * @returns {Promise<{ id: string, user_id: string, project_id: string | null } | null>}
   */
  async getNoteAccessSummary(noteId) {
    const query = `
      SELECT
        n.id::text,
        n.user_id::text,
        n.project_id::text
      FROM notes n
      WHERE n.id = $1::uuid
        AND n.deleted = false
      LIMIT 1;
    `;
    const rows = await this.executeQuery(query, [noteId]);
    return rows[0] || null;
  }

  async getAllNotesStats(userId, orgWideOrganizationId = null) {
    const query = `
    WITH user_scope_notes AS (
        SELECT 
            n.id, 
            n.tags, 
            n.status,
            n.created_at,
            (EXISTS (SELECT 1 FROM note_collaborators nc WHERE nc.note_id = n.id)) AS is_shared
        FROM notes n
        WHERE 
            (
            n.user_id = $1
             OR EXISTS (
                SELECT 1
                FROM note_collaborators nc
                WHERE nc.note_id = n.id
                  AND nc.user_id = $1
            )
            OR (
              $2::uuid IS NOT NULL
              AND n.project_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM projects p_org
                WHERE p_org.id = n.project_id
                  AND p_org.organization_id = $2::uuid
                  AND p_org.deleted = false
              )
            )
            )
            AND n.deleted = false 
    ),
    all_tags_unnested AS (
      SELECT unnest(tags)::text AS tag_name
        FROM user_scope_notes
    )
    SELECT
        -- 1. Total de notas
        (SELECT COUNT(*) FROM user_scope_notes)::int AS total_notes,

        -- 2. Array com TODAS as tags únicas
        COALESCE((
            SELECT array_agg(DISTINCT tag_name ORDER BY tag_name)
            FROM all_tags_unnested
        ), ARRAY[]::text[]) AS all_unique_tags,

        -- 3. Quantidade de tags únicas
        (SELECT COUNT(DISTINCT tag_name) FROM all_tags_unnested)::int AS unique_tags_count,

        -- 4. Distribuição por Status (Tratando NULL)
        -- Exemplo de saída: {"VISIBLE": 10, "ARCHIVED": 2, "no_status": 5}
        COALESCE((
            SELECT json_object_agg(s.status_key, s.count)
            FROM (
                SELECT 
                    -- Converte o enum para texto e trata NULL
                    COALESCE(status::text, 'no_status') AS status_key, 
                    COUNT(*) as count
                FROM user_scope_notes
                GROUP BY status
            ) s
        ), '{}'::json) AS status_distribution,

        -- 5. Top Tags
        COALESCE((
            SELECT json_agg(t)
            FROM (
                SELECT tag_name, COUNT(*) as count
                FROM all_tags_unnested
                GROUP BY tag_name
                ORDER BY count DESC
                LIMIT 10
            ) t
        ), '[]'::json) AS top_tags,

        -- 6. Métricas de Atividade
        (
            SELECT json_build_object(
                'shared_notes', COUNT(*) FILTER (WHERE is_shared),
                'private_notes', COUNT(*) FILTER (WHERE NOT is_shared),
                'created_last_30_days', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
                'created_last_7_days', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
            )
            FROM user_scope_notes
        ) AS activity_metrics
`;
    const results = await this.executeQuery(query, [
      userId,
      orgWideOrganizationId,
    ]);
    return results[0];
  }

  /**
   * Notas com prazo “amanhã” (UTC) que ainda não receberam o e-mail de véspera
   * (controle em properties.due_reminder.eve_sent_for_due_epoch).
   *
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async findNotesForDueDateEveReminder() {
    const query = `
      SELECT
        n.id::text,
        n.title,
        n.due_date,
        n.properties,
        n.user_id::text,
        u.email AS owner_email,
        u.name AS owner_name
      FROM notes n
      INNER JOIN users u ON n.user_id = u.user_id
      WHERE n.deleted = false
        AND n.due_date IS NOT NULL
        AND (n.due_date AT TIME ZONE 'UTC')::date =
            ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date + INTERVAL '1 day')::date
        AND (
          NULLIF(btrim(n.properties #>> '{due_reminder,eve_sent_for_due_epoch}'), '') IS NULL
          OR (NULLIF(btrim(n.properties #>> '{due_reminder,eve_sent_for_due_epoch}'), ''))::bigint
            IS DISTINCT FROM (floor(extract(epoch FROM n.due_date)))::bigint
        );
    `;
    return await this.executeQuery(query);
  }

  async processNotesWithSignedUrls(notes) {
    if (!notes || !Array.isArray(notes)) return notes;

    return Promise.all(
      notes.map(async (note) => {
        const processedNote = { ...note };

        // Processar avatares dos colaboradores
        if (
          processedNote.collaborators &&
          Array.isArray(processedNote.collaborators)
        ) {
          processedNote.collaborators = await Promise.all(
            processedNote.collaborators.map(async (collab) => {
              return collab;
            })
          );
        }

        return processedNote;
      })
    );
  }
}

module.exports = new ReadNotesRepository();
