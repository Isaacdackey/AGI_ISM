export type Role = 'ADMIN' | 'MODERATOR' | 'STUDENT';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword?: boolean;
};

export type Campus = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
};

export type School = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  campusId: string;
  _count?: { subjects?: number; resources?: number };
};

export type Subject = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  schoolId: string;
  _count?: { resources?: number };
};

export type Resource = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  level?: string;
  semester?: string;
  year?: number;
  tags?: string[];
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  downloadCount?: number;
  school?: { id: string; name: string; slug: string };
  subject?: { id: string; name: string; slug: string };
  uploadedBy?: { id: string; name: string } | null;
};

export type Moderator = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
