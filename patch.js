import fs from 'fs';

const appPath = 'frontend/src/App.tsx';
let code = fs.readFileSync(appPath, 'utf8');

// 1. Type Imports
code = code.replace('import { api, DashboardSummary, Role, TransactionListResponse } from "./api";', 'import { api, DashboardSummary, Role, TransactionListResponse, TrendItem, UserItem } from "./api";');

// 2. Add New State variables
code = code.replace('const [categoryTotals, setCategoryTotals] = useState', 
`const [trends, setTrends] = useState<TrendItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [categoryTotals, setCategoryTotals] = useState`);

// 3. Update loadData to fetch trends (and users if admin)
code = code.replace(/const \[summaryRes, catTotalsRes, txListRes\] = await Promise\.all\(\[\s+api.getSummary\(token\),\s+api.getCategoryTotals\(token\),\s+api.getTransactions\(token, filters\)\s+\]\);/,
`const [summaryRes, catTotalsRes, txListRes, trendsRes, usersRes] = await Promise.all([
        api.getSummary(token),
        api.getCategoryTotals(token),
        api.getTransactions(token, filters),
        api.getTrends(token, 6, "month"),
        role === "ADMIN" ? api.getUsers(token) : Promise.resolve({ data: [] })
      ]);`);

code = code.replace(/setCategoryTotals\(catTotalsRes\.data\);\s+setTransactions\(txListRes\.data\.items\);/,
`setCategoryTotals(catTotalsRes.data);
      setTransactions(txListRes.data.items);
      setTrends(trendsRes.data);
      setUsers(usersRes.data);`);

// 4. Update form submit to handle edit mode
code = code.replace(/const res = await api\.createTransaction\(auth\.token,\s*\{\s*amount: Number\(transactionForm\.amount\),\s*type: transactionForm\.type,\s*category: transactionForm\.category,\s*date: transactionForm\.date,\s*note: transactionForm\.note\s*\}\);\s*if \(res\.success\) \{/,
`
      const payload = {
        amount: Number(transactionForm.amount),
        type: transactionForm.type,
        category: transactionForm.category,
        date: transactionForm.date,
        note: transactionForm.note
      };
      
      let res;
      if (editId) {
        res = await api.updateTransaction(auth.token, editId, payload);
      } else {
        res = await api.createTransaction(auth.token, payload);
      }

      if (res.success) {`);

// Add editId to transactionForm reset
code = code.replace(/setTransactionForm\(\{\s*amount: "",\s*type: "EXPENSE",\s*category: "",\s*date: new Date\(\)\.toISOString\(\)\.slice\(0, 10\),\s*note: ""\s*\}\);/g, 
`setEditId(null);
        setTransactionForm({
          amount: "",
          type: "EXPENSE",
          category: "",
          date: new Date().toISOString().slice(0, 10),
          note: ""
        });`);

// Add UI for editing transaction below delete button
code = code.replace(/<button onClick=\{\(\) => deleteTransaction\(tx\.id\)\}\s+className="danger-btn">\s*Delete\s*<\/button>/g,
`<button onClick={() => {
                          setEditId(tx.id);
                          setTransactionForm({
                            amount: tx.amount.toString(),
                            type: tx.type,
                            category: tx.category,
                            date: new Date(tx.date).toISOString().slice(0, 10),
                            note: tx.note || ""
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="secondary-btn" style={{ marginRight: '8px' }}>
                          Edit
                        </button>
                        <button onClick={() => deleteTransaction(tx.id)} className="danger-btn">
                          Delete
                        </button>`);

// Add "Update Transaction" text on button
code = code.replace(/<button type="submit" className="primary-btn" disabled=\{loading\}>\s*\{loading \? "Saving\.\.\." : "Add Transaction"\}\s*<\/button>/, 
`<button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Saving..." : editId ? "Update Transaction" : "Add Transaction"}
              </button>`);

// Also inject the views (Trends and Users)
const injectionPoint = `<div className="dashboard-grid">`;
const trendsHtml = `
              <div className="card">
                <h3>Monthly Trends (Net)</h3>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                  {trends.map(t => (
                    <div key={t.period} style={{ minWidth: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t.period}</div>
                      <div style={{ color: t.net >= 0 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{formatCurrency(t.net)}</div>
                    </div>
                  ))}
                  {trends.length === 0 && <span style={{ color: '#94a3b8' }}>No trend data</span>}
                </div>
              </div>
`;

code = code.replace(injectionPoint, injectionPoint + trendsHtml);

const usersInjectionPoint = `</section>\n            <section className="card transaction-list">`;
const usersHtml = `
            {auth.role === "ADMIN" && (
              <section className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                  <h2>User Management (Admin Only)</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <select 
                              value={u.role}
                              onChange={async (e) => {
                                try {
                                  await api.updateUserRole(auth.token, u.id, e.target.value as Role);
                                  pushToast("success", "Role updated");
                                  loadData(auth.token, filters, auth.role);
                                } catch (err: any) {
                                  pushToast("error", err.message);
                                }
                              }}
                              style={{ padding: '4px', borderRadius: '4px', background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="ANALYST">Analyst</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </td>
                          <td>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem',
                              background: u.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                              color: u.status === 'ACTIVE' ? '#10b981' : '#f43f5e'
                            }}>
                              {u.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={async () => {
                                try {
                                  await api.deactivateUser(auth.token, u.id);
                                  pushToast("success", "User deactivated");
                                  loadData(auth.token, filters, auth.role);
                                } catch (err: any) {
                                  pushToast("error", err.message);
                                }
                              }}
                              className="danger-btn"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              disabled={u.status === 'INACTIVE' || u.id === auth.id}
                            >
                              Deactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
`;
code = code.replace(usersInjectionPoint, usersHtml + "\n" + usersInjectionPoint);

fs.writeFileSync(appPath, code);
console.log('Done!');
