const express = require('express');
const { Op } = require('sequelize');
const { Book } = require('../models');
const { authenticateJWT, requireRole } = require('../middlewares/auth');
const { cacheGet, cacheSet } = require('../middlewares/cache');
const {
  createBookValidator,
  updateBookValidator,
  idParamValidator,
  listSearchValidator,
} = require('../validators');

// Helper functions - inlined for simplicity
const getPagination = (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
};

const createError = (message, status = 500) => Object.assign(new Error(message), { status });

module.exports = function booksRouter(searchLimiter, listLimiter) {
  const router = express.Router();

  // Dynamic rate limiter: heavier limit when doing free-text search (q present)
  const dynamicLimiter = (req, res, next) => {
    const hasSearch = typeof req.query.q === 'string' && req.query.q.trim() !== '';
    return (hasSearch ? searchLimiter : listLimiter)(req, res, next);
  };

  // Create a book
  router.post('/', authenticateJWT, requireRole('ADMIN'), createBookValidator, async (req, res, next) => {
    try {
      const book = await Book.create(req.body);
      res.status(201).json(book);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return next(createError('ISBN already exists', 409));
      }
      next(err);
    }
  });

  // Update a book
  router.put('/:id', authenticateJWT, requireRole('ADMIN'), updateBookValidator, async (req, res, next) => {
    try {
      const [count, rows] = await Book.update(req.body, {
        where: { id: req.params.id },
        returning: true,
      });
      if (count === 0) return res.status(404).json({ error: 'Book not found' });
      res.json(rows[0]);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return next(createError('ISBN already exists', 409));
      }
      next(err);
    }
  });

  // Delete a book
  router.delete('/:id', authenticateJWT, requireRole('ADMIN'), idParamValidator, async (req, res, next) => {
    try {
      const deleted = await Book.destroy({ where: { id: req.params.id } });
      if (!deleted) return res.status(404).json({ error: 'Book not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // List/search books with optional filters and pagination; dynamically rate limited
  router.get('/', dynamicLimiter, listSearchValidator, async (req, res, next) => {
    try {
      let { q, author, title, isbn } = req.query;
      const { limit, offset } = getPagination(req.query);
      const where = {};
      const cacheKey = `books:list:${JSON.stringify({ q, author, title, isbn, limit, offset })}`;
      
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(cached);

      if (isbn) {
        isbn = String(isbn).replace(/[-\s]/g, '');
        where.isbn = isbn;
      }
      if (author) where.author = { [Op.iLike]: `%${author}%` };
      if (title) where.title = { [Op.iLike]: `%${title}%` };
      if (q) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${q}%` } },
          { author: { [Op.iLike]: `%${q}%` } },
          { isbn: { [Op.iLike]: `%${q}%` } },
        ];
      }

      const { rows, count } = await Book.findAndCountAll({
        where,
        limit,
        offset,
        order: [['title', 'ASC']],
      });
      
      const payload = { data: rows, total: count, limit, offset };
      await cacheSet(cacheKey, payload, 20);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  // Get single book by id
  router.get('/:id', idParamValidator, async (req, res, next) => {
    try {
      const book = await Book.findByPk(req.params.id);
      if (!book) return res.status(404).json({ error: 'Book not found' });
      res.json(book);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
