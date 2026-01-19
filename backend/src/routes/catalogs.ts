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
            ORDER BY e.full_name
        `);
        res.json(rows);
    } catch (e) { 
        console.error('Error fetching employees:', e);
        res.status(500).json({ error: 'Error fetching employees' }); 
    }
});

router.post('/employees', async (req, res) => {
    try {
        const { full_name, role_id, is_active } = req.body;
        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({ error: 'El nombre completo del empleado es obligatorio.' });
        }
        if (!role_id) {
            return res.status(400).json({ error: 'El puesto del empleado es obligatorio.' });
        }
        const newRecord = await db.table('employees').insert({ full_name, role_id, is_active });
        res.status(201).json(newRecord);
    } catch (error: any) {
        console.error('Error creating employee:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un empleado con el nombre '${req.body.full_name}'.` });
        }
        res.status(500).json({ error: 'Error creating employee' }); 
    }
});

router.put('/employees/:id', async (req, res) => {
    try {
        const { full_name, role_id, is_active } = req.body;
        const id = parseInt(req.params.id);
        if (full_name !== undefined && !String(full_name).trim()) {
            return res.status(400).json({ error: 'El nombre completo del empleado es obligatorio.' });
        }
        if (role_id !== undefined && !role_id) {
            return res.status(400).json({ error: 'El puesto del empleado es obligatorio.' });
        }
        const updated = await db.table('employees').update(id, { full_name, role_id, is_active });
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating employee:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe otro empleado con el nombre '${req.body.full_name}'.` });
        }
        res.status(500).json({ error: 'Error updating employee' }); 
    }
});

router.delete('/employees/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE manager_id = $1 OR responsible_dc_id = $1 OR responsible_business_id = $1 OR responsible_tech_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) {
            return res.status(400).json({ error: 'El empleado tiene oportunidades asignadas y no puede ser eliminado.' });
        }
        await db.query('DELETE FROM employees WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { 
        console.error('Error deleting employee:', e);
        res.status(500).json({ error: 'Error deleting employee' }); 
    }
});

// --- JOB ROLES ---
router.get('/job-roles', async (req, res) => {
    try {
        const rows = await db.table('job_roles').select();
        res.json(rows);
    } catch (e) { 
        console.error('Error fetching job roles:', e);
        res.status(500).json({ error: 'Error fetching job roles' }); 
    }
});

router.post('/job-roles', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'El nombre del puesto es obligatorio.' });
        }
        const newRecord = await db.table('job_roles').insert({ name });
        res.status(201).json(newRecord);
    } catch (error: any) {
        console.error('Error creating job role:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un puesto con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error creating job role' }); 
    }
});

router.put('/job-roles/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const id = parseInt(req.params.id);
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'El nombre del puesto es obligatorio.' });
        }
        const updated = await db.table('job_roles').update(id, { name });
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating job role:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un puesto con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error updating job role' });
    }
});

router.delete('/job-roles/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM employees WHERE role_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) {
            return res.status(400).json({ error: 'Existen empleados con este puesto y no puede ser eliminado.' });
        }
        await db.query('DELETE FROM job_roles WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { 
        console.error('Error deleting job role:', e);
        res.status(500).json({ error: 'Error deleting job role' }); 
    }
});

// --- STATUSES ---
router.get('/statuses', async (req, res) => {
    try {
        const rows = await db.table('opportunity_statuses').select();
        res.json(rows);
    } catch (e) { 
        console.error('Error fetching statuses:', e);
        res.status(500).json({ error: 'Error fetching statuses' }); 
    }
});

router.post('/statuses', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'El nombre del estado es obligatorio.' });
        const newRecord = await db.table('opportunity_statuses').insert({ name });
        res.status(201).json(newRecord);
    } catch (error: any) {
        console.error('Error creating status:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un estado con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error creating status' });
    }
});

router.put('/statuses/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const id = parseInt(req.params.id);
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'El nombre del estado es obligatorio.' });
        const updated = await db.table('opportunity_statuses').update(id, { name });
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating status:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un estado con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error updating status' });
    }
});

router.delete('/statuses/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE status_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) {
            return res.status(400).json({ error: 'Existen oportunidades con este estado y no puede ser eliminado.' });
        }
        await db.query('DELETE FROM opportunity_statuses WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { 
        console.error('Error deleting status:', e);
        res.status(500).json({ error: 'Error deleting status' }); 
    }
});

// --- OPP TYPES ---
router.get('/opp-types', async (req, res) => {
    try {
        const rows = await db.table('opportunity_types').select();
        res.json(rows);
    } catch (e) { 
        console.error('Error fetching opportunity types:', e);
        res.status(500).json({ error: 'Error fetching opportunity types' }); 
    }
});

router.post('/opp-types', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'El nombre del tipo de oportunidad es obligatorio.' });
        }
        const newRecord = await db.table('opportunity_types').insert({ name });
        res.status(201).json(newRecord);
    } catch (error: any) {
        console.error('Error creating opportunity type:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un tipo de oportunidad con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error creating opportunity type' });
    }
});

router.put('/opp-types/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const id = parseInt(req.params.id);
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'El nombre del tipo de oportunidad es obligatorio.' });
        }
        const updated = await db.table('opportunity_types').update(id, { name });
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating opportunity type:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un tipo de oportunidad con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error updating opportunity type' });
    }
});

router.delete('/opp-types/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE opportunity_type_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) {
            return res.status(400).json({ error: 'Existen oportunidades con este tipo y no puede ser eliminado.' });
        }
        await db.query('DELETE FROM opportunity_types WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { 
        console.error('Error deleting opportunity type:', e);
        res.status(500).json({ error: 'Error deleting opportunity type' }); 
    }
});


// --- MOTIVES ---
router.get('/motives', async (req, res) => {
    try {
        const rows = await db.table('motives').select();
        res.json(rows);
    } catch (e) { 
        console.error('Error fetching motives:', e);
        res.status(500).json({ error: 'Error fetching motives' }); 
    }
});

router.post('/motives', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'El nombre del motivo es obligatorio.' });
        }
        const newRecord = await db.table('motives').insert({ name });
        res.status(201).json(newRecord);
    } catch (error: any) {
        console.error('Error creating motive:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un motivo con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error creating motive' }); 
    }
});

router.put('/motives/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const id = parseInt(req.params.id);
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'El nombre del motivo es obligatorio.' });
        }
        const updated = await db.table('motives').update(id, { name });
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating motive:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un motivo con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Error updating motive' }); 
    }
});

router.delete('/motives/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE motive_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) {
            return res.status(400).json({ error: 'Existen oportunidades con este motivo y no puede ser eliminado.' });
        }
        await db.query('DELETE FROM motives WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) { 
        console.error('Error deleting motive:', e);
        res.status(500).json({ error: 'Error deleting motive' }); 
    }
});

export default router;
