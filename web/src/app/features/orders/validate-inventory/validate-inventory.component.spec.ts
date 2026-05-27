import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidateInventoryComponent } from './validate-inventory.component';
import { OrdersService } from './../services/orders.service';
import { of, throwError } from 'rxjs';

describe('ValidateInventoryComponent', () => {
  let component: ValidateInventoryComponent;
  let fixture: ComponentFixture<ValidateInventoryComponent>;
  let mockOrdersService: jasmine.SpyObj<OrdersService>;

  beforeEach(async () => {
    mockOrdersService = jasmine.createSpyObj('OrdersService', ['validateOrderInventory']);
    mockOrdersService.validateOrderInventory.and.returnValue(
      of({
        message: 'All items available',
        allItemsAvailable: true,
        items: []
      })
    );

    await TestBed.configureTestingModule({
      imports: [ValidateInventoryComponent],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ValidateInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize in standalone mode when no items provided', () => {
    expect(component.isModalMode).toBe(false);
    expect(component.items.length).toBe(1);
    expect(component.items[0].sellableProductExternalId).toBe('de5595f6-4d3e-44b7-9524-7cb41a6086bc');
    expect(component.items[0].quantity).toBe(1);
    expect(mockOrdersService.validateOrderInventory).toHaveBeenCalledWith(component.items);
  });

  it('should add item to list', () => {
    component.items = [];
    component.newProductId = 'de5595f6-4d3e-44b7-9524-7cb41a6086bd';
    component.newQuantity = 5;
    component.addItem();

    expect(component.items.length).toBe(1);
    expect(component.items[0].sellableProductExternalId).toBe('de5595f6-4d3e-44b7-9524-7cb41a6086bd');
    expect(component.items[0].quantity).toBe(5);
    expect(component.newProductId).toBe('');
    expect(component.newQuantity).toBeNull();
  });

  it('should not add item with invalid data', () => {
    component.items = [];
    component.newProductId = '';
    component.newQuantity = 0;
    component.addItem();

    expect(component.items.length).toBe(0);
    expect(component.errorMessage).toBeTruthy();
  });

  it('should remove item from list', () => {
    component.items = [
  { sellableProductExternalId: 'prod-1', quantity: 2 },
  { sellableProductExternalId: 'prod-2', quantity: 3 }
    ];

    component.removeItem(0);
    expect(component.items.length).toBe(1);
  expect(component.items[0].sellableProductExternalId).toBe('prod-2');
  });

  it('should validate inventory', (done) => {
    component.items = [{ sellableProductExternalId: 'de5595f6-4d3e-44b7-9524-7cb41a6086bc', quantity: 5 }];
    component.validateInventory();

    expect(component.isLoading).toBe(false);
    expect(mockOrdersService.validateOrderInventory).toHaveBeenCalledWith(component.items);

    // Wait for async operation
    setTimeout(() => {
      expect(component.isLoading).toBe(false);
      expect(component.validationResult?.allItemsAvailable).toBe(true);
      done();
    }, 100);
  });

  it('should handle validation error', (done) => {
    mockOrdersService.validateOrderInventory.and.returnValue(
      throwError(() => ({ error: { message: 'API error' } }))
    );

    component.items = [{ sellableProductExternalId: 'de5595f6-4d3e-44b7-9524-7cb41a6086bc', quantity: 5 }];
    component.validateInventory();

    setTimeout(() => {
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toContain('API error');
      done();
    }, 100);
  });

  it('should initialize in modal mode with input items', () => {
    component.orderedItems = [
      { sellableProductExternalId: 'de5595f6-4d3e-44b7-9524-7cb41a6086bc', quantity: 2 },
      { sellableProductExternalId: 'de5595f6-4d3e-44b7-9524-7cb41a6086bd', quantity: 3 }
    ];

    component.ngOnInit();

    expect(component.isModalMode).toBe(true);
    expect(component.items.length).toBe(2);
    expect(mockOrdersService.validateOrderInventory).toHaveBeenCalled();
  });

  it('should emit validationComplete when proceed called', () => {
    spyOn(component.validationComplete, 'emit');
    component.validationResult = {
      allItemsAvailable: true,
      message: 'Valid',
      items: []
    };

    component.onProceed();

    expect(component.validationComplete.emit).toHaveBeenCalledWith(component.validationResult);
  });

  it('should emit cancelled when cancel called', () => {
    spyOn(component.cancelled, 'emit');
    component.onCancel();

    expect(component.cancelled.emit).toHaveBeenCalled();
  });
});
