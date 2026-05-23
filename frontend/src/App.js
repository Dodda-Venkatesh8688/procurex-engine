import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  
  const [metrics, setMetrics] = useState({ totalPurchases: 0, pendingApprovals: 0, overdueInvoices: 0 });
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [reqItem, setReqItem] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqAmt, setReqAmt] = useState('');

  const [invReqId, setInvReqId] = useState('');
  const [invNum, setInvNum] = useState('');
  const [invAmt, setInvAmt] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invVendor, setInvVendor] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [errorLog, setErrorLog] = useState('');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, currentView]);

  const fetchDashboardData = async () => {
    try {
      const resMetrics = await axios.get(`${API_URL}/dashboard/procurement`);
      setMetrics(resMetrics.data);
      
      const resReqs = await axios.get(`${API_URL}/purchase-requests`);
      setRequests(resReqs.data);
      
      const resInvs = await axios.get(`${API_URL}/invoices`);
      setInvoices(resInvs.data);
      
      const resVendors = await axios.get(`${API_URL}/vendors`);
      setVendors(resVendors.data);
    } catch (err) {
      console.error('Data sync discrepancy:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLog('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      setUser(res.data);
    } catch (err) {
      setErrorLog('Invalid matching credentials.');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setErrorLog('');
    try {
      await axios.post(`${API_URL}/purchase-requests`, {
        item_name: reqItem,
        quantity: parseInt(reqQty),
        estimated_amount: parseFloat(reqAmt),
        department: user.department,
        created_by: user.id
      });
      setReqItem(''); setReqQty(''); setReqAmt('');
      setCurrentView('dashboard');
    } catch (err) {
      setErrorLog(err.response?.data?.error || 'Validation failure.');
    }
  };

  const handleApproveRequest = async (id, action) => {
    try {
      await axios.put(`${API_URL}/purchase-requests/${id}/approve`, {
        action,
        action_by: user.id
      });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadInvoice = async (e) => {
    e.preventDefault();
    setErrorLog('');
    try {
      await axios.post(`${API_URL}/invoices`, {
        purchase_request_id: invReqId,
        invoice_number: invNum,
        amount: parseFloat(invAmt),
        due_date: invDueDate,
        vendor_id: invVendor
      });
      setInvReqId(''); setInvNum(''); setInvAmt(''); setInvDueDate(''); setInvVendor('');
      setCurrentView('dashboard');
    } catch (err) {
      setErrorLog(err.response?.data?.error || 'Duplication conflict rule active.');
    }
  };

  const handleInvoiceStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/invoices/${id}/status`, { status });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="login-container">
        <h2>ProcureX Core Gateway</h2>
        {errorLog && <p style={{ color: 'red' }}>{errorLog}</p>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }}>Authenticate</button>
        </form>
        <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
          <p>Demo Logins (User / Pass):</p>
          <ul>
            <li>Admin: admin / admin123</li>
            <li>Employee: employee1 / emp123</li>
            <li>Officer: officer1 / off123</li>
            <li>Vendor: vendor1 / ven123</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="brand-title">ProcureX System Engine</div>
        <div className="nav-links">
          <span style={{ marginRight: '1rem' }}>{user.username} ({user.role})</span>
          <button onClick={() => setUser(null)}>Disconnect</button>
        </div>
      </nav>

      <div className="main-layout">
        <div className="sidebar">
          <div className={`sidebar-link ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>Dashboard Interface</div>
          {user.role === 'Employee' && (
            <div className={`sidebar-link ${currentView === 'create-request' ? 'active' : ''}`} onClick={() => setCurrentView('create-request')}>New Purchase Request</div>
          )}
          {user.role === 'Procurement Officer' && (
            <div className={`sidebar-link ${currentView === 'approvals' ? 'active' : ''}`} onClick={() => setCurrentView('approvals')}>Approval Console</div>
          )}
          {user.role === 'Vendor' && (
            <div className={`sidebar-link ${currentView === 'upload-invoice' ? 'active' : ''}`} onClick={() => setCurrentView('upload-invoice')}>Upload External Invoice</div>
          )}
          <div className={`sidebar-link ${currentView === 'invoices' ? 'active' : ''}`} onClick={() => setCurrentView('invoices')}>Invoice Records</div>
        </div>

        <div className="content-area">
          {errorLog && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>{errorLog}</div>}

          {currentView === 'dashboard' && (
            <div>
              <h3>Procurement Metrics Overview</h3>
              <div className="dashboard-grid">
                <div className="metric-card">
                  <div>Approved Capital</div>
                  <div className="metric-value">${metrics.totalPurchases}</div>
                </div>
                <div className="metric-card">
                  <div>Pending Envelopes</div>
                  <div className="metric-value">{metrics.pendingApprovals}</div>
                </div>
                <div className="metric-card">
                  <div>Overdue Payment Risks</div>
                  <div className="metric-value" style={{ color: metrics.overdueInvoices > 0 ? '#b91c1c' : 'green' }}>{metrics.overdueInvoices}</div>
                </div>
              </div>

              <h3>Procurement Requests Status Tracking</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item Specification</th>
                    <th>Quantity</th>
                    <th>Est. Valuation</th>
                    <th>Department Context</th>
                    <th>Status Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id}>
                      <td>#{req.id}</td>
                      <td>{req.item_name}</td>
                      <td>{req.quantity}</td>
                      <td>${req.estimated_amount}</td>
                      <td>{req.department}</td>
                      <td>
                        <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {currentView === 'create-request' && (
            <div style={{ maxWidth: '600px', background: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h3>Initialize Purchase Authorization Request</h3>
              <form onSubmit={handleCreateRequest}>
                <div className="form-group">
                  <label>Item Nomenclature</label>
                  <input type="text" className="form-control" value={reqItem} onChange={e => setReqItem(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Units Ordered</label>
                  <input type="number" className="form-control" value={reqQty} onChange={e => setReqQty(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Target Estimated Budget ($)</label>
                  <input type="number" className="form-control" value={reqAmt} onChange={e => setReqAmt(e.target.value)} required />
                </div>
                <button type="submit" className="btn">Deploy Request to Queue</button>
              </form>
            </div>
          )}

          {currentView === 'approvals' && (
            <div>
              <h3>Workflow Approval Routing Board</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Origin Department</th>
                    <th>Item Desc</th>
                    <th>Requested Valuation</th>
                    <th>Current Pipeline Status</th>
                    <th>Action Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.filter(r => r.status === 'Pending').map(req => (
                    <tr key={req.id}>
                      <td>{req.department}</td>
                      <td>{req.item_name}</td>
                      <td>${req.estimated_amount}</td>
                      <td><span className="badge badge-pending">{req.status}</span></td>
                      <td>
                        <button className="btn" style={{ background: '#16a34a', marginRight: '0.5rem' }} onClick={() => handleApproveRequest(req.id, 'Approve')}>Authorize</button>
                        <button className="btn" style={{ background: '#dc2626' }} onClick={() => handleApproveRequest(req.id, 'Reject')}>Decline</button>
                      </td>
                    </tr>
                  ))}
                  {requests.filter(r => r.status === 'Pending').length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>Approval operational queues clear.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {currentView === 'upload-invoice' && (
            <div style={{ maxWidth: '600px', background: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h3>Submit External Vendor Invoice</h3>
              <form onSubmit={handleUploadInvoice}>
                <div className="form-group">
                  <label>Link Approved Purchase Request Reference ID</label>
                  <select className="form-control" value={invReqId} onChange={e => setInvReqId(e.target.value)} required>
                    <option value="">Select Reference Order</option>
                    {requests.filter(r => r.status === 'Approved').map(r => (
                      <option key={r.id} value={r.id}>Req #{r.id} - {r.item_name} (${r.estimated_amount})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Invoice Token Serial Number (Unique Identifier)</label>
                  <input type="text" className="form-control" value={invNum} onChange={e => setInvNum(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Total Certified Amount ($)</label>
                  <input type="number" className="form-control" value={invAmt} onChange={e => setInvAmt(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Maturity Due Date Tracker</label>
                  <input type="date" className="form-control" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Vendor Identity Certification</label>
                  <select className="form-control" value={invVendor} onChange={e => setInvVendor(e.target.value)} required>
                    <option value="">Select Corporate Profile</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn">Post Invoice Ledger</button>
              </form>
            </div>
          )}

          {currentView === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Audited Invoice Matrix Vault</h3>
                <input type="text" className="form-control" style={{ maxWidth: '300px' }} placeholder="Search parameters..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial Code</th>
                    <th>Vendor Profile</th>
                    <th>Gross Financial Value</th>
                    <th>Maturity Boundary</th>
                    <th>Payment Status State</th>
                    {user.role === 'Admin' && <th>Audit Controls</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => {
                    const isOverdue = new Date(inv.due_date) < new Date() && inv.status !== 'Paid';
                    return (
                      <tr key={inv.id}>
                        <td>{inv.invoice_number}</td>
                        <td>{inv.vendor_name}</td>
                        <td>${inv.amount}</td>
                        <td style={{ color: isOverdue ? 'red' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                          {inv.due_date} {isOverdue && ' [OVERDUE RISK]'}
                        </td>
                        <td>
                          <span className={`badge ${inv.status === 'Paid' ? 'badge-approved' : isOverdue ? 'badge-overdue' : 'badge-pending'}`}>
                            {inv.status}
                          </span>
                        </td>
                        {user.role === 'Admin' && (
                          <td>
                            {inv.status !== 'Paid' && (
                              <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#16a34a' }} onClick={() => handleInvoiceStatus(inv.id, 'Paid')}>Disburse Funds</button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;