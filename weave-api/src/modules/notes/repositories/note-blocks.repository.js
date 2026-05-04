const BaseRepository = require("./base.repository");
const { getConnection } = require("@/database/connection");
const {
  flattenBlocksForInsert,
  mergeBlockPropertiesPatch,
  validateBlockPayload,
  newBlockId,
} = require("../block-normalizer");

/**
 * Blocos de nota (`note_blocks`).
 */
class NoteBlocksRepository extends BaseRepository {
  /**
   * Linhas planas ordenadas para montagem da árvore.
   * @param {string} noteId
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async findRowsByNoteId(noteId) {
    const query = `
      SELECT
        id::text,
        note_id::text,
        parent_id::text,
        type,
        properties,
        position,
        version,
        created_by::text,
        created_at,
        updated_at
      FROM note_blocks
      WHERE note_id = $1 AND deleted = false
      ORDER BY parent_id NULLS FIRST, position ASC, created_at ASC
    `;
    return await this.executeQuery(query, [noteId]);
  }

  /**
   * @param {string} blockId
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async findById(blockId) {
    const query = `
      SELECT
        id::text,
        note_id::text,
        parent_id::text,
        type,
        properties,
        position,
        version,
        created_by::text,
        created_at,
        updated_at
      FROM note_blocks
      WHERE id = $1 AND deleted = false
      LIMIT 1
    `;
    const rows = await this.executeQuery(query, [blockId]);
    return rows[0] || null;
  }

  /**
   * Monta árvore de blocos no formato esperado pelo front (children em listas).
   * @param {Array<Record<string, unknown>>} rows
   * @param {number} level
   * @returns {Array<Record<string, unknown>>}
   */
  /**
   * @param {string} noteId
   * @returns {Promise<Array<Record<string, unknown>>>}
   */
  async findTreeByNoteId(noteId) {
    const rows = await this.findRowsByNoteId(noteId);
    return this.buildBlocksTree(rows);
  }

  buildBlocksTree(rows, level = 0) {
    const ROOT = "__root__";
    /** @type {Map<string, Array<Record<string, unknown>>>} */
    const byParent = new Map();

    for (const r of rows) {
      const pid = r.parent_id ? String(r.parent_id) : ROOT;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(r);
    }

    for (const list of byParent.values()) {
      list.sort((a, b) => Number(a.position) - Number(b.position));
    }

    /**
     * @param {string} parentKey
     * @param {number} depth
     */
    const walk = (parentKey, depth) => {
      const siblings = byParent.get(parentKey) || [];
      return siblings.map((r) => {
        const props =
          r.properties && typeof r.properties === "object"
            ? r.properties
            : {};
        const text = typeof props.text === "string" ? props.text : "";
        const node = {
          id: String(r.id),
          note_id: String(r.note_id),
          parent_id: r.parent_id ? String(r.parent_id) : null,
          position: Number(r.position),
          type: r.type,
          version: Number(r.version),
          text,
          properties: props,
          level: depth,
        };
        if (r.type === "todo") {
          node.done = props.attrs?.checked === true;
        }
        if (r.type === "list") {
          node.children = walk(String(r.id), depth + 1);
        } else {
          node.children = [];
        }
        return node;
      });
    };

    return walk(ROOT, level);
  }

