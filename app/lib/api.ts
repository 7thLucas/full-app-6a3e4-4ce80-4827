/**
 * Typed API client for PropLedger backend calls.
 */

export interface Property {
  _id: string;
  name: string;
  address?: string;
  description?: string;
  unitCount: number;
  createdAt?: string;
}

export interface Unit {
  _id: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  tenantName?: string;
  monthlyRent?: number;
}

export interface Expense {
  _id: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  vendor?: string;
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitNumber?: string;
  createdAt?: string;
}

export interface PnlPropertyData {
  propertyId: string;
  propertyName: string;
  months: Record<number, { expenses: number; count: number }>;
}

export interface SummaryData {
  thisMonth: { total: number; count: number };
  yearToDate: number;
  recentExpenses: Expense[];
  categoryBreakdown: { _id: string; total: number; count: number }[];
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "Request failed");
  }
  return data.data ?? data;
}

// Properties
export const api = {
  properties: {
    list: () => apiFetch<Property[]>("/api/properties"),
    create: (body: Partial<Property>) =>
      apiFetch<Property>("/api/properties", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Property>) =>
      apiFetch<Property>(`/api/properties/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/properties/${id}`, { method: "DELETE" }),
  },
  units: {
    list: (params?: { propertyId?: string; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.propertyId) qs.set("propertyId", params.propertyId);
      if (params?.q) qs.set("q", params.q);
      return apiFetch<Unit[]>(`/api/units?${qs.toString()}`);
    },
    create: (body: Partial<Unit> & { propertyId: string }) =>
      apiFetch<Unit>("/api/units", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Unit>) =>
      apiFetch<Unit>(`/api/units/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/units/${id}`, { method: "DELETE" }),
  },
  expenses: {
    list: (params?: {
      propertyId?: string;
      unitId?: string;
      month?: number;
      year?: number;
      category?: string;
      page?: number;
      limit?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.propertyId) qs.set("propertyId", params.propertyId);
      if (params?.unitId) qs.set("unitId", params.unitId);
      if (params?.month) qs.set("month", String(params.month));
      if (params?.year) qs.set("year", String(params.year));
      if (params?.category) qs.set("category", params.category);
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      return fetch(`/api/expenses?${qs.toString()}`)
        .then((r) => r.json())
        .then((d) => ({ data: d.data as Expense[], pagination: d.pagination }));
    },
    create: (body: Partial<Expense> & { propertyId: string; amount: number; category: string; date: string }) =>
      apiFetch<Expense>("/api/expenses", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Expense>) =>
      apiFetch<Expense>(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/expenses/${id}`, { method: "DELETE" }),
    pnl: async (year?: number) => {
      const qs = year ? `?year=${year}` : "";
      const res = await fetch(`/api/expenses/pnl${qs}`);
      const d = await res.json();
      return d as { data: PnlPropertyData[]; year: number };
    },
    summary: async () => {
      const res = await fetch("/api/expenses/summary");
      const d = await res.json();
      return d.data as SummaryData;
    },
  },
};
