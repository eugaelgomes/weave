/* eslint-disable quotes */
const { executeQuery } = require("@/services/db/db-connection");

class BlocksRepository {
  // ========================================
  // CONSULTAS DE BLOCOS
  // ========================================

  /**
   * Busca todos os blocos de uma nota com estrutura hierárquica
   * @param {string} noteId - ID da nota
   * @returns {Array} - Blocos organizados hierarquicamente
   */
  async getBlocksByNoteId(noteId) {
    const query = `
      WITH RECURSIVE block_tree AS (
        -- Blocos raiz (sem parent_id)
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

        -- Blocos filhos (recursivo)
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

    return await executeQuery(query, [noteId]);
  }

  /**
   * Busca um bloco específico
   * @param {string} blockId - ID do bloco
   * @returns {Object|null} - Dados do bloco
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

    const results = await executeQuery(query, [blockId]);
    return results[0] || null;
  }

  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  /**
   * Cria um novo bloco
   * @param {Object} blockData - Dados do bloco
   * @returns {Object} - Bloco criado
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
    // Se position não fornecida, busca a próxima posição
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

    const results = await executeQuery(query, [
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
   * Atualiza um bloco existente
   * @param {string} blockId - ID do bloco
   * @param {Object} updateData - Dados para atualizar
   * @returns {Object} - Bloco atualizado
   */
  async updateBlock(blockId, updateData) {
    const allowedFields = ["type", "text", "properties", "done", "position"];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Constrói dinamicamente a query UPDATE
    Object.keys(updateData).forEach((field) => {
      if (allowedFields.includes(field) && updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);

        // Converte properties para JSON se necessário
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

    const results = await executeQuery(query, values);
    return results[0];
  }

  /**
   * Marca um bloco como deletado (soft delete)
   * @param {string} blockId - ID do bloco
   */
  async deleteBlock(blockId) {
    const query = `
      UPDATE blocks 
      SET deleted = true, updated_at = NOW()
      WHERE id = $1;
    `;

    await executeQuery(query, [blockId]);
  }

  /**
   * Reordena blocos atualizando suas posições
   * @param {Array} blockPositions - Array de {id, position}
   */
  async reorderBlocks(blockPositions) {
    const queries = blockPositions.map(({ id, position }) => ({
      query: `UPDATE blocks SET position = $1, updated_at = NOW() WHERE id = $2`,
      params: [position, id],
    }));

    // Executa todas as atualizações em uma transação
    for (const { query, params } of queries) {
      await executeQuery(query, params);
    }
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Calcula a próxima posição para um bloco
   * @param {string} noteId - ID da nota
   * @param {string|null} parentId - ID do bloco pai
   * @returns {number} - Próxima posição
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
    const results = await executeQuery(query, params);

    return results[0].next_position;
  }

  /**
   * Organiza blocos em estrutura hierárquica (árvore)
   * @param {Array} blocks - Lista plana de blocos
   * @returns {Array} - Blocos organizados hierarquicamente
   */
  buildBlockTree(blocks) {
    const blockMap = new Map();
    const rootBlocks = [];

    // Primeira passagem: criar mapa de blocos
    blocks.forEach((block) => {
      block.children = [];
      blockMap.set(block.id, block);
    });

    // Segunda passagem: construir árvore
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

    // Ordenar filhos por posição
    const sortChildren = (block) => {
      block.children.sort((a, b) => a.position - b.position);
      block.children.forEach(sortChildren);
    };

    rootBlocks.forEach(sortChildren);
    return rootBlocks.sort((a, b) => a.position - b.position);
  }
}

module.exports = new BlocksRepository();
