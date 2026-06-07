import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  yield: number;
  yieldUnit: string;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  costPerUnit: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  createdDate: string;
  lastModified: string;
}

interface RecipeIngredient {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
}

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="recipes-container">
      <header class="page-header">
        <h1>Recipe Management</h1>
        <div class="actions">
          <button class="btn-primary" (click)="addRecipe()">Add Recipe</button>
          <button class="btn-secondary" (click)="importRecipes()">Import</button>
        </div>
      </header>
    
      <div class="filters">
        <input type="text" placeholder="Search recipes..." [(ngModel)]="searchTerm" (input)="filterRecipes()">
        <select [(ngModel)]="categoryFilter" (change)="filterRecipes()">
          <option value="">All Categories</option>
          <option value="bread">Bread</option>
          <option value="pastry">Pastry</option>
          <option value="cake">Cake</option>
          <option value="cookies">Cookies</option>
          <option value="other">Other</option>
        </select>
        <select [(ngModel)]="sortBy" (change)="filterRecipes()">
          <option value="name">Name</option>
          <option value="cost">Cost per Unit</option>
          <option value="yield">Yield</option>
          <option value="modified">Last Modified</option>
        </select>
      </div>
    
      @if (loading) {
        <div class="loading">
          <p>Loading recipes...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="loadRecipes()">Retry</button>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="recipes-grid">
          @for (recipe of filteredRecipes; track recipe) {
            <div class="recipe-card" (click)="viewRecipe(recipe.id)">
              <div class="recipe-header">
                <h3>{{ recipe.name }}</h3>
                <div class="recipe-actions">
                  <button class="btn-edit" (click)="editRecipe(recipe.id); $event.stopPropagation()">Edit</button>
                  <button class="btn-cost" (click)="viewCost(recipe.id); $event.stopPropagation()">Cost</button>
                  <button class="btn-delete" (click)="deleteRecipe(recipe.id); $event.stopPropagation()">Delete</button>
                </div>
              </div>
              <p class="recipe-description">{{ recipe.description }}</p>
              <div class="recipe-details">
                <span class="category">{{ recipe.category | titlecase }}</span>
                <span class="yield">Yield: {{ recipe.yield }} {{ recipe.yieldUnit }}</span>
                <span class="cost">\${{ recipe.costPerUnit.toFixed(2) }}/unit</span>
              </div>
              <div class="recipe-times">
                <span>Prep: {{ recipe.prepTime }}min</span>
                <span>Cook: {{ recipe.cookTime }}min</span>
                <span>Total: {{ recipe.prepTime + recipe.cookTime }}min</span>
              </div>
              <div class="ingredients-preview">
                <strong>Ingredients ({{ recipe.ingredients.length }}):</strong>
                <ul>
                  @for (ingredient of recipe.ingredients.slice(0, 3); track ingredient) {
                    <li>
                      {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.itemName }}
                    </li>
                  }
                  @if (recipe.ingredients.length > 3) {
                    <li>...and {{ recipe.ingredients.length - 3 }} more</li>
                  }
                </ul>
              </div>
            </div>
          }
          @if (filteredRecipes.length === 0) {
            <div class="no-recipes">
              <p>No recipes found matching your criteria.</p>
              <button class="btn-primary" (click)="addRecipe()">Create First Recipe</button>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .recipes-container {
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
    .recipes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    .recipe-card {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 20px;
      box-shadow: var(--bakery-shadow-soft);
      border: 1px solid var(--bakery-accent);
    }
    .recipe-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .recipe-header h3 {
      margin: 0;
      color: var(--bakery-text-emph);
      font-size: 1.25rem;
      font-weight: 600;
    }
    .recipe-actions {
      display: flex;
      gap: 8px;
    }
    .recipe-description {
      color: var(--bakery-text-muted);
      margin-bottom: 15px;
      line-height: 1.4;
    }
    .recipe-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 0.875rem;
    }
    .category {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .yield, .cost {
      color: var(--bakery-text-muted);
    }
    .recipe-times {
      display: flex;
      gap: 15px;
      font-size: 0.875rem;
      color: var(--bakery-text-muted);
      margin-bottom: 15px;
    }
    .ingredients-preview {
      font-size: 0.875rem;
    }
    .ingredients-preview ul {
      margin: 5px 0 0 0;
      padding-left: 20px;
    }
    .ingredients-preview li {
      margin-bottom: 2px;
    }
    .btn-primary, .btn-secondary, .btn-edit, .btn-cost, .btn-delete {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
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
    .btn-cost {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
    }
    .btn-delete {
      background: var(--bakery-error);
      color: white;
    }
    .btn-primary:hover, .btn-edit:hover, .btn-cost:hover, .btn-delete:hover {
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
    .no-recipes {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: var(--bakery-text-muted);
    }
    .no-recipes p {
      margin-bottom: 20px;
      font-size: 1.1rem;
    }
  `]
})
export class RecipeListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  searchTerm = '';
  categoryFilter = '';
  sortBy = 'name';
  loading = false;
  error = '';

  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];

  ngOnInit() {
    this.loadRecipes();
  }

  loadRecipes() {
    this.loading = true;
    this.error = '';

    // TODO: Replace with real API call when backend is ready
    // For now, using mock data
    this.recipes = [
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
          { itemId: '1', itemName: 'All-Purpose Flour', quantity: 5, unit: 'lbs', cost: 12.50 },
          { itemId: '2', itemName: 'Water', quantity: 3, unit: 'cups', cost: 0 },
          { itemId: '3', itemName: 'Salt', quantity: 2, unit: 'tsp', cost: 0.10 }
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

    this.filterRecipes();
    this.loading = false;
  }

  filterRecipes() {
    this.filteredRecipes = this.recipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           recipe.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = !this.categoryFilter || recipe.category === this.categoryFilter;
      return matchesSearch && matchesCategory;
    });

    // Sort recipes
    this.filteredRecipes.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cost':
          return a.costPerUnit - b.costPerUnit;
        case 'yield':
          return b.yield - a.yield; // Higher yield first
        case 'modified':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        default:
          return 0;
      }
    });
  }

  addRecipe() {
    this.router.navigate(['/inventory/recipes/add']);
  }

  editRecipe(id: string) {
    this.router.navigate(['/inventory/recipes', id, 'edit']);
  }

  viewRecipe(id: string) {
    this.router.navigate(['/inventory/recipes', id]);
  }

  viewCost(id: string) {
    this.router.navigate(['/inventory/recipes', id, 'cost']);
  }

  deleteRecipe(id: string) {
    if (confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      // TODO: Implement delete API call
      alert('Delete functionality will be implemented when backend is ready.');
    }
  }

  importRecipes() {
    // TODO: Implement recipe import functionality
    alert('Import functionality will be implemented soon.');
  }
}