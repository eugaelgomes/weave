const { executeQuery, rowCount } = require("@/services/db/index");
const imageUtils = require("@/middlewares/data/image-utils");

class notesRepository {
  async createNotesQuerie(
    userId,
    title,
    content,
    tags = [],
    status = "open",
    projectId = null
  ) {
    const query = `
      INSERT INTO notes (user_id, title, description, tags, status, project_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *; 
    `;
    const results = await executeQuery(query, [
      userId,
      title,
      content,
      tags, // PostgreSQL aceita arrays diretamente
      status,
      projectId,
    ]);
    return results[0];
  }

  async getAllNotesByUserId(userId) {
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

    -- criador da nota
    u.name AS user_name,
    u.username AS user_username,
    u.email AS user_email,
    u.avatar_url AS user_avatar_url,

    -- projeto associado
    p.title AS project_name,

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
    LEFT JOIN note_collaborators nc ON n.id = nc.note_id
    LEFT JOIN users c ON nc.user_id = c.user_id
    WHERE (n.user_id = $1 OR EXISTS (
        SELECT 1 FROM note_collaborators nc2 
        WHERE nc2.note_id = n.id AND nc2.user_id = $1
    ))
      AND n.deleted = false
    GROUP BY n.id, u.user_id, p.title
    ORDER BY n.updated_at DESC;
    `;
    const results = await executeQuery(query, [userId]);
    return await this.processNotesWithSignedUrls(results);
  }

  async getAllNotesFormatted(userId) {
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
        n.deleted,

        -- criador da nota
        u.name as user_name,
        u.username as user_username,
        u.email as user_email,
        u.avatar_url as user_avatar_url,

        -- projeto associado
        p.title as project_name,

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
      LEFT JOIN note_collaborators nc ON n.id = nc.note_id
      LEFT JOIN users c ON nc.user_id = c.user_id
      WHERE (n.user_id = $1 OR EXISTS (
          SELECT 1 FROM note_collaborators nc2 
          WHERE nc2.note_id = n.id AND nc2.user_id = $1
      ))
        AND n.deleted = false
      GROUP BY n.id, u.user_id, p.title
      ORDER BY n.updated_at DESC;
    `;
    const results = await executeQuery(query, [userId]);
    return await this.processNotesWithSignedUrls(results);

  }

  /**
   * Busca notas com suporte a paginação, busca e filtros
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de paginação e filtros
   * @param {number} options.page - Página atual (default: 1)
   * @param {number} options.limit - Itens por página (default: 10)
   * @param {string} options.search - Termo de busca (opcional)
   * @param {Array} options.tags - Tags para filtrar (opcional)
   * @param {string} options.sortBy - Campo de ordenação (default: "updated_at")
   * @param {string} options.sortOrder - Ordem: "asc" ou "desc" (default: "desc")
   * @returns {Object} - { notes: Array, pagination: Object }
   */
  async getAllNotesWithPagination(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      tags = [],
      sortBy = "updated_at",
      sortOrder = "desc",
    } = options;

    const offset = (page - 1) * limit;

    let whereConditions = [
      `(n.user_id = $1 OR EXISTS (SELECT 1 FROM note_collaborators nc2 WHERE nc2.note_id = n.id AND nc2.user_id = $1))",
      "n.deleted = false`,
    ];
    let queryParams = [userId];
    let paramIndex = 2;

