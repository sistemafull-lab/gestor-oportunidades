import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Schema por defecto
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mydatabase',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Opcional: fijar search_path al schema por defecto
pool.query(`SET search_path TO ${DB_SCHEMA}`)
    .then(() => console.log(`✅ Conectado a PostgreSQL usando schema '${DB_SCHEMA}'`))
    .catch(err => console.error('❌ Error fijando schema', err));

pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente de la base de datos', err);
  process.exit(-1);
});

export const db = {
  query: async (text: string, params: any[] = []) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Error ejecutando la consulta:', { text, params, error });
      throw error;
    }
  },
  table: (tableName: string) => {
    const qualifiedTable = `${DB_SCHEMA}.${tableName}`; // usa schema
    return {
      find: async (id: number) => {
        const { rows } = await db.query(`SELECT * FROM ${qualifiedTable} WHERE id = $1`, [id]);
        return rows[0];
      },
      select: async (columns: string = '*') => {
        const { rows } = await db.query(`SELECT ${columns} FROM ${qualifiedTable}`);
        return rows;
      },
      where: (field: string, value: any) => ({
        select: async (columns: string = '*') => {
          const { rows } = await db.query(`SELECT ${columns} FROM ${qualifiedTable} WHERE ${field} = $1`, [value]);
          return rows;
        },
        count: async () => {
          const { rows } = await db.query(`SELECT COUNT(*) as count FROM ${qualifiedTable} WHERE ${field} = $1`, [value]);
          return parseInt(rows[0].count, 10);
        }
      }),
      insert: async (data: any) => {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(data);
        const { rows } = await db.query(
          `INSERT INTO ${qualifiedTable} (${columns}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        return rows[0];
      },
      update: async (id: number, data: any) => {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const assignments = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(data)];

        let query = `UPDATE ${qualifiedTable} SET ${assignments}`;

        // Timestamp solo si aplica
        const tablesWithTimestamp = ['opportunities', 'opportunity_observations'];
        if (tablesWithTimestamp.includes(tableName)) {
          query += `, updated_at = CURRENT_TIMESTAMP`;
        }

        query += ` WHERE id = $1 RETURNING *`;

        try {
          const { rows } = await db.query(query, values);
          return rows[0];
        } catch (error) {
          console.error(`Error updating table ${qualifiedTable}:`, error);
          throw error;
        }
      }
    };
  }
};
