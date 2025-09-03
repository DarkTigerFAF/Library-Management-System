const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { sequelize, User } = require('../models');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['ADMIN', 'BORROWER']),
    body('registered_date').optional().isISO8601().toDate(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const t = await sequelize.transaction();
    try {
      const { name, email, password, role = 'BORROWER', registered_date } = req.body;
      const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash, role, registered_date: registered_date ? new Date(registered_date) : new Date() }, { transaction: t });
      await t.commit();
      res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
      await t.rollback();
      if (err.name === 'SequelizeUniqueConstraintError') {
        err.status = 409; err.message = 'Email already exists';
      }
      next(err);
    }
  }
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'change_me', { expiresIn: '12h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
