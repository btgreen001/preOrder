import { Component } from '@angular/core';

import { Router } from '@angular/router';

@Component({
  selector: 'app-delivery-list',
  standalone: true,
  imports: [],
  templateUrl: './delivery-list.html',
  styleUrls: ['./delivery-list.scss']
})
export class DeliveryListComponent {
  // Mock data for deliveries
  deliveries = [
    { id: 101, orderId: 1, customer: 'Acme Cafe', date: '2025-10-10', status: 'Scheduled' },
    { id: 102, orderId: 2, customer: 'Bread & Butter', date: '2025-10-11', status: 'Delivered' },
    { id: 103, orderId: 3, customer: 'Sweet Spot', date: '2025-10-12', status: 'In Transit' }
  ];

  constructor(private router: Router) {}

  viewDelivery(deliveryId: number) {
    this.router.navigate(['/orders/delivery', deliveryId]);
  }
}
