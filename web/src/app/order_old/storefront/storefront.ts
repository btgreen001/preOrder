import { Component } from '@angular/core';

import { Router } from '@angular/router';

@Component({
  selector: 'app-storefront',
  standalone: true,
  imports: [],
  templateUrl: './storefront.html',
  styleUrls: ['./storefront.scss']
})
export class StorefrontComponent {
  // Mock data for storefront products
  products = [
    { id: 1, name: 'Sourdough Loaf', price: 6.5, available: true },
    { id: 2, name: 'Chocolate Croissant', price: 3.25, available: true },
    { id: 3, name: 'Baguette', price: 4.0, available: false },
    { id: 4, name: 'Cinnamon Roll', price: 3.75, available: true },
    { id: 5, name: 'Focaccia', price: 5.0, available: true }
  ];

  constructor(private router: Router) {}

  viewProduct(productId: number) {
    this.router.navigate(['/orders/product', productId]);
  }
}
