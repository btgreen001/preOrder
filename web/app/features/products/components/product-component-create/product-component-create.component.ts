import { Component, EventEmitter, OnInit, Output, inject, Directive, ElementRef, HostListener, Input, forwardRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyPipe } from '@angular/common';
import { UnitOptionsService } from '../../../../core/services/unit-options.service';

export interface ProductComponentCreateModel {
  name: string;
  sku?: string;
  isRecipeComponent: boolean;
  isListedForSale: boolean;
  outputUnitMsr?: string;
  outputUnitCount?: number;
  yieldToUnitConversion?: number;
  unitCost?: number;
  unitPrice?: number;
  category?: number;
  servingsPerPackage?: number;  // Number of servings per package
}

/**
 * CurrencyInputDirective
 *
 * ControlValueAccessor that:
 * - writes numeric values to the form control (number | null)
 * - shows formatted currency on blur
 * - shows raw numeric string on focus for editing
 *
 * Usage:
 * <input matInput type="text" inputmode="decimal" currencyInput formControlName="unitPrice" />
 */
@Directive({
  selector: '[currencyInput]',
  providers: [
    CurrencyPipe,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputDirective),
      multi: true
    }
  ]
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

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.el.disabled = isDisabled;
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

  // Keep input cleaned while typing and update model with numeric value
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

  // Helpers
  private parseNumber(value: string): number | null {
    if (!value) return null;
    // normalize whitespace and commas, keep dot as decimal separator
    const normalized = value.replace(/\s/g, '').replace(/,/g, '.');
    const cleaned = normalized.replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
}

@Component({
  selector: 'app-product-component-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    CurrencyInputDirective
  ],
  templateUrl: './product-component-create.component.html',
  styleUrls: ['./product-component-create.component.scss']
})
export class ProductComponentCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private unitOptionsService = inject(UnitOptionsService);
  private http = inject(HttpClient);

  unitOptions: string[] = [];

  ngOnInit(): void {
    this.unitOptionsService.getUnitOptions().subscribe(units => this.unitOptions = units);
    // Prefill an editable suggested SKU so the user sees a value immediately.
    // This suggestion is cosmetic and can be replaced by the user.
    const suggested = `AUTO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    this.form.controls.sku.setValue(suggested);
  }

  @Output() create = new EventEmitter<ProductComponentCreateModel>();
  @Output() cancel = new EventEmitter<void>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    sku: [''],
    isRecipeComponent: [true],
    isListedForSale: [true],
    outputUnitMsr: ['g', Validators.required],
    outputUnitCount: [24, [Validators.required, Validators.min(0)]],
    yieldToUnitConversion: [120, [Validators.required, Validators.min(0)]],
    unitPrice: [null as number | null, [Validators.min(0)]],
    servingsPerPackage: [1, [Validators.required, Validators.min(0)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: ProductComponentCreateModel = {
      name: String(this.form.controls.name.value || '').trim(),
      // Always send whatever is in the SKU field (suggested or user-provided)
      sku: String(this.form.controls.sku.value ?? '').trim(),
      isRecipeComponent: !!this.form.controls.isRecipeComponent.value,
      isListedForSale: !!this.form.controls.isListedForSale.value,
      outputUnitMsr: String(this.form.controls.outputUnitMsr.value || '').trim() || undefined,
      outputUnitCount: this.form.controls.outputUnitCount.value ?? undefined,
      yieldToUnitConversion: this.form.controls.yieldToUnitConversion.value ?? undefined,
      unitPrice: this.form.controls.unitPrice.value ?? undefined,
      servingsPerPackage: this.form.controls.servingsPerPackage.value ?? 1
    };

    this.create.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // inventoryBaseUom should be set to your system base (e.g., 'g' or 'ml' or 'each')
  get inventoryBaseUom(): string {
    return this.form.get('outputUnitMsr')?.value || 'g';
  }

  get normalizedBatchYield(): number {
    const qty = Number(this.form.value.outputUnitCount) || 0;
    const conv = Number(this.form.value.yieldToUnitConversion) || 0;
    const unit = String(this.form.value.outputUnitMsr) || 'g';
    return qty * conv;
  }

  // SKU availability UX: backend may auto-generate when undefined; only validate when user enters a value
  skuAvailable: boolean | null = null; // null = unchecked, true = available, false = taken

  checkSkuAvailability(): void {
    const val = String(this.form.controls.sku.value || '').trim();
    if (!val) {
      this.skuAvailable = null;
      return;
    }

    // Call a lightweight availability endpoint; if not implemented, ignore errors
    const api = `/api/products/sku-available?sku=${encodeURIComponent(val)}`;
    this.http.get<{ available: boolean }>(api).subscribe({
      next: r => this.skuAvailable = !!r?.available,
      error: () => this.skuAvailable = null
    });
  }
}