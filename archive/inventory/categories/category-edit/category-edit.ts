import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InventoryService, InventoryCategory } from '../../inventory.service';

@Component({
  selector: 'app-category-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="category-edit-container">
      <header class="page-header">
        <h1>Edit Category</h1>
        <button class="btn-secondary" (click)="goBack()">Back to Categories</button>
      </header>

      <div class="form-container" *ngIf="!loading">
        <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()">
          <div class="form-section">
            <h2>Category Information</h2>
            <div class="form-group">
              <label for="name">Category Name *</label>
              <input type="text" id="name" formControlName="name" placeholder="Enter category name">
              <div class="error" *ngIf="categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched">
                Category name is required and must be at least 2 characters
              </div>
            </div>
            <div class="form-group">
              <label for="description">Description *</label>
              <textarea id="description" formControlName="description" rows="4" placeholder="Describe what items belong in this category"></textarea>
              <div class="error" *ngIf="categoryForm.get('description')?.invalid && categoryForm.get('description')?.touched">
                Description is required and must be at least 10 characters
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="categoryForm.invalid || saving">
              {{ saving ? 'Saving...' : 'Update Category' }}
            </button>
            <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading category...</p>
      </div>
    </div>
  `,
  styles: [`
    .category-edit-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
      max-width: 600px;
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
    .form-container {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 30px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .form-section {
      margin-bottom: 30px;
    }
    .form-section h2 {
      color: var(--bakery-text-emph);
      margin: 0 0 20px 0;
      font-size: 1.25rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--bakery-text-emph);
    }
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      font-size: 1rem;
      font-family: inherit;
    }
    .form-group textarea {
      resize: vertical;
      min-height: 100px;
    }
    .error {
      color: var(--bakery-error);
      font-size: 0.875rem;
      margin-top: 5px;
    }
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--bakery-accent);
    }
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      transition: opacity 0.2s;
    }
    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-primary:hover:not(:disabled), .btn-secondary:hover {
      opacity: 0.9;
    }
    .loading {
      text-align: center;
      padding: 50px;
      color: var(--bakery-text-muted);
    }
    @media (max-width: 768px) {
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class CategoryEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = false;
  loading = true;
  categoryId = '';

  categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit() {
    this.categoryId = this.route.snapshot.params['id'];
    this.loadCategory();
  }

  loadCategory() {
    this.inventoryService.getCategory(this.categoryId).subscribe({
      next: (category) => {
        this.categoryForm.patchValue({
          name: category.name,
          description: category.description
        });
        this.loading = false;
      },
      error: (err) => {
        alert('Failed to load category. Please try again.');
        console.error('Error loading category:', err);
        this.router.navigate(['/inventory/categories']);
      }
    });
  }

  saveCategory() {
    if (this.categoryForm.valid) {
      this.saving = true;

      const formValue = this.categoryForm.value;
      const categoryData = {
        name: formValue.name!,
        description: formValue.description!
      };

      this.inventoryService.updateCategory(this.categoryId, categoryData).subscribe({
        next: () => {
          this.router.navigate(['/inventory/categories']);
        },
        error: (err) => {
          alert('Failed to update category. Please try again.');
          console.error('Error updating category:', err);
          this.saving = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.categoryForm.controls).forEach(key => {
        this.categoryForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack() {
    this.router.navigate(['/inventory/categories']);
  }
}
