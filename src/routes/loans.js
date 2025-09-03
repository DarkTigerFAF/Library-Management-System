const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Book, User, BorrowRecord } = require('../models');
const { checkoutValidator, idParamValidator } = require('../validators');
const { authenticateJWT, requireRole } = require('../middlewares/auth');

// Helper for creating errors with status codes
const createError = (message, status = 500) => Object.assign(new Error(message), { status });

const router = express.Router();
router.use(authenticateJWT);

// Create a loan (checkout) - borrower can checkout for themselves; admin can checkout for anyone
router.post('/', checkoutValidator, async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { book_id, user_id: bodyUserId, due_date } = req.body;
    const targetUserId = req.user.role === 'ADMIN' ? bodyUserId : req.user.id;
    
    if (req.user.role !== 'ADMIN' && bodyUserId && String(bodyUserId) !== String(req.user.id)) {
      throw createError('Forbidden', 403);
    }

    const user = await User.findByPk(targetUserId, { transaction: t });
    if (!user) throw createError('User not found', 404);

    const book = await Book.findByPk(book_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!book) throw createError('Book not found', 404);
    if (book.available_quantity <= 0) throw createError('No copies available', 409);

    // Optional idempotency: if Idempotency-Key provided, reuse existing record
    const idempotencyKey = req.header('Idempotency-Key');
    if (idempotencyKey) {
      const existing = await BorrowRecord.findOne({ where: { idempotency_key: idempotencyKey }, transaction: t });
      if (existing) {
        await t.rollback();
        return res.status(200).json(existing);
      }
    }

    const record = await BorrowRecord.create(
      { book_id, user_id: targetUserId, due_date, idempotency_key: idempotencyKey || null },
      { transaction: t }
    );
    await book.update({ available_quantity: book.available_quantity - 1 }, { transaction: t });
    await t.commit();
    res.status(201).json(record);
  } catch (err) {
    await t.rollback();
    next(err);
  }
});

// Return a loan
router.post('/:id/return', idParamValidator, async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const record = await BorrowRecord.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!record) throw createError('Loan not found', 404);
    
    if (req.user.role !== 'ADMIN' && String(record.user_id) !== String(req.user.id)) {
      throw createError('Forbidden', 403);
    }
    if (record.returned_at) throw createError('Loan already returned', 409);

    const book = await Book.findByPk(record.book_id, { transaction: t, lock: t.LOCK.UPDATE });
    await record.update({ returned_at: new Date() }, { transaction: t });
    await book.update({ available_quantity: book.available_quantity + 1 }, { transaction: t });
    await t.commit();
    res.json(record);
  } catch (err) {
    await t.rollback();
    next(err);
  }
});

// Current loans of borrower (owner only)
router.get('/me', async (req, res, next) => {
  try {
    const records = await BorrowRecord.findAll({
      where: { user_id: req.user.id, returned_at: { [Op.is]: null } },
      include: [{ model: Book, as: 'book' }],
      order: [['due_date', 'ASC']],
    });
    res.json(records);
  } catch (err) { 
    next(err); 
  }
});

// Overdue loans (admin only)
router.get('/overdue', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const today = new Date();
    const records = await BorrowRecord.findAll({
      where: { due_date: { [Op.lt]: today }, returned_at: { [Op.is]: null } },
      include: [{ model: Book, as: 'book' }, { model: User, as: 'user' }],
      order: [['due_date', 'ASC']],
    });
    res.json(records);
  } catch (err) { 
    next(err); 
  }
});

module.exports = () => router;
