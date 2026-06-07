import { Component, OnInit, inject } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, Recipe, RecipeIngredient } from '../inventory.service';

@Component({
  selector: 'app-recipe-edit',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <div class="recipe-edit-container">
      <header class="page-header">
        <h1>Edit Recipe</h1>
        <div class="actions">
          <button class="btn-secondary" (click)="cancel()">Cancel</button>
          <button class="btn-primary" (click)="saveRecipe()" [disabled]="!recipeForm.valid || saving">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
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
    
      @if (!loading && !error) {
        <form [formGroup]="recipeForm" class="recipe-form">
          <div class="form-section">
            <h2>Basic Information</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="name">Recipe Name *</label>
                <input type="text" id="name" formControlName="name" placeholder="e.g., Chocolate Chip Cookies">
              </div>
              <div class="form-group">
                <label for="category">Category *</label>
                <select id="category" formControlName="category">
                  <option value="">Select Category</option>
                  <option value="bread">Bread</option>
                  <option value="pastry">Pastry</option>
                  <option value="cake">Cake</option>
                  <option value="cookies">Cookies</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" formControlName="description" rows="3"
              placeholder="Brief description of the recipe"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="yield">Yield *</label>
                <input type="number" id="yield" formControlName="yield" min="1" step="0.1">
              </div>
              <div class="form-group">
                <label for="yieldUnit">Unit *</label>
                <select id="yieldUnit" formControlName="yieldUnit">
                  <option value="pieces">Pieces</option>
                  <option value="loaves">Loaves</option>
                  <option value="dozen">Dozen</option>
                  <option value="cups">Cups</option>
                  <option value="lbs">Pounds</option>
                  <option value="kg">Kilograms</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="prepTime">Prep Time (minutes)</label>
                <input type="number" id="prepTime" formControlName="prepTime" min="0">
              </div>
              <div class="form-group">
                <label for="cookTime">Cook Time (minutes)</label>
                <input type="number" id="cookTime" formControlName="cookTime" min="0">
              </div>
            </div>
          </div>
          <div class="form-section">
            <h2>Ingredients</h2>
            <div formArrayName="ingredients" class="ingredients-list">
              @for (ingredient of ingredients.controls; track ingredient; let i = $index) {
                <div
                  [formGroupName]="i" class="ingredient-item">
                  <div class="ingredient-row">
                    <div class="form-group">
                      <label>Ingredient Name *</label>
                      <input type="text" formControlName="itemName" placeholder="e.g., All-Purpose Flour"
                        (input)="onIngredientNameChange(i)">
                      </div>
                      <div class="form-group">
                        <label>Quantity *</label>
                        <input type="number" formControlName="quantity" min="0" step="0.01">
                      </div>
                      <div class="form-group">
                        <label>Unit *</label>
                        <select formControlName="unit">
                          <option value="cups">Cups</option>
                          <option value="tbsp">Tablespoons</option>
                          <option value="tsp">Teaspoons</option>
                          <option value="lbs">Pounds</option>
                          <option value="oz">Ounces</option>
                          <option value="kg">Kilograms</option>
                          <option value="g">Grams</option>
                          <option value="ml">Milliliters</option>
                          <option value="l">Liters</option>
                          <option value="pieces">Pieces</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label>Cost ($)</label>
                        <input type="number" formControlName="cost" min="0" step="0.01" readonly>
                      </div>
                      <button type="button" class="btn-remove" (click)="removeIngredient(i)">Remove</button>
                    </div>
                  </div>
                }
              </div>
              <button type="button" class="btn-add-ingredient" (click)="addIngredient()">+ Add Ingredient</button>
            </div>
            <div class="form-section">
              <h2>Instructions</h2>
              <div formArrayName="instructions" class="instructions-list">
                @for (instruction of instructions.controls; track instruction; let i = $index) {
                  <div class="instruction-item">
                    <div class="instruction-row">
                      <span class="step-number">{{ i + 1 }}.</span>
                      <textarea formControlName="instruction" rows="2"
                      placeholder="Describe this step..." class="instruction-text"></textarea>
                      <button type="button" class="btn-remove" (click)="removeInstruction(i)">Remove</button>
                    </div>
                  </div>
                }
              </div>
              <button type="button" class="btn-add-instruction" (click)="addInstruction()">+ Add Step</button>
            </div>
          </form>
        }
      </div>
    `,
  styles: [`
    .recipe-edit-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
      max-width: 1200px;
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

    .actions { display: flex; gap: 10px; }

    .recipe-form {
      background: var(--bakery-surface);
      padding: 30px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }

    .form-section {
      margin-bottom: 40px;
    }

    .form-section h2 {
      color: var(--bakery-text-emph);
      margin: 0 0 20px 0;
      font-size: 1.5rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--bakery-text-emph);
    }

    input, select, textarea {
      padding: 10px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      font-size: 14px;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--bakery-accent-2);
      box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
    }

    .ingredients-list, .instructions-list {
      margin-bottom: 20px;
    }

    .ingredient-item, .instruction-item {
      background: var(--bakery-bg);
      border: 1px solid var(--bakery-accent);
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
    }

    .ingredient-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr auto;
      gap: 15px;
      align-items: end;
    }

    .instruction-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 15px;
      align-items: center;
    }

    .step-number {
      font-weight: 600;
      color: var(--bakery-accent);
      min-width: 30px;
    }

    .instruction-text {
      width: 100%;
    }

    .btn-primary, .btn-secondary, .btn-add-ingredient, .btn-add-instruction, .btn-remove {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
    }

    .btn-primary:disabled {
      background: var(--bakery-text-muted);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }

    .btn-add-ingredient, .btn-add-instruction {
      background: var(--bakery-success);
      color: white;
      width: 100%;
      margin-top: 10px;
    }

    .btn-remove {
      background: var(--bakery-error);
      color: white;
      white-space: nowrap;
    }

    .btn-primary:hover:not(:disabled), .btn-secondary:hover,
    .btn-add-ingredient:hover, .btn-add-instruction:hover, .btn-remove:hover {
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
      .form-row {
        grid-template-columns: 1fr;
      }

      .ingredient-row {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .instruction-row {
        grid-template-columns: auto 1fr;
      }

      .actions {
        flex-direction: column;
        width: 100%;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class RecipeEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);

  saving = false;
  loading = false;
  error = '';
  recipeId = '';
  recipeForm: FormGroup;

  constructor() {
    this.recipeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      category: ['', Validators.required],
      yield: [1, [Validators.required, Validators.min(0.1)]],
      yieldUnit: ['pieces', Validators.required],
      prepTime: [0, [Validators.min(0)]],
      cookTime: [0, [Validators.min(0)]],
      ingredients: this.fb.array([]),
      instructions: this.fb.array([])
    });
  }

  ngOnInit() {
    this.recipeId = this.route.snapshot.params['id'];
    if (this.recipeId) {
      this.loadRecipe(this.recipeId);
    }
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  get instructions(): FormArray {
    return this.recipeForm.get('instructions') as FormArray;
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

    const foundRecipe = mockRecipes.find(recipe => recipe.id === id);
    if (foundRecipe) {
      this.populateForm(foundRecipe);
      this.loading = false;
    } else {
      this.error = 'Recipe not found.';
      this.loading = false;
    }
  }

  populateForm(recipe: Recipe) {
    this.recipeForm.patchValue({
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      yield: recipe.yield,
      yieldUnit: recipe.yieldUnit,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime
    });

    // Clear existing form arrays
    while (this.ingredients.length > 0) {
      this.ingredients.removeAt(0);
    }
    while (this.instructions.length > 0) {
      this.instructions.removeAt(0);
    }

    // Populate ingredients
    recipe.ingredients.forEach((ingredient: RecipeIngredient) => {
      const ingredientGroup = this.fb.group({
        itemName: [ingredient.itemName, Validators.required],
        quantity: [ingredient.quantity, [Validators.required, Validators.min(0.01)]],
        unit: [ingredient.unit, Validators.required],
        cost: [ingredient.cost || 0]
      });
      this.ingredients.push(ingredientGroup);
    });

    // Populate instructions
    recipe.instructions.forEach((instruction: string) => {
      const instructionGroup = this.fb.group({
        instruction: [instruction, Validators.required]
      });
      this.instructions.push(instructionGroup);
    });
  }

  addIngredient() {
    const ingredientGroup = this.fb.group({
      itemName: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      unit: ['cups', Validators.required],
      cost: [0]
    });
    this.ingredients.push(ingredientGroup);
  }

  removeIngredient(index: number) {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    }
  }

  addInstruction() {
    const instructionGroup = this.fb.group({
      instruction: ['', Validators.required]
    });
    this.instructions.push(instructionGroup);
  }

  removeInstruction(index: number) {
    if (this.instructions.length > 1) {
      this.instructions.removeAt(index);
    }
  }

  onIngredientNameChange(index: number) {
    // TODO: Implement ingredient lookup and cost calculation
    // For now, we'll leave cost as 0
  }

  saveRecipe() {
    if (this.recipeForm.valid && this.recipeId) {
      this.saving = true;

      // TODO: Implement update API call when backend is ready
      alert('Recipe updated successfully! (Mock implementation)');
      this.saving = false;
      this.router.navigate(['/inventory/recipes', this.recipeId]);
    }
  }

  cancel() {
    this.router.navigate(['/inventory/recipes', this.recipeId]);
  }

  goBack() {
    this.router.navigate(['/inventory/recipes']);
  }
}