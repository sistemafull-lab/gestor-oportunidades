import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';

const router = Router();

const OpportunitySchema = z.object({
    name: z.string().optional(),
    account_id: z.number().optional(),
    status_id: z.number().optional(),
    opportunity_type_id: z.number().optional().nullable(),
    manager_id: z.number().optional(),
    responsible_dc_id: z.number().nullable().optional(),
    responsible_business_id: z.number().nullable().optional(),
    responsible_tech_id: z.number().nullable().optional(),
    percentage: z.number().optional(),
    color_code: z.string().optional(),
    has_ia_proposal: z.boolean().optional(),
    has_prototype: z.boolean().optional(),
    has_rfp: z.boolean().optional(),
    has_anteproyecto: z.boolean().optional(),
    reason_motive: z.string().nullable().optional(),
    motive_id: z.number().nullable().optional(),
    start_date: z.string().optional(),
    understanding_date: z.string().nullable().optional(),
    engagement_date: z.string().nullable().optional(),
    scope_date: z.string().nullable().optional(),
    coe_date: z.string().nullable().optional(),
    delivery_date: z.string().nullable().optional(),
    commitment_date: z.string().nullable().optional(),
    real_delivery_date: z.string().nullable().optional(),
    estimated_hours: z.number().nullable().optional(),
    estimated_term_months: z.number().optional().nullable(), // Changed to number().optional() to accept decimals
    work_plan_link: z.string().nullable().optional(),
    k_red_index: z.number().optional(),
    order_index: z.number().optional(),
    is_archived: z.boolean().optional()
});

const cleanData = (data: any) => {
    const cleaned: any = {};
    for (const key in data) {
        if (data[key] === "") {
            cleaned[key] = null;
        } else {
            cleaned[key] = data[key];
        }
    }
    return cleaned;
};

router.get('/opportunities', async (req, res) => {
    try {
        const { view } = req.query;
        let query = `
            SELECT o.*, 
                   a.name as account_name, 
                   s.name as status_name, 
                   m.name as motive_name,
                   e1.full_name as manager_name,
                   e2.full_name as dc_name,
                   e3.full_name as neg_name,
                   e4.full_name as tec_name,
                   (SELECT text FROM opportunity_observations WHERE opportunity_id = o.id ORDER BY created_at DESC LIMIT 1) as last_observation
            FROM opportunities o
            JOIN accounts a ON o.account_id = a.id
            JOIN opportunity_statuses s ON o.status_id = s.id
            JOIN employees e1 ON o.manager_id = e1.id
            LEFT JOIN motives m ON o.motive_id = m.id
            LEFT JOIN employees e2 ON o.responsible_dc_id = e2.id
            LEFT JOIN employees e3 ON o.responsible_business_id = e3.id
            LEFT JOIN employees e4 ON o.responsible_tech_id = e4.id
        `;
        
        if (view === 'TRASH') {
            query += ` WHERE o.deleted_at IS NOT NULL`;
        } else if (view === 'ALL') {
            query += ` WHERE o.deleted_at IS NULL`; // ALL (Activas + Históricas) pero no papelera
        } else {
            query += ` WHERE o.deleted_at IS NULL`;
            if (view === 'ON') query += ` AND o.is_archived = FALSE`;
            else if (view === 'ON-OUT') query += ` AND o.is_archived = TRUE`;
        }
        
        // Sorting is now handled on the frontend for active views as per REQ 2
        query += ` ORDER BY o.id DESC`;

        const { rows } = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error in GET /opportunities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/opportunities/max-id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT MAX(id) as max_id FROM opportunities');
        res.json({ max_id: rows[0].max_id || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

router.post('/opportunities', async (req, res) => {
    try {
        const data = cleanData(OpportunitySchema.parse(req.body));
        const result = await db.table('opportunities').insert(data);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in POST /opportunities:', error);
        const msg = error instanceof Error ? error.message : 'Invalid data';
        res.status(400).json({ error: msg });
    }
});

router.put('/opportunities/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = cleanData(OpportunitySchema.parse(req.body));
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
        
        const result = await db.table('opportunities').update(id, data);
        if (!result) return res.status(404).json({ error: 'Not found' });
        res.json(result);
    } catch (error) {
        console.error('Error in PUT /opportunities:', error);
        const msg = error instanceof Error ? error.message : 'Update failed';
        res.status(400).json({ error: msg });
    }
});

router.delete('/opportunities/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.query(`UPDATE opportunities SET deleted_at = NOW() WHERE id = $1`, [id]);
        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/opportunities/:id/permanent', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.query(`DELETE FROM opportunities WHERE id = $1`, [id]);
        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/opportunities/:id/restore', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.query(`UPDATE opportunities SET deleted_at = NULL WHERE id = $1`, [id]);
        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
