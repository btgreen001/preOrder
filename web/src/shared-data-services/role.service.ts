import { Injectable, inject } from '@angular/core';
import { AuthService } from '../app/core/services/auth.service';

export type UserRole = 'SystemAdmin' | 'admin' | 'staff' | 'customer' | 'delivery' | 'CompanyAdmin';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private authService = inject(AuthService);

  getCurrentRole(): UserRole {
    const user = this.authService.currentUserValue;
    const backendRole = user?.role;
    return this.mapBackendRoleToFrontend(backendRole);
  }

  private mapBackendRoleToFrontend(backendRole: string | undefined): UserRole {
    switch (backendRole) {
      case 'SystemAdmin':
        return 'SystemAdmin';
      case 'CompanyAdmin':
        return 'CompanyAdmin';
      case 'admin':
        return 'admin';
      case 'staff':
        return 'staff';
      case 'customer':
        return 'customer';
      case 'delivery':
        return 'delivery';
      default:
        return 'staff'; // Default fallback
    }
  }

  getCurrentUser() {
    return this.authService.currentUserValue;
  }

  getCurrentUserName(): string {
    const user = this.authService.currentUserValue;
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim() || user.username;
    }
    return 'Admin';
  }

  getAvailableRoles(): UserRole[] {
    return ['SystemAdmin', 'admin', 'staff', 'customer', 'delivery', 'CompanyAdmin'];
  }
}
