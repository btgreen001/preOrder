import { Component, OnInit, ViewChild, ElementRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
  private readonly router = inject(Router);

  // -----------------------------
  // SIGNAL STATE
  // -----------------------------
  holidayEvents = signal<AdminHolidayEvent[]>([]);
  menuItems = signal<AdminMenuItem[]>([]);
  sellableProducts = signal<AdminSellableProduct[]>([]);

  selectedHolidayEventExternalId = signal<string>('');
  editingExternalId = signal<string | null>(null);

  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form = signal<SaveMenuItemRequest>({
    holidayEventExternalId: '',
    productExternalId: null,
    name: '',
    description: '',
    price: 0.0,
    maxPerOrder: 1,
    sortOrder: 1,
    isActive: true
  });

  // -----------------------------
  // LIFECYCLE
  // -----------------------------
  ngOnInit(): void {
    this.setDefaults();
    this.loadHolidayEvents();
    this.loadSellableProducts();
  }

  // -----------------------------
  // RESET DEFAULTS
  // -----------------------------
  setDefaults(): void {
    this.selectedHolidayEventExternalId.set('');
    this.editingExternalId.set(null);
    this.isLoading.set(false);
    this.isSaving.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.form.set({
      holidayEventExternalId: '',
      productExternalId: null,
      name: '',
      description: '',
      price: 0.0,
      maxPerOrder: 1,
      sortOrder: 1,
      isActive: true
    });
  }

  // -----------------------------
  // LOAD EVENTS
  // -----------------------------
  loadHolidayEvents(): void {
    this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: events => {
        this.holidayEvents.set(events);

        const persisted = this.preorderAdminService.getSelectedHolidayEventExternalId();
        const current = this.selectedHolidayEventExternalId();
        const candidate = current || persisted || '';

        const preferred =
          events.find(e => e.externalId === candidate) ?? events[0];

        if (preferred) {
          this.selectedHolidayEventExternalId.set(preferred.externalId);

          this.form.update(f => {
            f.holidayEventExternalId = preferred.externalId;
            return f;
          });

          this.preorderAdminService.setSelectedHolidayEventExternalId(
            preferred.externalId
          );
        }

        if (this.selectedHolidayEventExternalId()) {
          this.loadMenuItems();
        }
      },
      error: () => {
        this.errorMessage.set('Could not load pre-order events.');
      }
    });
  }

  // -----------------------------
  // LOAD PRODUCTS
  // -----------------------------
  loadSellableProducts(): void {
    this.preorderAdminService.getSellableProducts().subscribe({
      next: products => {
        this.sellableProducts.set(
          products.filter(p => p.isActive && p.isForSale)
        );
      },
      error: () => {
        this.errorMessage.set('Could not load sellable products.');
      }
    });
  }

  // -----------------------------
  // EVENT CHANGE
  // -----------------------------
  onEventChange(): void {
    const id = this.selectedHolidayEventExternalId();
    this.preorderAdminService.setSelectedHolidayEventExternalId(id);
    this.startCreate();
    this.loadMenuItems();
  }

  // -----------------------------
  // LOAD MENU ITEMS
  // -----------------------------
  loadMenuItems(): void {
    const eventId = this.selectedHolidayEventExternalId();
    if (!eventId) {
      this.menuItems.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.preorderAdminService.getMenuItems(eventId).subscribe({
      next: items => {
        this.menuItems.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load items.');
        this.isLoading.set(false);
      }
    });
  }

  // -----------------------------
  // START CREATE
  // -----------------------------
  startCreate(): void {
    this.editingExternalId.set(null);
    this.successMessage.set('');

    this.form.set({
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      productExternalId: null,
      name: '',
      description: '',
      price: 0.0,
      maxPerOrder: 1,
      sortOrder: 1,
      isActive: true
    });
  }

  startEdit(item: AdminMenuItem): void {
    this.editingExternalId.set(item.externalId);
    this.successMessage.set('');

    const matchedProduct = this.sellableProducts()
      .find(product => product.id === item.sellableProductId);

    this.form.set({
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      productExternalId: matchedProduct?.externalId ?? null,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      maxPerOrder: item.maxPerOrder ?? null,
      sortOrder: item.sortOrder,
      isActive: item.isActive
    });

    this.scrollToEditorStart();
  }

  deleteMenuItem(item: AdminMenuItem): void {
    const confirmMsg = `Delete "${item.name}"? Customers won't see it in new orders, but existing orders will remain.`;

    if (!confirm(confirmMsg)) return;

    this.isSaving.set(true);
    this.errorMessage.set('');

    const deactivateRequest: SaveMenuItemRequest = {
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      productExternalId: this.sellableProducts()
        .find(p => p.id === item.sellableProductId)?.externalId || undefined,
      name: item.name,
      description: item.description,
      price: item.price,
      maxPerOrder: item.maxPerOrder,
      sortOrder: item.sortOrder,
      isActive: false
    };

    this.preorderAdminService.updateMenuItem(item.externalId, deactivateRequest)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open('Item deleted.', 'Close', {
            duration: 3000,
            panelClass: ['info-snackbar']
          });
          this.loadMenuItems();
        },
        error: (error) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            extractErrorMessage(error, 'Could not delete item.')
          );
        }
      });
  }


  private scrollToEditorStart(): void {
    const input = this.itemNameInput?.nativeElement;
    if (!input) {
      return;
    }

    input.scrollIntoView({
      behavior: 'smooth',
      block: this.isMobileViewport() ? 'center' : 'start',
      inline: 'nearest'
    });

    if (!this.isMobileViewport()) {
      setTimeout(() => input.focus(), 220);
    }
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

  saveMenuItem(nextRoute?: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const form = this.form();

    if (!form.holidayEventExternalId) {
      this.snackBar.open('Select an event first.', 'Close', {
        duration: 3000,
        panelClass: ['info-snackbar']
      });
      return;
    }

    if (!form.name.trim()) {
      this.focusValidationField(this.itemNameInput);
      return;
    }

    if (form.price < 0) {
      this.snackBar.open('Price cannot be negative.', 'Close', {
        duration: 3000,
        panelClass: ['info-snackbar']
      });
      return;
    }

    if (form.maxPerOrder !== null && form.maxPerOrder < 1) {
      this.snackBar.open('Max-per-order must be at least 1.', 'Close', {
        duration: 3000,
        panelClass: ['info-snackbar']
      });
      return;
    }

    this.isSaving.set(true);

    const request: SaveMenuItemRequest = {
      holidayEventExternalId: form.holidayEventExternalId,
      productExternalId: form.productExternalId || undefined,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      price: Number(form.price),
      maxPerOrder: form.maxPerOrder ?? undefined,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive ?? true
    };

    const save$ = this.editingExternalId()
      ? this.preorderAdminService.updateMenuItem(this.editingExternalId()!, request)
      : this.preorderAdminService.createMenuItem(request);

    save$.subscribe({
      next: () => {
        this.isSaving.set(false);

        this.snackBar.open(
          this.editingExternalId() ? 'Item updated.' : 'Item created.',
          'Close',
          { duration: 3000, panelClass: ['info-snackbar'] }
        );

        if (nextRoute) {
          this.router.navigate([nextRoute]);
        }

        this.startCreate();
        this.loadMenuItems();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          extractErrorMessage(error, 'Could not save item.')
        );
      }
    });
  }


  resolveProductName(item: AdminMenuItem): string {
    const product = this.sellableProducts()
      .find(entry => entry.id === item.sellableProductId);

    return product?.name ?? 'Unlinked';
  }


  isUsingUnlinkedProduct(item: AdminMenuItem): boolean {
    return this.resolveProductName(item)
      .trim()
      .toUpperCase() === PreorderMenuAdminComponent.UNLINKED_PRODUCT_NAME;
  }


  unlinkedMenuItems = computed(() =>
    this.menuItems().filter(item => this.isUsingUnlinkedProduct(item))
  );


@ViewChild('itemHeader') itemHeader!: ElementRef<HTMLElement>;
@ViewChild('selectEvent') selectEvent!: ElementRef<HTMLSelectElement>;
@ViewChild('itemNameInput') itemNameInput!: ElementRef<HTMLInputElement>;
@ViewChild('priceInput') priceInput!: ElementRef<HTMLInputElement>;
@ViewChild('maxPerOrderInput') maxPerOrderInput!: ElementRef<HTMLInputElement>;
@ViewChild('sortOrderInput') sortOrderInput!: ElementRef<HTMLInputElement>;
@ViewChild('isActiveInput') isActiveInput!: ElementRef<HTMLSelectElement>;
@ViewChild('descriptionInput') descriptionInput!: ElementRef<HTMLTextAreaElement>;



}
