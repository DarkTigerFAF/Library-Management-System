require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

// Startup with retry logic
const startServer = async () => {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true }); // Align DB schema to models
      break;
    } catch (err) {
      attempts++;
      console.error(`DB connection failed (attempt ${attempts}/${maxAttempts}):`, err.message);
      if (attempts >= maxAttempts) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    }
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
