import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mydatabase',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  // Deshabilitar SSL si conectamos a localhost (ej. vía Cloud SQL Proxy)
  ssl: (process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost') 
       ? false 
       : { rejectUnauthorized: false }
});

// Agregamos un listener para capturar errores de conexión en el pool
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
  table: (tableName: string) => ({
    find: async (id: number) => {
        const { rows } = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
        return rows[0];
    },
    select: async (columns: string = '*') => {
        const { rows } = await db.query(`SELECT ${columns} FROM ${tableName}`);
        return rows;
    },
    where: (field: string, value: any) => {
        return {
            select: async (columns: string = '*') => {
                const { rows } = await db.query(`SELECT ${columns} FROM ${tableName} WHERE ${field} = $1`, [value]);
                return rows;
            },
            count: async () => {
                const { rows } = await db.query(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${field} = $1`, [value]);
                return parseInt(rows[0].count, 10);
            }
        }
    },
    insert: async (data: any) => {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(data);
        const { rows } = await db.query(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`, values);
        return rows[0];
    },
    update: async (id: number, data: any) => {
        // Verificar si hay campos para actualizar
        const keys = Object.keys(data);
        if (keys.length === 0) return null; // Nada que actualizar

        const assignments = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(data)];
        
        let query = `UPDATE ${tableName} SET ${assignments}`;
        
        // CORRECCIÓN: Según el esquema (init.sql), las tablas 'employees' y 'accounts' 
        // NO tienen columna 'updated_at', solo 'created_at'.
        // Solo 'opportunities' y 'opportunity_observations' la tienen.
        const tablesWithTimestamp = ['opportunities', 'opportunity_observations'];
        
        if (tablesWithTimestamp.includes(tableName)) {
             query += `, updated_at = CURRENT_TIMESTAMP`;
        }
        
        query += ` WHERE id = $1 RETURNING *`;

        try {
            const { rows } = await db.query(query, values);
            return rows[0];
        } catch (error) {
            console.error(`Error updating table ${tableName}:`, error);
            throw error;
        }
    }
  })
};
