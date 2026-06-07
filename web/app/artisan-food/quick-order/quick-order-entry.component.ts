import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RoleService } from '../../../shared-data-services/role.service';

@Component({
  selector: 'app-quick-order-entry',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './quick-order-entry.component.html',
  styleUrls: ['./quick-order-entry.component.scss']
})
export class QuickOrderEntryComponent {
  private roleService = inject(RoleService);

  // Only staff/admin can access
  constructor() {
    this.setDefaultDateTime();
  }

  get isStaffOrAdmin(): boolean {
    const role = this.roleService.getCurrentRole();
    return role === 'admin' || role === 'staff';
  }

  // Form fields

  walkIn = false;
  order = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    products: [
      { name: '', quantity: 1, notes: '' }
    ],
    pickupOrDelivery: 'pickup',
    date: '',
    time: '',
    notes: '',
    source: 'phone' // default for quick entry
  };

  setDefaultDateTime() {
    const now = new Date();
    // Format date as yyyy-MM-dd
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    this.order.date = `${yyyy}-${mm}-${dd}`;
    // Format time as HH:mm
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    this.order.time = `${hh}:${min}`;
  }

  // Order source options for staff
  orderSources = [
    { value: 'phone', label: 'Phone Call' },
    { value: 'in-person', label: 'In-Person' },
    { value: 'email', label: 'Email' }
  ];

  addProduct() {
    this.order.products.push({ name: '', quantity: 1, notes: '' });
  }

  removeProduct(i: number) {
    if (this.order.products.length > 1) {
      this.order.products.splice(i, 1);
    }
  }

  submitOrder() {
    // TODO: Integrate with backend or order service
    alert('Order submitted! (mock)');
    // Reset form
    this.walkIn = false;
    this.order = {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      products: [
        { name: '', quantity: 1, notes: '' }
      ],
      pickupOrDelivery: 'pickup',
      date: '',
      time: '',
      notes: '',
      source: 'phone'
    };
    this.setDefaultDateTime();
  }
}
