import { Role } from '../../common/auth-user';

export class User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  password_hash: string;
  role: Role;
  created_at?: string;

  constructor(row: Partial<User>) {
    Object.assign(this, row);
    this.avatar_url = row.avatar_url || null;
  }

  static fromRow(row: any): User | null {
    return row ? new User(row) : null;
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }

  /** Loại bỏ password_hash trước khi trả ra ngoài API. */
  toPublicJSON() {
    return {
      id: this.id,
      full_name: this.full_name,
      email: this.email,
      phone: this.phone,
      avatar_url: this.avatar_url,
      role: this.role,
    };
  }
}
