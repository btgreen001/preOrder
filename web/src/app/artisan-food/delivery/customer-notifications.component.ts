import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CustomerOrder {
  id: string;
  customer: string;
  email: string;
  phone: string;
  status: 'submitted' | 'confirmed' | 'planned' | 'out-for-delivery' | 'delivered' | 'delayed';
  items: string[];
  amount: number;
  submittedAt: string;
  confirmedAt?: string;
  plannedFor?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  trackingLink: string;
  notifications: {
    type: string;
    sentAt: string;
    channel: 'email' | 'sms';
    status: 'sent' | 'delivered' | 'failed';
  }[];
}

@Component({
  selector: 'app-customer-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-notifications.component.html',
  styleUrls: ['./customer-notifications.component.scss']
})
export class CustomerNotificationsComponent {
  selectedOrderId = 'ORD-001';

  customerOrders: CustomerOrder[] = [
    {
      id: 'ORD-001',
      customer: 'Sarah Wilson',
      email: 'sarah@email.com',
      phone: '(555) 123-4567',
      status: 'out-for-delivery',
      items: ['Wedding Cake', 'Cupcakes x12'],
      amount: 275,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      plannedFor: new Date().toISOString(),
      outForDeliveryAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      trackingLink: `https://bakery.com/track/ORD-001`,
      notifications: [
        { type: 'Order Submitted', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', status: 'delivered' },
        { type: 'Order Confirmed', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), channel: 'email', status: 'delivered' },
        { type: 'Planned for Delivery', sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), channel: 'email', status: 'delivered' },
        { type: 'Out for Delivery', sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), channel: 'sms', status: 'sent' }
      ]
    },
    {
      id: 'ORD-002',
      customer: 'Mike Chen',
      email: 'mike@email.com',
      phone: '(555) 234-5678',
      status: 'confirmed',
      items: ['Sourdough Bread x3', 'Jam x2'],
      amount: 42,
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      trackingLink: `https://bakery.com/track/ORD-002`,
      notifications: [
        { type: 'Order Submitted', sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', status: 'delivered' },
        { type: 'Order Confirmed', sentAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), channel: 'email', status: 'delivered' }
      ]
    }
  ];

  get selectedOrder(): CustomerOrder {
    return this.customerOrders.find(o => o.id === this.selectedOrderId) || this.customerOrders[0];
  }

  updateSelectedOrder() {
    // Trigger change detection
  }

  isStatusCompleted(status: string): boolean {
    const statusOrder = ['submitted', 'confirmed', 'planned', 'out-for-delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(this.selectedOrder.status);
    const checkIndex = statusOrder.indexOf(status);
    return checkIndex <= currentIndex;
  }
}