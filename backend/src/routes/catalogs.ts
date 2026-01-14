import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// --- EMPLOYEES ---
router.get('/employees', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT e.*, r.name as role_name 
            FROM employees e 
            JOIN job_roles r ON e.role_id = r.id
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.post('/employees', async (req, res) => {
    try {
        const { full_name, role_id, is_active } = req.body;
        const newRecord = await db.table('employees').insert({ full_name, role_id, is_active });
        res.status(201).json(newRecord);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.put('/employees/:id', async (req, res) => {
    try {
        const { full_name, role_id, is_active } = req.body;
        const cleanData: any = {};
        if (full_name !== undefined) cleanData.full_name = full_name;
        if (role_id !== undefined) cleanData.role_id = role_id;
        if (is_active !== undefined) cleanData.is_active = is_active;

        const updated = await db.table('employees').update(parseInt(req.params.id), cleanData);
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/employees/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE manager_id = $1 OR responsible_dc_id = $1 OR responsible_business_id = $1 OR responsible_tech_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) return res.status(400).json({ error: 'Empleado tiene oportunidades asignadas' });
        
        await db.query('DELETE FROM employees WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// --- JOB ROLES ---
router.get('/job-roles', async (req, res) => {
    try {
        const rows = await db.table('job_roles').select();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.post('/job-roles', async (req, res) => {
    try {
        const { name } = req.body;
        const newRecord = await db.table('job_roles').insert({ name });
        res.status(201).json(newRecord);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/job-roles/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM employees WHERE role_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) return res.status(400).json({ error: 'Existen empleados con este puesto' });
        
        await db.query('DELETE FROM job_roles WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// --- STATUSES ---
router.get('/statuses', async (req, res) => {
    try {
        const rows = await db.table('opportunity_statuses').select();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// --- OPP TYPES ---
router.get('/opp-types', async (req, res) => {
    try {
        const rows = await db.table('opportunity_types').select();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// --- MOTIVES ---
router.get('/motives', async (req, res) => {
    try {
        const rows = await db.table('motives').select();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.post('/motives', async (req, res) => {
    try {
        const { name } = req.body;
        const newRecord = await db.table('motives').insert({ name });
        res.status(201).json(newRecord);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.put('/motives/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const updated = await db.table('motives').update(parseInt(req.params.id), { name });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/motives/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE motive_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) return res.status(400).json({ error: 'Existen oportunidades con este motivo' });
        
        await db.query('DELETE FROM motives WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

export default router;
