
import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  PreorderAdminService,
  AdminHolidayEvent,
  AdminMenuItem,
  AdminSellableProduct,
  SaveMenuItemRequest
} from '../services/preorder-admin.service';

@Component({
  selector: 'app-preorder-menu-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './preorder-menu-admin.component.html',
  styleUrl: './preorder-menu-admin.component.scss'
})
export class PreorderMenuAdminComponent implements OnInit {
  private static readonly UNLINKED_PRODUCT_NAME = 'UNLINKED';
  private readonly preorderAdminService = inject(PreorderAdminService);
  private readonly snackBar = inject(MatSnackBar);

  holidayEvents: AdminHolidayEvent[] = [];
  menuItems: AdminMenuItem[] = [];
  sellableProducts: AdminSellableProduct[] = [];

  selectedHolidayEventExternalId = '';
  editingExternalId: string | null = null;

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form: SaveMenuItemRequest = {
    holidayEventExternalId: '',
    productExternalId: null,
    name: '',
    description: '',
    price: 0.00,
    maxPerOrder: null,
    sortOrder: 0,
    isActive: true
  };

  ngOnInit(): void {
    this.setDefaults();
    this.loadHolidayEvents();
    this.loadSellableProducts();
  }

  setDefaults(): void {
    this.selectedHolidayEventExternalId = '';
    this.editingExternalId = null;
    this.isLoading = false;
    this.isSaving = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.form = {
      holidayEventExternalId: '',
      productExternalId: null,
      name: '',
      description: '',
      price: 0.00,
      maxPerOrder: 1,
      sortOrder: 1,
      isActive: true
    };
  }

  loadHolidayEvents(): void {
    this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: events => {
        this.holidayEvents = events;
        if (!this.selectedHolidayEventExternalId && events.length > 0) {
          this.selectedHolidayEventExternalId = events[0].externalId;
          this.form.holidayEventExternalId = events[0].externalId;
        }

        if (this.selectedHolidayEventExternalId) {
          this.loadMenuItems();
        }
      },
      error: () => {
        this.errorMessage = 'Could not load pre-order events.';
      }
    });
  }

  loadSellableProducts(): void {
    this.preorderAdminService.getSellableProducts().subscribe({
      next: products => {
        this.sellableProducts = products.filter(product => product.isActive && product.isForSale);
      },
      error: () => {
        this.errorMessage = 'Could not load sellable products.';
      }
    });
  }

  onEventChange(): void {
    this.startCreate();
    this.loadMenuItems();
  }

  loadMenuItems(): void {
    if (!this.selectedHolidayEventExternalId) {
      this.menuItems = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.preorderAdminService.getMenuItems(this.selectedHolidayEventExternalId).subscribe({
      next: items => {
        this.menuItems = items;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load items.';
        this.isLoading = false;
      }
    });
  }

  startCreate(): void {
    this.editingExternalId = null;
    this.successMessage = '';
    this.form = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      productExternalId: null,
      name: '',
      description: '',
      price: 0.00,
      maxPerOrder: 1,
      sortOrder: 1,
      isActive: true
    };
  }

  startEdit(item: AdminMenuItem): void {
    this.editingExternalId = item.externalId;
    this.successMessage = '';

    const matchedProduct = this.sellableProducts.find(product => product.id === item.sellableProductId);

    this.form = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      productExternalId: matchedProduct?.externalId ?? null,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      maxPerOrder: item.maxPerOrder ?? null,
      sortOrder: item.sortOrder,
      isActive: item.isActive
    };
  }

  deleteMenuItem(item: AdminMenuItem): void {
    const confirmMsg = item.isActive
      ? `Deactivate "${item.name}"? Customers won't see it in new orders, but existing orders will remain.`
      : `Permanently deactivated "${item.name}" - reactivate it to sell again.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const deactivateRequest: SaveMenuItemRequest = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      productExternalId: this.sellableProducts.find(p => p.id === item.sellableProductId)?.externalId || undefined,
      name: item.name,
      description: item.description,
      price: item.price,
      maxPerOrder: item.maxPerOrder,
      sortOrder: item.sortOrder,
      isActive: false
    };

    this.preorderAdminService.updateMenuItem(item.externalId, deactivateRequest).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Item deactivated.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
        this.loadMenuItems();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not deactivate item.');
      }
    });
  }

    private focusValidationField(inputRef: ElementRef<HTMLInputElement>): void {
    const input = inputRef?.nativeElement;
    if (!input) {
      return;
    }

    if (this.isMobileViewport()) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    input.focus();
  }

    private isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 768px)').matches;
  }

  saveMenuItem(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.holidayEventExternalId) {
      this.snackBar.open('Select an event first.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      return;
    }

    if (!this.form.name.trim()) {
      this.focusValidationField(this.itemNameInput);
      return;
    }

    if (this.form.price < 0) {
      this.snackBar.open('Price cannot be negative.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });

      return;
    }

    if (this.form.maxPerOrder !== null && this.form.maxPerOrder !== undefined && this.form.maxPerOrder < 1) {
      this.snackBar.open('Max-per-order must be at least 1.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      return;
    }

    this.isSaving = true;

    const request: SaveMenuItemRequest = {
      holidayEventExternalId: this.form.holidayEventExternalId,
      productExternalId: this.form.productExternalId || undefined,
      name: this.form.name.trim(),
      description: this.form.description?.trim() || undefined,
      price: Number(this.form.price),
      maxPerOrder: this.form.maxPerOrder ?? undefined,
      sortOrder: Number(this.form.sortOrder),
      isActive: this.form.isActive ?? true
    };

    const save$ = this.editingExternalId
      ? this.preorderAdminService.updateMenuItem(this.editingExternalId, request)
      : this.preorderAdminService.createMenuItem(request);

    save$.subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open(this.editingExternalId ? 'Item updated.' : 'Item created.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
        this.startCreate();
        this.loadMenuItems();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not save item.');
      }
    });
  }

  resolveProductName(item: AdminMenuItem): string {
    const product = this.sellableProducts.find(entry => entry.id === item.sellableProductId);
    return product?.name ?? 'Unlinked';
  }

  isUsingUnlinkedProduct(item: AdminMenuItem): boolean {
    return this.resolveProductName(item).trim().toUpperCase() === PreorderMenuAdminComponent.UNLINKED_PRODUCT_NAME;
  }

  get unlinkedMenuItems(): AdminMenuItem[] {
    return this.menuItems.filter(item => this.isUsingUnlinkedProduct(item));
  }


@ViewChild('itemNameInput') itemNameInput!: ElementRef<HTMLInputElement>;
@ViewChild('priceInput') priceInput!: ElementRef<HTMLInputElement>;
@ViewChild('maxPerOrderInput') maxPerOrderInput!: ElementRef<HTMLInputElement>;
@ViewChild('sortOrderInput') sortOrderInput!: ElementRef<HTMLInputElement>;
@ViewChild('isActiveInput') isActiveInput!: ElementRef<HTMLSelectElement>;
@ViewChild('descriptionInput') descriptionInput!: ElementRef<HTMLTextAreaElement>;

}
