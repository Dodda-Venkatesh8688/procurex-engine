const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ id: user.id, username: user.username, role: user.role, department: user.department });
  });
});

app.post('/api/purchase-requests', (req, res) => {
  const { item_name, quantity, estimated_amount, department, created_by } = req.body;
  
  db.get('SELECT id FROM purchase_requests WHERE item_name = ? AND status = "Pending" AND created_by = ?', 
    [item_name, created_by], (err, row) => {
      if (row) return res.status(400).json({ error: 'Duplicate purchase request detected.' });

      db.run(`INSERT INTO purchase_requests (item_name, quantity, estimated_amount, department, created_by) 
        VALUES (?, ?, ?, ?, ?)`, 
        [item_name, quantity, estimated_amount, department, created_by], 
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ id: this.lastID, message: 'Purchase request logged successfully.' });
        }
      );
    }
  );
});

app.get('/api/purchase-requests', (req, res) => {
  db.all('SELECT * FROM purchase_requests', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/purchase-requests/:id/approve', (req, res) => {
  const { id } = req.params;
  const { action, action_by } = req.body; 
  const statusUpdate = action === 'Approve' ? 'Approved' : 'Rejected';

  db.run('UPDATE purchase_requests SET status = ? WHERE id = ?', [statusUpdate, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('INSERT INTO approval_logs (request_id, action_by, action) VALUES (?, ?, ?)', 
      [id, action_by, statusUpdate], 
      (logErr) => {
        if (logErr) return res.status(500).json({ error: logErr.message });
        res.json({ message: `Request update committed: ${statusUpdate}` });
      }
    );
  });
});

app.post('/api/invoices', (req, res) => {
  const { purchase_request_id, invoice_number, amount, due_date, vendor_id } = req.body;

  db.get('SELECT id FROM invoices WHERE invoice_number = ?', [invoice_number], (err, row) => {
    if (row) return res.status(400).json({ error: 'Invoice duplication conflict. Submission locked.' });

    db.run(`INSERT INTO invoices (purchase_request_id, invoice_number, amount, due_date, vendor_id) 
      VALUES (?, ?, ?, ?, ?)`,
      [purchase_request_id, invoice_number, amount, due_date, vendor_id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run('UPDATE purchase_requests SET status = "Ordered" WHERE id = ?', [purchase_request_id]);
        res.status(201).json({ id: this.lastID, message: 'Invoice linked to procurement cycle.' });
      }
    );
  });
});

app.get('/api/invoices', (req, res) => {
  db.all(`SELECT i.*, v.name as vendor_name FROM invoices i 
          JOIN vendors v ON i.vendor_id = v.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run('UPDATE invoices SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Invoice tracking checkpoint updated to: ${status}` });
  });
});

app.get('/api/vendors', (req, res) => {
  db.all('SELECT * FROM vendors', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/dashboard/procurement', (req, res) => {
  const queries = {
    totalPurchases: 'SELECT SUM(estimated_amount) as total FROM purchase_requests WHERE status = "Approved" OR status = "Ordered"',
    pendingApprovals: 'SELECT COUNT(*) as count FROM purchase_requests WHERE status = "Pending"',
    overdueInvoices: "SELECT COUNT(*) as count FROM invoices WHERE status != 'Paid' AND date(due_date) < date('now')"
  };

  db.get(queries.totalPurchases, [], (err1, r1) => {
    db.get(queries.pendingApprovals, [], (err2, r2) => {
      db.get(queries.overdueInvoices, [], (err3, r3) => {
        res.json({
          totalPurchases: r1?.total || 0,
          pendingApprovals: r2?.count || 0,
          overdueInvoices: r3?.count || 0
        });
      });
    });
  });
});

app.listen(5000, () => {
  console.log('ProcureX Core running on internal port 5000');
});