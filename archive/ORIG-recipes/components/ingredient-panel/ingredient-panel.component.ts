import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { RecipeIngredientDto } from '../../services/recipe-ingredient.service';
import { UnitOptionsService } from '../../../../core/services/unit-options.service';
import { UnitConversionResolverService } from '../../../../core/services/unit-conversion-resolver.service';
import { formatAsFraction, parseQuantityInput } from '../../../../shared/utils/quantity-format.util';
import { quantityFormatValidator } from '../../../../shared/validators/quantity-format.validator';
import { RoleService } from '../../../../../shared-data-services/role.service';

@Component({
  selector: 'app-ingredient-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    CdkDropList,
    CdkDrag
  ],
  template: `
    <div class="ingredient-panel">
      <!-- Two Column Layout -->
      <div class="two-column-layout">
        <!-- Left: Ingredients List -->
        <div class="left-column">
          <div *ngIf="isLoading" class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <span>Loading ingredients...</span>
          </div>

          <div *ngIf="!isLoading && ingredients.length === 0" class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <p>No ingredients added yet</p>
          </div>

          <table *ngIf="!isLoading && ingredients.length > 0" class="ingredients-table">
            <thead>
              <tr>
                <th *ngIf="!readOnly" class="col-drag"></th>
                <th class="col-qty">Qty</th>
                <th class="col-name">Ingredient</th>
                <th *ngIf="isAdmin" class="col-cost">Cost/Unit</th>
                <th *ngIf="isAdmin" class="col-total">Total</th>
                <th *ngIf="!readOnly" class="col-action"></th>
              </tr>
            </thead>
            <tbody cdkDropList (cdkDropListDropped)="onIngredientDrop($event)" [cdkDropListDisabled]="readOnly">
              <tr *ngFor="let ing of ingredients" cdkDrag class="ingredient-row" [class.editing-row]="editingExternalId === getIngredientKey(ing)">
                <td *ngIf="!readOnly" class="col-drag" cdkDragHandle>
                  <mat-icon class="drag-handle-icon">drag_indicator</mat-icon>
                </td>
                <td class="col-qty">{{ formatQuantityDisplay(ing.quantityRequired, ing.unit) }} <span *ngIf="ing.unit !== 'each'"> {{ ing.unit }}</span>
</td>
                <td class="col-name">{{ getIngredientDisplayName(ing) }}</td>
                <td *ngIf="isAdmin" class="col-cost">
                  <div class="cost-line"><span class="cost-label">Initial:</span> {{ formatUnitCost(getInitialUnitCost(ing)) }}</div>
                  <div class="cost-line"><span class="cost-label">Current:</span> {{ formatUnitCostOrDash(getCurrentUnitCost(ing)) }}</div>
                </td>
                <td *ngIf="isAdmin" class="col-total">
                  <div class="cost-line"><span class="cost-label">Initial:</span> <strong>{{ getInitialLineTotal(ing) | currency }}</strong></div>
                  <div class="cost-line"><span class="cost-label">Current:</span> <strong>{{ formatMoneyOrDash(getCurrentLineTotal(ing)) }}</strong></div>
                </td>
                <td *ngIf="!readOnly" class="col-action">
                  <button mat-icon-button matTooltip="Edit" (click)="startEditIngredient(ing)" [disabled]="isLoading">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="onRemoveIngredient(getIngredientKey(ing))" [disabled]="isLoading">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr *ngIf="isAdmin" class="total-row">
                <td [attr.colspan]="readOnly ? 3 : 4" class="total-label">Total Ingredient Cost (Initial)</td>
                <td class="col-total"><strong>{{ calculateTotalCost() | currency }}</strong></td>
              </tr>
              <tr *ngIf="isAdmin" class="total-row">
                <td [attr.colspan]="readOnly ? 3 : 4" class="total-label">Total Ingredient Cost (Current)</td>
                <td class="col-total"><strong>{{ formatMoneyOrDash(calculateCurrentTotalCost()) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Right: Add / Edit Form -->
        <div class="right-column" *ngIf="!readOnly">
          <form [formGroup]="addIngredientForm" (ngSubmit)="onSubmitForm()" class="add-form">
            <div class="form-title">
              <mat-icon>{{ isEditMode ? 'edit' : 'add_circle' }}</mat-icon>
              {{ isEditMode ? 'Update Ingredient' : 'New Ingredient' }}
            </div>
              <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
              <mat-label>Ingredient</mat-label>
              <mat-select formControlName="inventoryItemId">
                <mat-option *ngFor="let item of inventoryItems" [value]="item.externalId">
                  {{ item.name }} ({{ item.sku }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="addIngredientForm.get('inventoryItemId')?.hasError('required')">
                Ingredient is required
              </mat-error>
            </mat-form-field>

            <div class="qty-unit-row">
              <mat-form-field appearance="outline" class="half-width" subscriptSizing="dynamic">
                <mat-label>Quantity</mat-label>
                <input
                  matInput
                  type="text"
                  formControlName="quantityRequired"
                  placeholder="1/2, 1 1/2, 2"
                  [class.invalid-quantity-input]="isQuantityInvalid">
                <mat-error *ngIf="quantityControl?.hasError('required')">
                  Qty is required
                </mat-error>
                <mat-error *ngIf="quantityControl?.hasError('quantityFormat')">
                  Quantity invalid (e.g., 1/2, 1 1/2, 2)
                </mat-error>
                <mat-error *ngIf="quantityControl?.hasError('quantityMin') || quantityControl?.hasError('quantityZeroNotAllowed')">
                  Quantity must be greater than 0
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width" subscriptSizing="dynamic">
                <mat-label>Unit</mat-label>
                <mat-select formControlName="unit" placeholder="Select unit" [typeaheadDebounceInterval]="75">
                  <mat-option *ngFor="let unit of unitOptions" [value]="unit">
                    {{ unit }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field *ngIf="isAdmin" appearance="outline" class="full-width" subscriptSizing="dynamic">
              <mat-label>Cost Per Unit (Initial Snapshot)</mat-label>
              <input matInput type="number" formControlName="costPerUnit" min="0" step="0.01">
            </mat-form-field>

            <div class="form-actions">
              <button mat-stroked-button color="primary" type="submit" [disabled]="!addIngredientForm.valid || isLoading">
                <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
                {{ isEditMode ? 'Update' : 'Add' }}
              </button>
              <button *ngIf="isEditMode" mat-stroked-button type="button" (click)="cancelEdit()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ingredient-panel {
      padding: 16px;
      width: 100%;
    }

    h3 {
      margin-top: 0;
      color: #333;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .two-column-layout {
      display: flex;
      flex-direction: row;
      gap: 24px;
      width: 100%;
    }

    .left-column {
      flex: 1 1 60%;
      min-width: 0;
    }

    .right-column {
      flex: 0 0 350px;
      max-width: 350px;
    }

    .add-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .full-width {
      width: 100%;
    }

    .qty-unit-row {
      display: flex;
      gap: 12px;
      width: 100%;
      align-items: flex-start;
    }

    .half-width {
      flex: 1 1 0;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      color: #999;
      background: white;
      border-radius: 8px;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ddd;
      margin-bottom: 8px;
    }

    .ingredients-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .ingredients-table thead tr {
      background: #f5f5f5;
    }

    .ingredients-table th {
      padding: 10px 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e0e0e0;
      white-space: nowrap;
    }

    th.col-cost, th.col-total { text-align: right; }

    .ingredients-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      vertical-align: middle;
    }

    .ingredient-row:last-child td {
      border-bottom: none;
    }

    .col-qty  { white-space: nowrap; font-weight: 500; color: #1976d2; width: 90px; }
    .col-name { }
    .col-cost { white-space: nowrap; width: 100px; color: #666; font-size: 13px; text-align: right; }
    .col-total { white-space: nowrap; width: 100px; text-align: right; }
    .col-action { width: 96px; text-align: center; padding: 4px; white-space: nowrap; }
    .col-drag { width: 32px; text-align: center; padding: 4px; cursor: grab; color: #aaa; }
    .drag-handle-icon { font-size: 20px; line-height: 20px; height: 20px; width: 20px; cursor: grab; }
    .cdk-drag-preview { display: table; box-shadow: 0 4px 12px rgba(0,0,0,0.18); background: white; }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }

    .cost-line {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      line-height: 1.35;
    }

    .cost-label {
      color: #7a7a7a;
      font-size: 12px;
      min-width: 52px;
      text-align: left;
    }

    .editing-row td { background: #fff8e1; }

    .total-row td {
      background: #e8f5e9;
      border-top: 2px solid #c8e6c9;
      border-bottom: none;
    }

    .total-label {
      text-align: right;
      font-size: 13px;
      color: #555;
      font-weight: 500;
    }

    .form-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 4px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .invalid-quantity-input {
      color: #c62828 !important;
      caret-color: #c62828;
    }
  `]
})
export class IngredientPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() ingredients: RecipeIngredientDto[] = [];
  @Input() readOnly = false;
  @Input() recipeExternalId: string = '';
  @Output() ingredientAdded = new EventEmitter<{
    sourceType: 'inventory' | 'recipe_component';
    isRecipeComponent: boolean;
    sourceItem?: {
      externalId: string;
      sourceType: 'inventory' | 'recipe_component';
      isRecipeComponent: boolean;
      name?: string;
      displayName?: string;
    };
    sourceExternalId?: string;
    displayName: string;
    inventoryItemExternalId?: string;
    recipeComponentProductExternalId?: string;
    inventoryItemName?: string;
    recipeComponentProductName?: string;
    quantityRequired: number;
    unit: string;
    costPerUnit: number;
  }>();
  @Output() ingredientUpdated = new EventEmitter<{
    externalId: string;
    sourceType: 'inventory' | 'recipe_component';
    isRecipeComponent: boolean;
    sourceItem?: {
      externalId: string;
      sourceType: 'inventory' | 'recipe_component';
      isRecipeComponent: boolean;
      name?: string;
      displayName?: string;
    };
    sourceExternalId?: string;
    displayName: string;
    inventoryItemExternalId?: string;
    recipeComponentProductExternalId?: string;
    inventoryItemName?: string;
    recipeComponentProductName?: string;
    quantityRequired: number;
    unit: string;
    costPerUnit: number;
  }>();
  @Output() ingredientRemoved = new EventEmitter<string>();
  @Output() ingredientsReordered = new EventEmitter<RecipeIngredientDto[]>();

  editingExternalId: string | null = null;
  isEditMode = false;

  addIngredientForm!: FormGroup;
  inventoryItems: any[] = [];
  unitOptions: string[] = [];
  isLoading = false;
  private immutableCostBasisUnit: string | null = null;
  private immutableCostBasisValue: number | null = null;
  private unitControlSub?: Subscription;
  private selectedIngredientItem: any = null;
  private currentUnitCostByIngredientKey: Record<string, number | null> = {};
  private currentLineTotalByIngredientKey: Record<string, number | null> = {};
  isAdmin = false;

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private productService: ProductService,
    private unitOptionsService: UnitOptionsService,
    private unitConversionResolver: UnitConversionResolverService,
    private snackBar: MatSnackBar,
    private roleService: RoleService
  ) {
    const role = this.roleService.getCurrentRole();
    const rawRole = this.roleService.getCurrentUser()?.role;
    this.isAdmin = role === 'admin' || role === 'SystemAdmin' || role === 'CompanyAdmin'
      || rawRole === 'CompanyAdmin' || rawRole === 'SystemAdmin' || rawRole === 'admin';

    this.addIngredientForm = this.fb.group({
      inventoryItemId: ['', Validators.required],
      quantityRequired: ['', [quantityFormatValidator({ required: true, min: 0.01 })]],
      unit: ['', Validators.required],
      costPerUnit: ['', Validators.min(0)]
    });
  }

  ngOnInit(): void {
    this.loadInventoryItems();
    this.loadUnitOptions();
    this.addIngredientForm.get('inventoryItemId')!.valueChanges.subscribe((selectedId: string) => {
      const item = this.inventoryItems.find(i => i.externalId === selectedId);
      // Cache the resolved item so onSubmitForm never has to re-search
      this.selectedIngredientItem = item ?? null;
      if (item) {
        const lookedUpQuantity = Number.isFinite(Number(item.defaultQuantity)) && Number(item.defaultQuantity) > 0
          ? Number(item.defaultQuantity)
          : 1;
        const lookedUpUnit = item.unitOfMeasure ?? item.unit ?? '';
        const lookedUpCost = item.unitCost ?? 0;

        this.ensureUnitOption(lookedUpUnit);

        this.addIngredientForm.patchValue({
          quantityRequired: formatAsFraction(lookedUpQuantity),
          unit: lookedUpUnit,
          costPerUnit: lookedUpCost
        }, { emitEvent: false });

        this.immutableCostBasisUnit = this.normalizeUnit(lookedUpUnit);
        this.immutableCostBasisValue = this.toNumber(lookedUpCost, 0);
      }
    });

    this.unitControlSub = this.addIngredientForm.get('unit')?.valueChanges.subscribe((newUnit: string) => {
      this.onIngredientUnitChanged(newUnit);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ingredients']) {
      this.ingredients = (this.ingredients || []).map((ingredient) => this.normalizeIncomingIngredient(ingredient));
      this.mergeUnitsFromIngredients();
      this.refreshCurrentCosts();
    }
  }

  private normalizeIncomingIngredient(ingredient: RecipeIngredientDto): RecipeIngredientDto {
    const sourceType: 'inventory' | 'recipe_component' =
      ingredient.sourceType === 'recipe_component' || ingredient.sourceType === 'inventory'
        ? ingredient.sourceType
        : ((ingredient as any).isRecipeComponent ? 'recipe_component' : 'inventory');

    const sourceExternalId = this.getFirstNonEmpty([
      ingredient.sourceExternalId,
      ingredient.inventoryItemExternalId,
      ingredient.recipeComponentProductExternalId,
      ingredient.inventoryItemId,
      (ingredient as any).sourceItem?.externalId
    ]);

    const inventoryItemExternalId = sourceType === 'inventory'
      ? this.getFirstNonEmpty([ingredient.inventoryItemExternalId, sourceExternalId])
      : ingredient.inventoryItemExternalId;

    const recipeComponentProductExternalId = sourceType === 'recipe_component'
      ? this.getFirstNonEmpty([ingredient.recipeComponentProductExternalId, sourceExternalId])
      : ingredient.recipeComponentProductExternalId;

    const displayName = this.getFirstNonEmpty([
      ingredient.displayName,
      (ingredient as any).name,
      ingredient.inventoryItemName,
      ingredient.recipeComponentProductName,
      (ingredient as any).sourceItem?.displayName,
      (ingredient as any).sourceItem?.name
    ]);

    return {
      ...ingredient,
      sourceType,
      isRecipeComponent: sourceType === 'recipe_component',
      sourceExternalId,
      inventoryItemExternalId,
      recipeComponentProductExternalId,
      displayName: displayName || ingredient.displayName
    } as RecipeIngredientDto;
  }

  private getFirstNonEmpty(candidates: unknown[]): string {
    for (const candidate of candidates) {
      const normalized = String(candidate ?? '').trim();
      if (normalized) return normalized;
    }
    return '';
  }

  ngOnDestroy(): void {
    this.unitControlSub?.unsubscribe();
  }

  private loadUnitOptions(): void {
    this.unitOptionsService.getUnitOptions().subscribe({
      next: (units) => {
        this.unitOptions = units;
      }
    });
  }

  private mergeUnitsFromIngredients(): void {
    if (!this.ingredients?.length) return;

    const existing = new Set(this.unitOptions.map(unit => this.normalizeUnit(unit)));
    const missing = this.ingredients
      .map(ingredient => ingredient.unit)
      .filter(unit => !!unit)
      .map(unit => this.normalizeUnit(unit))
      .filter(unit => !!unit && !existing.has(unit));

    if (!missing.length) return;

    this.unitOptions = [...this.unitOptions, ...missing].sort((left, right) => left.localeCompare(right));
  }

  private ensureUnitOption(unit: string): void {
    const normalizedUnit = this.normalizeUnit(unit);
    if (!normalizedUnit) return;
    if (this.unitOptions.some(option => this.normalizeUnit(option) === normalizedUnit)) return;

    this.unitOptions = [...this.unitOptions, normalizedUnit].sort((left, right) => left.localeCompare(right));
  }

  private normalizeUnit(unit: unknown): string {
    return String(unit ?? '').trim();
  }

  private onIngredientUnitChanged(newUnitRaw: unknown): void {
    const newUnit = this.normalizeUnit(newUnitRaw);
    if (!newUnit) return;

    const costControl = this.addIngredientForm.get('costPerUnit');
    const currentCost = this.toNumber(costControl?.value, NaN);
    const baseUnit = this.immutableCostBasisUnit;
    const baseCost = this.immutableCostBasisValue;

    if (!baseUnit || !Number.isFinite(baseCost as number) || (baseCost as number) < 0) {
      if (Number.isFinite(currentCost) && currentCost >= 0) {
        this.immutableCostBasisUnit = newUnit;
        this.immutableCostBasisValue = currentCost;
      }
      return;
    }

    if (baseUnit === newUnit) {
      costControl?.setValue(Number((baseCost as number).toFixed(6)), { emitEvent: false });
      return;
    }

    const selectedInventoryItemId = String(this.addIngredientForm.get('inventoryItemId')?.value ?? '').trim();
    this.unitConversionResolver.convertValue(1, newUnit, baseUnit, selectedInventoryItemId).subscribe((baseUnitsPerNewUnit) => {
      if (!Number.isFinite(baseUnitsPerNewUnit as number) || (baseUnitsPerNewUnit as number) <= 0) {
        this.addIngredientForm.patchValue({
          unit: baseUnit,
          costPerUnit: Number((baseCost as number).toFixed(6))
        }, { emitEvent: false });
        return;
      }

      const convertedCost = (baseCost as number) * (baseUnitsPerNewUnit as number);
      costControl?.setValue(Number(convertedCost.toFixed(6)), { emitEvent: false });
    });
  }

  loadInventoryItems(): void {
    this.isLoading = true;
    // Load both inventory items and recipe components (products marked as components)
    forkJoin([
      this.inventoryService.getInventoryItems(),
      this.productService.getProducts().pipe(
        map(products => products.filter(p => p.isRecipeComponent === true)),
        catchError(err => {
          console.error('Failed to load recipe components:', err);
          return of([]);
        })
      )
    ]).subscribe(
      ([items, components]) => {
        // Merge inventory items with recipe components for unified selection
        // Mark components with a source flag for later identification
        const componentItems = components.map((comp: any) => ({
          externalId: comp.externalId,
          name: comp.name,
          displayName: `${comp.name} [Component]`,
          sku: comp.sku ? `${comp.sku}-COMP` : 'COMP',
          defaultQuantity: comp.outputUnitCount ?? 1,
          quantityOnHand: comp.quantityOnHand,
          unitOfMeasure: comp.unit || comp.unitOfMeasure || 'unit',
          unitCost: comp.unitCost ?? comp.unitPrice ?? 0,
          outputUnitCount: comp.outputUnitCount,
          baseUnitsPerOutputUnit: comp.baseUnitsPerOutputUnit,
          isRecipeComponent: true,
          sourceType: 'recipe_component' as const
        }));
        this.inventoryItems = [...items, ...componentItems].sort((left: any, right: any) => {
          const leftName = String(left.displayName ?? left.name ?? '').toLocaleLowerCase();
          const rightName = String(right.displayName ?? right.name ?? '').toLocaleLowerCase();
          return leftName.localeCompare(rightName);
        });
        this.isLoading = false;
        this.refreshCurrentCosts();
      },
      (error: any) => {
        console.error('Failed to load inventory items:', error);
        this.isLoading = false;
      }
    );
  }

  onSubmitForm(): void {
    if (!this.addIngredientForm.valid) {
      this.addIngredientForm.markAllAsTouched();
      if (this.quantityControl?.invalid) {
        this.showQuantityValidationError();
      }
      return;
    }
    const val = this.addIngredientForm.value;
    const parsedQuantity = parseQuantityInput(val.quantityRequired);
    if (!parsedQuantity.isValid || parsedQuantity.value === null) {
      this.quantityControl?.setErrors({
        ...(this.quantityControl?.errors ?? {}),
        quantityFormat: true
      });
      this.quantityControl?.markAsTouched();
      this.showQuantityValidationError();
      return;
    }

    const rawSelectedValue = this.addIngredientForm.get('inventoryItemId')?.value;
    const selectedItemFromValue = typeof rawSelectedValue === 'object' && rawSelectedValue !== null
      ? rawSelectedValue
      : null;

    // Resolve selected item defensively to prevent missing IDs/names for recipe components
    const normalizedRawId = this.normalizeExternalId(rawSelectedValue);
    const normalizedFormId = this.normalizeExternalId(val.inventoryItemId);

    const selectedItem = this.selectedIngredientItem
      ?? selectedItemFromValue
      ?? this.inventoryItems.find(i =>
        this.normalizeExternalId(i.externalId) === normalizedRawId
        || this.normalizeExternalId(i.externalId) === normalizedFormId
        || i.displayName === rawSelectedValue
        || i.name === rawSelectedValue
      );

    const resolvedExternalId = this.normalizeExternalId(
      selectedItem?.externalId
      ?? rawSelectedValue
      ?? val.inventoryItemId
      ?? selectedItemFromValue?.externalId
    );

    if (!resolvedExternalId || !this.isGuid(resolvedExternalId)) {
      this.snackBar.open('Could not resolve ingredient identifier. Please reselect ingredient and try again.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const resolvedItem = selectedItem
      ?? this.inventoryItems.find(i => this.normalizeExternalId(i.externalId) === resolvedExternalId)
      ?? null;

    const sourceType: 'inventory' | 'recipe_component' =
      resolvedItem?.sourceType
      ?? (resolvedItem?.isRecipeComponent ? 'recipe_component' : 'inventory');
    const isRecipeComponent = sourceType === 'recipe_component';
    const normalizedQuantityRequired = parsedQuantity.value;
    const normalizedCostPerUnit = this.toNumber(val.costPerUnit, 0);
    const resolvedDisplayName = resolvedItem?.displayName ?? resolvedItem?.name ?? `Ingredient (${resolvedExternalId})`;
    const resolvedName = resolvedItem?.name ?? resolvedItem?.displayName ?? `Ingredient (${resolvedExternalId})`;

    const payload = {
      sourceType,
      isRecipeComponent,
      sourceItem: {
        externalId: resolvedExternalId,
        sourceType,
        isRecipeComponent,
        name: resolvedName,
        displayName: resolvedDisplayName
      },
      sourceExternalId: resolvedExternalId,
      displayName: resolvedDisplayName,
      inventoryItemExternalId: sourceType === 'inventory' ? resolvedExternalId : undefined,
      recipeComponentProductExternalId: sourceType === 'recipe_component' ? resolvedExternalId : undefined,
      inventoryItemName: sourceType === 'inventory' ? resolvedName : undefined,
      recipeComponentProductName: sourceType === 'recipe_component' ? resolvedName : undefined,
      quantityRequired: normalizedQuantityRequired,
      unit: val.unit,
      costPerUnit: normalizedCostPerUnit,
    };

    if (this.isEditMode) {
      this.ingredientUpdated.emit({ ...payload, externalId: this.editingExternalId! });
    } else {
      this.ingredientAdded.emit(payload);
    }
    this.editingExternalId = null;
    this.isEditMode = false;
    this.immutableCostBasisUnit = null;
    this.immutableCostBasisValue = null;
    this.selectedIngredientItem = null;
    this.addIngredientForm.reset();
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private normalizeExternalId(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  startEditIngredient(ing: RecipeIngredientDto): void {
    this.editingExternalId = this.getIngredientKey(ing);
    this.isEditMode = true;
    this.ensureUnitOption(ing.unit);
    const selectedSourceId = ing.inventoryItemExternalId
      ?? ing.recipeComponentProductExternalId
      ?? (ing as any).sourceExternalId
      ?? (ing as any).inventoryItemId;
    const selectedItem = this.inventoryItems.find(i => i.externalId === selectedSourceId);
    this.addIngredientForm.setValue({
      inventoryItemId: selectedItem?.externalId ?? selectedSourceId ?? '',
      quantityRequired: formatAsFraction(ing.quantityRequired),
      unit: ing.unit,
      costPerUnit: ing.costPerUnit ?? ''
    });
    this.immutableCostBasisUnit = this.normalizeUnit(ing.unit);
    this.immutableCostBasisValue = this.toNumber(ing.costPerUnit, 0);
  }

  cancelEdit(): void {
    this.editingExternalId = null;
    this.isEditMode = false;
    this.immutableCostBasisUnit = null;
    this.immutableCostBasisValue = null;
    this.selectedIngredientItem = null;
    this.addIngredientForm.reset();
  }

  onRemoveIngredient(externalId: string): void {
    if (this.editingExternalId === externalId) this.cancelEdit();
    this.ingredientRemoved.emit(externalId);
  }

  onIngredientDrop(event: CdkDragDrop<RecipeIngredientDto[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    moveItemInArray(this.ingredients, event.previousIndex, event.currentIndex);
    // Emit the reordered array to the parent — parent will persist on Save (same pattern as composition panel)
    this.ingredientsReordered.emit([...this.ingredients]);
  }

  getIngredientKey(ing: RecipeIngredientDto): string {
    return ing.externalId
      ?? ing.inventoryItemExternalId
      ?? ing.recipeComponentProductExternalId
      ?? (ing as any).inventoryItemId
      ?? '';
  }

  getIngredientDisplayName(ing: RecipeIngredientDto): string {
    const directName = ing.displayName
      || (ing as any).name
      || ing.inventoryItemName
      || ing.recipeComponentProductName
      || (ing as any).sourceItem?.displayName
      || (ing as any).sourceItem?.name;
    if (directName) {
      return this.applyComponentSuffixIfNeeded(directName, ing);
    }

    const sourceId = this.getNonEmptySourceId(ing);

    if (!sourceId) {
      return '[Missing source ID — delete and re-add]';
    }

    const matchedItem = this.inventoryItems.find(i => i.externalId === sourceId);
    const matchedName = matchedItem?.displayName || matchedItem?.name || '[Unknown ingredient source]';
    return this.applyComponentSuffixIfNeeded(matchedName, ing);
  }

  private applyComponentSuffixIfNeeded(name: string, ing: RecipeIngredientDto): string {
    const normalizedName = String(name ?? '').trim();
    if (!normalizedName) return '';

    const isComponent = ing.sourceType === 'recipe_component' || (ing as any).isRecipeComponent === true;
    if (!isComponent) return normalizedName;

    if (/\[component\]\s*$/i.test(normalizedName) || /\(comp\)\s*$/i.test(normalizedName)) {
      return normalizedName;
    }

    return `${normalizedName} [Component]`;
  }

  private getNonEmptySourceId(ing: RecipeIngredientDto): string {
    const candidates = [
      ing.inventoryItemExternalId,
      ing.recipeComponentProductExternalId,
      (ing as any).sourceExternalId,
      (ing as any).inventoryItemId,
      (ing as any).sourceItem?.externalId
    ];

    for (const candidate of candidates) {
      const normalized = String(candidate ?? '').trim();
      if (normalized) return normalized;
    }

    return '';
  }

  calculateTotalCost(): number {
    return this.ingredients.reduce((sum, ing) => sum + ((ing.costPerUnit || 0) * ing.quantityRequired), 0);
  }

  calculateCurrentTotalCost(): number | null {
    const values = this.ingredients.map(ing => this.getCurrentLineTotal(ing));
    if (values.some(value => value === null)) {
      return null;
    }

    return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  }

  
  getInitialUnitCost(ing: RecipeIngredientDto): number {
    return this.toNumber(ing.costPerUnit, 0);
  }

  getInitialLineTotal(ing: RecipeIngredientDto): number {
    return this.getInitialUnitCost(ing) * this.toNumber(ing.quantityRequired, 0);
  }

  getCurrentUnitCost(ing: RecipeIngredientDto): number | null {
    return this.currentUnitCostByIngredientKey[this.getIngredientKey(ing)] ?? null;
  }

  getCurrentLineTotal(ing: RecipeIngredientDto): number | null {
    return this.currentLineTotalByIngredientKey[this.getIngredientKey(ing)] ?? null;
  }

  formatMoneyOrDash(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatUnitCost(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(this.toNumber(value, 0));
  }

  formatUnitCostOrDash(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(value);
  }

  private refreshCurrentCosts(): void {
    if (!this.ingredients?.length || !this.inventoryItems?.length) {
      this.currentUnitCostByIngredientKey = {};
      this.currentLineTotalByIngredientKey = {};
      return;
    }

    const lookups = this.ingredients.map(ingredient => this.computeCurrentCostForIngredient(ingredient));

    forkJoin(lookups).subscribe((results) => {
      const unitMap: Record<string, number | null> = {};
      const totalMap: Record<string, number | null> = {};

      results.forEach(result => {
        unitMap[result.key] = result.currentUnitCost;
        totalMap[result.key] = result.currentLineTotal;
      });

      this.currentUnitCostByIngredientKey = unitMap;
      this.currentLineTotalByIngredientKey = totalMap;
    });
  }

  private computeCurrentCostForIngredient(ingredient: RecipeIngredientDto) {
    const key = this.getIngredientKey(ingredient);
    const quantityRequired = this.toNumber(ingredient.quantityRequired, 0);

    const inventoryItem = this.inventoryItems.find(i =>
      i.externalId === ingredient.inventoryItemExternalId
      || i.externalId === ingredient.recipeComponentProductExternalId
      || i.externalId === (ingredient as any).sourceExternalId
      || i.externalId === (ingredient as any).inventoryItemId
    );

    const inventoryCostPerUnit = this.toNumber(inventoryItem?.unitCost, NaN);
    const inventoryUnit = this.normalizeUnit(inventoryItem?.unitOfMeasure ?? inventoryItem?.unit ?? '');
    const ingredientUnit = this.normalizeUnit(ingredient.unit);

    if (!Number.isFinite(inventoryCostPerUnit) || inventoryCostPerUnit < 0 || !inventoryUnit || !ingredientUnit) {
      return of({ key, currentUnitCost: null, currentLineTotal: null });
    }

    if (inventoryUnit === ingredientUnit) {
      const currentUnitCost = inventoryCostPerUnit;
      return of({ key, currentUnitCost, currentLineTotal: currentUnitCost * quantityRequired });
    }

    const inventoryItemExternalId = inventoryItem?.externalId
      ?? ingredient.inventoryItemExternalId
      ?? ingredient.recipeComponentProductExternalId
      ?? (ingredient as any).sourceExternalId
      ?? (ingredient as any).inventoryItemId
      ?? '';

    return this.unitConversionResolver.convertValue(1, ingredientUnit, inventoryUnit, inventoryItemExternalId).pipe(
      map((inventoryUnitsPerIngredientUnit) => {
        if (!Number.isFinite(inventoryUnitsPerIngredientUnit as number) || (inventoryUnitsPerIngredientUnit as number) <= 0) {
          return { key, currentUnitCost: null, currentLineTotal: null };
        }

        const currentUnitCost = inventoryCostPerUnit * (inventoryUnitsPerIngredientUnit as number);
        return {
          key,
          currentUnitCost,
          currentLineTotal: currentUnitCost * quantityRequired
        };
      }),
      catchError(() => of({ key, currentUnitCost: null, currentLineTotal: null }))
    );
  }

  private static readonly WEIGHT_UNITS = new Set(['mg', 'g', 'kg', 'ton', 'oz', 'lb']);

  formatQuantityDisplay(value: number, unit?: string): string {
    if (!Number.isFinite(value)) return '';
    if (Number.isInteger(value)) return String(value);
    const isWeight = IngredientPanelComponent.WEIGHT_UNITS.has((unit ?? '').trim().toLowerCase());
    return isWeight ? String(Number(value.toFixed(4)).toString()) : formatAsFraction(value);
  }

  get quantityControl() {
    return this.addIngredientForm.get('quantityRequired');
  }

  get isQuantityInvalid(): boolean {
    const control = this.quantityControl;
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  private showQuantityValidationError(): void {
    this.snackBar.open(
      'Invalid quantity. Use a whole number, decimal, or fraction (e.g., 2, 0.5, 1/2, 1 1/2).',
      'Close',
      { duration: 5000, panelClass: ['error-snackbar'] }
    );
  }
}
