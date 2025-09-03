const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticateJWT, ownerOrAdmin, requireRole } = require('../middlewares/auth');
const {
  idParamValidator,
  listSearchValidator,
} = require('../validators');

// Helper for pagination
const getPagination = (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
};

const router = express.Router();
router.use(authenticateJWT);

// Update borrower
router.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const [count, rows] = await User.update(req.body, { 
      where: { id: req.params.id, role: 'BORROWER' }, 
      returning: true 
    });
    if (count === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { 
    next(err); 
  }
});

// Delete borrower
router.delete('/:id', idParamValidator, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id, role: 'BORROWER' } });
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) { 
    next(err); 
  }
});

// List borrowers (simple list with pagination and optional q search on name/email)
router.get('/', requireRole('ADMIN'), listSearchValidator, async (req, res, next) => {
  try {
    const { q } = req.query;
    const { limit, offset } = getPagination(req.query);
    const where = { role: 'BORROWER' };
    
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } }, 
        { email: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    const { rows, count } = await User.findAndCountAll({ 
      where, 
      limit, 
      offset, 
      order: [['name', 'ASC']] 
    });
    
    const data = rows.map(u => ({ 
      id: u.id, 
      name: u.name, 
      email: u.email, 
      registered_date: u.registered_date 
    }));
    
    res.json({ data, total: count, limit, offset });
  } catch (err) {
    next(err);
  }
});

// Get borrower by id
router.get('/:id', idParamValidator, ownerOrAdmin(async (req) => req.params.id), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'BORROWER') return res.status(404).json({ error: 'User not found' });
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      registered_date: user.registered_date 
    });
  } catch (err) { 
    next(err); 
  }
});

module.exports = () => router;
