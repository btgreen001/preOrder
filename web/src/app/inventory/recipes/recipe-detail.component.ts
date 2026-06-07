import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, Recipe, RecipeIngredient } from '../inventory.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recipe-detail-container">
      <header class="page-header">
        <button class="btn-back" (click)="goBack()">← Back to Recipes</button>
        <div class="actions">
          <button class="btn-edit" (click)="editRecipe()">Edit Recipe</button>
          <button class="btn-cost" (click)="viewCost()">View Cost Analysis</button>
          <button class="btn-delete" (click)="deleteRecipe()">Delete</button>
        </div>
      </header>
    
      @if (loading) {
        <div class="loading">
          <p>Loading recipe...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="goBack()">Go Back</button>
        </div>
      }
    
      @if (!loading && !error && recipe) {
        <div class="recipe-content">
          <div class="recipe-header">
            <div class="recipe-title">
              <h1>{{ recipe.name }}</h1>
              <span class="recipe-category">{{ recipe.category | titlecase }}</span>
            </div>
            <div class="recipe-meta">
              <div class="meta-item">
                <strong>Yield:</strong> {{ recipe.yield }} {{ recipe.yieldUnit }}
              </div>
              <div class="meta-item">
                <strong>Cost per Unit:</strong> \${{ recipe.costPerUnit.toFixed(2) }}
              </div>
              <div class="meta-item">
                <strong>Prep Time:</strong> {{ recipe.prepTime }} min
              </div>
              <div class="meta-item">
                <strong>Cook Time:</strong> {{ recipe.cookTime }} min
              </div>
              <div class="meta-item">
                <strong>Total Time:</strong> {{ recipe.prepTime + recipe.cookTime }} min
              </div>
            </div>
          </div>
          @if (recipe.description) {
            <div class="recipe-description">
              <h2>Description</h2>
              <p>{{ recipe.description }}</p>
            </div>
          }
          <div class="recipe-ingredients">
            <h2>Ingredients</h2>
            <ul class="ingredients-list">
              @for (ingredient of recipe.ingredients; track ingredient) {
                <li class="ingredient-item">
                  <span class="quantity">{{ ingredient.quantity }} {{ ingredient.unit }}</span>
                  <span class="name">{{ ingredient.itemName }}</span>
                  <span class="cost">(\${{ (ingredient.cost || 0).toFixed(2) }})</span>
                </li>
              }
            </ul>
            <div class="total-cost">
              <strong>Total Cost: \${{ getTotalCost().toFixed(2) }}</strong>
            </div>
          </div>
          <div class="recipe-instructions">
            <h2>Instructions</h2>
            <ol class="instructions-list">
              @for (instruction of recipe.instructions; track instruction) {
                <li class="instruction-item">
                  {{ instruction }}
                </li>
              }
            </ol>
          </div>
          <div class="recipe-footer">
            <div class="recipe-dates">
              <p><strong>Created:</strong> {{ recipe.createdDate | date:'mediumDate' }}</p>
              <p><strong>Last Modified:</strong> {{ recipe.lastModified | date:'mediumDate' }}</p>
            </div>
          </div>
        </div>
      }
    </div>
    `,
  styles: [`
    .recipe-detail-container {
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

    .btn-back {
      background: var(--bakery-text-muted);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .actions { display: flex; gap: 10px; }

    .recipe-content {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 30px;
      box-shadow: var(--bakery-shadow-soft);
    }

    .recipe-header {
      margin-bottom: 30px;
    }

    .recipe-title h1 {
      margin: 0 0 10px 0;
      color: var(--bakery-text-emph);
      font-size: 2.5rem;
      font-weight: 600;
    }

    .recipe-category {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .recipe-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .meta-item {
      background: var(--bakery-bg);
      padding: 15px;
      border-radius: 6px;
      border: 1px solid var(--bakery-accent);
    }

    .recipe-description, .recipe-ingredients, .recipe-instructions {
      margin-bottom: 40px;
    }

    h2 {
      color: var(--bakery-text-emph);
      margin: 0 0 20px 0;
      font-size: 1.5rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }

    .ingredients-list, .instructions-list {
      padding-left: 0;
      list-style: none;
    }

    .ingredients-list {
      background: var(--bakery-bg);
      border-radius: 6px;
      padding: 20px;
    }

    .ingredient-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--bakery-accent);
    }

    .ingredient-item:last-child {
      border-bottom: none;
    }

    .quantity {
      font-weight: 600;
      color: var(--bakery-accent);
      min-width: 120px;
    }

    .name {
      flex: 1;
      margin: 0 15px;
    }

    .cost {
      color: var(--bakery-text-muted);
      font-size: 0.875rem;
    }

    .total-cost {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid var(--bakery-accent);
      text-align: right;
      font-size: 1.1rem;
      color: var(--bakery-accent);
    }

    .instructions-list {
      counter-reset: step-counter;
    }

    .instruction-item {
      counter-increment: step-counter;
      margin-bottom: 15px;
      padding: 15px;
      background: var(--bakery-bg);
      border-radius: 6px;
      border-left: 4px solid var(--bakery-accent);
      position: relative;
    }

    .instruction-item::before {
      content: counter(step-counter);
      position: absolute;
      left: -20px;
      top: 15px;
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .recipe-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--bakery-accent);
    }

    .recipe-dates {
      display: flex;
      justify-content: space-between;
      color: var(--bakery-text-muted);
      font-size: 0.875rem;
    }

    .btn-edit, .btn-cost, .btn-delete, .btn-secondary {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
    }

    .btn-edit {
      background: var(--bakery-info);
      color: white;
    }

    .btn-cost {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
    }

    .btn-delete {
      background: var(--bakery-error);
      color: white;
    }

    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }

    .btn-edit:hover, .btn-cost:hover, .btn-delete:hover, .btn-secondary:hover, .btn-back:hover {
      opacity: 0.9;
    }

    .loading, .error {
      text-align: center;
      padding: 60px 20px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }

    .error p {
      color: var(--bakery-error);
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }

      .actions {
        width: 100%;
        justify-content: flex-end;
      }

      .recipe-meta {
        grid-template-columns: 1fr;
      }

      .recipe-dates {
        flex-direction: column;
        gap: 10px;
      }

      .ingredient-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }

      .quantity {
        min-width: auto;
      }
    }
  `]
})
export class RecipeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);

  recipe: Recipe | null = null;
  loading = false;
  error = '';

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadRecipe(id);
    }
  }

  loadRecipe(id: string) {
    this.loading = true;
    this.error = '';

    // TODO: Replace with real API call when backend is ready
    // For now, using mock data
    const mockRecipes = [
      {
        id: '1',
        name: 'Sourdough Bread',
        description: 'Traditional sourdough bread with crispy crust',
        category: 'bread',
        yield: 2,
        yieldUnit: 'loaves',
        prepTime: 30,
        cookTime: 45,
        costPerUnit: 8.50,
        ingredients: [
          { itemId: '1', itemName: 'All-Purpose Flour', quantity: 5, unit: 'lb', cost: 12.50 },
          { itemId: '2', itemName: 'Water', quantity: 3, unit: 'c', cost: 0 },
          { itemId: '3', itemName: 'Salt', quantity: 2, unit: 't', cost: 0.10 }
        ],
        instructions: ['Mix ingredients', 'Knead dough', 'Let rise', 'Bake at 450°F'],
        createdDate: '2025-01-15',
        lastModified: '2025-01-20'
      },
      {
        id: '2',
        name: 'Chocolate Chip Cookies',
        description: 'Classic chocolate chip cookies',
        category: 'cookies',
        yield: 24,
        yieldUnit: 'cookies',
        prepTime: 15,
        cookTime: 12,
        costPerUnit: 0.75,
        ingredients: [
          { itemId: '1', itemName: 'All-Purpose Flour', quantity: 2.25, unit: 'cups', cost: 1.25 },
          { itemId: '4', itemName: 'Chocolate Chips', quantity: 2, unit: 'cups', cost: 5.40 },
          { itemId: '5', itemName: 'Butter', quantity: 1, unit: 'cup', cost: 2.50 }
        ],
        instructions: ['Cream butter and sugar', 'Add dry ingredients', 'Fold in chocolate chips', 'Bake at 375°F'],
        createdDate: '2025-01-10',
        lastModified: '2025-01-18'
      }
    ];

    const foundRecipe = mockRecipes.find(recipe => recipe.id === id);
    if (foundRecipe) {
      this.recipe = foundRecipe;
      this.loading = false;
    } else {
      this.error = 'Recipe not found.';
      this.loading = false;
    }
  }

  getTotalCost(): number {
    if (!this.recipe) return 0;
    return this.recipe.ingredients.reduce((total: number, ingredient: RecipeIngredient) => total + (ingredient.cost || 0), 0);
  }

  editRecipe() {
    if (this.recipe) {
      this.router.navigate(['/inventory/recipes', this.recipe.id, 'edit']);
    }
  }

  viewCost() {
    if (this.recipe) {
      this.router.navigate(['/inventory/recipes', this.recipe.id, 'cost']);
    }
  }

  deleteRecipe() {
    if (this.recipe && confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      // TODO: Implement delete API call when backend is ready
      alert('Delete functionality will be implemented when backend is ready.');
      this.router.navigate(['/inventory/recipes']);
    }
  }

  goBack() {
    this.router.navigate(['/inventory/recipes']);
  }
}