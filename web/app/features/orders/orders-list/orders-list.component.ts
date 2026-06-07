import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Order, OrdersService } from '../services/orders.service';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.css']
})
export class OrdersListComponent implements OnInit {
  orders: Order[] = [];
  displayedColumns: string[] = ['id', 'customerId', 'orderDate', 'status', 'totalAmount', 'actions'];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private ordersService: OrdersService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  /**
   * Load all orders from the backend
   */
  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.ordersService.getOrders().subscribe({
      next: (data: Order[]) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.errorMessage = 'Failed to load orders. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Get status badge color
   */
getStatusColor(orderStatus: string): string {
  //if (!orderStatus) return 'gray'; // or your default color
  switch (orderStatus.toLowerCase()) {
    case 'processing': return 'orange';
    case 'pending': return 'blue';
    case 'completed': return 'green';
    case 'cancelled': return 'red';
    default: return 'red';
  }
}
}
