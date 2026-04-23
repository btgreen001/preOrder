import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../../shared-data-services/role.service';

interface DeliveryOrder {
  id: string;
  customer: string;
  phone: string;
  address: string;
  items: string[];
  amount: number;
  status: 'ready' | 'assigned' | 'out-for-delivery' | 'delivered' | 'failed';
  assignedDriver?: string;
  scheduledTime?: string;
  deliveredTime?: string;
  notes?: string;
  proximityGroup?: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  currentDeliveries: number;
}

@Component({
  selector: 'app-delivery-dispatch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-dispatch.component.html',
  styleUrls: ['./delivery-dispatch.component.scss']
})
export class DeliveryDispatchComponent {
  private roleService = inject(RoleService);


  get isDispatcher(): boolean {
    const role = this.roleService.getCurrentRole();
    return role === 'admin' || role === 'staff';
  }

  get isDriver(): boolean {
    return this.roleService.getCurrentRole() === 'delivery';
  }

  // Mock data
  orders: DeliveryOrder[] = [
    {
      id: 'ORD-001',
      customer: 'Sarah Wilson',
      phone: '(555) 123-4567',
      address: '123 Main St, Springfield, IL 62701',
      items: ['Wedding Cake', 'Cupcakes x12'],
      amount: 275,
      status: 'ready',
      proximityGroup: 'Downtown'
    },
    {
      id: 'ORD-002', 
      customer: 'Mike Chen',
      phone: '(555) 234-5678',
      address: '456 Oak Ave, Springfield, IL 62702',
      items: ['Sourdough Bread x3', 'Jam x2'],
      amount: 42,
      status: 'assigned',
      assignedDriver: 'John Doe',
      proximityGroup: 'Downtown'
    },
    {
      id: 'ORD-003',
      customer: 'Emma Davis', 
      phone: '(555) 345-6789',
      address: '789 Pine Rd, Springfield, IL 62703',
      items: ['Birthday Cake', 'Cookies x24'],
      amount: 95,
      status: 'out-for-delivery',
      assignedDriver: 'Jane Smith',
      proximityGroup: 'Northside'
    },
    {
      id: 'ORD-004',
      customer: 'Tom Brown',
      phone: '(555) 456-7890', 
      address: '321 Elm St, Springfield, IL 62704',
      items: ['Croissants x6'],
      amount: 24,
      status: 'delivered',
      assignedDriver: 'John Doe',
      deliveredTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      proximityGroup: 'Southside'
    }
  ];

  drivers: Driver[] = [
    { id: 'D001', name: 'John Doe', phone: '(555) 111-2222', status: 'available', currentDeliveries: 1 },
    { id: 'D002', name: 'Jane Smith', phone: '(555) 333-4444', status: 'busy', currentDeliveries: 2 }, 
    { id: 'D003', name: 'Bob Johnson', phone: '(555) 555-6666', status: 'available', currentDeliveries: 0 }
  ];

  selectedOrders: string[] = [];
  selectedDriver = '';

  get readyOrders() {
    return this.orders.filter(o => o.status === 'ready');
  }

  get assignedOrders() {
    return this.orders.filter(o => o.status === 'assigned');
  }

  get outForDeliveryOrders() {
    return this.orders.filter(o => o.status === 'out-for-delivery');
  }

  get deliveredOrders() {
    return this.orders.filter(o => o.status === 'delivered');
  }

  get failedOrders() {
    return this.orders.filter(o => o.status === 'failed');
  }

  get availableDrivers() {
    return this.drivers.filter(d => d.status === 'available');
  }

  get proximityGroups() {
    const groups: Record<string, DeliveryOrder[]> = {};
    this.readyOrders.forEach(order => {
      const group = order.proximityGroup || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(order);
    });
    return groups;
  }

  toggleOrderSelection(orderId: string) {
    const index = this.selectedOrders.indexOf(orderId);
    if (index >= 0) {
      this.selectedOrders.splice(index, 1);
    } else {
      this.selectedOrders.push(orderId);
    }
  }

  assignToDriver() {
    if (!this.selectedDriver || this.selectedOrders.length === 0) return;
    
    const driver = this.drivers.find(d => d.id === this.selectedDriver);
    if (!driver) return;

    this.selectedOrders.forEach(orderId => {
      const order = this.orders.find(o => o.id === orderId);
      if (order && order.status === 'ready') {
        order.status = 'assigned';
        order.assignedDriver = driver.name;
        this.sendNotification(order, 'assigned');
      }
    });

    driver.currentDeliveries += this.selectedOrders.length;
    if (driver.currentDeliveries > 0) {
      driver.status = 'busy';
    }

    this.selectedOrders = [];
    this.selectedDriver = '';
  }

  // Driver functions
  get myDeliveries() {
    const currentUser = 'John Doe'; // Mock current driver
    return this.orders.filter(o => o.assignedDriver === currentUser && o.status !== 'delivered');
  }

  markOutForDelivery(order: DeliveryOrder) {
    order.status = 'out-for-delivery';
    this.sendNotification(order, 'out-for-delivery');
  }

  markDelivered(order: DeliveryOrder) {
    order.status = 'delivered';
    order.deliveredTime = new Date().toISOString();
    this.sendNotification(order, 'delivered');
    
    // Update driver availability
    const driver = this.drivers.find(d => d.name === order.assignedDriver);
    if (driver) {
      driver.currentDeliveries = Math.max(0, driver.currentDeliveries - 1);
      if (driver.currentDeliveries === 0) {
        driver.status = 'available';
      }
    }
  }

  markFailed(order: DeliveryOrder, reason: string) {
    order.status = 'failed';
    order.notes = reason;
    this.sendNotification(order, 'failed');
  }

  // Wrap window.prompt for template usage
  promptFail(order: DeliveryOrder) {
    const reason = window.prompt('Reason for failed delivery:') || 'Unable to deliver';
    this.markFailed(order, reason);
  }

  openInMaps(address: string) {
    const encodedAddress = encodeURIComponent(address);
    // Try Google Maps first, fallback to Apple Maps on iOS
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  }

  openInWaze(address: string) {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://waze.com/ul?q=${encodedAddress}`, '_blank');
  }

  // Customer notifications
  private sendNotification(order: DeliveryOrder, event: string) {
    const messages = {
      'assigned': `Your order ${order.id} has been assigned for delivery.`,
      'out-for-delivery': `Your order ${order.id} is out for delivery!`,
      'delivered': `Your order ${order.id} has been delivered. Thank you!`,
      'failed': `We couldn't deliver your order ${order.id}. We'll contact you to reschedule.`,
      'delayed': `Your order ${order.id} delivery is delayed. Updated ETA coming soon.`
    };

    // Mock notification - in real app would send email/SMS
    console.log(`📧 Notification to ${order.customer} (${order.phone}): ${messages[event as keyof typeof messages]}`);
  }

  sendDelayNotification(order: DeliveryOrder) {
    this.sendNotification(order, 'delayed');
  }

  // Route optimization (mock)
  optimizeRoute(orders: DeliveryOrder[]) {
    // Mock route optimization - in real app would use routing API
    alert(`Route optimized for ${orders.length} deliveries! Suggested order: ${orders.map(o => o.customer).join(' → ')}`);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'ready': '#2196f3',
      'assigned': '#ff9800', 
      'out-for-delivery': '#4caf50',
      'delivered': '#9c27b0',
      'failed': '#f44336'
    };
    return colors[status] || '#666';
  }
}