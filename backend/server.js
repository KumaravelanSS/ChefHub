const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initRelationalDb } = require('./config/mysql_db');
const { initMongoDb } = require('./config/mongo_db');
const seedDatabase = require('./seeders/seed_all');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const vendorRoutes = require('./routes/vendor');
const riderRoutes = require('./routes/rider');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/admin', adminRoutes);

// System Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'ChefHub Hyper-Local DBMS Ecosystem',
    schemas_active: 12,
    relational_tables: 7,
    mongo_collections: 5,
    timestamp: new Date()
  });
});

async function startServer() {
  try {
    await initRelationalDb();
    await initMongoDb();
    
    // Run initial seed script
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 ChefHub DBMS Server Running on http://localhost:${PORT}`);
      console.log(`   - 7 MySQL Relational Tables Initialized`);
      console.log(`   - 5 MongoDB Document Collections Initialized`);
      console.log(`   - Single Master Admin Credentials: admin / admin`);
      console.log(`==================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start ChefHub backend server:', err);
  }
}

startServer();
