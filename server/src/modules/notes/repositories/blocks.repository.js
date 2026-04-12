const BaseRepository = require("./base.repository");

/**
 * Blocos hierárquicos de notas.
 */
class BlocksRepository extends BaseRepository {
  /**
   * @param {string} noteId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async getBlocksByNoteId(noteId) {
    const query = `
      WITH RECURSIVE block_tree AS (
        SELECT 
          id,
          note_id,
          user_id,
          parent_id,
          type,
          text,
          properties,
          done,
          position,
          created_at,
          updated_at,
          0 as level
        FROM blocks 
        WHERE note_id = $1 
          AND parent_id IS NULL 
          AND deleted = false

        UNION ALL

        SELECT 
          b.id,
          b.note_id,
          b.user_id,
          b.parent_id,
          b.type,
          b.text,
          b.properties,
          b.done,
          b.position,
          b.created_at,
          b.updated_at,
          bt.level + 1
        FROM blocks b
        INNER JOIN block_tree bt ON b.parent_id = bt.id
        WHERE b.deleted = false
      )
      SELECT 
        id::text,
        note_id::text,
        user_id::text,
        parent_id::text,
        type,
        text,
        properties,
        done,
        position,
        level,
        created_at,
        updated_at
      FROM block_tree
      ORDER BY level, position;
    `;

    return await this.executeQuery(query, [noteId]);
  }

  /**
   * @param {string} blockId
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async getBlockById(blockId) {
    const query = `
      SELECT 
        id::text,
        note_id::text,
        user_id::text,
        parent_id::text,
        type,
        text,
        properties,
        done,
        position,
        created_at,
        updated_at
      FROM blocks 
      WHERE id = $1 AND deleted = false
    `;

    const results = await this.executeQuery(query, [blockId]);
    return results[0] || null;
  }

  /**
   * @param {Object} blockData
   * @returns {Promise<Record<string, unknown>>}
   */
  async createBlock({
    noteId,
    userId,
    parentId = null,
    type,
    text = "",
    properties = {},
    done = false,
    position,
  }) {
    if (position === undefined) {
      position = await this._getNextPosition(noteId, parentId);
    }

    const query = `
      INSERT INTO blocks (
        note_id, user_id, parent_id, type, text, 
        properties, done, position
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id::text,
        note_id::text,
        user_id::text,
        parent_id::text,
        type,
        text,
        properties,
        done,
        position,
        created_at,
        updated_at;
    `;

    const results = await this.executeQuery(query, [
      noteId,
      userId,
      parentId,
      type,
      text,
      JSON.stringify(properties),
      done,
      position,
    ]);

    return results[0];
  }

  /**
   * @param {string} blockId
   * @param {Record<string, unknown>} updateData
   * @returns {Promise<Record<string, unknown>>}
   */
  async updateBlock(blockId, updateData) {
    const allowedFields = ["type", "text", "properties", "done", "position"];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach((field) => {
      if (allowedFields.includes(field) && updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);

        if (field === "properties") {
          values.push(JSON.stringify(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error("Nenhum campo válido para atualizar");
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(blockId);

    const query = `
      UPDATE blocks 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex} AND deleted = false
      RETURNING 
        id::text,
        note_id::text,
        user_id::text,
        parent_id::text,
        type,
        text,
        properties,
        done,
        position,
        created_at,
        updated_at;
    `;

    const results = await this.executeQuery(query, values);
    return results[0];
  }

  /**
   * @param {string} blockId
   * @returns {Promise<void>}
   */
  async deleteBlock(blockId) {
    const query = `
      UPDATE blocks 
      SET deleted = true, updated_at = NOW()
      WHERE id = $1;
    `;

    await this.executeQuery(query, [blockId]);
  }

  /**
   * @param {{ id: string, position: number }[]} blockPositions
   * @returns {Promise<void>}
   */
  async reorderBlocks(blockPositions) {
    const queries = blockPositions.map(({ id, position }) => ({
      query: `UPDATE blocks SET position = $1, updated_at = NOW() WHERE id = $2`,
      params: [position, id],
    }));

    for (const { query, params } of queries) {
      await this.executeQuery(query, params);
    }
  }

  /**
   * @param {string} noteId
   * @param {string|null} [parentId=null]
   * @returns {Promise<number>}
   */
  async _getNextPosition(noteId, parentId = null) {
    const query = `
      SELECT COALESCE(MAX(position), 0) + 1 as next_position
      FROM blocks 
      WHERE note_id = $1 
        AND parent_id ${parentId ? "= $2" : "IS NULL"}
        AND deleted = false;
    `;

    const params = parentId ? [noteId, parentId] : [noteId];
    const results = await this.executeQuery(query, params);

    return results[0].next_position;
  }

  /**
   * @param {Record<string, unknown>[]} blocks
   * @returns {Record<string, unknown>[]}
   */
  buildBlockTree(blocks) {
    const blockMap = new Map();
    const rootBlocks = [];

    blocks.forEach((block) => {
      block.children = [];
      blockMap.set(block.id, block);
    });

    blocks.forEach((block) => {
      if (block.parent_id) {
        const parent = blockMap.get(block.parent_id);
        if (parent) {
          parent.children.push(block);
        }
      } else {
        rootBlocks.push(block);
      }
    });

    const sortChildren = (block) => {
      block.children.sort((a, b) => a.position - b.position);
      block.children.forEach(sortChildren);
    };

    rootBlocks.forEach(sortChildren);
    return rootBlocks.sort((a, b) => a.position - b.position);
  }
}

module.exports = new BlocksRepository();
