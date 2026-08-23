import { Pool, PoolConfig, QueryResultRow } from 'pg';

export let pool: Pool | null = null;

export function initPgPool(config: PoolConfig) {
  if (!pool) {
    // Managed databases usually require SSL
    const finalConfig = {
      ...config,
      ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : undefined,
    };
    pool = new Pool(finalConfig);
    pool.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
    });
  }
}

export async function executeQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) {
  if (!pool) throw new Error('Database pool not initialized');
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function rowCount(
  text: string,
  params?: any[]
): Promise<number> {
  if (!pool) throw new Error('Database pool not initialized');
  const result = await pool.query(text, params);
  return result.rowCount || 0;
}

export async function getConnection() {
  if (!pool) throw new Error('Database pool not initialized');
  return pool.connect();
}

export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await getConnection();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
