import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-builder',
  imports: [CommonModule],
  templateUrl: './order-builder.html',
  styleUrl: './order-builder.scss'
})
export class OrderBuilderComponent {
  // Mock data for products
  products = [
    { id: 1, name: 'Sourdough Loaf', price: 6.5, available: true },
    { id: 2, name: 'Chocolate Croissant', price: 3.25, available: true },
    { id: 3, name: 'Baguette', price: 4.0, available: false },
    { id: 4, name: 'Cinnamon Roll', price: 3.75, available: true },
    { id: 5, name: 'Focaccia', price: 5.0, available: true }
  ];

  // Mock cart
  cart: { id: number; name: string; price: number; qty: number }[] = [];

  constructor(private router: Router) {}

  addToCart(product: any) {
    const found = this.cart.find(item => item.id === product.id);
    if (found) {
      found.qty++;
    } else {
      this.cart.push({ ...product, qty: 1 });
    }
  }

  removeFromCart(productId: number) {
    this.cart = this.cart.filter(item => item.id !== productId);
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  checkout() {
    // Simulate checkout and navigate to order list
    this.cart = [];
    this.router.navigate(['/orders/list']);
  }
}
