import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RecipeService, RecipeIngredientDto, AddRecipeIngredientRequest } from '../services/recipe.service';
import { InventoryService } from '../../../features/inventory/services/inventory.service';
import { ViewEncapsulation } from '@angular/core';
import { quantityFormatValidator, wholeNumberValidator } from '../../../shared/validators/quantity-format.validator';
import { formatAsFraction, parseQuantityInput } from '../../../shared/utils/quantity-format.util';
import { UnitConversionApiService } from '../../../core/services/unit-conversion-api.service';
import { UnitOptionsService } from '../../../core/services/unit-options.service';
import { RoleService } from '../../../../shared-data-services/role.service';

@Component({
  selector: 'app-recipe-ingredients',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatCardModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './recipe-ingredients.component.html',
  styleUrls: ['./recipe-ingredients.component.css']
})
export class RecipeIngredientsComponent implements OnInit {
  recipeExternalId: string = '';
  ingredients: RecipeIngredientDto[] = [];
  inventoryItems: any[] = [];
  displayedColumns: string[] = ['itemName', 'sku', 'quantityRequired', 'unit', 'actions'];
  isAdmin = false;
  unitOptions: string[] = [];
  
  loading = false;
  saving = false;
  quantityFractionPreview = '';
  addIngredientForm: FormGroup;

  constructor(
    private recipeService: RecipeService,
    private inventoryService: InventoryService,
    private unitConversionApi: UnitConversionApiService,
    private unitOptionsService: UnitOptionsService,
    private route: ActivatedRoute,
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    const role = this.roleService.getCurrentRole();
    const rawRole = this.roleService.getCurrentUser()?.role;
    this.isAdmin = role === 'admin' || role === 'SystemAdmin' || role === 'CompanyAdmin'
      || rawRole === 'CompanyAdmin' || rawRole === 'SystemAdmin' || rawRole === 'admin';

    this.displayedColumns = this.isAdmin
      ? ['itemName', 'sku', 'quantityRequired', 'unit', 'costPerUnit', 'totalCost', 'actions']
      : ['itemName', 'sku', 'quantityRequired', 'unit', 'actions'];

    this.addIngredientForm = this.fb.group({
      inventoryItemExternalId: ['', Validators.required],
      quantityRequired: ['1', [quantityFormatValidator({ required: true, min: 0.01 })]],
      unit: ['c', Validators.required],
      costPerUnit: [null, [Validators.min(0)]],
      scaleMultiplier: [1, [wholeNumberValidator({ required: true, min: 1, max: 999 })]]
    });
  }

  ngOnInit(): void {
    this.recipeExternalId = this.route.snapshot.paramMap.get('recipeId') || '';
    if (!this.recipeExternalId) {
      this.showError('Recipe ID not found');
      return;
    }

    this.loadIngredients();
    this.loadInventoryItems();
    this.loadUnitOptions();
  }

  private loadUnitOptions(): void {
    this.unitOptionsService.getUnitOptions().subscribe({
      next: (units) => {
        this.unitOptions = units;
      }
    });
  }

  loadIngredients(): void {
    this.loading = true;
    this.recipeService.getIngredients(this.recipeExternalId).subscribe({
      next: (ingredients) => {
        this.ingredients = ingredients;
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to load ingredients');
        this.loading = false;
      }
    });
  }

  loadInventoryItems(): void {
    this.inventoryService.getAllInventoryItems().subscribe({
      next: (items: any[]) => {
        this.inventoryItems = items;
      },
      error: (error: any) => {
        this.showError('Failed to load inventory items');
      }
    });
  }

  addIngredient(): void {
    if (!this.addIngredientForm.valid) {
      this.showError('Please fill in all required fields');
      return;
    }

    const parsedQuantity = parseQuantityInput(this.addIngredientForm.get('quantityRequired')?.value);
    if (!parsedQuantity.isValid || parsedQuantity.value === null) {
      this.showError(parsedQuantity.error || 'Invalid quantity format');
      return;
    }

    this.saving = true;
    const request: AddRecipeIngredientRequest = {
      inventoryItemExternalId: this.addIngredientForm.get('inventoryItemExternalId')?.value,
      quantityRequired: parsedQuantity.value,
      unit: this.normalizeUnit(this.addIngredientForm.get('unit')?.value),
      costPerUnit: this.addIngredientForm.get('costPerUnit')?.value || undefined
    };
    
    this.recipeService.addIngredient(this.recipeExternalId, request).subscribe({
      next: (ingredient) => {
        this.ingredients.push(ingredient);
        this.addIngredientForm.reset({ unit: 'c', quantityRequired: '1', scaleMultiplier: 1, costPerUnit: null });
        this.quantityFractionPreview = '';
        this.showSuccess('Ingredient added successfully');
        this.saving = false;
      },
      error: (error) => {
        this.showError('Failed to add ingredient: ' + error.error?.message);
        this.saving = false;
      }
    });
  }

  updateQuantityPreview(): void {
    const quantityInput = this.addIngredientForm.get('quantityRequired')?.value;
    const parsed = parseQuantityInput(quantityInput);

    if (!parsed.isValid || parsed.value === null) {
      this.quantityFractionPreview = '';
      return;
    }

    const parsedValue = parsed.value;

    this.unitConversionApi.formatFraction(parsedValue).subscribe({
      next: (response) => {
        this.quantityFractionPreview = response.formatted;
      },
      error: () => {
        this.quantityFractionPreview = formatAsFraction(parsedValue);
      }
    });
  }

  getCostPreviewTotal(): number | null {
    const parsed = parseQuantityInput(this.addIngredientForm.get('quantityRequired')?.value);
    const cost = Number(this.addIngredientForm.get('costPerUnit')?.value);

    if (!parsed.isValid || parsed.value === null || !Number.isFinite(cost) || cost < 0) {
      return null;
    }

    return parsed.value * cost;
  }

  private normalizeUnit(unit: unknown): string {
    return String(unit ?? '').trim();
  }

  getTotalCost(): string {
    const total = this.ingredients.reduce((sum, ing) => {
      return sum + (ing.totalCost || 0);
    }, 0);
    return total.toFixed(2);
  }

  updateIngredient(ingredient: RecipeIngredientDto, field: string, value: any): void {
    this.recipeService.updateIngredient(ingredient.externalId, {
      [field]: value
    }).subscribe({
      next: (updated) => {
        const index = this.ingredients.findIndex(i => i.externalId === ingredient.externalId);
        if (index >= 0) {
          this.ingredients[index] = updated;
        }
        this.showSuccess('Ingredient updated');
      },
      error: (error) => {
        this.showError('Failed to update ingredient: ' + error.error?.message);
      }
    });
  }

  removeIngredient(ingredient: RecipeIngredientDto): void {
    if (confirm(`Remove ${ingredient.inventoryItemName}?`)) {
      this.recipeService.removeIngredient(ingredient.externalId).subscribe({
        next: () => {
          this.ingredients = this.ingredients.filter(i => i.externalId !== ingredient.externalId);
          this.showSuccess('Ingredient removed');
        },
        error: (error) => {
          this.showError('Failed to remove ingredient: ' + error.error?.message);
        }
      });
    }
  }

  getInventoryItemName(itemId: string): string {
    const item = this.inventoryItems.find(i => i.externalId === itemId);
    return item ? item.name : itemId;
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
  }
}
