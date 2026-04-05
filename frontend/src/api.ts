export type Role = "ADMIN" | "ANALYST" | "VIEWER";

export interface TrendItem {
  period: string;
  granularity: "month" | "week";
  income: number;
  expense: number;
  net: number;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      status: string;
    };
    token: string;
  };
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  recentActivity: Array<{
    id: string;
    amount: string;
    type: "INCOME" | "EXPENSE";
    category: string;
    date: string;
    note?: string;
  }>;
}

export interface TransactionListResponse {
  success: boolean;
  data: {
    items: Array<{
      id: string;
      amount: string;
      type: "INCOME" | "EXPENSE";
      category: string;
      date: string;
      note?: string;
      createdBy: {
        name: string;
        email: string;
      };
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface TransactionFilters {
  type?: "INCOME" | "EXPENSE";
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await res.json();
  if (!res.ok) {
    const validationBody = data?.errors?.body;
    const validationMessage =
      Array.isArray(validationBody) && validationBody.length > 0
        ? validationBody[0]
        : undefined;

    throw new Error(validationMessage || data.message || "Request failed");
  }

  return data as T;
}

export const api = {
  register(name: string, email: string, password: string) {
    return request<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  },

  login(email: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  getSummary(token: string) {
    return request<{ success: boolean; data: DashboardSummary }>("/dashboard/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  getCategoryTotals(token: string) {
    return request<{
      success: boolean;
      data: Array<{ category: string; type: "INCOME" | "EXPENSE"; total: number }>;
    }>("/dashboard/categories", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  getTransactions(token: string, filters: TransactionFilters = {}) {
    const query = new URLSearchParams();

    if (filters.type) {
      query.set("type", filters.type);
    }
    if (filters.category) {
      query.set("category", filters.category);
    }
    if (filters.dateFrom) {
      query.set("dateFrom", new Date(filters.dateFrom).toISOString());
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query.set("dateTo", endOfDay.toISOString());
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";

    return request<TransactionListResponse>(`/transactions${suffix}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  createTransaction(
    token: string,
    payload: {
      amount: number;
      type: "INCOME" | "EXPENSE";
      category: string;
      date: string;
      note?: string;
    }
  ) {
    return request<{ success: boolean }>("/transactions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...payload,
        date: new Date(payload.date).toISOString()
      })
    });
  },

  deleteTransaction(token: string, id: string) {
    return request<{ success: boolean; message: string }>(`/transactions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  updateTransaction(
    token: string,
    id: string,
    payload: {
      amount?: number;
      type?: "INCOME" | "EXPENSE";
      category?: string;
      date?: string;
      note?: string;
    }
  ) {
    const body: any = { ...payload };
    if (payload.date) body.date = new Date(payload.date).toISOString();
    return request<{ success: boolean; data: any }>(`/transactions/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  },

  getTrends(token: string, months = 6, granularity: "month" | "week" = "month") {
    return request<{ success: boolean; data: TrendItem[] }>(`/dashboard/trends?months=${months}&granularity=${granularity}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  getUsers(token: string) {
    return request<{ success: boolean; data: UserItem[] }>(`/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  updateUserRole(token: string, id: string, role: Role) {
    return request<{ success: boolean; data: UserItem }>(`/users/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });
  },

    activateUser(token: string, id: string) {
    return request<{ success: boolean; data: UserItem }>( `/users/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: "ACTIVE" })
    });
  },

  deactivateUser(token: string, id: string) {
    return request<{ success: boolean; data: UserItem }>(`/users/${id}/deactivate`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
};
