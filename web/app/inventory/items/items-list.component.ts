import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService, InventoryItem } from '../inventory.service';
import { Product, ProductsService } from '../../features/products/services/products.service';

@Component({
  selector: 'app-items-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="items-container">
      <header class="page-header">
        <h1>Inventory Items</h1>
        <div class="actions">
          <button class="btn-primary" (click)="addItem()">Add New Item</button>
          <button class="btn-secondary" (click)="exportItems()">Export</button>
        </div>
      </header>
    
      <div class="filters">
        <input type="text" placeholder="Search items..." [(ngModel)]="searchTerm" (input)="filterItems()">
        <select [(ngModel)]="categoryFilter" (change)="filterItems()">
          <option value="">All Categories</option>
          @for (category of categories; track category) {
            <option [value]="category.name">{{ category.name }}</option>
          }
        </select>
        <select [(ngModel)]="stockFilter" (change)="filterItems()">
          <option value="">All Stock Levels</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>
    
      @if (loading) {
        <div class="loading">
          <p>Loading inventory items...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="loadItems()">Retry</button>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="items-table">
          <h2 class="section-title">Raw Ingredients (Inventory Items)</h2>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Unit</th>
                <th>Reorder Point</th>
                <th>Cost/Unit</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredItems; track item) {
                <tr
                  [class.low-stock]="item.quantityOnHand <= item.reorderPoint"
                  [class.out-of-stock]="item.quantityOnHand === 0">
                  <td>{{ item.name }}</td>
                  <td>{{ item.categoryId || 0 }}</td>
                  <td [class.warning]="item.quantityOnHand <= item.reorderPoint">
                    {{ item.quantityOnHand }}
                  </td>
                  <td>{{ item.unitOfMeasure }}</td>
                  <td>{{ item.reorderPoint }}</td>
                  <td>\${{ item.unitCost.toFixed(2) }}</td>
                  <td>{{ item.expirationDate ? (item.expirationDate | date:'shortDate') : 'N/A' }}</td>
                  <td>
                    <button class="btn-edit" (click)="editItem(item.externalId)">Edit</button>
                    <button class="btn-history" (click)="viewHistory(item.externalId)">History</button>
                    <button class="btn-delete" (click)="deleteItem(item.externalId)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (filteredItems.length === 0) {
            <div class="no-items">
              <p>No items found matching your criteria.</p>
            </div>
          }
          <h2 class="section-title recipe-components">Recipe Components (Sellable Products)</h2>
          <table>
            <thead>
              <tr>
                <th>Component Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Output Unit</th>
                <th>For Sale</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (product of filteredRecipeComponentProducts; track product) {
                <tr>
                  <td>{{ product.name }}</td>
                  <td>{{ product.sku || 'Auto' }}</td>
                  <td>{{ product.category || 'N/A' }}</td>
                  <td>\${{ product.unitPrice.toFixed(2) }}</td>
                  <td>{{ product.outputUnitMsr || 'N/A' }}</td>
                  <td>{{ product.isForSale ? 'Yes' : 'No' }}</td>
                  <td>
                    <button class="btn-edit" (click)="viewProductInProducts(product)">View in Products</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (filteredRecipeComponentProducts.length === 0) {
            <div class="no-items">
              <p>No recipe components found for the current filters.</p>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .items-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }
    .actions { display: flex; gap: 10px; }
    .filters {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .items-table {
      background: var(--bakery-surface);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--bakery-shadow-soft);
    }
    .section-title {
      margin: 20px 0 10px;
      padding: 0 12px;
      color: var(--bakery-text-emph);
      font-size: 1.15rem;
      font-weight: 600;
    }
    .section-title.recipe-components {
      margin-top: 26px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--bakery-accent);
      color: var(--bakery-text-emph);
    }
    th {
      background: var(--bakery-accent-2);
      font-weight: 600;
      color: var(--bakery-text-emph);
    }
    .low-stock { background-color: var(--bakery-warning); }
    .out-of-stock { background-color: var(--bakery-error); opacity: 0.7; }
    .warning { color: var(--bakery-warning-text); font-weight: 600; }
    .btn-primary, .btn-secondary, .btn-edit, .btn-history, .btn-delete {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-right: 5px;
      font-weight: 500;
    }
    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-edit {
      background: var(--bakery-info);
      color: white;
    }
    .btn-history {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
    }
    .btn-delete {
      background: var(--bakery-error);
      color: white;
    }
    .btn-primary:hover, .btn-edit:hover, .btn-history:hover, .btn-delete:hover {
      opacity: 0.9;
    }
    input, select {
      padding: 8px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
    }
    .loading, .error {
      text-align: center;
      padding: 40px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .error p {
      color: var(--bakery-error);
      margin-bottom: 15px;
    }
    .no-items {
      text-align: center;
      padding: 40px;
      color: var(--bakery-text-muted);
    }
  `]
})
export class ItemsListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);
  private router = inject(Router);

  searchTerm = '';
  categoryFilter = '';
  stockFilter = '';
  loading = false;
  error = '';

  items: InventoryItem[] = [];
  filteredItems: InventoryItem[] = [];
  recipeComponentProducts: Product[] = [];
  filteredRecipeComponentProducts: Product[] = [];
  categories: { name: string }[] = [];

  ngOnInit() {
    this.loadItems();
    this.loadCategories();
    this.loadRecipeComponents();
  }

  loadRecipeComponents() {
    this.productsService.getAllProducts().subscribe({
      next: (products) => {
        this.recipeComponentProducts = products.filter(p => p.IsRecipeComponent === true);
        this.filterItems();
      },
      error: (err) => {
        console.error('Error loading recipe components:', err);
      }
    });
  }

  loadItems() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getItems().subscribe({
      next: (items) => {
        this.items = items;
        this.filterItems();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load inventory items. Please try again.';
        this.loading = false;
        console.error('Error loading items:', err);
      }
    });
  }

  loadCategories() {
    this.inventoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
      }
    });
  }

  filterItems() {
    this.filteredItems = this.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = !this.categoryFilter || item.categoryId === Number(this.categoryFilter);
      const matchesStock = !this.stockFilter ||
        (this.stockFilter === 'low' && item.quantityOnHand <= item.reorderPoint) ||
        (this.stockFilter === 'out' && item.quantityOnHand === 0);
      return matchesSearch && matchesCategory && matchesStock;
    });

    const search = this.searchTerm.toLowerCase();
    this.filteredRecipeComponentProducts = this.recipeComponentProducts.filter(product => {
      return product.name.toLowerCase().includes(search)
        || (product.description?.toLowerCase().includes(search) ?? false)
        || (product.sku?.toLowerCase().includes(search) ?? false);
    });
  }

  addItem() {
    this.router.navigate(['/inventory/items/add']);
  }

  editItem(id: string) {
    this.router.navigate(['/inventory/items', id, 'edit']);
  }

  viewHistory(id: string) {
    this.router.navigate(['/inventory/items', id, 'history']);
  }

  deleteItem(id: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.inventoryService.deleteItem(id).subscribe({
        next: () => {
          this.loadItems(); // Reload the list
        },
        error: (err) => {
          alert('Failed to delete item. Please try again.');
          console.error('Error deleting item:', err);
        }
      });
    }
  }

  exportItems() {
    // TODO: Implement export functionality
    alert('Export functionality will be implemented soon.');
  }

  viewProductInProducts(product: Product) {
    this.router.navigate(['/products/list'], {
      queryParams: {
        productExternalId: product.externalId,
        search: product.sku || product.name
      }
    });
  }
}