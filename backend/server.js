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

const path = require('path');
const fs = require('fs');

// Static Frontend Serving (Serves ChefHub React UI)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const altFrontendDistPath = path.join(__dirname, 'public');

let staticPath = null;
if (fs.existsSync(frontendDistPath)) {
  staticPath = frontendDistPath;
} else if (fs.existsSync(altFrontendDistPath)) {
  staticPath = altFrontendDistPath;
}

if (staticPath) {
  console.log(`[Express Engine] Serving ChefHub React UI from: ${staticPath}`);
  app.use(express.static(staticPath));
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>ChefHub Backend Server</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1.25rem; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: center; max-width: 520px; width: 100%; border: 1px solid #334155; }
            h1 { color: #38bdf8; margin-top: 0; margin-bottom: 0.5rem; font-size: 1.8rem; letter-spacing: -0.5px; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.25rem; }
            .badge { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 0.5rem 1.25rem; border-radius: 9999px; font-weight: 600; font-size: 0.85rem; border: 1px solid rgba(16, 185, 129, 0.3); }
            .dot { width: 8px; height: 8px; background: #34d399; border-radius: 50%; box-shadow: 0 0 10px #34d399; }
            .endpoints { text-align: left; margin-top: 1.75rem; background: #0f172a; padding: 1.25rem; border-radius: 0.75rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85rem; color: #cbd5e1; border: 1px solid #1e293b; }
            .endpoints strong { color: #f1f5f9; display: block; margin-bottom: 0.5rem; font-family: system-ui; }
            a { color: #38bdf8; text-decoration: none; font-weight: 500; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🍳 ChefHub Backend API</h1>
            <p>Cloud Microservice powered by Node.js, Express, and Supabase PostgreSQL Database.</p>
            <div class="badge"><span class="dot"></span> SERVER ONLINE & CONNECTED</div>
            <div class="endpoints">
              <strong>🌐 Public API Health Check:</strong>
              - <a href="/api/health" target="_blank">GET /api/health</a>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/admin', adminRoutes);

// SPA Fallback for React Router (Customer, Chef, Rider, Admin Portals)
if (staticPath) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

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
