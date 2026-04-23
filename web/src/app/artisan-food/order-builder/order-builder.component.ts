import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Product {
  id: string;
  name: string;
  basePrice: number;
  category: string;
}

interface Customization {
  type: string;
  value: string;
  price: number;
}

interface CartItem {
  id: string;
  name: string;
  basePrice: number;
  quantity: number;
  customizations: Customization[];
  totalPrice: number;
  category: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  deliveryAddress?: string;
  notes?: string;
}

import { RoleService } from '../../../shared-data-services/role.service';

@Component({
  selector: 'app-order-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './order-builder.component.html',
  styleUrls: ['./order-builder.component.scss']
})
export class OrderBuilderComponent {
  private roleService = inject(RoleService);


  get isStaffOrAdmin(): boolean {
    const role = this.roleService.getCurrentRole();
    return role === 'admin' || role === 'staff';
  }
  currentStep = 1;
  totalSteps = 4;
  
  customer: Customer = {
    name: '',
    email: '',
    phone: ''
  };

  cart: CartItem[] = [];
  
  selectedDeliveryDate = '';
  selectedDeliveryTime = '';
  deliveryMethod = 'pickup';
  
  specialInstructions = '';
  rushOrder = false;
  
  availableProducts = [
    { id: 'P001', name: 'Wedding Cake', basePrice: 350, category: 'cakes' },
    { id: 'P002', name: 'Birthday Cake', basePrice: 65, category: 'cakes' },
    { id: 'P003', name: 'Sourdough Bread', basePrice: 8, category: 'breads' },
    { id: 'P004', name: 'Croissants', basePrice: 24, category: 'pastries' },
    { id: 'P005', name: 'Chocolate Cookies', basePrice: 18, category: 'cookies' }
  ];

  get cartTotal() {
    return this.cart.reduce((total, item) => total + item.totalPrice, 0);
  }

  get cartCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  addToCart(product: Product) {
    const existingItem = this.cart.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity++;
      existingItem.totalPrice = existingItem.basePrice * existingItem.quantity;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        basePrice: product.basePrice,
        quantity: 1,
        customizations: [],
        totalPrice: product.basePrice,
        category: product.category
      });
    }
  }

  removeFromCart(itemId: string) {
    this.cart = this.cart.filter(item => item.id !== itemId);
  }

  updateQuantity(itemId: string, quantity: number) {
    const item = this.cart.find(item => item.id === itemId);
    if (item && quantity > 0) {
      item.quantity = quantity;
      item.totalPrice = item.basePrice * quantity;
    }
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitOrder() {
    const order = {
      customer: this.customer,
      items: this.cart,
      delivery: {
        method: this.deliveryMethod,
        date: this.selectedDeliveryDate,
        time: this.selectedDeliveryTime,
        address: this.customer.deliveryAddress
      },
      specialInstructions: this.specialInstructions,
      rushOrder: this.rushOrder,
      total: this.cartTotal,
      createdAt: new Date().toISOString(),
      status: 'Scheduled', // Initial status
      source: 'web' // Web-based orders
    };
    alert('Order submitted successfully! Order details: ' + JSON.stringify(order, null, 2));
  }

  canProceedToNext(): boolean {
    switch (this.currentStep) {
      case 1: return this.cart.length > 0;
      case 2: return !!(this.customer.name && this.customer.email && this.customer.phone);
      case 3: return !!(this.selectedDeliveryDate && this.selectedDeliveryTime);
      case 4: return true;
      default: return false;
    }
  }
}