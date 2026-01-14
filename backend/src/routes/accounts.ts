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
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create account
router.post('/accounts', async (req, res) => {
    try {
        const { name, contact_name, contact_email, is_active } = req.body;
        if (!name) return res.status(400).json({ error: 'Account name is required' });

        const newAccount = await db.table('accounts').insert({
            name,
            contact_name,
            contact_email,
            is_active: is_active !== undefined ? is_active : true
        });
        res.status(201).json(newAccount);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update account
router.put('/accounts/:id', async (req, res) => {
    try {
        const { name, contact_name, contact_email, is_active } = req.body;
        const accountId = parseInt(req.params.id, 10);
        if (isNaN(accountId)) return res.status(400).json({ error: 'Invalid account ID' });

        if (is_active === false) {
            const { rows } = await db.query(
                'SELECT COUNT(*) FROM opportunities WHERE account_id = $1 AND is_archived = FALSE AND deleted_at IS NULL',
                [accountId]
            );
            const activeOppsCount = parseInt(rows[0].count, 10);
            if (activeOppsCount > 0) {
                return res.status(400).json({ error: `No se puede desactivar la cuenta porque tiene ${activeOppsCount} oportunidades activas.` });
            }
        }
        
        const updatedAccount = await db.table('accounts').update(accountId, { name, contact_name, contact_email, is_active });
        res.json(updatedAccount);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE account
router.delete('/accounts/:id', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id, 10);
        if (isNaN(accountId)) return res.status(400).json({ error: 'Invalid account ID' });

        const { rows } = await db.query('SELECT COUNT(*) FROM opportunities WHERE account_id = $1', [accountId]);
        if (parseInt(rows[0].count, 10) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar la cuenta porque tiene oportunidades asociadas.' });
        }

        await db.query('DELETE FROM accounts WHERE id = $1', [accountId]);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
