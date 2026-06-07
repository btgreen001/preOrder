import { Component } from '@angular/core';

import { Router } from '@angular/router';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [],
  templateUrl: './product-catalog.html',
  styleUrls: ['./product-catalog.scss']
})
export class ProductCatalogComponent {
  // Mock data for products
  products = [
    { id: 1, name: 'Sourdough Loaf', price: 6.5, allergens: ['Wheat'] },
    { id: 2, name: 'Chocolate Croissant', price: 3.25, allergens: ['Wheat', 'Eggs', 'Milk'] },
    { id: 3, name: 'Baguette', price: 4.0, allergens: ['Wheat'] },
    { id: 4, name: 'Cinnamon Roll', price: 3.75, allergens: ['Wheat', 'Eggs', 'Milk'] },
    { id: 5, name: 'Focaccia', price: 5.0, allergens: ['Wheat'] }
  ];

  constructor(private router: Router) {}

  viewProduct(productId: number) {
    this.router.navigate(['/orders/product', productId]);
  }
}
