
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UnitOptionsService } from '../../../core/services/unit-options.service';
import {
  UnitConversionApiService,
  UnitConversionDto,
  UpsertUnitConversionRequest
} from '../../../core/services/unit-conversion-api.service';

@Component({
  selector: 'app-unit-conversion-manage',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './unit-conversion-manage.component.html',
  styleUrl: './unit-conversion-manage.component.scss'
})
export class UnitConversionManageComponent implements OnInit {
  private readonly unitApi = inject(UnitConversionApiService);
  private readonly unitOptionsService = inject(UnitOptionsService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  conversions: UnitConversionDto[] = [];
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  categories: string[] = [];
  categoryUnits: string[] = [];

  readonly form = this.fb.group({
    externalId: [''],
    category: ['weight', [Validators.required, Validators.maxLength(50)]],
    fromUnit: ['', [Validators.required, Validators.maxLength(50)]],
    toUnit: ['', [Validators.required, Validators.maxLength(50)]],
    conversionFactor: [1, [Validators.required, Validators.min(0.00000001)]],
    isGlobal: [false]
  });

  get isSystemAdmin(): boolean {
    return this.authService.currentUserValue?.role === 'SystemAdmin';
  }

  ngOnInit(): void {
    this.categories = [...this.unitOptionsService.categories];
    this.loadCategoryUnits(this.form.controls.category.value || 'weight');

    this.form.controls.category.valueChanges.subscribe(category => {
      this.loadCategoryUnits(category || 'weight');
    });

    this.loadConversions();
  }

  private loadCategoryUnits(category: string): void {
    this.unitOptionsService.getUnitOptionsByCategory(category).subscribe(units => {
      this.categoryUnits = units;

      const from = this.form.controls.fromUnit.value || '';
      const to = this.form.controls.toUnit.value || '';

      if (from && !units.includes(from)) {
        this.form.controls.fromUnit.setValue('');
      }
      if (to && !units.includes(to)) {
        this.form.controls.toUnit.setValue('');
      }
    });
  }

  loadConversions(): void {
    this.loading = true;
    this.error = null;

    this.unitApi.getConversions(undefined, true)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (rows) => {
          this.conversions = rows;
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Failed to load unit conversions.';
        }
      });
  }

  edit(conversion: UnitConversionDto): void {
    this.success = null;
    this.error = null;

    this.form.patchValue({
      externalId: conversion.externalId,
      category: conversion.category || 'weight',
      fromUnit: conversion.fromUnit,
      toUnit: conversion.toUnit,
      conversionFactor: conversion.conversionFactor,
      isGlobal: !conversion.organizationGuid
    });

    this.loadCategoryUnits(conversion.category || 'weight');
  }

  clearForm(): void {
    this.form.reset({
      externalId: '',
      category: 'weight',
      fromUnit: '',
      toUnit: '',
      conversionFactor: 1,
      isGlobal: false
    });

    this.loadCategoryUnits('weight');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.success = null;
    this.error = null;

    const value = this.form.getRawValue();
    const request: UpsertUnitConversionRequest = {
      externalId: value.externalId || undefined,
      category: value.category || 'weight',
      fromUnit: (value.fromUnit || '').trim(),
      toUnit: (value.toUnit || '').trim(),
      conversionFactor: Number(value.conversionFactor || 0),
      isActive: true
    };

    const useGlobal = !!value.isGlobal && this.isSystemAdmin;
    const save$ = useGlobal
      ? this.unitApi.upsertGlobalConversion(request)
      : this.unitApi.upsertOrganizationConversion(request);

    save$
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.success = useGlobal
            ? 'Global conversion saved.'
            : 'Organization conversion saved.';
          this.clearForm();
          this.loadConversions();
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Failed to save conversion.';
        }
      });
  }

  deactivate(externalId: string): void {
    this.success = null;
    this.error = null;

    this.unitApi.deactivateConversion(externalId).subscribe({
      next: () => {
        this.success = 'Conversion deactivated.';
        this.loadConversions();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to deactivate conversion.';
      }
    });
  }

  canDeactivate(conversion: UnitConversionDto): boolean {
    const isGlobal = !conversion.organizationGuid;
    if (!isGlobal) {
      return true;
    }

    return this.isSystemAdmin;
  }
}