    if (search && search.trim()) {
      whereConditions.push(`(
        LOWER(n.title) LIKE LOWER($${paramIndex}) OR 
        LOWER(n.description) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      whereConditions.push(`n.tags && $${paramIndex}`);
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
        n.deleted,
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
        p.org_id::text,
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
      LEFT JOIN note_collaborators nc ON n.id = nc.note_id
      LEFT JOIN users c ON nc.user_id = c.user_id
      LEFT JOIN organizations o ON p.org_id = o.id AND o.deleted = false
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY 
        n.id,
        u.user_id,
        p.id,
        o.id
      ORDER BY 
        n.${validSortField} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM notes n
      WHERE ${whereConditions.join(" AND ")};
    `;

    const notes = await executeQuery(notesQuery, [
      ...queryParams,
      limit,
      offset,
    ]);
    const [countResult] = await executeQuery(countQuery, queryParams);
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
        n.deleted,
        -- criador da nota
        n.user_id::text,
        u.name AS user_name,
        u.username AS user_username,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url,
        -- projeto associado
        n.project_id::text,
        p.title AS project_name,
        -- organização associada
        p.org_id::text,
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
    LEFT JOIN note_collaborators nc ON n.id = nc.note_id
    LEFT JOIN users c ON nc.user_id = c.user_id
    LEFT JOIN organizations o ON p.org_id = o.id AND o.deleted = false
    WHERE n.id = $1 AND n.deleted = false
    GROUP BY 
        n.id, 
        u.user_id, 
        p.id,
        p.org_id,
        o.id
    
    LIMIT 1;
    `;
    const results = await executeQuery(query, [noteId]);
    if (results[0]) {
      const processed = await this.processNotesWithSignedUrls([results[0]]);
      return processed[0];
    }
    return null;
  }

  async getAllNotesStats(userId) {
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
            (n.user_id = $1
             OR EXISTS (
                SELECT 1
                FROM note_collaborators nc
                WHERE nc.note_id = n.id
                  AND nc.user_id = $1
            ))
            AND n.deleted = false 
    ),
    all_tags_unnested AS (
        SELECT unnest(tags) AS tag_name
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
        -- Exemplo de saída: {"active": 10, "archived": 2, "sem_status": 5}
        COALESCE((
            SELECT json_object_agg(s.status_key, s.count)
            FROM (
                SELECT 
                    -- Transforma NULL em 'sem_status' para ser uma chave JSON válida
                    COALESCE(status, 'sem_status') AS status_key, 
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
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  /**
   * Atualiza uma nota com campos dinâmicos
   * @param {string} noteId - ID da nota a ser atualizada
   * @param {Object} updateData - Objeto com os campos a serem atualizados
   * @param {string} [updateData.title] - Título da nota
   * @param {string} [updateData.description] - Descrição/conteúdo da nota
   * @param {Array} [updateData.tags] - Array de tags
   * @param {boolean} [updateData.deleted] - Status de exclusão
   * @returns {Object|null} - Nota atualizada ou null se nenhum campo foi fornecido
   */
  async updateNoteById(noteId, updateData) {
    const allowedFields = [
      "title",
      "description",
      "tags",
      "status",
      "deleted",
      "project_id",
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push("updated_at = NOW()");

    values.push(noteId);

    const query = `
      UPDATE notes
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const results = await executeQuery(query, values);
    return results[0];
  }

  async createCompleteNote(
    userId,
    title,
    description,
    tags = [],
    initialBlockContent = "",
    status = "open",
    projectId = null
  ) {
    const query = `
      WITH new_note AS (
        INSERT INTO notes (user_id, title, description, tags, status, project_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      ),
      new_block AS (
        INSERT INTO blocks (note_id, user_id, text)
        SELECT id, $1, $7
        FROM new_note
        RETURNING *
      )
      SELECT 
        -- Seleciona colunas da nota criada
        new_note.id AS note_id,
        new_note.project_id,
        new_note.title,
        new_note.description,
        new_note.tags,
        new_note.status,
        new_note.created_at AS note_created_at,
        new_note.updated_at AS note_updated_at,
        new_note.user_id,
        
        -- Seleciona colunas do bloco criado
        new_block.id AS block_id,
        new_block.text AS block_text,
        new_block.type AS block_type,
        new_block.properties AS block_properties,
        new_block.done AS block_done,
        new_block.position AS block_position,
        new_block.created_at AS block_created_at,
        new_block.updated_at AS block_updated_at,
        
        -- Dados do usuário
        u.name AS user_name,
        u.username AS user_username,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url
      FROM new_note, new_block
      INNER JOIN users u ON new_note.user_id = u.user_id;
    `;
    const results = await executeQuery(query, [
      userId,
      title,
      description,
      tags,
      status,
      projectId,
      initialBlockContent,
    ]);
    return results[0];
  }

  async deleteNoteById(noteId) {
    const query = `UPDATE notes SET deleted = true WHERE id = $1`;
    await executeQuery(query, [noteId]);
  }

  // ========================================
  // MÉTODOS PARA GERENCIAR COLABORADORES
  // ========================================

  /**
   * Adiciona um colaborador à nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário colaborador
   * @returns {Object} - Dados do colaborador adicionado
   */
  async addCollaborator(noteId, userId) {
    const checkQuery = `
      SELECT removed FROM note_collaborators
      WHERE note_id = $1 AND user_id = $2
      LIMIT 1;
    `;
    const existing = await executeQuery(checkQuery, [noteId, userId]);

    if (existing.length > 0) {
      if (existing[0].removed) {
        const reactivateQuery = `
          UPDATE note_collaborators
          SET removed = false, removed_at = NULL, removed_by = NULL, added_at = NOW()
          WHERE note_id = $1 AND user_id = $2
          RETURNING *;
        `;
        const results = await executeQuery(reactivateQuery, [noteId, userId]);
        return results[0];
      }
      return null;
    }

    const insertQuery = `
      INSERT INTO note_collaborators (note_id, user_id)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const results = await executeQuery(insertQuery, [noteId, userId]);
    return results[0];
  }

  /**
   * Remove um colaborador da nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário colaborador
   * @returns {Object} - Resultado da operação
   */
  async removeCollaborator(noteId, userId) {
    const query = `
      UPDATE note_collaborators 
      SET removed_at = NOW(), removed = true, removed_by = 'owner'
      WHERE note_id = $1 AND user_id = $2 AND removed = false;
    `;
    const count = await rowCount(query, [noteId, userId]);
    return { rowCount: count };
  }

  /**
   * Recusa a colaboração de um usuário em uma nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário colaborador
   * @returns {Object} - Objeto com rowCount para checar operação
   */
  async recuseCollaboration(noteId, userId) {
    const query = `
    UPDATE note_collaborators
    SET removed_at = NOW(),
        removed = true,
        removed_by = 'itself'
    WHERE note_id = $1
      AND user_id = $2
      AND removed = false
      AND user_id <> (SELECT user_id FROM notes WHERE note_id = $1);
  `;
    const count = await rowCount(query, [noteId, userId]);
    return { rowCount: count };
  }

  /**
   * Lista todos os colaboradores de uma nota
   * @param {string} noteId - ID da nota
   * @returns {Array} - Lista de colaboradores
   */
  async getCollaboratorsByNoteId(noteId) {
    const query = `
    SELECT 
      nc.user_id::text,
      nc.added_at,
      u.username,
      u.email,
      u.avatar_url,
      nc.removed,
      nc.removed_by,
      nc.removed_at
    FROM note_collaborators nc
    INNER JOIN notes n ON nc.note_id = n.id
    INNER JOIN users u ON nc.user_id = u.user_id
    WHERE nc.note_id = $1
    ORDER BY nc.added_at ASC;
    `;
    const results = await executeQuery(query, [noteId]);
    return results[0];
  }

  /**
   * Verifica se um usuário é colaborador de uma nota
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário
   * @returns {boolean} - True se for colaborador
   */
  async isCollaborator(noteId, userId) {
    const query = `
      SELECT 1 FROM note_collaborators
      WHERE note_id = $1 AND user_id = $2 AND removed = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [noteId, userId]);
    return results.length > 0;
  }

  /**
   * Processa URLs assinadas para avatares em notas e colaboradores
   * @param {Array} notes - Array de notas
   * @returns {Promise<Array>} - Notas com URLs assinadas
   */
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

module.exports = new notesRepository();
