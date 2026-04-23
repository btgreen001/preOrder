import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-history.html',
  styleUrls: ['./order-history.scss']
})
export class OrderHistoryComponent {
  // Mock data for order history
  orders = [
    { id: 1, date: '2025-10-01', total: 24.5, status: 'Delivered' },
    { id: 2, date: '2025-10-05', total: 12.0, status: 'Cancelled' },
    { id: 3, date: '2025-10-08', total: 36.75, status: 'Delivered' }
  ];

  constructor(private router: Router) {}

  viewOrder(orderId: number) {
    this.router.navigate(['/orders/detail', orderId]);
  }
}
