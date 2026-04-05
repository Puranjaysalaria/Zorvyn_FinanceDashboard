import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, DashboardSummary, Role, TransactionListResponse, TrendItem, UserItem } from "./api";

type AuthState = {
  token: string;
  role: Role;
  name: string;
  email: string;
};

type TransactionFormState = {
  amount: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  date: string;
  note: string;
};

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} />;
}

function App() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authBooting, setAuthBooting] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionListResponse["data"]["items"]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [trendGranularity, setTrendGranularity] = useState<"month" | "week">("month");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [categoryTotals, setCategoryTotals] = useState<Array<{ category: string; type: "INCOME" | "EXPENSE"; total: number }>>([]);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>({
    amount: "",
    type: "EXPENSE",
    category: "",
    date: new Date().toISOString().slice(0, 10),
    note: ""
  });
  const [filters, setFilters] = useState<{
    type: "" | "INCOME" | "EXPENSE";
    category: string;
    dateFrom: string;
    dateTo: string;
  }>({
    type: "",
    category: "",
    dateFrom: "",
    dateTo: ""
  });
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [trendTableLoading, setTrendTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const topCategories = useMemo(() => {
    return [...categoryTotals].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [categoryTotals]);

  const resetAuthFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const pushToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      removeToast(id);
    }, 3200);
  };

  const toastStack = (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-head">
            <strong>{toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}</strong>
            <button className="toast-close" onClick={() => removeToast(toast.id)} type="button">
              x
            </button>
          </div>
          <p className="toast-message">{toast.message}</p>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );

  const loadDashboardData = async (token: string, role: Role, filterState = filters, granularityState = trendGranularity) => {
    setDashboardLoading(true);
    try {
      const [summaryRes, categoryRes, trendsRes, usersRes] = await Promise.all([
          api.getSummary(token),
          api.getCategoryTotals(token), 
          api.getTrends(token, granularityState === "week" ? 3 : 6, granularityState), 
          role === "ADMIN" ? api.getUsers(token) : Promise.resolve({ data: [] }) 
      ]);
      setSummary(summaryRes.data);
      setCategoryTotals(categoryRes.data);
      setTrends(trendsRes.data);
      setUsers(usersRes.data);

      if (role === "ADMIN" || role === "ANALYST") {
        const txRes = await api.getTransactions(token, {
          type: filterState.type || undefined,
          category: filterState.category || undefined,
          dateFrom: filterState.dateFrom || undefined,
          dateTo: filterState.dateTo || undefined
        });
        setTransactions(txRes.data.items);
      } else {
        setTransactions([]);
      }
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    const storedAuth = window.localStorage.getItem("zorvyn_auth");
    if (!storedAuth) {
      setAuthBooting(false);
      return;
    }

    const restore = async () => {
      try {
        const parsed = JSON.parse(storedAuth) as AuthState;
        setAuth(parsed);
        await loadDashboardData(parsed.token, parsed.role);
        pushToast("Session restored.", "info");
      } catch (_error) {
        window.localStorage.removeItem("zorvyn_auth");
        pushToast("Session expired. Please login again.", "error");
      } finally {
        setAuthBooting(false);
      }
    };

    void restore();
  }, []);

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === "register") {
        if (name.trim().length < 2) {
          throw new Error("Name must be at least 2 characters");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
      } else if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const authResponse =
        authMode === "register"
          ? await api.register(name.trim(), email, password)
          : await api.login(email, password);

      const nextAuth: AuthState = {
        token: authResponse.data.token,
        role: authResponse.data.user.role,
        name: authResponse.data.user.name,
        email: authResponse.data.user.email
      };

      setAuth(nextAuth);
      window.localStorage.setItem("zorvyn_auth", JSON.stringify(nextAuth));

      // Move to dashboard immediately, then load data in the background.
      void loadDashboardData(nextAuth.token, nextAuth.role).catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : "Unable to load dashboard data";
        setError(message);
        pushToast(message, "error");
      });

      pushToast(
        authMode === "register"
          ? `Account created for ${nextAuth.email}.`
          : `Logged in as ${nextAuth.role}.`,
        "success"
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to login";
      setError(message);
      pushToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    window.localStorage.removeItem("zorvyn_auth");
    setSummary(null);
    setTransactions([]);
    setCategoryTotals([]);
    setError(null);
    pushToast("Logged out successfully.", "success");
  };

  const handleRefresh = async () => {
    if (!auth) {
      return;
    }
    try {
      await loadDashboardData(auth.token, auth.role);
      pushToast("Dashboard refreshed with latest data.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Refresh failed", "error");
    }
  };

  const handleApplyFilters = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth || auth.role === "VIEWER") {
      return;
    }

    setTxLoading(true);
    setError(null);
    try {
      await loadDashboardData(auth.token, auth.role);
      pushToast("Transaction filters applied.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load transactions";
      setError(message);
      pushToast(message, "error");
    } finally {
      setTxLoading(false);
    }
  };

  const handleClearFilters = async () => {
    if (!auth || auth.role === "VIEWER") {
      return;
    }
    const nextFilters = { type: "" as "", category: "", dateFrom: "", dateTo: "" };
    setFilters(nextFilters);
    setTxLoading(true);
    try {
      await loadDashboardData(auth.token, auth.role, nextFilters);
      pushToast("Filters cleared.", "info");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Unable to clear filters", "error");
    } finally {
      setTxLoading(false);
    }
  };

  const handleCreateTransaction = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth || auth.role === "VIEWER") {
      return;
    }

    setTxLoading(true);
    setError(null);
    try {
      const parsedAmount = Number(transactionForm.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Amount must be greater than zero");
      }

      const txPayload = {
          amount: parsedAmount,
          type: transactionForm.type,
          category: transactionForm.category,
          date: transactionForm.date,
          note: transactionForm.note || undefined
        };

        pushToast(editId ? "Transaction updated successfully." : `Transaction added in ${transactionForm.category || "category"}.`, "success");

        editId
          ? await api.updateTransaction(auth.token, editId, txPayload)
          : await api.createTransaction(auth.token, txPayload);

        if (editId) {
          setEditId(null);
        }
      setTransactionForm((prev) => ({
        ...prev,
        amount: "",
        category: "",
        note: ""
      }));

      await loadDashboardData(auth.token, auth.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save transaction";
      setError(message);
      pushToast(message, "error");
    } finally {
      setTxLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!auth || auth.role === "VIEWER") {
      return;
    }

    setTxLoading(true);
    setError(null);
    try {
      pushToast("Transaction deleted.", "success");
      await api.deleteTransaction(auth.token, id);
      await loadDashboardData(auth.token, auth.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete transaction";
      setError(message);
      pushToast(message, "error");
    } finally {
      setTxLoading(false);
    }
  };

  if (authBooting) {
    return (
      <div className="page dashboard-page">
        <header className="topbar">
          <div>
            <div className="skeleton skeleton-line" style={{ width: '150px' }} />
            <Skeleton className="skeleton-line short" />
          </div>
          <div className="topbar-actions">
            <div className="skeleton skeleton-line" style={{ width: '150px', height: '2.5rem' }} />
          </div>
        </header>

        <section className="kpi-grid">
          <article>
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </article>
          <article>
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </article>
          <article>
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </article>
        </section>

        <section className="content-grid" style={{ gap: '1.5rem', alignItems: 'start', marginTop: '1.5rem' }}>
          <article className="card" style={{ height: '350px' }}>
            <div className="skeleton skeleton-line" style={{ height: '100%' }} />
          </article>
          <article className="card" style={{ height: '350px' }}>
            <div className="skeleton skeleton-line" style={{ height: '100%' }} />
          </article>
        </section>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="page login-page">
        {toastStack}
        <div className="orb orb-left" />
        <div className="orb orb-right" />
        <form className="login-card" onSubmit={handleAuthSubmit}>
          <p className="eyebrow">Finance Access Portal</p>
          <h1>{authMode === "login" ? "Zorvyn Control Center" : "Create Your Account"}</h1>
          <p className="muted">
            {authMode === "login"
              ? "Securely sign in to view role-specific finance insights."
              : "Register and start with your own real account data."}
          </p>

          <div className="auth-switch" role="tablist" aria-label="Authentication mode">
            <button
              className={authMode === "login" ? "auth-tab active" : "auth-tab"}
              type="button"
              onClick={() => {
                setAuthMode("login");
                resetAuthFields();
              }}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "auth-tab active" : "auth-tab"}
              type="button"
              onClick={() => {
                setAuthMode("register");
                resetAuthFields();
              }}
            >
              Register
            </button>
          </div>

          {authMode === "register" ? (
            <label>
              Full Name
              <input value={name} onChange={(e) => setName(e.target.value)} type="text" required />
            </label>
          ) : null}

          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>

          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
          </label>

          {authMode === "register" ? (
            <label>
              Confirm Password
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                minLength={8}
                required
              />
            </label>
          ) : null}

          {error ? <p className="error">{error}</p> : null}

          <button disabled={loading} type="submit">
            {loading ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div className="hints">
            {authMode === "login" ? (
              <>
                <p>Your registered accounts are saved in PostgreSQL and persist beyond seed data.</p>
                <p>Password must be at least 8 characters.</p>
                <p>Seed accounts for quick testing:</p>
                <p>Admin: admin@zorvyn.com / Admin@123</p>
                <p>Analyst: analyst@zorvyn.com / Analyst@123</p>
                <p>Viewer: viewer@zorvyn.com / Viewer@123</p>
              </>
            ) : (
              <>
                <p>Newly registered users are created with VIEWER role by default.</p>
                <p>Admin can create role-based users from backend user management APIs.</p>
                <p>Password must be at least 8 characters.</p>
              </>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      {toastStack}
      <header className="topbar">
        <div>
          <p className="eyebrow">Finance Dashboard</p>
          <h1>Welcome, {auth.name}</h1>
          <p className="muted">
            Role: <strong>{auth.role}</strong> | {auth.email}
          </p>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={handleRefresh} type="button">
            Refresh
          </button>
          <button className="ghost" onClick={handleLogout} type="button">
            Log Out
          </button>
        </div>
      </header>

      {dashboardLoading && !summary ? (
        <section className="kpi-grid">
          <article>
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </article>
          <article>
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </article>
          <article>
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </article>
        </section>
      ) : summary ? (
        <section className="kpi-grid">
          <article>
            <p>Total Income</p>
            <h2>{formatCurrency(summary.totalIncome)}</h2>
          </article>
          <article>
            <p>Total Expense</p>
            <h2>{formatCurrency(summary.totalExpense)}</h2>
          </article>
          <article>
            <p>Net Balance</p>
            <h2>{formatCurrency(summary.netBalance)}</h2>
          </article>
        </section>
      ) : null}

        {/* DASHBOARD CARDS ROW */}
        <section className="content-grid" style={{ gap: '1.5rem', alignItems: 'start' }}>
          
          {/* TRENDS */}
          <article className="card">
            <h3>Trends</h3><select value={trendGranularity} onChange={async (e) => { 
              const newGranularity = e.target.value as "month" | "week"; 
              setTrendGranularity(newGranularity); 
              if (auth) {
                setTrendTableLoading(true);
                try {
                  const res = await api.getTrends(auth.token, newGranularity === "week" ? 3 : 6, newGranularity);
                  setTrends(res.data);
                } catch (err) {
                  console.error(err);
                } finally {
                  setTrendTableLoading(false);
                }
              }
            }} style={{ position: 'absolute', right: '1rem', top: '1rem', padding: '0.25rem 2.4rem 0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}><option value="month">Monthly</option><option value="week">Weekly</option></select>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{trendGranularity === 'week' ? 'Week' : 'Month'}</th>
                  <th>Income</th>
                  <th>Expense</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardLoading && !summary) || trendTableLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton className="skeleton-line short" /></td>
                      <td><Skeleton className="skeleton-line short" /></td>
                      <td><Skeleton className="skeleton-line short" /></td>
                    </tr>
                  ))
                ) : (
                  trends.map(t => (
                    <tr key={t.period}>
                      <td>{t.period}</td>
                      <td className="income" style={{ color: "#22c55e" }}>{formatCurrency(t.income)}</td>
                      <td className="expense" style={{ color: "#ef4444" }}>{formatCurrency(t.expense)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>
          
          {/* USERS */}
          {auth.role === 'ADMIN' && (
            <article className="card">
              <h3>User Management</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={u.status === 'ACTIVE' ? '' : 'inactive'}>
                      <td>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          className="form-input"
                          style={{ padding: '0.25rem 2.4rem 0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                          onChange={async (e) => {
                            const newRole = e.target.value as any;
                            setUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: newRole } : user));
                            pushToast(`User role updated to ${newRole}`, "success");
                            try {
                              await api.updateUserRole(auth.token, u.id, newRole);
                            } catch (err) {
                              const uRes = await api.getUsers(auth.token);
                              setUsers(uRes.data);
                              pushToast("Failed to update role", "error");
                            }
                          }}
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td>{u.status}</td>
                      <td>
                        {u.status === 'ACTIVE' ? (
                          <button
                            className="danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                            onClick={async () => {
                              setUsers(prev => prev.map(user => user.id === u.id ? { ...user, status: 'INACTIVE' } : user));
                              pushToast("User deactivated successfully", "success");
                              try {
                                await api.deactivateUser(auth.token, u.id);
                              } catch (err) {
                                const uRes = await api.getUsers(auth.token);
                                setUsers(uRes.data);
                                pushToast("Failed to deactivate user", "error");
                              }
                            }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                            onClick={async () => {
                              setUsers(prev => prev.map(user => user.id === u.id ? { ...user, status: 'ACTIVE' } : user));
                              pushToast("User activated successfully", "success");
                              try {
                                await api.activateUser(auth.token, u.id);
                              } catch (err) {
                                const uRes = await api.getUsers(auth.token);
                                setUsers(uRes.data);
                                pushToast("Failed to activate user", "error");
                              }
                            }}
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}

          {/* CATEGORIES */}
          <article className="card">
            <h3>Top Categories</h3>
          <ul className="list">
            {dashboardLoading && !summary
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <li key={`category-skeleton-${idx}`}>
                    <Skeleton className="skeleton-line" />
                  </li>
                ))
              : topCategories.map((item) => (
                  <li key={`${item.category}-${item.type}`}>
                    <span>
                      {item.category} <small>{item.type}</small>
                    </span>
                    <strong>{formatCurrency(item.total)}</strong>
                  </li>
                ))}
          </ul>
        </article>

        <article className="card">
          <h3>Recent Activity</h3>
          <ul className="list">
            {dashboardLoading && !summary
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <li key={`recent-skeleton-${idx}`}>
                    <Skeleton className="skeleton-line" />
                  </li>
                ))
              : (summary?.recentActivity || []).map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.category} <small>{new Date(item.date).toLocaleDateString()}</small>
                    </span>
                    <strong className={item.type === "INCOME" ? "ok" : "warn"}>
                      {item.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(Number(item.amount))}
                    </strong>
                  </li>
                ))}
          </ul>
        </article>
      </section>

      <section className="card">
        <h3>Transactions</h3>
        {auth.role === "VIEWER" ? (
          <p className="muted">This role cannot access transaction listing.</p>
        ) : (
          <>
            <form className="filter-row" onSubmit={handleApplyFilters}>
              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as "" | "INCOME" | "EXPENSE" }))}
              >
                <option value="">All Types</option>
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>
              <input
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              />
              <button type="submit" disabled={txLoading}>
                {txLoading ? "Loading..." : "Apply Filters"}
              </button>
              <button className="ghost" type="button" onClick={handleClearFilters}>
                Clear
              </button>
            </form>

              {auth.role === "ADMIN" || auth.role === "ANALYST" ? (
              <form className="tx-form" onSubmit={handleCreateTransaction}>
                <h4>{editId ? 'Edit Transaction' : 'Create Transaction'}</h4>
                <div className="tx-grid">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                  <select
                    value={transactionForm.type}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({ ...prev, type: e.target.value as "INCOME" | "EXPENSE" }))
                    }
                    required
                  >
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                  <input
                    placeholder="Category"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, category: e.target.value }))}
                    required
                  />
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="Note"
                    value={transactionForm.note}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, note: e.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1 / -1' }}>
                    <button type="submit" disabled={txLoading} style={{ flex: 1 }}>
                      {txLoading ? "Saving..." : editId ? "Update" : "Create"}
                    </button>
                    {editId && (
                      <button type="button" disabled={txLoading} onClick={() => { setEditId(null); setTransactionForm({ amount: "", type: "INCOME", category: "", date: "", note: "" }) }} style={{ flex: 1, backgroundColor: '#6c757d' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>
            ) : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Created By</th>
                      {(auth.role === "ADMIN" || auth.role === "ANALYST") && (
                        <th>Actions</th>
                      )}
                  </tr>
                </thead>
                <tbody>
                  {txLoading || (dashboardLoading && !summary) ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`}>
                        <td colSpan={auth.role === "ADMIN" || auth.role === "ANALYST" ? 6 : 5}>
                          <Skeleton className="skeleton-line" />
                        </td>
                      </tr>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.date).toLocaleDateString()}</td>
                        <td>{tx.category}</td>
                        <td>{tx.type}</td>
                        <td>{formatCurrency(Number(tx.amount))}</td>
                        <td>{tx.createdBy.name}</td>
                        {auth.role === "ADMIN" || auth.role === "ANALYST" ? (
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="ghost"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#334155', color: 'white', border: 'none', borderRadius: '4px' }}
                                  type="button"
                                  onClick={() => {
                                    setEditId(tx.id);
                                    setTransactionForm({
                                      amount: String(tx.amount),
                                      type: tx.type,
                                      category: tx.category,
                                      date: new Date(tx.date).toISOString().slice(0, 10),
                                      note: tx.note || ""
                                    });

                                  }}
                                >
                                  Edit
                                </button>
                                {auth.role === "ADMIN" && (
                                  <button
                                    className="danger"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none', borderRadius: '4px' }}
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          ) : null}
                      </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan={auth.role === "ADMIN" || auth.role === "ANALYST" ? 6 : 5}>No transactions found for current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {error ? <div className="inline-error">{error}</div> : null}
    </div>
  );
}

export default App;
