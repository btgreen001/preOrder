import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService, InventoryCategory } from '../inventory.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="categories-container">
      <header class="page-header">
        <h1>Item Categories</h1>
        <div class="actions">
          <button class="btn-primary" (click)="addCategory()">Add Category</button>
        </div>
      </header>
    
      @if (loading) {
        <div class="loading">
          <p>Loading categories...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="loadCategories()">Retry</button>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="categories-grid">
          @for (category of categories; track category) {
            <div class="category-card" (click)="viewCategory(category.id)" style="cursor:pointer;">
              <div class="category-header">
                <h3>{{ category.name }}</h3>
                <div class="category-actions">
                  <button class="btn-edit" (click)="editCategory(category.id); $event.stopPropagation();">Edit</button>
                  <button class="btn-delete" (click)="deleteCategory(category.id); $event.stopPropagation();">Delete</button>
                </div>
              </div>
              <p class="category-description">{{ category.description }}</p>
              <div class="category-stats">
                <span class="item-count">{{ category.itemCount }} items</span>
                <span class="created-date">Created: {{ category.createdDate | date:'shortDate' }}</span>
              </div>
            </div>
          }
          @if (categories.length === 0) {
            <div class="no-categories">
              <p>No categories found.</p>
              <button class="btn-primary" (click)="addCategory()">Create First Category</button>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .categories-container {
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
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .category-card {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 20px;
      box-shadow: var(--bakery-shadow-soft);
      border: 1px solid var(--bakery-accent);
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .category-header h3 {
      margin: 0;
      color: var(--bakery-text-emph);
      font-size: 1.25rem;
      font-weight: 600;
    }
    .category-actions {
      display: flex;
      gap: 8px;
    }
    .category-description {
      color: var(--bakery-text-muted);
      margin-bottom: 15px;
      line-height: 1.4;
    }
    .category-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: var(--bakery-text-muted);
    }
    .item-count {
      font-weight: 600;
      color: var(--bakery-accent);
    }
    .btn-primary, .btn-secondary, .btn-edit, .btn-delete {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
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
      padding: 6px 12px;
    }
    .btn-delete {
      background: var(--bakery-error);
      color: white;
      padding: 6px 12px;
    }
    .btn-primary:hover, .btn-edit:hover, .btn-delete:hover {
      opacity: 0.9;
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
    .no-categories {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: var(--bakery-text-muted);
    }
    .no-categories p {
      margin-bottom: 20px;
      font-size: 1.1rem;
    }
  `]
})
export class CategoriesComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  loading = false;
  error = '';
  categories: InventoryCategory[] = [];

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load categories. Please try again.';
        this.loading = false;
        console.error('Error loading categories:', err);
      }
    });
  }

  addCategory() {
    this.router.navigate(['/inventory/categories/add']);
  }

  editCategory(id: string) {
    this.router.navigate(['/inventory/categories', id, 'edit']);
  }

  deleteCategory(id: string) {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      this.inventoryService.deleteCategory(id).subscribe({
        next: () => {
          this.loadCategories(); // Reload the list
        },
        error: (err) => {
          alert('Failed to delete category. Please try again.');
          console.error('Error deleting category:', err);
        }
      });
    }
  }

  viewCategory(id: string) {
    this.router.navigate(['/inventory/categories', id]);
  }
}