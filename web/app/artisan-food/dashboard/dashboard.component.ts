import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RoleService } from '../../../shared-data-services/role.service';
import { LicenseService } from '../../../shared-data-services/license.service';
import { TrialBannerComponent } from '../../../shared-data-services/trial-banner.component';

interface Order {
  id: string;
  customer: string;
  item: string;
  amount: number;
  status: string;
  dueDate: string;
  source: string;
}

@Component({
  selector: 'app-artisan-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TrialBannerComponent, RouterModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class ArtisanDashboardComponent {
  private roleService = inject(RoleService);
  licenseService = inject(LicenseService);

  stats = {
    todayOrders: 12,
    weeklyRevenue: 2450,
    pendingOrders: 8,
    completedOrders: 45,
    upcomingDeliveries: 6,
    lowStockItems: 3
  };

  recentOrders = [
    { id: 'ORD-001', customer: 'Sarah Wilson', item: 'Custom Wedding Cake', amount: 450, status: 'In Progress', dueDate: '2025-09-28', source: 'web' },
    { id: 'ORD-002', customer: 'Mike Chen', item: 'Sourdough Bread (Weekly)', amount: 25, status: 'Ready', dueDate: '2025-09-25', source: 'phone' },
    { id: 'ORD-003', customer: 'Emma Davis', item: 'Strawberry Jam (6 jars)', amount: 48, status: 'Pending', dueDate: '2025-09-26', source: 'in-person' },
    { id: 'ORD-004', customer: 'Tom Brown', item: 'Birthday Cupcakes (24)', amount: 72, status: 'In Progress', dueDate: '2025-09-27', source: 'email' }
  ];

  orderStatuses = ['Pending', 'Scheduled', 'In Progress', 'Ready', 'Completed', 'Cancelled'];

  updateOrderStatus(order: Order, newStatus: string) {
    order.status = newStatus;
  }

  upcomingProduction = [
    { item: 'Wedding Cake Base', quantity: 1, startTime: '06:00 AM', estimatedDuration: '4 hours' },
    { item: 'Sourdough Bread', quantity: 8, startTime: '05:00 AM', estimatedDuration: '8 hours' },
    { item: 'Cupcake Batter', quantity: 24, startTime: '08:00 AM', estimatedDuration: '2 hours' }
  ];

  get currentRole() {
    return this.roleService.getCurrentRole();
  }

  get currentUserName() {
    return this.roleService.getCurrentUserName();
  }

  get displayRole() {
    const user = this.roleService.getCurrentUser();
    return user?.role || 'Admin';
  }

  get licenseTier() {
    return this.licenseService.getCurrentTier();
  }
}