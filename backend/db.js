const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'procurex.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err);
  } else {
    console.log('Connected to SQLite Database.');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    department TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    email TEXT,
    performance_rating REAL DEFAULT 5.0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS purchase_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT,
    quantity INTEGER,
    estimated_amount REAL,
    status TEXT DEFAULT 'Pending',
    department TEXT,
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_request_id INTEGER,
    invoice_number TEXT UNIQUE,
    amount REAL,
    due_date TEXT,
    status TEXT DEFAULT 'Pending',
    vendor_id INTEGER,
    FOREIGN KEY(purchase_request_id) REFERENCES purchase_requests(id),
    FOREIGN KEY(vendor_id) REFERENCES vendors(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS approval_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    action_by INTEGER,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(request_id) REFERENCES purchase_requests(id),
    FOREIGN KEY(action_by) REFERENCES users(id)
  )`);

  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO users (username, password, role, department) VALUES 
        ('admin', 'admin123', 'Admin', 'Management'),
        ('employee1', 'emp123', 'Employee', 'Engineering'),
        ('officer1', 'off123', 'Procurement Officer', 'Procurement'),
        ('vendor1', 'ven123', 'Vendor', 'External')
      `);
      db.run(`INSERT INTO vendors (name, email, performance_rating) VALUES 
        ('Global Tech Corp', 'contact@globaltech.com', 4.8),
        ('Alpha Manufacturing', 'sales@alphamanufacturing.com', 4.2)
      `);
    }
  });
});

module.exports = db;