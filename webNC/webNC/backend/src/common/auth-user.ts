export type Role = 'ADMIN' | 'TENANT';

/** Payload JWT được gắn vào request.user */
export interface AuthUser {
  id: number;
  role: Role;
  full_name: string;
}
