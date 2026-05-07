//working on adding listeners and onchange onblur so that the normalized details will shows.


import { Component, OnDestroy, OnInit, ViewChild, HostListener, ChangeDetectorRef, ElementRef, Input, Directive } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, FormControl, Validators, ControlValueAccessor, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteTrigger, MAT_AUTOCOMPLETE_SCROLL_STRATEGY } from '@angular/material/autocomplete';
import { Overlay } from '@angular/cdk/overlay';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';


import {
  RecipeService,
  RecipeVersionSummaryDto,
  UpdateRecipeWithDetailsRequest
} from '../services/recipe.service';
import { RecipeIngredientService } from '../services/recipe-ingredient.service';
import { RecipeCompositionService } from '../services/recipe-composition.service';
import { ProductService, SellableProductDto } from '../services/product.service';
import { ProductsService } from '../../../features/products/services/products.service';
import { UnitOptionsService } from '../../../core/services/unit-options.service';
import { IngredientPanelComponent } from '../components/ingredient-panel/ingredient-panel.component';
import { CompositionPanelComponent } from '../components/composition-panel/composition-panel.component';
import { ProductComponentCreateComponent, ProductComponentCreateModel } from '../../../features/products/components/product-component-create/product-component-create.component';
import { RoleService } from '../../../../shared-data-services/role.service';
import { IdleDetectionService } from '../../../core/services/idle-detection.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-recipe-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    RouterModule,
    IngredientPanelComponent,
    CompositionPanelComponent
  ],
  templateUrl: './recipe-editor.component.html',
  styleUrls: ['./recipe-editor.component.css'],
  providers: [
    {
      provide: MAT_AUTOCOMPLETE_SCROLL_STRATEGY,
      useFactory: (overlay: Overlay) => () => overlay.scrollStrategies.reposition(),
      deps: [Overlay]
    }
  ]
})
export class RecipeEditorComponent implements OnInit, OnDestroy {
  private static readonly EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
  private readonly debugTreatRecipeComponentsAsInventory = false;

