export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function throwApiError(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  let message = text || res.statusText || 'Erreur inattendue';
  let code: string | undefined;
  if (text) {
    try {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === 'object') {
        const msg = (body as { message?: unknown; error?: unknown }).message;
        const raw = Array.isArray(msg) ? msg[0] : (msg ?? (body as { error?: unknown }).error);
        if (typeof raw === 'string' && raw) message = raw;
        const bodyCode = (body as { code?: unknown }).code;
        if (typeof bodyCode === 'string') code = bodyCode;
      }
    } catch {
      // Corps non JSON : on garde le texte brut.
    }
  }
  throw new ApiError(res.status, message, code);
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> | undefined) };
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' as RequestCredentials });
  } catch {
    throw new ApiError(0, 'Connexion impossible, vérifiez votre réseau');
  }
  if (!res.ok) await throwApiError(res);
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return res.json();
  return res;
}

export const apiPost = (path: string, data: unknown) =>
  apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiPatch = (path: string, data: unknown) =>
  apiFetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiDelete = (path: string) => apiFetch(path, { method: 'DELETE' });

export const apiUpload = (path: string, form: FormData) => apiFetch(path, { method: 'POST', body: form });

export const api = {
  campuses: () => apiFetch('/campuses'),
  schools: (params?: string) => apiFetch(`/schools${params || ''}`),
  school: (slug: string) => apiFetch(`/schools/${encodeURIComponent(slug)}`),
  createSchool: (data: unknown) => apiPost('/schools', data),
  updateSchool: (id: string, data: unknown) => apiPatch(`/schools/${encodeURIComponent(id)}`, data),
  deleteSchool: (id: string) => apiDelete(`/schools/${encodeURIComponent(id)}`),
  subjects: (params?: string) => apiFetch(`/subjects${params || ''}`),
  subject: (slug: string) => apiFetch(`/subjects/${encodeURIComponent(slug)}`),
  createSubject: (data: unknown) => apiPost('/subjects', data),
  updateSubject: (id: string, data: unknown) => apiPatch(`/subjects/${encodeURIComponent(id)}`, data),
  deleteSubject: (id: string) => apiDelete(`/subjects/${encodeURIComponent(id)}`),
  resources: (params?: string) => apiFetch(`/resources${params || ''}`),
  resource: (slug: string) => apiFetch(`/resources/${encodeURIComponent(slug)}`),
  updateResource: (id: string, data: unknown) => apiPatch(`/resources/${encodeURIComponent(id)}`, data),
  deleteResource: (id: string) => apiDelete(`/resources/${encodeURIComponent(id)}`),
  approveResource: (id: string) => apiPatch(`/resources/${encodeURIComponent(id)}/approve`, {}),
  rejectResource: (id: string) => apiPatch(`/resources/${encodeURIComponent(id)}/reject`, {}),
  uploadResource: (form: FormData) => apiUpload('/resources', form),
  login: (data: unknown) => apiPost('/auth/login', data),
  changePassword: (data: unknown) => apiPost('/auth/change-password', data),
  logout: () => apiPost('/auth/logout', {}),
  me: () => apiFetch('/auth/me'),
  adminStats: () => apiFetch('/admin/stats'),
  pending: () => apiFetch('/admin/pending'),
  moderators: () => apiFetch('/admin/moderators'),
  createModerator: (data: { name: string; email: string }) => apiPost('/admin/moderators', data),
  disableModerator: (id: string) => apiPatch(`/admin/moderators/${encodeURIComponent(id)}/disable`, {}),
  enableModerator: (id: string) => apiPatch(`/admin/moderators/${encodeURIComponent(id)}/enable`, {}),
  resetModeratorPassword: (id: string) => apiPost(`/admin/moderators/${encodeURIComponent(id)}/reset-password`, {}),
};

export function resourceDownloadUrl(id: string) {
  return `${API}/resources/${encodeURIComponent(id)}/download`;
}
export function resourcePreviewUrl(id: string) {
  return `${API}/resources/${encodeURIComponent(id)}/preview`;
}
