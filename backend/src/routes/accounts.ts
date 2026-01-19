import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET all accounts
router.get('/accounts', async (req, res) => {
    try {
        const onlyActive = req.query.active === 'true';
        let rows;
        if (onlyActive) {
            rows = await db.table('accounts').where('is_active', true).select();
        } else {
            rows = await db.table('accounts').select();
        }
        res.json(rows);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create account
router.post('/accounts', async (req, res) => {
    try {
        const { name, contact_name, contact_email, is_active } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'El nombre de la cuenta es obligatorio.' });
        }
        const newAccount = await db.table('accounts').insert({
            name,
            contact_name,
            contact_email,
            is_active: is_active !== undefined ? is_active : true
        });
        res.status(201).json(newAccount);
    } catch (error: any) {
        console.error('Error creating account:', error);
        // Check for unique constraint violation (code for PostgreSQL)
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe una cuenta con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update account
router.put('/accounts/:id', async (req, res) => {
    try {
        const { name, contact_name, contact_email, is_active } = req.body;
        const accountId = parseInt(req.params.id, 10);
        if (isNaN(accountId)) {
            return res.status(400).json({ error: 'ID de cuenta inválido.' });
        }

        if (is_active === false) {
            const result = await db.query(
                'SELECT COUNT(*) FROM opportunities WHERE account_id = $1 AND is_archived = FALSE AND deleted_at IS NULL',
                [accountId]
            );
            const activeOppsCount = parseInt(result.rows[0].count, 10);
            if (activeOppsCount > 0) {
                return res.status(400).json({ error: `No se puede desactivar la cuenta porque tiene ${activeOppsCount} oportunidades activas.` });
            }
        }
        
        const updatedAccount = await db.table('accounts').update(accountId, { name, contact_name, contact_email, is_active });
        res.json(updatedAccount);
    } catch (error: any) {
        console.error('Error updating account:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe otra cuenta con el nombre '${req.body.name}'.` });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE account
router.delete('/accounts/:id', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id, 10);
        if (isNaN(accountId)) {
            return res.status(400).json({ error: 'ID de cuenta inválido.' });
        }

        const result = await db.query('SELECT COUNT(*) FROM opportunities WHERE account_id = $1', [accountId]);
        if (parseInt(result.rows[0].count, 10) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar la cuenta porque tiene oportunidades asociadas.' });
        }

        await db.query('DELETE FROM accounts WHERE id = $1', [accountId]);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