  form!: FormGroup;
  loading = true;
  saving = false;
  error = '';
  recipeId: string | null = null;
  isEditing = false;
  isViewOnly = false;
  isCookMode = false;
  cookTheme: 'light' | 'dark' = 'light';
  keepAwakeEnabled = false; // Only true in cook mode
  private wakeLockSentinel: any = null;
  private idlePulseInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      void this.requestWakeLock();
    }
  };
  recipeDetailsCollapsed = false;
  ingredientsCollapsed = false;
  compositionsCollapsed = false;

  // Version management
  versions: RecipeVersionSummaryDto[] = [];
  currentVersion: RecipeVersionSummaryDto | null = null;
  creatingDraft = false;
  draftError = '';
  duplicating = false;
  duplicateError = '';

  // Admin state
  isAdmin = false;
  deleting = false;
  deleteError = '';

  // Product picker
  allProducts: SellableProductDto[] = [];
  filteredProducts: SellableProductDto[] = [];
  productName = '';
  changingProduct = false;
  // Snapshot of linked product while picker is open; used to restore on cancel or declined change
  private snapshotProductExternalId: string | null = null;
  private snapshotProductName: string | null = null;
  productsLoading = false;
  productSearchCtrl = new FormControl('');
  private productSearchSub?: import('rxjs').Subscription;
  @ViewChild('productAutoTrigger') autoTrigger?: MatAutocompleteTrigger;
  
  // Data arrays for ingredients and sections
  ingredients: any[] = [];
  sections: any[] = [];
  subRecipeCookData: Record<string, { externalId: string; name: string; ingredients: any[]; sections: any[] }> = {};
  selectedItem: any = null;
  private manualExtraTimeMin = 0;
  private syncingTotalTime = false;

  constructor(
    private formBuilder: FormBuilder,
    private recipeService: RecipeService,
    private ingredientService: RecipeIngredientService,
    private compositionService: RecipeCompositionService,
    private productService: ProductService,
    private roleService: RoleService,
    private idleDetection: IdleDetectionService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private productsService: ProductsService
    ,
    private unitOptionsService: UnitOptionsService
  ) {
    this.initializeForm();
    const role = this.roleService.getCurrentRole();
    const rawRole = this.roleService.getCurrentUser()?.role;
    this.isAdmin = role === 'admin' || role === 'SystemAdmin' || role === 'CompanyAdmin'
      || rawRole === 'CompanyAdmin' || rawRole === 'SystemAdmin' || rawRole === 'admin';
  }

  openCreateComponentModal(): void {
    const ref = this.dialog.open(ProductComponentCreateComponent, { width: '560px' });
    const instance = ref.componentInstance as ProductComponentCreateComponent;

    // Pre-fill the modal with current recipe data so the user doesn't have to re-enter it
    const recipeName = String(this.form.get('name')?.value || '').trim();
    const yieldUnit = String(this.form.get('yieldUnit')?.value || 'pieces');
    const parsedYield = this.parseYieldToNumber(String(this.form.get('yieldServingCnt')?.value || '0')) ?? 0;
    const currentCostPerUnit = Number(this.form.getRawValue().costPerUnit) || 0;


    // Find the ProductCategory ID for 'recipe component' (case-insensitive)
    // For now, assume you have a list of product categories available as this.productCategories
    // and that each has a 'name' and 'id' property.
    let recipeComponentCategoryId: number | undefined = undefined;
    // Defensive: check for productCategories array and valid id
    const categories = (this as any).productCategories;
    if (Array.isArray(categories)) {
      const match = categories.find((cat: any) =>
        typeof cat.name === 'string' && cat.name.toLowerCase() === 'recipe component'
      );
      if (match && typeof match.id === 'number') {
        recipeComponentCategoryId = match.id;
      } else if (match && typeof match.id === 'string' && !isNaN(Number(match.id))) {
        recipeComponentCategoryId = Number(match.id);
      }
    }

    instance.form.patchValue({
      name: recipeName,
      outputUnitMsr: yieldUnit,
      outputUnitCount: parsedYield > 0 ? parsedYield : 24,
      unitPrice: currentCostPerUnit > 0 ? currentCostPerUnit : null,
      // Patch as string if defined
      ...(recipeComponentCategoryId !== undefined && recipeComponentCategoryId !== null ? { category: recipeComponentCategoryId.toString() } : {})
    });

    const subCreate = instance.create.subscribe((payload: ProductComponentCreateModel) => {
      console.log('Component create payload (from recipe editor):', payload);
      const req = {
        name: payload.name,
        sku: payload.sku || '',
        // Convert category to string if defined
        ...(payload.category !== undefined && payload.category !== null ? { category: payload.category.toString() } : {}),
        description: `${payload.name} created in recipe editor${payload.outputUnitMsr ? ' (unit: ' + payload.outputUnitMsr + ')' : ''}`,
        unitPrice: payload.unitPrice ?? 0,
        unitCost: currentCostPerUnit > 0 ? currentCostPerUnit : undefined,
        outputUnitMsr: payload.outputUnitMsr || undefined,
        outputUnitCount: payload.outputUnitCount ?? undefined,
        baseUnitsPerOutputUnit: payload.yieldToUnitConversion ?? undefined,
        servingsPerPackage: payload.servingsPerPackage ?? 1,
        IsRecipeComponent: payload.isRecipeComponent,
        isForSale: payload.isListedForSale
      };

      this.productsService.createProduct(req).subscribe({
        next: (created) => {
          // Link created product to the recipe form
          if (created && (created as any).externalId) {
            this.form.patchValue({ productExternalId: (created as any).externalId });
            this.productName = created.name || payload.name;
          }
          this.snackBar.open(`Created component product: ${created.name}`, 'Close', { duration: 3000 });
          ref.close();
          subCreate.unsubscribe();
        },
        error: (err) => {
          console.error('Error creating product:', err);
          this.snackBar.open('Failed to create product. See console for details.', 'Close', { duration: 4000 });
        }
      });
    });

    const subCancel = instance.cancel.subscribe(() => {
      ref.close();
      subCancel.unsubscribe();
      subCreate.unsubscribe();
    });
  }

  private initializeForm(): void {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      productExternalId: [''],
      // yieldServingCnt accepts decimals or simple fractions (e.g. "1/2"). Parsing happens on save.
      yieldServingCnt: ['25', [Validators.required, this.yieldServingCntValidator.bind(this)]],
      yieldUnit: ['g', Validators.required],
      unitsPerServing: ['120', [Validators.required, Validators.min(0)]],
      shelfLifeDayCnt: [null as number | null, [Validators.min(0)]],
      costPerUnit: [0, [Validators.required, Validators.min(0)]],
      recipeStatusCd: ['D', Validators.required], // D=draft, A=active, X=archived, B=abandoned
      prepTimeMin: [0, [Validators.min(0)]],
      activeTimeMin: [0, [Validators.min(0)]],
      cookTimeMin: [0, [Validators.min(0)]],
      restTimeMin: [0, [Validators.min(0)]],
      inactiveTimeMin: [0, [Validators.min(0)]],
      totalTimeMin: [0, [Validators.min(0)]]
    });

    this.setupTotalTimeComputation();
    // By default, costPerUnit is computed and not editable until override is enabled
    this.form.get('costPerUnit')?.disable();
    // NOTE: Yield changes no longer auto-recompute cost.
    // Recompute will occur when the recipe is saved (user opted for explicit save-to-recompute behavior).
    // Keep validator in place but do not subscribe to valueChanges here.
  }

  unitOptions: string[] = [];
  costOverride = false;
  // True when the recipe's cost was not present in the DB and we fetched a computed value
  costWasComputed = false;
  // Original persisted DB value (null when DB had no explicit value)
  originalCostPerUnit: number | null = null;
  // True when user manually edited the cost input (implicit override)
  costEdited = false;
  private costControlSub?: import('rxjs').Subscription;

  @ViewChild('costInput') costInput?: ElementRef<HTMLInputElement>;

  toggleCostOverride(): void {
    // If the form is view-only, instruct the user to create a draft instead
    if (this.isViewOnly) {
      this.snackBar.open('This recipe is view-only. Create a draft to override the cost.', 'OK', { duration: 4000 });
      return;
    }
    this.costOverride = !this.costOverride;
    const ctrl = this.form.get('costPerUnit');
    if (this.costOverride) {
      ctrl?.enable();
      // When user enables override, the value is now explicitly overridden
      this.costWasComputed = false;
      // Focus the input for immediate editing
      setTimeout(() => this.costInput?.nativeElement.focus());
    } else {
      ctrl?.disable();
    }
  }

  private registerCostControlWatcher(): void {
    // unsubscribe previous
    this.costControlSub?.unsubscribe();
    const ctrl = this.form.get('costPerUnit');
    if (!ctrl) return;
    this.costControlSub = ctrl.valueChanges.subscribe((val) => {
      // treat NaN or non-number gracefully
      const num = Number(val);
      const isNumber = Number.isFinite(num);
      if (this.originalCostPerUnit === null) {
        // original was null (no persisted value) — any non-zero edit counts
        this.costEdited = isNumber && num !== 0;
      } else {
        // compare numerically to original
        this.costEdited = isNumber && Math.abs(num - (this.originalCostPerUnit as number)) > 0.000001;
      }
    });
  }

  private yieldServingCntValidator(control: FormControl) {
    const raw = String(control.value ?? '').trim();
    if (!raw) return { required: true };
    const parsed = this.parseYieldToNumber(raw);
    if (parsed === null || !(parsed > 0)) return { invalidYield: true };
    return null;
  }

  private parseYieldToNumber(raw: string): number | null {
    const s = raw.trim();
    if (!s) return null;
    if (s.includes('/')) {
      const parts = s.split('/').map(p => p.trim());
      if (parts.length !== 2) return null;
      const num = Number(parts[0]);
      const den = Number(parts[1]);
      if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
      return num / den;
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  ngOnInit(): void {
    this.isCookMode = this.route.snapshot.data['cookMode'] === true;
    this.isViewOnly = this.route.snapshot.data['viewOnly'] === true || this.isCookMode;

    // Load unit options for yieldUnit select
    this.unitOptionsService.getUnitOptions().subscribe({
      next: (u) => this.unitOptions = u,
      error: () => this.unitOptions = ['pieces']
    });

    if (this.isCookMode) {
      this.cookTheme = this.resolveInitialCookTheme();
      this.keepAwakeEnabled = true;
      this.setupWakeLockLifecycle();
    } else {
      this.keepAwakeEnabled = false;
    }

    this.route.paramMap.subscribe((params) => {
      this.recipeId = params.get('externalId');
      
      if (this.recipeId) {
        this.isEditing = true;
        // Reset stale state before loading new version
        this.loading = true;
        this.versions = [];
        this.currentVersion = null;
        this.ingredients = [];
        this.sections = [];
        this.draftError = '';
        this.loadRecipe(this.recipeId);
      } else {
        this.loading = false;
      }
    });
  }

  private refreshComputedCost(): void {
    if (!this.isAdmin) return;
    if (this.costOverride) return; // don't overwrite manual override

    // If we have a persisted recipe, ask backend costing service
    if (this.recipeId) {
      this.recipeService.getRecipeCost(this.recipeId).subscribe({
        next: (resp: any) => {
          const value = resp?.costPerUnit ?? resp?.CostPerUnit ?? resp?.cost_per_unit ?? null;
          if (value !== null && value !== undefined) {
            const ctrl = this.form.get('costPerUnit');
            ctrl?.setValue(Number(value), { emitEvent: false });
            ctrl?.disable();
            // Mark that this value was computed (backend calculation) rather than stored as explicit value
            this.costWasComputed = true;
            this.originalCostPerUnit = null;
            this.costEdited = false;
            this.registerCostControlWatcher();
          }
        },
        error: (err) => {
          console.warn('Unable to fetch computed recipe cost:', err?.message ?? err);
        }
      });
      return;
    }

    // No recipeId (create flow) — compute locally from ingredients and yield
    try {
      const yieldQty = Number(this.parseYieldToNumber(String(this.form.get('yieldServingCnt')?.value)) ?? this.form.get('yieldServingCnt')?.value) || 0;
      let total = 0;
      for (const ing of this.ingredients || []) {
        const lineCost = (ing.quantityRequired || 0) * (ing.costPerUnit || 0);
        total += lineCost;
      }
      const computed = yieldQty > 0 ? total / yieldQty : 0;
      const ctrl = this.form.get('costPerUnit');
      ctrl?.setValue(Number(computed), { emitEvent: false });
      ctrl?.disable();
      this.costWasComputed = true;
      this.originalCostPerUnit = null;
      this.costEdited = false;
      this.registerCostControlWatcher();
    } catch (e) {
      console.warn('Local computed cost failed:', e);
    }
  }

  ngOnDestroy(): void {
    this.productSearchSub?.unsubscribe();
    this.costControlSub?.unsubscribe();
    this.teardownWakeLockLifecycle();
  }

  loadRecipe(recipeId: string): void {
    this.recipeService.getRecipeById(recipeId).subscribe({
      next: (recipe) => {
        const normalizedProductExternalId = this.normalizeProductExternalId(recipe.productExternalId);

        // Map API field names to form field names
        const formData = {
          name: recipe.recipeName,
          description: recipe.description,
          productExternalId: normalizedProductExternalId,
          yieldServingCnt: recipe.yieldServingCnt,
          yieldUnit: recipe.yieldUnit,
          shelfLifeDayCnt: recipe.shelfLifeDayCnt,
          unitsPerServing: recipe.unitsPerServing,
          costPerUnit: recipe.costPerUnit,
          recipeStatusCd: recipe.recipeStatusCd || 'D',
          prepTimeMin: recipe.prepTimeMin || 0,
          activeTimeMin: recipe.activeTimeMin || 0,
          cookTimeMin: recipe.cookTimeMin || 0,
          restTimeMin: recipe.restTimeMin || 0,
          inactiveTimeMin: recipe.inactiveTimeMin || 0,
          totalTimeMin: recipe.totalTimeMin || 0
        };
        this.form.patchValue(formData);
        
        // Ensure costPerUnit is never left null in the control UI. If DB returned null,
        // set a safe 0 and ask the backend to compute a value instead.
        const costCtrl = this.form.get('costPerUnit');
        if (!this.isAdmin) {
          costCtrl?.setValue(0, { emitEvent: false });
          this.costWasComputed = false;
          this.originalCostPerUnit = null;
          this.costEdited = false;
          costCtrl?.disable();
        } else if (recipe.costPerUnit === null || recipe.costPerUnit === undefined) {
          costCtrl?.setValue(0, { emitEvent: false });
          // Mark that DB didn't have an explicit cost; we'll fetch computed value
          this.costWasComputed = true;
          // Ask the costing endpoint to compute and populate the value
          this.refreshComputedCost();
        } else {
          costCtrl?.setValue(Number(recipe.costPerUnit), { emitEvent: false });
          this.costWasComputed = false;
          // Persisted value exists — allow editing the stored value directly
          this.originalCostPerUnit = Number(recipe.costPerUnit);
          this.costEdited = false;
          // enable control so stored value is editable without toggling override
          costCtrl?.enable();
          this.registerCostControlWatcher();
        }

        // Derive effective view-only state: explicit view route OR a non-draft version on the edit route
        const routeViewOnly = this.route.snapshot.data['viewOnly'] === true;
        this.isViewOnly = this.isCookMode || routeViewOnly || recipe.recipeStatusCd !== 'D';

        // Disable all fields when not editing a draft
        if (this.isViewOnly) {
          this.form.disable();
        } else {
          this.form.enable();
        }
        // If we're not overriding cost, keep costPerUnit disabled (read-only)
        this.costOverride = false;
        if (!this.costOverride) {
          // For recipes with persisted cost allow editing; otherwise keep disabled
          if (this.originalCostPerUnit === null) {
            this.form.get('costPerUnit')?.disable();
          }
        }
        
        // Load ingredients, compositions, and versions
        this.loadIngredients(recipeId);
        this.loadCompositions(recipeId);
        this.loadVersions(recipeId);
        this.productName = normalizedProductExternalId ? (recipe.productName ?? '') : '';
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading recipe:', err);
        this.error = err.error?.message || 'Failed to load recipe';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    this.performSave({ navigateAfter: true });
  }

  saveAndStay(): void {
    this.performSave({ navigateAfter: false });
  }

  private setupTotalTimeComputation(): void {
    const componentFields = ['prepTimeMin', 'activeTimeMin', 'cookTimeMin', 'restTimeMin', 'inactiveTimeMin'];

    this.form.get('totalTimeMin')?.valueChanges.subscribe((value) => {
      if (this.syncingTotalTime) return;
      const total = this.coerceNumber(value);
      this.manualExtraTimeMin = Math.max(0, total - this.calculateBaseTimeSum());
    });

    componentFields.forEach((field) => {
      this.form.get(field)?.valueChanges.subscribe(() => {
        this.recalculateTotalTime();
      });
    });
  }

  private calculateBaseTimeSum(): number {
    return this.coerceNumber(this.form.get('prepTimeMin')?.value)
      + this.coerceNumber(this.form.get('activeTimeMin')?.value)
      + this.coerceNumber(this.form.get('cookTimeMin')?.value)
      + this.coerceNumber(this.form.get('restTimeMin')?.value)
      + this.coerceNumber(this.form.get('inactiveTimeMin')?.value);
  }

  private recalculateTotalTime(): void {
    const computedTotal = this.calculateBaseTimeSum() + this.manualExtraTimeMin;
    const currentTotal = this.coerceNumber(this.form.get('totalTimeMin')?.value);
    if (currentTotal === computedTotal) return;

    this.syncingTotalTime = true;
    this.form.patchValue({ totalTimeMin: computedTotal }, { emitEvent: false });
    this.syncingTotalTime = false;
  }

  private coerceNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }

  private mapIngredientForSave(ing: any, index: number): any {
    const normalizedInventoryId = this.normalizeGuidExternalId(ing.inventoryItemExternalId);
    const normalizedComponentId = this.normalizeGuidExternalId(ing.recipeComponentProductExternalId);
    const normalizedSourceId = this.normalizeGuidExternalId(ing.sourceExternalId ?? ing.inventoryItemId);

    const hasInventoryId = !!normalizedInventoryId;
    const hasComponentId = !!normalizedComponentId;
    const hasSourceId = !!normalizedSourceId;

    let resolvedSourceType: 'inventory' | 'recipe_component' =
      ing.sourceType
      ?? (ing.isRecipeComponent === true ? 'recipe_component' : 'inventory');

    if (hasComponentId && !hasInventoryId) {
      resolvedSourceType = 'recipe_component';
    } else if (hasInventoryId && !hasComponentId) {
      resolvedSourceType = 'inventory';
    }

    let resolvedInventoryId: string | undefined;
    let resolvedComponentId: string | undefined;

    if (resolvedSourceType === 'inventory') {
      resolvedInventoryId = hasInventoryId ? normalizedInventoryId : (hasSourceId ? normalizedSourceId : undefined);
      resolvedComponentId = undefined;
    } else {
      resolvedComponentId = hasComponentId ? normalizedComponentId : (hasSourceId ? normalizedSourceId : undefined);
      resolvedInventoryId = undefined;
    }

    if (!resolvedInventoryId && !resolvedComponentId) {
      if (hasComponentId) {
        resolvedComponentId = normalizedComponentId;
      } else if (hasInventoryId) {
        resolvedInventoryId = normalizedInventoryId;
      }
    }

    return {
      inventoryItemExternalId: resolvedInventoryId,
      recipeComponentProductExternalId: resolvedComponentId,
      quantityRequired: ing.quantityRequired,
      unit: ing.unit,
      costPerUnit: ing.costPerUnit ?? 0,
      purposeTxt: ing.purpose ?? undefined,
      sectionName: ing.section ?? undefined,
      sequenceNumber: index
    };
  }

  private buildIngredientInputsForSave(): any[] | null {
    const ingredientInputs = this.ingredients.map((ing: any, index: number) => this.mapIngredientForSave(ing, index));
    const invalidIndex = ingredientInputs.findIndex((input: any) =>
      !input.inventoryItemExternalId && !input.recipeComponentProductExternalId
    );

    if (invalidIndex >= 0) {
      const oneBasedIndex = invalidIndex + 1;
      const msg = `Ingredient ${oneBasedIndex} is missing source ID. Please reselect that ingredient and try Save again.`;
      this.error = msg;
      this.snackBar.open(msg, 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
      return null;
    }

    return ingredientInputs;
  }

  private buildUpdateRequest(): UpdateRecipeWithDetailsRequest | null {
    if (!this.recipeId) return null;
    const formValue = this.form.value;
    const ingredientInputs = this.buildIngredientInputsForSave();
    if (!ingredientInputs) return null;

    const compositions: any[] = [];
    this.sections.forEach((section: any) => {
      section.items.forEach((item: any) => {
        if (item.type === 'step') {
          compositions.push({
            compositionType: 'STEP',
            stepText: item.stepText,
            sectionName: section.title,
            sequenceNumber: item.sequenceNumber
          });
        } else if (item.type === 'recipe') {
          compositions.push({
            compositionType: 'RECIPE',
            subRecipeExternalId: item.externalId,
            quantity: this.parseRecipeAmountToQuantity(item.recipeAmount) ?? item.quantity,
            unit: item.unit,
            sectionName: section.title,
            sequenceNumber: item.sequenceNumber
          });
        }
      });
    });

    const req: any = {
      externalId: this.recipeId,
      recipeName: formValue.name,
      description: formValue.description,
      productExternalId: this.normalizeProductExternalIdForPayload(formValue.productExternalId),
      yieldServingCnt: this.parseYieldToNumber(String(formValue.yieldServingCnt)) ?? formValue.yieldServingCnt,
      yieldUnit: formValue.yieldUnit,
      unitsPerServing: formValue.unitsPerServing,
      shelfLifeDayCnt: formValue.shelfLifeDayCnt,
      // Include costPerUnit in payload when user explicitly enabled override or when they edited the stored value
      costPerUnit: (this.costOverride || this.costEdited) ? this.coerceNumber(this.form.get('costPerUnit')?.value) : undefined,
      recipeStatusCd: formValue.recipeStatusCd,
      prepTimeMin: formValue.prepTimeMin,
      activeTimeMin: formValue.activeTimeMin,
      cookTimeMin: formValue.cookTimeMin,
      restTimeMin: formValue.restTimeMin,
      inactiveTimeMin: formValue.inactiveTimeMin,
      totalTimeMin: formValue.totalTimeMin,
      ingredients: ingredientInputs,
      compositions
    };

    (req as any).costPerUnitIsOverride = this.costOverride || this.costEdited;
    // If the user neither enabled override nor edited the stored value, remove costPerUnit so backend preserves DB null/computed semantics
    if (!(this.costOverride || this.costEdited)) {
      delete req.costPerUnit;
    }
    return req as UpdateRecipeWithDetailsRequest;
  }

  private performSave({ navigateAfter }: { navigateAfter: boolean }): void {
    if (this.form.invalid) return;

    this.saving = true;
    this.error = '';

    const formValue = this.form.value;
    const ingredientInputs = this.buildIngredientInputsForSave();
    if (!ingredientInputs) {
      this.saving = false;
      return;
    }

    if (this.isEditing && this.recipeId) {
      const request = this.buildUpdateRequest();
      if (!request) {
        this.saving = false;
        return;
      }
      this.recipeService.updateRecipeWithDetails(request).subscribe({
        next: () => {
          this.saving = false;
          if (navigateAfter) {
            this.router.navigate(['/recipes']);
          } else {
            this.snackBar.open('Record Saved', undefined, { duration: 2500 });
            this.loadRecipe(this.recipeId!);
          }
        },
        error: (err) => {
          console.error('Error updating recipe:', err);
          this.error = err.error?.message || 'Failed to update recipe';
          this.saving = false;
        }
      });
    } else {
      const compositions: any[] = [];
      this.sections.forEach((section: any) => {
        section.items.forEach((item: any) => {
          if (item.type === 'step') {
            compositions.push({
              compositionType: 'STEP',
              stepText: item.stepText,
              sectionName: section.title,
              sequenceNumber: item.sequenceNumber
            });
          } else if (item.type === 'recipe') {
            compositions.push({
              compositionType: 'RECIPE',
              subRecipeExternalId: item.externalId,
              quantity: this.parseRecipeAmountToQuantity(item.recipeAmount) ?? item.quantity,
              unit: item.unit,
              sectionName: section.title,
              sequenceNumber: item.sequenceNumber
            });
          }
        });
      });

      const request: any = {
        recipeName: formValue.name,
        description: formValue.description,
        productExternalId: this.normalizeProductExternalIdForPayload(formValue.productExternalId),
        yieldServingCnt: this.parseYieldToNumber(String(formValue.yieldServingCnt)) ?? formValue.yieldServingCnt,
        yieldUnit: formValue.yieldUnit,
        unitsPerServing: formValue.unitsPerServing,
        shelfLifeDayCnt: formValue.shelfLifeDayCnt,
        // Only include costPerUnit when override enabled; otherwise omit to preserve computed/null
        costPerUnit: this.costOverride ? this.coerceNumber(this.form.get('costPerUnit')?.value) : undefined,
        prepTimeMin: formValue.prepTimeMin,
        activeTimeMin: formValue.activeTimeMin,
        bakeTimeMin: formValue.cookTimeMin,
        restTimeMin: formValue.restTimeMin,
        inactiveTimeMin: formValue.inactiveTimeMin,
        totalTimeMin: formValue.totalTimeMin,
        ingredients: ingredientInputs,
        compositions
      };

      (request as any).costPerUnitIsOverride = this.costOverride;
      if (!this.costOverride) {
        delete request.costPerUnit;
      }

      this.recipeService.createRecipeWithDetails(request).subscribe({
        next: (result) => {
          this.saving = false;
          if (navigateAfter) {
            this.router.navigate(['/recipes']);
          } else {
            // Stay on edit page for the newly created recipe
            this.router.navigate(['/recipes/edit', result.externalId]);
          }
        },
        error: (err) => {
          console.error('Error creating recipe:', err);
          this.error = err.error?.message || 'Failed to create recipe';
          this.saving = false;
        }
      });
    }
  }

  revertToComputedConfirm(): void {
    if (!this.recipeId) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '560px',
      data: {
        title: 'Revert stored cost?',
        message: 'Revert stored Cost Per Unit to computed value? This will clear the stored value in the database.',
        confirmText: 'Revert',
        cancelText: 'Cancel'
      }
    });
    ref.afterClosed().subscribe(ok => { if (ok) this.revertToComputed(); });
  }

  private revertToComputed(): void {
    if (!this.recipeId) return;
    const payload: any = { costPerUnit: null, costPerUnitIsOverride: false };
    this.saving = true;
    this.recipeService.updateRecipeCost(this.recipeId, payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.snackBar.open('Stored cost cleared; fetching computed value...', undefined, { duration: 2500 });
        this.originalCostPerUnit = null;
        this.costEdited = false;
        this.costOverride = false;
        const ctrl = this.form.get('costPerUnit');
        ctrl?.setValue(0, { emitEvent: false });
        ctrl?.disable();
        this.refreshComputedCost();
      },
      error: (err) => {
        console.error('Error reverting cost to computed:', err);
        this.saving = false;
        this.snackBar.open('Failed to revert stored cost. See console for details.', 'Close', { duration: 4000 });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/recipes']);
  }

  openCookMode(): void {
    if (!this.recipeId) return;
    this.router.navigate(['/recipes/cook', this.recipeId]);
  }

  exitCookMode(): void {
    if (!this.recipeId) {
      this.router.navigate(['/recipes']);
      this.toggleKeepAwake();
      return;
    }

    this.router.navigate(['/recipes/view', this.recipeId]);
  }

  toggleCookTheme(): void {
    this.cookTheme = this.cookTheme === 'light' ? 'dark' : 'light';
  }

  toggleKeepAwake(): void {
    // In cook mode, keepAwakeEnabled is always true and cannot be toggled
    if (this.isCookMode) {
      this.keepAwakeEnabled = true;
      this.startIdlePulse();
      void this.requestWakeLock();
      return;
    }
    // In non-cook mode, allow toggling
    this.keepAwakeEnabled = !this.keepAwakeEnabled;
    if (this.keepAwakeEnabled) {
      this.startIdlePulse();
      void this.requestWakeLock();
    } else {
      this.stopIdlePulse();
      void this.releaseWakeLock();
    }
  }

  get wakeLockSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  get keepAwakeActive(): boolean {
    return Boolean(this.wakeLockSentinel);
  }

  get cookIngredientsBySection(): Array<{ title: string; items: any[] }> {
    const groups = new Map<string, any[]>();

    this.ingredients.forEach((ingredient: any) => {
      const title = (ingredient.section || 'Preparation').trim() || 'Preparation';
      if (!groups.has(title)) {
        groups.set(title, []);
      }
      groups.get(title)!.push(ingredient);
    });

    const orderedTitles = Array.from(groups.keys()).sort((left, right) => {
      const leftPrep = left.toLowerCase() === 'preparation';
      const rightPrep = right.toLowerCase() === 'preparation';
      if (leftPrep && !rightPrep) return -1;
      if (!leftPrep && rightPrep) return 1;
      return left.localeCompare(right);
    });

    const topLevelGroups = orderedTitles.map((title) => ({ title, items: groups.get(title) ?? [] }));

    const subRecipeGroups = this.getCookSubRecipeSequence()
      .map((subRecipe) => {
        const data = this.subRecipeCookData[subRecipe.externalId];
        if (!data) return null;
        return {
          title: data.name,
          items: data.ingredients
        };
      })
      .filter((group): group is { title: string; items: any[] } => !!group);

    return [...topLevelGroups, ...subRecipeGroups];
  }

  get cookInstructionSections(): any[] {
    return this.sections;
  }

  get subRecipeSequence(): Array<{ externalId: string; name: string }> {
    const seen = new Set<string>();
    const sequence: Array<{ externalId: string; name: string }> = [];

    this.sections.forEach((section: any) => {
      section.items?.forEach((item: any) => {
        if (item?.type !== 'recipe' || !item.externalId || seen.has(item.externalId)) return;
        seen.add(item.externalId);
        sequence.push({
          externalId: item.externalId,
          name: item.recipeName || 'Sub-Recipe'
        });
      });
    });

    return sequence;
  }

  private getCookSubRecipeSequence(): Array<{ externalId: string; name: string }> {
    const seen = new Set<string>();
    const sequence: Array<{ externalId: string; name: string }> = [];

    const addUnique = (entry: { externalId: string; name: string }) => {
      if (!entry.externalId || seen.has(entry.externalId)) return;
      seen.add(entry.externalId);
      sequence.push(entry);
    };

    this.subRecipeSequence.forEach(addUnique);

    this.subRecipeSequence.forEach((topLevelSubRecipe) => {
      const data = this.subRecipeCookData[topLevelSubRecipe.externalId];
      if (!data?.sections?.length) return;
      this.extractSubRecipeRefsFromSections(data.sections).forEach(addUnique);
    });

    return sequence;
  }

  getSubRecipeCookData(externalId: string | undefined): { externalId: string; name: string; ingredients: any[]; sections: any[] } | null {
    if (!externalId) return null;
    return this.subRecipeCookData[externalId] ?? null;
  }

  getSubRecipeInstructionSections(externalId: string | undefined): any[] {
    return this.getSubRecipeCookData(externalId)?.sections ?? [];
  }

  getSubRecipeIngredients(externalId: string | undefined): any[] {
    return this.getSubRecipeCookData(externalId)?.ingredients ?? [];
  }

  get cookSummaryName(): string {
    return this.form.get('name')?.value || 'Recipe';
  }

  get cookSummaryDescription(): string {
    return this.form.get('description')?.value || '';
  }

  get prepTimeLabel(): string {
    return this.formatMinutes(this.form.get('prepTimeMin')?.value);
  }

  get cookTimeLabel(): string {
    return this.formatMinutes(this.form.get('cookTimeMin')?.value);
  }

  get totalTimeLabel(): string {
    return this.formatMinutes(this.form.get('totalTimeMin')?.value);
  }

  get yieldLabel(): string {
    const quantity = this.form.get('yieldServingCnt')?.value;
    const unit = this.form.get('yieldUnit')?.value;
    if (!quantity && !unit) return '—';
    return `${quantity ?? '—'} ${unit ?? ''}`.trim();
  }

  getCookIngredientDisplayName(ingredient: any): string {
    const baseName = String(
      ingredient?.displayName
      ?? ingredient?.name
      ?? ingredient?.inventoryItemName
      ?? ingredient?.recipeComponentProductName
      ?? '[Unknown ingredient]'
    ).trim();

    const isRecipeComponent = ingredient?.sourceType === 'recipe_component'
      || ingredient?.isRecipeComponent === true
      || !!ingredient?.recipeComponentProductExternalId;

    if (!isRecipeComponent) return baseName;
    if (/\[component\]\s*$/i.test(baseName) || /\(comp\)\s*$/i.test(baseName)) {
      return baseName;
    }

    return `${baseName} [Component]`;
  }

  private formatMinutes(value: unknown): string {
    const minutes = this.coerceNumber(value);
    return minutes > 0 ? `${minutes} min` : '—';
  }

  private resolveInitialCookTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private setupWakeLockLifecycle(): void {
    console.debug('[RecipeEditor/CookMode] setupWakeLockLifecycle() called', {
      isCookMode: this.isCookMode,
      keepAwakeEnabled: this.keepAwakeEnabled
    });
    if (!this.isCookMode) return;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    this.startIdlePulse();
    void this.requestWakeLock();
  }

  private teardownWakeLockLifecycle(): void {
    console.debug('[RecipeEditor/CookMode] teardownWakeLockLifecycle() called', {
      keepAwakeEnabled: this.keepAwakeEnabled,
      hasIdlePulseInterval: !!this.idlePulseInterval
    });
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.stopIdlePulse();
    void this.releaseWakeLock();
  }

  private startIdlePulse(): void {
    console.debug('[RecipeEditor/CookMode] startIdlePulse() called', {
      keepAwakeEnabled: this.keepAwakeEnabled,
      hasIdlePulseInterval: !!this.idlePulseInterval
    });
    if (!this.keepAwakeEnabled) return;
    if (this.idlePulseInterval) return;

    this.idleDetection.resetActivity();
    this.idlePulseInterval = setInterval(() => {
      this.idleDetection.resetActivity();
    }, 15000);
  }

  private stopIdlePulse(): void {
    console.debug('[RecipeEditor/CookMode] stopIdlePulse() called', {
      hasIdlePulseInterval: !!this.idlePulseInterval
    });
    if (!this.idlePulseInterval) return;
    clearInterval(this.idlePulseInterval);
    this.idlePulseInterval = null;
  }

  private async requestWakeLock(): Promise<void> {
    if (!this.keepAwakeEnabled || !this.wakeLockSupported) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (this.wakeLockSentinel) return;

    try {
      const wakeLock = (navigator as any).wakeLock;
      this.wakeLockSentinel = await wakeLock.request('screen');
      this.wakeLockSentinel?.addEventListener?.('release', () => {
        this.wakeLockSentinel = null;
      });
    } catch {
      this.wakeLockSentinel = null;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    if (!this.wakeLockSentinel) return;
    try {
      await this.wakeLockSentinel.release();
    } finally {
      this.wakeLockSentinel = null;
    }
  }

  deleteRecipe(): void {
    if (!this.recipeId || this.deleting) return;
    const recipeId = this.recipeId;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '560px',
      data: {
        title: 'Delete recipe',
        message: 'Are you sure you want to delete this recipe? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.deleting = true;
      this.deleteError = '';
      this.recipeService.deleteRecipe(recipeId).subscribe({
        next: () => {
          this.deleting = false;
          this.router.navigate(['/recipes']);
        },
        error: (err) => {
          console.error('Error deleting recipe:', err);
          this.deleteError = err.error?.message || err.error?.error || 'Failed to delete recipe';
          this.deleting = false;
        }
      });
    });
  }

  duplicateRecipe(): void {
    if (!this.recipeId || this.duplicating) return;
    this.duplicating = true;
    this.duplicateError = '';
    this.recipeService.forkRecipe(this.recipeId).subscribe({
      next: (result) => {
        this.duplicating = false;
        this.router.navigate(['/recipes/edit', result.externalId]);
        this.snackBar.open('Recipe Duplicated', undefined, { duration: 2500 });

      },
      error: (err) => {
        console.error('Error copy recipe:', err);
        this.duplicateError = err.error?.error || err.error?.message || 'Failed to copy recipe';
        this.duplicating = false;
      }
    });
  }

  get nameError(): string {
    const control = this.form.get('name');
    if (control?.hasError('required')) return 'Recipe name is required';
    if (control?.hasError('minlength')) return 'Recipe name must be at least 3 characters';
    return '';
  }

  get yieldServingCntError(): string {
    const control = this.form.get('yieldServingCnt');
    if (control?.hasError('required')) return 'Yield quantity is required';
    if (control?.hasError('invalidYield')) return 'Yield quantity must be a positive number or fraction (e.g. 1.5 or 1/2)';
    return '';
  }

  get unitsPerServingError(): string {
    const control = this.form.get('unitsPerServing');
    if (control?.hasError('required')) return 'Units per serving is required';
    if (control?.hasError('invalidUnits')) return 'Units per serving must be a positive number';
    return '';
  }

  get costPerUnitError(): string {
    const control = this.form.get('costPerUnit');
    if (control?.hasError('required')) return 'Cost per unit is required';
    if (control?.hasError('min')) return 'Cost per unit cannot be negative';
    return '';
  }

  toggleRecipeDetailsCollapsed(): void {
    this.recipeDetailsCollapsed = !this.recipeDetailsCollapsed;
  }

  toggleIngredientsCollapsed(): void {
    this.ingredientsCollapsed = !this.ingredientsCollapsed;
  }

  togglecompositionsCollapsed(): void {
    this.compositionsCollapsed = !this.compositionsCollapsed;
  }

  loadVersions(recipeExternalId: string): void {
    this.recipeService.getRecipeVersions(recipeExternalId).subscribe({
      next: (versions) => {
        this.versions = versions;
        this.currentVersion = versions.find(v => v.externalId === recipeExternalId) ?? null;
      },
      error: (err) => console.error('Error loading versions:', err)
    });
  }

  get isDraft(): boolean {
    return this.currentVersion?.status === 'D';
  }

  get hasDraftVersion(): boolean {
    return this.versions.some(v => v.status === 'D');
  }

  get statusLabel(): string {
    const map: Record<string, string> = { D: 'Draft', A: 'Active', X: 'Archived', B: 'Abandoned' };
    return map[this.currentVersion?.status ?? ''] ?? 'Unknown';
  }

  versionLabel(v: RecipeVersionSummaryDto): string {
    const statusMap: Record<string, string> = { D: 'Draft', A: 'Active', X: 'Archived', B: 'Abandoned' };
    return `${statusMap[v.status] ?? v.status} (${v.versionNumber})`;
  }

  // ── Product picker ──────────────────────────────────────────
  openProductPicker(): void {
    // Snapshot current linked product so we can restore if the user cancels
    this.snapshotProductExternalId = this.normalizeProductExternalId(this.form.get('productExternalId')?.value) || null;
    this.snapshotProductName = this.productName || null;

    this.changingProduct = true;
    this.productSearchCtrl.setValue('');
    this.cdr.detectChanges(); // stamp the *ngIf DOM before we try to open the panel

    // Subscribe valueChanges so filtering stays live (unsubscribe on close)
    this.productSearchSub?.unsubscribe();
    this.productSearchSub = this.productSearchCtrl.valueChanges.subscribe(val => {
      this.onProductSearch(val ?? '');
    });

    if (this.allProducts.length === 0) {
      this.productsLoading = true;
      this.productService.getProducts().subscribe({
        next: (products) => {
          this.allProducts = products;
          this.filteredProducts = products;
          this.productsLoading = false;
          // Re-apply any search the user typed while products were loading
          this.onProductSearch(this.productSearchCtrl.value ?? '');
          // Open panel now that options exist (DOM already present)
          setTimeout(() => this.autoTrigger?.openPanel());
        },
        error: () => { this.productsLoading = false; }
      });
    } else {
      // Ensure the virtual "<New>" option is always present by delegating
      // to the search handler rather than copying `allProducts` directly.
      this.onProductSearch(this.productSearchCtrl.value ?? '');
      // DOM is stamped, open immediately
      setTimeout(() => this.autoTrigger?.openPanel());
    }
  }

  onProductSearch(value: string): void {
    const q = String(value ?? '').toLowerCase();
    const matches = this.allProducts.filter(p =>
      p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
    );
    // Prepend a virtual "New" option to streamline creating a linked product
    const newOption = ({ externalId: '__new', name: '<Create Product>' } as unknown) as SellableProductDto;
    this.filteredProducts = [newOption, ...matches];
  }

  onProductSelected(product: SellableProductDto): void {
    // If user chose the special <New> option, open the create modal instead
    if (product && product.externalId === '__new') {
      // keep the search panel closed and open create modal
      this.productSearchSub?.unsubscribe();
      this.changingProduct = false;
      // open modal (which will create and link the product on success)
      this.openCreateComponentModal();
      return;
    }

    const currentProductId = this.normalizeProductExternalId(this.form.get('productExternalId')?.value);
    const newProductId = product.externalId;

    // If we're changing from one linked product to another, check whether the
    // previous product would become unproduced (RECIPE(7)) and warn the user.
    if (currentProductId && currentProductId !== newProductId) {
      this.recipeService.checkProductUsageByRecipes(currentProductId).subscribe({
        next: (usage) => {
          if (usage?.isLastRecipeForProduct) {
            const otherNames = (usage.recipes || []).map(r => r.recipeName).filter(n => !!n);
            const nameList = otherNames.length ? `\n\nRecipes: ${otherNames.join(', ')}` : '';
            const msg = `Changing the linked product will unlink the previous product as the finished good. The previous product is produced by only this recipe. ${nameList} Continue?`;
            const dlgRef = this.dialog.open(ConfirmDialogComponent, {
              width: '560px',
              data: {
                title: 'Confirm Change',
                message: msg,
                confirmText: 'Change',
                cancelText: 'Cancel'
              }
            });
            dlgRef.afterClosed().subscribe(confirmed => {
              if (!confirmed) {
                // user declined: restore snapshot and close picker
                if (this.snapshotProductExternalId) {
                  this.form.patchValue({ productExternalId: this.snapshotProductExternalId });
                  this.productName = this.snapshotProductName || '';
                }
                this.productSearchSub?.unsubscribe();
                this.changingProduct = false;
                // clear snapshot
                this.snapshotProductExternalId = null;
                this.snapshotProductName = null;
                return;
              }

              // user confirmed — proceed with assignment and clear snapshot
              this.form.patchValue({ productExternalId: newProductId });
              this.productName = product.name;
              this.productSearchSub?.unsubscribe();
              this.changingProduct = false;
              this.snapshotProductExternalId = null;
              this.snapshotProductName = null;
            });
            return;
          }

          this.form.patchValue({ productExternalId: newProductId });
          this.productName = product.name;
          this.productSearchSub?.unsubscribe();
          this.changingProduct = false;
          // confirmed — clear snapshot
          this.snapshotProductExternalId = null;
          this.snapshotProductName = null;
        },
        error: (err) => {
          console.error('Product usage check failed, proceeding with change', err);
          const dlgRef2 = this.dialog.open(ConfirmDialogComponent, {
            width: '560px',
            data: {
              title: 'Confirm Change',
              message: 'Change linked product? Proceed despite check failure.',
              confirmText: 'Change',
              cancelText: 'Cancel'
            }
          });
          dlgRef2.afterClosed().subscribe(confirmed => {
            if (!confirmed) {
              // restore snapshot and close picker
              if (this.snapshotProductExternalId) {
                this.form.patchValue({ productExternalId: this.snapshotProductExternalId });
                this.productName = this.snapshotProductName || '';
              }
              this.productSearchSub?.unsubscribe();
              this.changingProduct = false;
              this.snapshotProductExternalId = null;
              this.snapshotProductName = null;
              return;
            }

            this.form.patchValue({ productExternalId: newProductId });
            this.productName = product.name;
            this.productSearchSub?.unsubscribe();
            this.changingProduct = false;
            // confirmed — clear snapshot
            this.snapshotProductExternalId = null;
            this.snapshotProductName = null;
          });
          return;
        }
      });
      return;
    }

    // No existing linked product or it's the same selection — just assign
    this.form.patchValue({ productExternalId: product.externalId });
    this.productName = product.name;
    this.productSearchSub?.unsubscribe();
    this.changingProduct = false;
    // confirmed — clear snapshot
    this.snapshotProductExternalId = null;
    this.snapshotProductName = null;
  }

  clearProduct(): void {
    const currentProductId = this.normalizeProductExternalId(this.form.get('productExternalId')?.value);
    if (!currentProductId) {
      // nothing linked
      this.form.patchValue({ productExternalId: null });
      this.productName = '';
      this.productSearchSub?.unsubscribe();
      this.changingProduct = false;
      return;
    }

    // Check with backend whether this product is produced by other recipes
    this.recipeService.checkProductUsageByRecipes(currentProductId).subscribe({
      next: (usage) => {
        if (usage?.isLastRecipeForProduct) {
          const otherNames = (usage.recipes || []).map(r => r.recipeName).filter(n => !!n);
          const nameList = otherNames.length
            ? `<br><br>Recipe: ${otherNames.join(', ')}`
            : '';
          const msg = `This product is produced by this recipe only. Removing it will leave the product with no producing recipes.${nameList}<br><br>Are you sure you want to unlink it?`;          const dlg = this.dialog.open(ConfirmDialogComponent, { width: '560px', data: { title: 'Confirm Removal', message: msg, confirmText: 'Remove', cancelText: 'Cancel' } });
          dlg.afterClosed().subscribe(ok => {
            if (!ok) return;
            this.form.patchValue({ productExternalId: null });
            this.productName = '';
            this.productSearchSub?.unsubscribe();
            this.changingProduct = false;
          });
        } else {
          const dlg = this.dialog.open(ConfirmDialogComponent, { width: '560px', data: { title: 'Confirm Removal', message: 'Remove linked product? This will unlink the recipe from the finished good. Continue?', confirmText: 'Remove', cancelText: 'Cancel' } });
          dlg.afterClosed().subscribe(ok => {
            if (!ok) return;
            this.form.patchValue({ productExternalId: null });
            this.productName = '';
            this.productSearchSub?.unsubscribe();
            this.changingProduct = false;
          });
        }
      },
      error: (err) => {
        console.error('Product usage check failed, proceeding with removal prompt', err);
        const dlg = this.dialog.open(ConfirmDialogComponent, { width: '560px', data: { title: 'Confirm Removal', message: 'Remove linked product? This will unlink the recipe from the finished good. Continue?', confirmText: 'Remove', cancelText: 'Cancel' } });
        dlg.afterClosed().subscribe(ok => {
          if (!ok) return;
          this.form.patchValue({ productExternalId: null });
          this.productName = '';
          this.productSearchSub?.unsubscribe();
          this.changingProduct = false;
        });
      }
    });
  }

  cancelProductChange(): void {
    // Cancel the product picker and restore the previously linked product (if any)
    this.changingProduct = false;
    if (this.snapshotProductExternalId) {
      this.form.patchValue({ productExternalId: this.snapshotProductExternalId });
      this.productName = this.snapshotProductName || '';
    }
    this.productSearchCtrl.setValue('');
    this.autoTrigger?.closePanel();
    this.productSearchSub?.unsubscribe();
    // clear snapshot
    this.snapshotProductExternalId = null;
    this.snapshotProductName = null;
  }

  private normalizeProductExternalId(productExternalId: unknown): string {
    const value = String(productExternalId ?? '').trim();
    if (!value) return '';
    if (value === RecipeEditorComponent.EMPTY_GUID) return '';
    return value;
  }

  private normalizeProductExternalIdForPayload(productExternalId: unknown): string | null {
    const normalized = this.normalizeProductExternalId(productExternalId);
    return normalized || null;
  }


  // ── Version management ──
  onVersionChange(externalId: string): void {
    if (!externalId || externalId === this.recipeId) return;
    // Route to edit for drafts, view for everything else — regardless of current mode
    const targetVersion = this.versions.find(v => v.externalId === externalId);
    const route = targetVersion?.status === 'D'
      ? '/recipes/edit'
      : (this.isCookMode ? '/recipes/cook' : '/recipes/view');
    this.router.navigate([route, externalId]);
  }

  createOrNavigateToDraft(): void {
    if (!this.recipeId) return;
    this.draftError = '';

    // If a draft already exists in the loaded versions, navigate straight to it
    const existingDraft = this.versions.find(v => v.status === 'D');
    if (existingDraft) {
      this.router.navigate(['/recipes/edit', existingDraft.externalId]);
      return;
    }

    // No draft found locally — call the API to create one
    this.creatingDraft = true;
    this.recipeService.createDraftFromRecipe(this.recipeId).subscribe({
      next: (draft) => {
        this.creatingDraft = false;
        this.router.navigate(['/recipes/edit', draft.externalId]);
      },
      error: (err) => {
        this.creatingDraft = false;
        if (err.status === 409) {
          // Race condition: draft was created between our check and the API call
          // Re-fetch versions and navigate to it
          this.recipeService.getRecipeVersions(this.recipeId!).subscribe(vs => {
            const draft = vs.find(v => v.status === 'D');
            if (draft) this.router.navigate(['/recipes/edit', draft.externalId]);
          });
        } else {
          this.draftError = err.error?.error || 'Failed to create draft.';
        }
      }
    });
  }

  onAddIngredient(event: any): void {
    console.log('Adding ingredient:', event);
    const normalized = this.normalizeIngredientForUi({
      sourceType: event.sourceType
        ?? event.sourceItem?.sourceType
        ?? ((event.isRecipeComponent || event.sourceItem?.isRecipeComponent) ? 'recipe_component' : 'inventory'),
      isRecipeComponent: event.isRecipeComponent,
      sourceItem: event.sourceItem,
      sourceExternalId: event.sourceExternalId,
      displayName: event.displayName,
      name: event.name,
      inventoryItemExternalId: event.inventoryItemExternalId,
      recipeComponentProductExternalId: event.recipeComponentProductExternalId,
      inventoryItemName: event.inventoryItemName,
      recipeComponentProductName: event.recipeComponentProductName,
      quantityRequired: event.quantityRequired,
      unit: event.unit,
      costPerUnit: event.costPerUnit ?? 0,
      purpose: event.purposeTxt ?? event.purpose ?? null,
      section: event.sectionName ?? event.section ?? null,
      externalId: event.externalId ?? `tmp-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    });

    if (!normalized.sourceExternalId) {
      this.snackBar.open('Ingredient add failed: missing source identifier. Please reselect ingredient and try again.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (!normalized.inventoryItemExternalId && !normalized.recipeComponentProductExternalId && !normalized.sourceExternalId) {
      console.error('Ingredient normalization failed: no source IDs available after add mapping', {
        event,
        normalized
      });
      this.snackBar.open('Ingredient add failed: source ID missing after mapping. Please reselect ingredient.', 'Close', {
        duration: 6000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.ingredients.push(normalized);
    this.ingredients = [...this.ingredients]; // Trigger change detection
    // Recompute cost when ingredients change
    this.refreshComputedCost();
  }

  private normalizeExternalId(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return undefined;
    if (normalized === RecipeEditorComponent.EMPTY_GUID) return undefined;
    return normalized;
  }

  private normalizeGuidExternalId(value: unknown): string | undefined {
    const normalized = this.normalizeExternalId(value);
    if (!normalized) return undefined;
    return this.isGuid(normalized) ? normalized : undefined;
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  onRemoveIngredient(ingredientExternalId: string): void {
    const dlg = this.dialog.open(ConfirmDialogComponent, { width: '480px', data: { title: 'Remove ingredient', message: 'Remove this ingredient?', confirmText: 'Remove', cancelText: 'Cancel' } });
    dlg.afterClosed().subscribe(ok => {
      if (!ok) return;
      this._removeIngredientConfirmed(ingredientExternalId);
    });
  }

  private _removeIngredientConfirmed(ingredientExternalId: string): void {
    console.log('Removing ingredient:', ingredientExternalId);
    // Match on ingredient record externalId (loaded) or inventoryItemExternalId (pending adds)
    const index = this.ingredients.findIndex((ing: any) =>
      ing.externalId === ingredientExternalId ||
      ing.inventoryItemExternalId === ingredientExternalId ||
      ing.recipeComponentProductExternalId === ingredientExternalId ||
      ing.sourceExternalId === ingredientExternalId
    );
    if (index >= 0) {
      this.ingredients.splice(index, 1);
      this.ingredients = [...this.ingredients];
      this.refreshComputedCost();
    }
  }

  private normalizeIngredientForUi(ing: any): any {
    let resolvedSourceType: 'inventory' | 'recipe_component' =
      ing.sourceType === 'recipe_component' || ing.sourceType === 'inventory'
        ? ing.sourceType
        : (ing.isRecipeComponent ? 'recipe_component' : 'inventory');

    const sourceExternalId = this.normalizeGuidExternalId(
      ing.sourceExternalId
      ?? ing.recipeComponentProductExternalId
      ?? ing.inventoryItemExternalId
      ?? ing.inventoryItemId
      ?? ing.sourceItem?.externalId
    );

    let inventoryCandidate = this.normalizeGuidExternalId(
      ing.inventoryItemExternalId
      ?? (resolvedSourceType === 'inventory' ? sourceExternalId : undefined)
    );

    let componentCandidate = this.normalizeGuidExternalId(
      ing.recipeComponentProductExternalId
      ?? (resolvedSourceType === 'recipe_component' ? sourceExternalId : undefined)
    );

    if (componentCandidate && !inventoryCandidate) {
      resolvedSourceType = 'recipe_component';
    } else if (inventoryCandidate && !componentCandidate) {
      resolvedSourceType = 'inventory';
    }

    if (this.debugTreatRecipeComponentsAsInventory) {
      const forcedInventoryId = sourceExternalId ?? componentCandidate ?? inventoryCandidate;
      if (forcedInventoryId) {
        resolvedSourceType = 'inventory';
        inventoryCandidate = forcedInventoryId;
        componentCandidate = undefined;
      }
    }

    
    const resolvedDisplayName =
      ing.displayName
      ?? ing.name
      ?? ing.inventoryItemName
      ?? ing.recipeComponentProductName
      ?? ing.sourceItem?.displayName
      ?? ing.sourceItem?.name
      ?? '';

    const resolvedInventoryId = resolvedSourceType === 'inventory'
      ? (inventoryCandidate ?? sourceExternalId)
      : undefined;

    const resolvedComponentId = resolvedSourceType === 'recipe_component'
      ? (componentCandidate ?? sourceExternalId)
      : undefined;

    return {
      ...ing,
      sourceType: resolvedSourceType,
      isRecipeComponent: resolvedSourceType === 'recipe_component',
      sourceExternalId,
      displayName: resolvedDisplayName,
      name: ing.name ?? resolvedDisplayName,
      inventoryItemExternalId: resolvedInventoryId,
      recipeComponentProductExternalId: resolvedComponentId,
      inventoryItemName: ing.inventoryItemName ?? (resolvedSourceType === 'inventory' ? (ing.sourceItem?.name ?? resolvedDisplayName) : undefined),
      recipeComponentProductName: ing.recipeComponentProductName ?? (resolvedSourceType === 'recipe_component' ? (ing.sourceItem?.name ?? resolvedDisplayName) : undefined),
      sourceMissing: !resolvedInventoryId && !resolvedComponentId
    };
  }

  onUpdateIngredient(event: any): void {
    console.log('Updating ingredient:', event);
    const index = this.ingredients.findIndex((ing: any) =>
      ing.externalId === event.externalId ||
      ing.inventoryItemExternalId === event.externalId ||
      ing.recipeComponentProductExternalId === event.externalId ||
      ing.sourceExternalId === event.externalId
    );
    if (index >= 0) {
      this.ingredients[index] = this.normalizeIngredientForUi({
        ...this.ingredients[index],
        ...event,
        sourceType: event.sourceType
          ?? (event.isRecipeComponent ? 'recipe_component' : this.ingredients[index].sourceType ?? 'inventory'),
        sourceExternalId: event.sourceExternalId
          ?? event.recipeComponentProductExternalId
          ?? event.inventoryItemExternalId
          ?? event.inventoryItemId
          ?? event.sourceItem?.externalId
          ?? this.ingredients[index].sourceExternalId
          ?? this.ingredients[index].recipeComponentProductExternalId
          ?? this.ingredients[index].inventoryItemExternalId,
        displayName: event.displayName
          ?? event.inventoryItemName
          ?? event.recipeComponentProductName
          ?? this.ingredients[index].displayName,
        quantityRequired: event.quantityRequired,
        unit: event.unit,
        costPerUnit: event.costPerUnit ?? 0
      });
      this.ingredients = [...this.ingredients];
      this.refreshComputedCost();
    }
  }

  onCompositionChanged(sections: any[]): void {
    console.log('Composition changed:', sections);
    this.sections = sections;
    this.refreshCookSubRecipeData();
  }

  onIngredientsReordered(ingredients: any[]): void {
    this.ingredients = (ingredients || []).map((ingredient: any) => this.normalizeIngredientForUi(ingredient));
  }

  onItemAdded(event: any): void {
    console.log('Item added:', event);
  }

  onItemRemoved(event: any): void {
    console.log('Item removed:', event);
  }

  onItemSelected(item: any): void {
    this.selectedItem = item;
    console.log('Item selected for editing:', item);
  }

  loadIngredients(recipeExternalId: string): void {
    this.ingredientService.getIngredients(recipeExternalId).subscribe({
      next: (ingredients) => {
        console.log('Loaded ingredients:', ingredients);
        this.ingredients = ingredients.map((ing: any) => this.normalizeIngredientForUi({
          externalId: ing.externalId,              // ingredient record ExternalId (for remove)
          sourceType: ing.sourceType ?? (ing.recipeComponentProductExternalId ? 'recipe_component' : 'inventory'),
          isRecipeComponent: ing.isRecipeComponent ?? !!ing.recipeComponentProductExternalId,
          sourceExternalId: ing.recipeComponentProductExternalId ?? ing.inventoryItemExternalId,
          displayName: ing.displayName ?? ing.inventoryItemName ?? ing.recipeComponentProductName ?? '',
          inventoryItemExternalId: ing.inventoryItemExternalId,
          recipeComponentProductExternalId: ing.recipeComponentProductExternalId,
          inventoryItemName: ing.inventoryItemName,
          recipeComponentProductName: ing.recipeComponentProductName,
          quantityRequired: ing.quantityRequired,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit,
          totalCost: ing.totalCost,
          purpose: ing.purposeTxt,
          section: ing.sectionName
        }));

        const invalidCount = this.ingredients.filter((ing: any) => ing.sourceMissing).length;
        if (invalidCount > 0) {
          this.snackBar.open(
            `${invalidCount} ingredient row(s) are missing source IDs. Delete and re-add those rows before saving.`,
            'Close',
            { duration: 7000, panelClass: ['error-snackbar'] }
          );
        }
      },
      error: (err) => {
        console.error('Error loading ingredients:', err);
      }
    });
  }

  loadCompositions(recipeExternalId: string): void {
    this.compositionService.getCompositions(recipeExternalId).subscribe({
      next: (compositions) => {
        console.log('Loaded compositions:', compositions);
        // Group compositions by section
        const sectionMap = new Map<string, any[]>();
        
        compositions.forEach((comp: any) => {
          const sectionName = comp.sectionName || 'Default';
          if (!sectionMap.has(sectionName)) {
            sectionMap.set(sectionName, []);
          }
          
          const item = comp.compositionType === 'STEP' 
            ? {
                id: comp.externalId,
                type: 'step',
                stepText: comp.stepText,
                sequenceNumber: comp.sequenceNumber
              }
            : {
                id: comp.externalId,
                type: 'recipe',
                recipeName: comp.subRecipeName,
                externalId: comp.subRecipeExternalId,
                recipeAmount: comp.quantity != null ? String(comp.quantity) : '',
                quantity: comp.quantity,
                unit: comp.unit,
                sequenceNumber: comp.sequenceNumber
              };
          
          sectionMap.get(sectionName)!.push(item);
        });
        
        // Convert to sections array
        this.sections = Array.from(sectionMap.entries()).map(([title, items], index) => ({
          id: `section-${index}`,
          title,
          items: items.sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        }));

        this.refreshCookSubRecipeData();
      },
      error: (err) => {
        console.error('Error loading compositions:', err);
      }
    });
  }

  private refreshCookSubRecipeData(): void {
    const subRecipes = this.subRecipeSequence;
    if (subRecipes.length === 0) {
      this.subRecipeCookData = {};
      return;
    }

    const buildSubRecipeRequest = (subRecipe: { externalId: string; name: string }) =>
      forkJoin({
        ingredients: this.ingredientService.getIngredients(subRecipe.externalId).pipe(catchError(() => of([]))),
        compositions: this.compositionService.getCompositions(subRecipe.externalId).pipe(catchError(() => of([])))
      }).pipe(
        map(({ ingredients, compositions }) => ({
          externalId: subRecipe.externalId,
          name: subRecipe.name,
          ingredients: (ingredients as any[]).map((ingredient: any) => this.mapCookIngredient(ingredient)),
          sections: this.mapCompositionsToSections(compositions as any[])
        }))
      );

    const levelOneRequests = subRecipes.map(buildSubRecipeRequest);

    forkJoin(levelOneRequests).subscribe({
      next: (levelOneResults: any[]) => {
        const baseData = levelOneResults.reduce((acc: Record<string, any>, result: any) => {
          acc[result.externalId] = result;
          return acc;
        }, {} as Record<string, { externalId: string; name: string; ingredients: any[]; sections: any[] }>);

        const secondLevelRefs = levelOneResults.flatMap((result: any) =>
          this.extractSubRecipeRefsFromSections(result.sections)
        );

        const seenSecondLevel = new Set<string>();
        const uniqueSecondLevelRefs = secondLevelRefs.filter((entry: any) => {
          if (!entry.externalId || seenSecondLevel.has(entry.externalId) || baseData[entry.externalId]) return false;
          seenSecondLevel.add(entry.externalId);
          return true;
        });

        if (uniqueSecondLevelRefs.length === 0) {
          this.subRecipeCookData = baseData;
          return;
        }

        const levelTwoRequests = uniqueSecondLevelRefs.map(buildSubRecipeRequest);
        forkJoin(levelTwoRequests).subscribe({
          next: (levelTwoResults: any[]) => {
            const merged = { ...baseData };
            levelTwoResults.forEach((result: any) => {
              merged[result.externalId] = result;
            });
            this.subRecipeCookData = merged;
          },
          error: () => {
            this.subRecipeCookData = baseData;
          }
        });
      },
      error: () => {
        this.subRecipeCookData = {};
      }
    });
  }

  private extractSubRecipeRefsFromSections(sections: any[]): Array<{ externalId: string; name: string }> {
    const refs: Array<{ externalId: string; name: string }> = [];
    sections.forEach((section: any) => {
      section?.items?.forEach((item: any) => {
        if (item?.type !== 'recipe' || !item.externalId) return;
        refs.push({
          externalId: item.externalId,
          name: item.recipeName || 'Sub-Recipe'
        });
      });
    });
    return refs;
  }

  private mapCookIngredient(ingredient: any): any {
    return this.normalizeIngredientForUi({
      externalId: ingredient.externalId,
      sourceType: ingredient.sourceType ?? (ingredient.recipeComponentProductExternalId ? 'recipe_component' : 'inventory'),
      isRecipeComponent: ingredient.isRecipeComponent ?? !!ingredient.recipeComponentProductExternalId,
      sourceExternalId: ingredient.recipeComponentProductExternalId ?? ingredient.inventoryItemExternalId,
      displayName: ingredient.displayName ?? ingredient.inventoryItemName ?? ingredient.recipeComponentProductName ?? '',
      inventoryItemExternalId: ingredient.inventoryItemExternalId,
      recipeComponentProductExternalId: ingredient.recipeComponentProductExternalId,
      inventoryItemName: ingredient.inventoryItemName,
      recipeComponentProductName: ingredient.recipeComponentProductName,
      quantityRequired: ingredient.quantityRequired,
      unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit,
      totalCost: ingredient.totalCost,
      purpose: ingredient.purposeTxt,
      section: ingredient.sectionName
    });
  }

  private mapCompositionsToSections(compositions: any[]): any[] {
    const sectionMap = new Map<string, any[]>();

    compositions.forEach((composition: any) => {
      const sectionName = composition.sectionName || 'Default';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }

      const item = composition.compositionType === 'STEP'
        ? {
            id: composition.externalId,
            type: 'step',
            stepText: composition.stepText,
            sequenceNumber: composition.sequenceNumber
          }
        : {
            id: composition.externalId,
            type: 'recipe',
            recipeName: composition.subRecipeName,
            externalId: composition.subRecipeExternalId,
            recipeAmount: composition.quantity != null ? String(composition.quantity) : '',
            quantity: composition.quantity,
            unit: composition.unit,
            sequenceNumber: composition.sequenceNumber
          };

      sectionMap.get(sectionName)!.push(item);
    });

    return Array.from(sectionMap.entries()).map(([title, items], index) => ({
      id: `section-${index}`,
      title,
      items: items.sort((left, right) => left.sequenceNumber - right.sequenceNumber)
    }));
  }

  private parseRecipeAmountToQuantity(amount: string | undefined): number | undefined {
    const value = (amount || '').trim();
    if (!value) return undefined;

    const quantity = Number.parseFloat(value);
    if (Number.isNaN(quantity)) return undefined;

    return quantity;
  }

  // inventoryBaseUom should be set to your system base (e.g., 'g' or 'ml' or 'each')
  get inventoryBaseUom(): string {
    return this.form.get('yieldUnit')?.value || 'g';
  }

  get normalizedBatchYield(): number {
    const qtyRaw = this.form.get('yieldServingCnt')?.value;
    const qty = (this.parseYieldToNumber(String(qtyRaw ?? '')) ?? Number(qtyRaw)) || 0;
    const unitsPerServing = Number(this.form.get('unitsPerServing')?.value) || 0;
    return qty * unitsPerServing;
  }
}

// ── CurrencyInputDirective (ControlValueAccessor for currency inputs) ──
@Directive({
  selector: '[currencyInput]',
  standalone: true
})
export class CurrencyInputDirective implements ControlValueAccessor {
  @Input() currency = 'USD';
  private el: HTMLInputElement;
  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private disabled = false;

  constructor(private elementRef: ElementRef, private currencyPipe: CurrencyPipe) {
    this.el = this.elementRef.nativeElement;
  }

  // ControlValueAccessor API
  writeValue(value: number | null): void {
    if (value === null || value === undefined || isNaN(value as any)) {
      this.el.value = '';
    } else {
      this.el.value = this.currencyPipe.transform(value, this.currency, 'symbol', '1.2-2') || '';
    }
  }

  @HostListener('input')
  onInput(): void {
    // allow digits, dot, minus; remove other chars
    const cleaned = this.el.value.replace(/[^\d\.\-]/g, '');
    if (cleaned !== this.el.value) {
      this.el.value = cleaned;
    }
    const num = this.parseNumber(this.el.value);
    this.onChange(num);
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private parseNumber(value: string): number | null {
    if (!value) return null;
    // normalize whitespace and commas, keep dot as decimal separator
    const normalized = value.replace(/\s/g, '').replace(/,/g, '.');
    const cleaned = normalized.replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Show raw numeric value for editing
  @HostListener('focus')
  onFocus(): void {
    const numeric = this.el.value.replace(/[^0-9.\-]/g, '').replace(/,/g, '.');
    this.el.value = numeric;
    // select to make replacement easy
    setTimeout(() => this.el.select(), 0);
  }

  // Format on blur and notify form
  @HostListener('blur')
  onBlur(): void {
    const num = this.parseNumber(this.el.value);
    this.onChange(num);
    this.onTouched();
    this.el.value = (num === null || isNaN(num as any)) ? '' : (this.currencyPipe.transform(num, this.currency, 'symbol', '1.2-2') || '');
  }
}
