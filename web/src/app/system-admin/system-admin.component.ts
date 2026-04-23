import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Organization, SystemUser } from './admin.service';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-admin.component.html',
  styleUrls: ['./system-admin.component.scss'],
  providers: [AdminService]
})
export class SystemAdminComponent implements OnInit {
  private adminService = inject(AdminService);

  organizations: Organization[] = [];
  users: SystemUser[] = [];
  orgFilter = '';
  userFilter = '';
  loading = false;
  error: string | null = null;
  licenseTiers = ['Basic', 'Standard', 'Professional', 'Enterprise'];
  userRoles = [
    { display: 'System Admin', value: 'SystemAdmin' }, // Backend: SystemAdmin
    { display: 'Company Admin', value: 'admin' }, // Backend: admin (in database)
    { display: 'Staff', value: 'staff' }, // Backend: staff (in database)
    { display: 'Customer', value: 'Customer' }, // Backend: Customer
    { display: 'Delivery', value: 'Delivery' } // Backend: Delivery
  ];

  onUserEnabledChange(event: Event, userId: string) {
    const checked = (event.target && (event.target as HTMLInputElement).checked) || false;
    this.handleUserEnabledChange(userId, checked);
  }

  ngOnInit(): void {
    this.fetchData();
  }

  getOrganizationName(orgId: string): string {
    const org = this.organizations.find(o => o.organizationId === orgId);
    return org ? org.organizationName : '';
  }

  fetchData(): void {
    this.loading = true;
    this.error = null;
    Promise.all([
      this.adminService.getAllOrganizations().toPromise(),
      this.adminService.getAllUsers().toPromise()
    ]).then(([orgs, usrs]) => {
      this.organizations = orgs || [];
      this.users = usrs || [];
    }).catch((err: unknown) => {
      this.error = err instanceof Error ? err.message : 'Failed to load data';
    }).finally(() => {
      this.loading = false;
    });
  }

  handleLicenseChange(orgId: string, newTier: string) {
    this.loading = true;
    this.adminService.updateOrganizationLicense(orgId, newTier).toPromise()
      .then(() => this.fetchData())
  .catch((err: unknown) => this.error = err instanceof Error ? err.message : 'Failed to update license')
      .finally(() => this.loading = false);
  }

  handleUserRoleChange(userId: string, newRole: string) {
    this.loading = true;
    this.adminService.updateUser(userId, { userRole: newRole }).toPromise()
      .then(() => this.fetchData())
  .catch((err: unknown) => this.error = err instanceof Error ? err.message : 'Failed to update user role')
      .finally(() => this.loading = false);
  }

  handleUserEnabledChange(userId: string, enabled: boolean) {
    this.loading = true;
    this.adminService.updateUser(userId, { isEnabled: enabled }).toPromise()
      .then(() => this.fetchData())
  .catch((err: unknown) => this.error = err instanceof Error ? err.message : 'Failed to update user status')
      .finally(() => this.loading = false);
  }

  handleEmulateUser(userId: string) {
    this.loading = true;
    if (!localStorage.getItem('admin_basicAuth')) {
      localStorage.setItem('admin_basicAuth', sessionStorage.getItem('basicAuth') || '');
      localStorage.setItem('admin_user', sessionStorage.getItem('currentUser') || '');
    }

    this.adminService.emulateUser(userId).toPromise()
      .then((resp: unknown) => {
        sessionStorage.setItem('currentUser', JSON.stringify(resp));
        localStorage.setItem('is_emulating', '1');
        window.location.href = '/';
      })
  .catch((err: unknown) => this.error = err instanceof Error ? err.message : 'Failed to emulate user')
      .finally(() => this.loading = false);
  }

  handleRevertToAdmin() {
    const adminBasic = localStorage.getItem('admin_basicAuth');
    const adminUser = localStorage.getItem('admin_user');
    if (adminBasic !== null && adminUser !== null) {
      sessionStorage.setItem('basicAuth', adminBasic || '');
      sessionStorage.setItem('currentUser', adminUser || '');
      localStorage.removeItem('admin_basicAuth');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('is_emulating');
      window.location.href = '/';
    }
  }

  get isEmulating(): boolean {
    return !!localStorage.getItem('admin_basicAuth');
  }

  get filteredOrgs(): Organization[] {
    return this.organizations.filter(o =>
      o.organizationName.toLowerCase().includes(this.orgFilter.toLowerCase())
    );
  }

  get filteredUsers(): SystemUser[] {
    return this.users.filter(u =>
      u.userName.toLowerCase().includes(this.userFilter.toLowerCase()) ||
      u.emailAddress.toLowerCase().includes(this.userFilter.toLowerCase())
    );
  }

  // Compare function for ngModel binding
  compareRoles(role1: string, role2: string): boolean {
    return role1 === role2;
  }
}
