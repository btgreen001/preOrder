import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService, Order } from '../services/orders.service';


@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-detail-container" *ngIf="order">
      <header class="page-header">
        <h1>Order Details</h1>
        <button class="btn-edit" (click)="editOrder()">Edit Order</button>
      </header>
      <div class="order-info">
        <p><strong>Order ID:</strong> {{ order.externalId }}</p>
        <p><strong>Customer:</strong> {{ order.customerId }}</p>
        <p><strong>Status:</strong> <span class="status-badge status-{{ order.orderStatus }}">{{ order.orderStatus | titlecase }}</span></p>
        <p><strong>Total:</strong> {{ order.totalAmount | currency:'USD':'symbol':'1.2-2' }}</p>
        <p><strong>Created:</strong> {{ order.orderDate | date:'medium' }}</p>
      </div>
    </div>
    <div *ngIf="!order">
      <p>Order not found.</p>
    </div>
  `,
  styles: [`
    .order-detail-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
      max-width: 800px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--bakery-accent);
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }
    .order-info {
      background: var(--bakery-surface);
      padding: 30px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .order-info p {
      margin: 15px 0;
      font-size: 1.1rem;
      line-height: 1.6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .order-info strong {
      color: var(--bakery-text-emph);
      font-weight: 600;
      min-width: 120px;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-pending {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .status-processing {
      background: var(--bakery-primary);
      color: var(--bakery-text-emph);
    }
    .status-completed {
      background: var(--bakery-success);
      color: var(--bakery-text-emph);
    }
    .status-cancelled {
      background: var(--bakery-error);
      color: var(--bakery-text-emph);
    }
    .btn-edit {
      padding: 10px 20px;
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background-color 0.2s;
    }
    .btn-edit:hover {
      background: var(--bakery-accent-2);
    }
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }
      .order-info {
        padding: 20px;
      }
      .order-info p {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
    }
  `]
})
export class OrderDetailComponent {
  order: Order | undefined;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orders = inject(OrdersService);
  private status: Order['orderStatus'] = 'PENDING';

  constructor() {
    const externalId = this.route.snapshot.params['externalId'];
    this.orders.getOrderById(externalId).subscribe((o: Order) => this.order = o);
  }

  editOrder() {
    if (this.order) {
      this.router.navigate(['/orders/edit', this.order.externalId]);
    }
  }
}
