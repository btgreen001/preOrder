import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { InventoryService, InventoryCategory } from '../../inventory.service';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="category-detail-container">
      <header class="page-header">
        <h1>Category Details</h1>
        <div class="header-actions">
          <button class="btn-secondary" (click)="editCategory()">Edit Category</button>
          <button class="btn-secondary" (click)="goBack()">Back to Categories</button>
        </div>
      </header>
    
      @if (!loading) {
        <div class="detail-container">
          <div class="detail-card">
            <div class="detail-section">
              <h2>{{ category?.name }}</h2>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Description</label>
                  <p>{{ category?.description }}</p>
                </div>
                <div class="detail-item">
                  <label>Items in Category</label>
                  <p>{{ category?.itemCount }} items</p>
                </div>
                <div class="detail-item">
                  <label>Created Date</label>
                  <p>{{ category?.createdDate | date:'mediumDate' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    
      @if (loading) {
        <div class="loading">
          <p>Loading category details...</p>
        </div>
      }
    </div>
    `,
  styles: [`
    .category-detail-container {
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
    .header-actions {
      display: flex;
      gap: 10px;
    }
    .detail-container {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 30px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .detail-card {
      margin-bottom: 20px;
    }
    .detail-section h2 {
      color: var(--bakery-text-emph);
      margin: 0 0 20px 0;
      font-size: 1.5rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .detail-item {
      background: var(--bakery-bg);
      padding: 20px;
      border-radius: 6px;
      border: 1px solid var(--bakery-accent);
    }
    .detail-item label {
      display: block;
      font-weight: 600;
      color: var(--bakery-text-emph);
      margin-bottom: 8px;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-item p {
      margin: 0;
      color: var(--bakery-text-emph);
      font-size: 1rem;
      line-height: 1.5;
    }
    .btn-secondary {
      padding: 10px 16px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background-color 0.2s;
    }
    .btn-secondary:hover {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
    }
    .loading {
      text-align: center;
      padding: 50px;
      color: var(--bakery-text-muted);
    }
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }
      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CategoryDetailComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = true;
  categoryId = '';
  category: InventoryCategory | null = null;

  ngOnInit() {
    this.categoryId = this.route.snapshot.params['id'];
    this.loadCategory();
  }

  loadCategory() {
    this.inventoryService.getCategory(this.categoryId).subscribe({
      next: (category) => {
        this.category = category;
        this.loading = false;
      },
      error: (err) => {
        alert('Failed to load category details. Please try again.');
        console.error('Error loading category:', err);
        this.router.navigate(['/inventory/categories']);
      }
    });
  }

  editCategory() {
    this.router.navigate(['/inventory/categories', this.categoryId, 'edit']);
  }

  goBack() {
    this.router.navigate(['/inventory/categories']);
  }
}
