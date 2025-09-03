// Initializes models and associations
const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

// User model for authentication and RBAC (also represents a borrower when role=BORROWER)
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('ADMIN', 'BORROWER'), allowNull: false, defaultValue: 'BORROWER' },
  registered_date: { type: DataTypes.DATEONLY, allowNull: true },
  },
  {
    tableName: 'users',
    indexes: [{ unique: true, fields: ['email'] }, { fields: ['role'] }],
  }
);

// Book model: represents books in library
const Book = sequelize.define(
  'Book',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    author: { type: DataTypes.STRING(255), allowNull: false },
    isbn: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      set(value) {
        // Normalize: remove hyphens and spaces before persist/validate
        if (typeof value === 'string') {
          this.setDataValue('isbn', value.replace(/[-\s]/g, ''));
        } else {
          this.setDataValue('isbn', value);
        }
      },
      validate: {
        // Simple ISBN-10/13 pattern (not exhaustive but good enough for demo)
        is: /^(?:\d{9}[\dXx]|\d{13})$/,
      },
    },
    available_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    shelf_location: { type: DataTypes.STRING(50), allowNull: true },
  },
  {
    tableName: 'books',
    indexes: [
      { fields: ['title'] },
      { fields: ['author'] },
      { unique: true, fields: ['isbn'] },
    ],
  }
);

// BorrowRecord model: tracks checkouts/returns
const BorrowRecord = sequelize.define(
  'BorrowRecord',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    returned_at: { type: DataTypes.DATE, allowNull: true },
    idempotency_key: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'borrow_records',
    indexes: [
      { fields: ['due_date'] },
      { fields: ['returned_at'] },
  { unique: true, fields: ['idempotency_key'], where: { idempotency_key: { [Op.ne]: null } } },
      { fields: ['user_id'] },
    ],
  }
);

// Associations
Book.hasMany(BorrowRecord, { foreignKey: { name: 'book_id', allowNull: false }, as: 'borrow_records' });
BorrowRecord.belongsTo(Book, { foreignKey: { name: 'book_id', allowNull: false }, as: 'book' });

User.hasMany(BorrowRecord, { foreignKey: { name: 'user_id', allowNull: false }, as: 'borrow_records' });
BorrowRecord.belongsTo(User, { foreignKey: { name: 'user_id', allowNull: false }, as: 'user' });

module.exports = { sequelize, User, Book, BorrowRecord };
