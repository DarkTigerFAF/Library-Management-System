const express = require('express');
const { Op } = require('sequelize');
const { BorrowRecord, Book, User } = require('../models'); // Fixed: User instead of Borrower
const { Parser } = require('json2csv'); // Inline the CSV utility

// Helper functions
const toStartOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const toEndOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const toCSV = (data) => new Parser().parse(data);

const router = express.Router();

// Export overdue borrows of last month as CSV
router.get('/overdue/last-month.csv', async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const records = await BorrowRecord.findAll({
      where: {
        due_date: { [Op.between]: [toStartOfDay(start), toEndOfDay(end)] },
        returned_at: { [Op.is]: null },
      },
      include: [
        { model: Book, as: 'book' },
        { model: User, as: 'user' }, // Fixed: use User instead of Borrower
      ],
      order: [['due_date', 'ASC']],
    });
    
    const flat = records.map((r) => ({
      id: r.id,
      book_title: r.book.title,
      book_isbn: r.book.isbn,
      borrower_name: r.user.name, // Fixed: user instead of borrower
      borrower_email: r.user.email, // Fixed: user instead of borrower
      due_date: r.due_date,
    }));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="overdue-loans-last-month.csv"');
    res.send(toCSV(flat));
  } catch (err) { 
    next(err); 
  }
});

// Export all borrows of last month as CSV
router.get('/borrows/last-month.csv', async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const records = await BorrowRecord.findAll({
      where: {
        created_at: { [Op.between]: [toStartOfDay(start), toEndOfDay(end)] },
      },
      include: [
        { model: Book, as: 'book' },
        { model: User, as: 'user' }, // Fixed: use User instead of Borrower
      ],
      order: [['created_at', 'ASC']],
    });
    
    const flat = records.map((r) => ({
      id: r.id,
      book_title: r.book.title,
      book_isbn: r.book.isbn,
      borrower_name: r.user.name, // Fixed: user instead of borrower
      borrower_email: r.user.email, // Fixed: user instead of borrower
      due_date: r.due_date,
      returned_at: r.returned_at,
      created_at: r.created_at,
    }));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="loans-last-month.csv"');
    res.send(toCSV(flat));
  } catch (err) { 
    next(err); 
  }
});

module.exports = () => router;
