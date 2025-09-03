// Basic test for book endpoints using supertest
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { redis } = require('../src/config/redis');

describe('Books API', () => {
	beforeAll(async () => {
		await sequelize.sync({ force: true });
	});

	afterAll(async () => {
		await sequelize.close();
		try {
			if (redis && redis.isOpen) {
				await redis.quit();
			}
		} catch (_) {
			// ignore
		}
	});

	it('creates and lists a book', async () => {
		// Register an admin
		const admin = { name: 'Admin', email: 'admin@example.com', password: 'secret123', role: 'ADMIN' };
		await request(app).post('/api/auth/register').send(admin).expect(201);
		// Login to get JWT
		const loginRes = await request(app)
			.post('/api/auth/login')
			.send({ email: admin.email, password: admin.password })
			.expect(200);
		const token = loginRes.body.token;

		const createRes = await request(app)
			.post('/api/books')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'Clean Code',
				author: 'Robert C. Martin',
				isbn: '9780132350884',
				available_quantity: 3,
				shelf_location: 'A1',
			})
			.expect(201);

		expect(createRes.body.id).toBeDefined();

		const listRes = await request(app).get('/api/books').expect(200);
		expect(listRes.body.total).toBe(1);
		expect(listRes.body.data[0].title).toBe('Clean Code');
	});
});

