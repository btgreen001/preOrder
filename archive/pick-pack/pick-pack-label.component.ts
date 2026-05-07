import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  picked: boolean;
  substitution?: string;
  notes?: string;
}

interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalWeight?: number;
  status: 'picking' | 'packing' | 'labeling' | 'completed';
  packingNotes?: string;
  internalTrackingLabel?: string;
  allergens?: string[];
  expirationDate?: string;
}

@Component({
  selector: 'app-pick-pack-label',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pick-pack-label.component.html',
  styleUrls: ['./pick-pack-label.component.scss']
})
export class PickPackLabelComponent {
  currentStep: 'pick' | 'pack' | 'label' | 'confirm' = 'pick';
  selectedOrder: Order | null = null;

  // Mock orders ready for fulfillment
  availableOrders: Order[] = [
    {
      id: 'ORD-001',
      customerName: 'Sarah Wilson',
      status: 'picking',
      items: [
        { id: 'I001', name: 'Sourdough Bread', quantity: 2, picked: false },
        { id: 'I002', name: 'Strawberry Jam', quantity: 1, picked: false },
        { id: 'I003', name: 'Chocolate Cookies', quantity: 3, picked: false }
      ]
    },
    {
      id: 'ORD-002',
      customerName: 'Mike Chen',
      status: 'picking',
      items: [
        { id: 'I004', name: 'Wedding Cake', quantity: 1, picked: false },
        { id: 'I005', name: 'Cupcakes', quantity: 12, picked: false }
      ]
    }
  ];

  selectOrder(order: Order) {
    this.selectedOrder = { ...order };
    this.currentStep = 'pick';
  }

  goToStep(step: 'pick' | 'pack' | 'label' | 'confirm') {
    this.currentStep = step;
  }

  canProceedToPack(): boolean {
    return this.selectedOrder?.items.every(item => item.picked) || false;
  }

  canProceedToLabel(): boolean {
    return this.selectedOrder?.status === 'packing';
  }

  pickItem(item: OrderItem) {
    if (this.selectedOrder) {
      item.picked = true;
      this.updateInventory(item);
    }
  }

  unpickItem(item: OrderItem) {
    item.picked = false;
  }

  proceedToPacking() {
    if (this.selectedOrder && this.canProceedToPack()) {
      this.selectedOrder.status = 'packing';
      this.currentStep = 'pack';
    }
  }

  proceedToLabeling() {
    if (this.selectedOrder) {
      this.selectedOrder.status = 'labeling';
      this.selectedOrder.totalWeight = this.calculateWeight();
      this.currentStep = 'label';
    }
  }

  proceedToConfirm() {
    if (this.selectedOrder) {
      this.generateLabel();
      this.currentStep = 'confirm';
    }
  }

  completeOrder() {
    if (this.selectedOrder) {
      this.selectedOrder.status = 'completed';
      // Remove from available orders
      const index = this.availableOrders.findIndex(o => o.id === this.selectedOrder!.id);
      if (index >= 0) {
        this.availableOrders.splice(index, 1);
      }
      this.selectedOrder = null;
      this.currentStep = 'pick';
    }
  }

  private updateInventory(item: OrderItem) {
    // Mock inventory update - log the change
    console.log(`Inventory updated: ${item.name} - ${item.quantity} picked`);
  }

  private calculateWeight(): number {
    // Mock weight calculation
    return Math.floor(Math.random() * 10) + 5; // 5-15 lbs
  }

  private generateLabel() {
    if (this.selectedOrder) {
      this.selectedOrder.internalTrackingLabel = `${this.selectedOrder.id}-${Date.now()}`;
      this.selectedOrder.allergens = ['Contains gluten', 'May contain nuts'];
      this.selectedOrder.expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  printLabel() {
    alert('Label sent to default printer!');
  }

  addSubstitution(item: OrderItem, substitution: string) {
    item.substitution = substitution;
  }

  get allItemsPicked(): boolean {
    return this.selectedOrder?.items.every(item => item.picked) || false;
  }

  get hasSubstitutions(): boolean {
    return this.selectedOrder?.items.some(item => item.substitution) || false;
  }
}
