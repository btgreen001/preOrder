import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
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
    price: 0,
    maxPerOrder: null,
    sortOrder: 0,
    isActive: true
  };

  ngOnInit(): void {
    this.loadHolidayEvents();
    this.loadSellableProducts();
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
        this.errorMessage = 'Could not load menu items.';
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
      price: 0,
      maxPerOrder: null,
      sortOrder: 0,
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
        this.successMessage = 'Menu item deactivated.';
        this.loadMenuItems();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not deactivate menu item.');
      }
    });
  }

  saveMenuItem(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.holidayEventExternalId) {
      this.errorMessage = 'Select an event first.';
      return;
    }

    if (!this.form.name.trim()) {
      this.errorMessage = 'Menu item name is required.';
      return;
    }

    if (this.form.price < 0) {
      this.errorMessage = 'Price cannot be negative.';
      return;
    }

    if (this.form.maxPerOrder !== null && this.form.maxPerOrder !== undefined && this.form.maxPerOrder < 1) {
      this.errorMessage = 'Max-per-order must be at least 1.';
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
        this.successMessage = this.editingExternalId ? 'Menu item updated.' : 'Menu item created.';
        this.startCreate();
        this.loadMenuItems();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not save menu item.');
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
}
