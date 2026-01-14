import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// Obtener todas las observaciones de una oportunidad específica (ordenadas por fecha descendente)
router.get('/opportunities/:id/observations', async (req, res) => {
    try {
        const opportunityId = parseInt(req.params.id, 10);
        if (isNaN(opportunityId)) return res.status(400).json({ error: 'Invalid opportunity ID' });

        const { rows } = await db.query(
            'SELECT * FROM opportunity_observations WHERE opportunity_id = $1 ORDER BY created_at DESC', 
            [opportunityId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Agregar una observación a una oportunidad
router.post('/opportunities/:id/observations', async (req, res) => {
    try {
        const opportunityId = parseInt(req.params.id, 10);
        const { text } = req.body;
        if (isNaN(opportunityId) || !text) return res.status(400).json({ error: 'Invalid data' });

        const newObservation = await db.table('opportunity_observations').insert({
            opportunity_id: opportunityId,
            text
        });
        res.status(201).json(newObservation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Editar una observación
router.put('/observations/:id', async (req, res) => {
    try {
        const observationId = parseInt(req.params.id, 10);
        const { text } = req.body;
        if (isNaN(observationId) || !text) return res.status(400).json({ error: 'Invalid data' });

        const updated = await db.table('opportunity_observations').update(observationId, { text });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Eliminar una observación
router.delete('/observations/:id', async (req, res) => {
    try {
        const observationId = parseInt(req.params.id, 10);
        if (isNaN(observationId)) return res.status(400).json({ error: 'Invalid observation ID' });

        await db.query('DELETE FROM opportunity_observations WHERE id = $1', [observationId]);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