  /**
   * @param {string} noteId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async insertDefaultParagraph(noteId, userId) {
    const query = `
      INSERT INTO note_blocks (
        note_id, parent_id, type, properties, position, version, created_by
      )
      VALUES ($1, NULL, 'paragraph', '{}'::jsonb, 0, 1, $2)
    `;
    await this.executeQuery(query, [noteId, userId]);
  }

  /**
   * @param {string} noteId
   * @param {string} userId
   * @param {unknown[]} blocksTree
   * @returns {Promise<number>} número de linhas inseridas
   */
  async bulkInsert(noteId, userId, blocksTree) {
    const rows = flattenBlocksForInsert(blocksTree, noteId, userId, null, 0);
    if (rows.length === 0) return 0;

    const client = await getConnection();
    try {
      await client.query("BEGIN");
      for (const row of rows) {
        await client.query(
          `
          INSERT INTO note_blocks (
            id, note_id, parent_id, type, properties, position, version, created_by
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb, $6, 1, $7::uuid)
        `,
          [
            row.id,
            row.note_id,
            row.parent_id,
            row.type,
            JSON.stringify(row.properties || {}),
            row.position,
            row.created_by,
          ]
        );
      }
      await client.query("COMMIT");
      return rows.length;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * @param {string} noteId
   * @param {string} userId
   * @param {{ type?: string, parent_id?: string | null, position?: number, properties?: Record<string, unknown>, text?: string, done?: boolean }} data
   * @returns {Promise<Record<string, unknown>>}
   */
  async insert(noteId, userId, data) {
    const id = newBlockId();
    const validated = validateBlockPayload(
      {
        id,
        type: data.type || "paragraph",
        properties: data.properties,
        text: data.text,
        done: data.done,
      },
      "block",
      0
    );

    const parentId =
      data.parent_id === undefined || data.parent_id === null || data.parent_id === ""
        ? null
        : String(data.parent_id);

    let position = data.position;
    if (position === undefined || position === null) {
      const maxRow = await this.executeQuery(
        `
        SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
        FROM note_blocks
        WHERE note_id = $1 AND deleted = false
          AND (
            ($2::uuid IS NULL AND parent_id IS NULL)
            OR (parent_id = $2::uuid)
          )
      `,
        [noteId, parentId]
      );
      position = Number(maxRow[0]?.next_pos ?? 0);
    }

    const query = `
      INSERT INTO note_blocks (
        id, note_id, parent_id, type, properties, position, version, created_by
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb, $6, 1, $7::uuid)
      RETURNING
        id::text,
        note_id::text,
        parent_id::text,
        type,
        properties,
        position,
        version,
        created_by::text,
        created_at,
        updated_at
    `;
    const rows = await this.executeQuery(query, [
      validated.id,
      noteId,
      parentId,
      validated.type,
      JSON.stringify(validated.properties || {}),
      Number(position),
      userId,
    ]);
    const row = rows[0];
    return this._rowToApiBlock(row);
  }

  /**
   * @param {string} blockId
   * @param {{ type?: string, properties?: Record<string, unknown>, position?: number, text?: string, done?: boolean }} patch
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async update(blockId, patch) {
    const existing = await this.findById(blockId);
    if (!existing) return null;

    const blockType = patch.type !== undefined ? String(patch.type) : String(existing.type);
    let properties = existing.properties;
    if (typeof properties === "string") {
      try {
        properties = JSON.parse(properties);
      } catch {
        properties = {};
      }
    }
    if (!properties || typeof properties !== "object") properties = {};

    if (
      patch.text !== undefined ||
      patch.done !== undefined ||
      patch.properties !== undefined
    ) {
      const propsPatch = { ...(patch.properties || {}) };
      if (patch.text !== undefined) propsPatch.text = patch.text;
      if (patch.done !== undefined && blockType === "todo") {
        propsPatch.attrs = {
          ...(propsPatch.attrs && typeof propsPatch.attrs === "object"
            ? propsPatch.attrs
            : {}),
          checked: patch.done === true,
        };
      }
      properties = mergeBlockPropertiesPatch(blockType, propsPatch, properties);
    }

    const sets = [];
    const values = [];
    let i = 1;

    if (patch.type !== undefined) {
      sets.push(`type = $${i++}`);
      values.push(blockType);
    }
    sets.push(`properties = $${i++}::jsonb`);
    values.push(JSON.stringify(properties));

    if (patch.position !== undefined) {
      sets.push(`position = $${i++}`);
      values.push(Number(patch.position));
    }

    sets.push(`version = version + 1`);
    sets.push(`updated_at = NOW()`);
    values.push(blockId);

    const query = `
      UPDATE note_blocks
      SET ${sets.join(", ")}
      WHERE id = $${i}::uuid AND deleted = false
      RETURNING
        id::text,
        note_id::text,
        parent_id::text,
        type,
        properties,
        position,
        version,
        created_by::text,
        created_at,
        updated_at
    `;
    const rows = await this.executeQuery(query, values);
    const row = rows[0];
    return row ? this._rowToApiBlock(row) : null;
  }

  /**
   * @param {string[]} blockIds
   * @returns {Promise<number>}
   */
  /**
   * Remove físico de todos os blocos da nota (para sync em massa).
   * @param {string} noteId
   * @returns {Promise<number>}
   */
  async deleteAllByNoteId(noteId) {
    const query = `DELETE FROM note_blocks WHERE note_id = $1::uuid`;
    return await this.rowCount(query, [noteId]);
  }

  async softDelete(blockIds) {
    if (!Array.isArray(blockIds) || blockIds.length === 0) return 0;
    const query = `
      UPDATE note_blocks
      SET deleted = true, deleted_at = NOW(), updated_at = NOW()
      WHERE id = ANY($1::uuid[]) AND deleted = false
    `;
    const n = await this.rowCount(query, [blockIds]);
    return n;
  }

  /**
   * @param {string} noteId
   * @param {string | null} parentId
   * @param {string[]} orderedIds
   * @returns {Promise<number>}
   */
  async reorder(noteId, parentId, orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return 0;

    const client = await getConnection();
    try {
      await client.query("BEGIN");
      let updated = 0;
      const rootParent =
        parentId === null || parentId === undefined || parentId === "";

      for (let idx = 0; idx < orderedIds.length; idx++) {
        const blockId = orderedIds[idx];
        const sql = rootParent
          ? `
          UPDATE note_blocks
          SET position = $1, version = version + 1, updated_at = NOW()
          WHERE id = $2::uuid AND note_id = $3::uuid AND deleted = false AND parent_id IS NULL
        `
          : `
          UPDATE note_blocks
          SET position = $1, version = version + 1, updated_at = NOW()
          WHERE id = $2::uuid AND note_id = $3::uuid AND deleted = false AND parent_id = $4::uuid
        `;
        const params = rootParent
          ? [idx, blockId, noteId]
          : [idx, blockId, noteId, parentId];
        const res = await client.query(sql, params);
        updated += res.rowCount || 0;
      }
      await client.query("COMMIT");
      return updated;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * @param {Record<string, unknown>} row
   * @returns {Record<string, unknown>}
   */
  _rowToApiBlock(row) {
    const props =
      row.properties && typeof row.properties === "object"
        ? row.properties
        : {};
    const text = typeof props.text === "string" ? props.text : "";
    const out = {
      id: String(row.id),
      note_id: String(row.note_id),
      parent_id: row.parent_id ? String(row.parent_id) : null,
      position: Number(row.position),
      type: row.type,
      version: Number(row.version),
      text,
      properties: props,
      level: 0,
      children: row.type === "list" ? [] : [],
    };
    if (row.type === "todo") {
      out.done = props.attrs?.checked === true;
    }
    return out;
  }
}

module.exports = new NoteBlocksRepository();
