describe('Phase 2 - Business Logic Features', () => {
  const apiUrl = Cypress.env('apiUrl') || 'https://localhost:5124/api';

  beforeEach(() => {
    // Login before each test
    cy.visit('/login', { timeout: 10000 });
    cy.get('input').eq(0).clear().type('ba');
    cy.get('input').eq(1).clear().type('password');
    cy.get('[data-testid="login-submit-button"]').click();
    cy.url({ timeout: 15000 }).should('not.include', '/login');
    cy.wait(2000); // Wait for token to be stored
  });

  describe('Inventory - Low Stock Items', () => {
    it('should load and display low stock items', () => {
      cy.intercept('GET', `${apiUrl}/inventory/low-stock`, {
        statusCode: 200,
        body: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            itemName: 'Flour - All Purpose',
            quantityOnHand: 5,
            reorderPoint: 10,
            sku: 'FLOUR-AP-001'
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            itemName: 'Sugar - Granulated',
            quantityOnHand: 3,
            reorderPoint: 8,
            sku: 'SUGAR-GR-001'
          }
        ]
      }).as('getLowStock');

      cy.visit(`/inventory/low-stock`);
      cy.wait('@getLowStock');
      cy.wait(1000);

      cy.get('[data-testid="low-stock-items"]', { timeout: 10000 }).should('exist');
      cy.get('table tbody tr').should('have.length', 2);
      cy.contains('Flour - All Purpose').should('be.visible');
      cy.contains('Sugar - Granulated').should('be.visible');
    });

    it('should display summary metrics for low stock items', () => {
      cy.visit(`/inventory/low-stock`);
      cy.wait(2000);

      cy.get('[data-testid="summary-cards"]', { timeout: 10000 }).should('exist');
      cy.get('[data-testid="total-items-card"]').should('contain', /\d+/);
      cy.get('[data-testid="critical-items-card"]').should('contain', /\d+/);
    });
  });

  describe('Inventory - Expiring Items', () => {
    it('should load and display expiring items', () => {
      cy.intercept('GET', `${apiUrl}/inventory/expiring-soon*`, {
        statusCode: 200,
        body: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            itemName: 'Butter - Unsalted',
            expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            quantityOnHand: 15,
            sku: 'BUTTER-US-001'
          }
        ]
      }).as('getExpiringItems');

      cy.visit(`/inventory/expiring`);
      cy.wait('@getExpiringItems');
      cy.wait(1000);

      cy.get('[data-testid="expiring-items"]', { timeout: 10000 }).should('exist');
      cy.get('table tbody tr').should('have.length.greaterThan', 0);
      cy.contains('Butter - Unsalted').should('exist');
    });

    it('should allow configuring expiration window', () => {
      cy.visit(`/inventory/expiring`);
      cy.wait(2000);

      cy.get('[data-testid="days-input"]', { timeout: 10000 }).clear().type('15', { force: true });
      cy.get('[data-testid="filter-btn"]').click();
      cy.wait(2000);

      cy.get('[data-testid="expiring-items"]').should('exist');
    });
  });

  describe('Inventory - Reservations', () => {
    it('should display active inventory reservations', () => {
      cy.intercept('GET', `${apiUrl}/inventory/reservations*`, {
        statusCode: 200,
        body: [
          {
            id: '1',
            itemId: '550e8400-e29b-41d4-a716-446655440001',
            itemName: 'Flour - All Purpose',
            quantity: 50,
            orderId: '650e8400-e29b-41d4-a716-446655440001',
            reservedDate: new Date().toISOString(),
            status: 'Active'
          }
        ]
      }).as('getReservations');

      cy.visit(`/inventory/reservations`);
      cy.wait('@getReservations');
      cy.wait(1000);

      cy.get('[data-testid="reservations-table"]', { timeout: 10000 }).should('exist');
      cy.get('table tbody tr').should('have.length.greaterThan', 0);
    });

    it('should display reservation summary metrics', () => {
      cy.visit(`/inventory/reservations`);
      cy.wait(2000);

      cy.get('[data-testid="total-reservations-card"]', { timeout: 10000 }).should('exist');
      cy.get('[data-testid="reserved-quantity-card"]').should('exist');
      cy.get('[data-testid="active-orders-card"]').should('exist');
    });
  });

  describe('Orders - Validate Inventory', () => {
    it('should validate order items against available inventory', () => {
      cy.intercept('POST', `${apiUrl}/orders/validate-inventory`, {
        statusCode: 200,
        body: {
          isValid: true,
          missingItems: [],
          message: 'All items are available'
        }
      }).as('validateInventory');

      cy.visit(`/orders/validate-inventory`);
      cy.wait(1000);

      // Add test items
      cy.get('[data-testid="product-id-input"]', { timeout: 10000 }).type('550e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="quantity-input"]').type('5', { force: true });
      cy.get('[data-testid="add-item-btn"]').click();
      cy.wait(500);

      // Validate
      cy.get('[data-testid="validate-btn"]').click();
      cy.wait('@validateInventory');
      cy.wait(1000);

      cy.get('[data-testid="validation-result"]', { timeout: 10000 }).should('exist');
      cy.contains('All items are available').should('be.visible');
    });

    it('should display missing items when validation fails', () => {
      cy.intercept('POST', `${apiUrl}/orders/validate-inventory`, {
        statusCode: 200,
        body: {
          isValid: false,
          missingItems: [
            { productId: '550e8400-e29b-41d4-a716-446655440001', requiredQty: 100, availableQty: 20 }
          ],
          message: 'Insufficient inventory for some items'
        }
      }).as('validateInventoryFail');

      cy.visit(`/orders/validate-inventory`);
      cy.wait(1000);

      cy.get('[data-testid="product-id-input"]', { timeout: 10000 }).type('550e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="quantity-input"]').type('100', { force: true });
      cy.get('[data-testid="add-item-btn"]').click();
      cy.wait(500);

      cy.get('[data-testid="validate-btn"]').click();
      cy.wait('@validateInventoryFail');
      cy.wait(1000);

      cy.get('[data-testid="validation-result"]').should('exist');
      cy.contains('Insufficient inventory').should('be.visible');
    });
  });

  describe('Orders - Check Availability', () => {
    it('should check product availability for specific quantity', () => {
      cy.intercept('POST', `${apiUrl}/orders/check-availability`, {
        statusCode: 200,
        body: {
          available: true,
          availableQuantity: 30,
          message: 'Sufficient quantity available'
        }
      }).as('checkAvailability');

      cy.visit(`/orders/check-availability`);
      cy.wait(1000);

      cy.get('[data-testid="product-id-input"]', { timeout: 10000 }).type('550e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="quantity-input"]').type('20', { force: true });
      cy.get('[data-testid="check-btn"]').click();
      cy.wait('@checkAvailability');
      cy.wait(1000);

      cy.get('[data-testid="availability-result"]', { timeout: 10000 }).should('exist');
      cy.contains('Sufficient quantity available').should('be.visible');
    });

    it('should display shortfall when quantity not available', () => {
      cy.intercept('POST', `${apiUrl}/orders/check-availability`, {
        statusCode: 200,
        body: {
          available: false,
          availableQuantity: 10,
          message: 'Only 10 units available, 50 requested'
        }
      }).as('checkAvailabilityFail');

      cy.visit(`/orders/check-availability`);
      cy.wait(1000);

      cy.get('[data-testid="product-id-input"]', { timeout: 10000 }).type('550e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="quantity-input"]').type('50', { force: true });
      cy.get('[data-testid="check-btn"]').click();
      cy.wait('@checkAvailabilityFail');
      cy.wait(1000);

      cy.get('[data-testid="availability-result"]').should('exist');
      cy.contains('Only 10 units available').should('be.visible');
    });
  });

  describe('Orders - Pick List Generation', () => {
    it('should generate pick list for order', () => {
      cy.intercept('GET', `${apiUrl}/orders/*/pick-list`, {
        statusCode: 200,
        body: {
          orderId: '650e8400-e29b-41d4-a716-446655440001',
          items: [
            { productId: '550e8400-e29b-41d4-a716-446655440001', productName: 'Flour - All Purpose', quantity: 50, location: 'Shelf A1', notes: 'FIFO' },
            { productId: '550e8400-e29b-41d4-a716-446655440002', productName: 'Sugar - Granulated', quantity: 25, location: 'Shelf B2', notes: '' }
          ],
          totalItems: 2,
          priority: 'Normal'
        }
      }).as('generatePickList');

      cy.visit(`/orders/pick-list`);
      cy.wait(1000);

      cy.get('[data-testid="order-id-input"]', { timeout: 10000 }).type('650e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="generate-btn"]').click();
      cy.wait('@generatePickList');
      cy.wait(1000);

      cy.get('[data-testid="pick-list-result"]', { timeout: 10000 }).should('exist');
      cy.get('[data-testid="pick-list-table"]').should('exist');
      cy.get('table tbody tr').should('have.length', 2);
    });

    it('should allow printing pick list', () => {
      cy.visit(`/orders/pick-list`);
      cy.wait(1000);

      cy.get('[data-testid="order-id-input"]', { timeout: 10000 }).type('650e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="generate-btn"]').click();
      cy.wait(2000);

      cy.get('[data-testid="print-btn"]', { timeout: 10000 }).should('exist').should('be.visible');
    });
  });

  describe('Orders - Complete Order', () => {
    it('should complete pending order', () => {
      cy.intercept('GET', `${apiUrl}/orders/by-status/Pending`, {
        statusCode: 200,
        body: [
          {
            id: '650e8400-e29b-41d4-a716-446655440001',
            customerId: '750e8400-e29b-41d4-a716-446655440001',
            customerName: 'Test Customer',
            orderStatus: 'Pending',
            orderDate: new Date().toISOString(),
            totalAmount: 150.00
          }
        ]
      }).as('getPendingOrders');

      cy.intercept('PUT', `${apiUrl}/orders/*/complete`, {
        statusCode: 200,
        body: {
          orderId: '650e8400-e29b-41d4-a716-446655440001',
          status: 'Completed',
          completedAt: new Date().toISOString()
        }
      }).as('completeOrder');

      cy.visit(`/orders/completion`);
      cy.wait('@getPendingOrders');
      cy.wait(1000);

      cy.get('[data-testid="refresh-btn"]', { timeout: 10000 }).should('exist');
      cy.get('[data-testid="orders-table"]').should('exist');
      cy.get('[data-testid="complete-btn-650e8400-e29b-41d4-a716-446655440001"]').should('exist');
    });
  });

  describe('Orders - Cancel Order', () => {
    it('should cancel active order with confirmation', () => {
      cy.intercept('GET', `${apiUrl}/orders`, {
        statusCode: 200,
        body: [
          {
            id: '650e8400-e29b-41d4-a716-446655440001',
            customerId: '750e8400-e29b-41d4-a716-446655440001',
            customerName: 'Test Customer',
            orderStatus: 'Processing',
            orderDate: new Date().toISOString(),
            totalAmount: 150.00
          }
        ]
      }).as('getOrders');

      cy.intercept('PUT', `${apiUrl}/orders/*/cancel`, {
        statusCode: 200,
        body: {
          orderId: '650e8400-e29b-41d4-a716-446655440001',
          status: 'Cancelled',
          cancelledAt: new Date().toISOString()
        }
      }).as('cancelOrder');

      cy.visit(`/orders/cancellation`);
      cy.wait('@getOrders');
      cy.wait(1000);

      cy.get('[data-testid="orders-table"]', { timeout: 10000 }).should('exist');
      cy.get('[data-testid="cancel-btn-650e8400-e29b-41d4-a716-446655440001"]').should('exist');
    });
  });

  describe('Orders - Filter by Status', () => {
    it('should filter orders by pending status', () => {
      cy.intercept('GET', `${apiUrl}/orders/by-status/Pending`, {
        statusCode: 200,
        body: [
          {
            id: '650e8400-e29b-41d4-a716-446655440001',
            customerId: '750e8400-e29b-41d4-a716-446655440001',
            customerName: 'Test Customer 1',
            orderStatus: 'Pending',
            orderDate: new Date().toISOString(),
            totalAmount: 150.00
          }
        ]
      }).as('getPendingOrders');

      cy.visit(`/orders/by-status`);
      cy.wait(1000);

      cy.get('[data-testid="status-tab-Pending"]', { timeout: 10000 }).click();
      cy.wait('@getPendingOrders');
      cy.wait(1000);

      cy.get('[data-testid="orders-table"]', { timeout: 10000 }).should('exist');
      cy.get('table tbody tr').should('have.length', 1);
    });

    it('should filter orders by completed status', () => {
      cy.intercept('GET', `${apiUrl}/orders/by-status/Completed`, {
        statusCode: 200,
        body: [
          {
            id: '650e8400-e29b-41d4-a716-446655440002',
            customerId: '750e8400-e29b-41d4-a716-446655440002',
            customerName: 'Test Customer 2',
            orderStatus: 'Completed',
            orderDate: new Date().toISOString(),
            totalAmount: 200.00
          }
        ]
      }).as('getCompletedOrders');

      cy.visit(`/orders/by-status`);
      cy.wait(1000);

      cy.get('[data-testid="status-tab-Completed"]', { timeout: 10000 }).click();
      cy.wait('@getCompletedOrders');
      cy.wait(1000);

      cy.get('[data-testid="orders-table"]', { timeout: 10000 }).should('exist');
      cy.get('table tbody tr').should('have.length', 1);
      cy.contains('Completed').should('be.visible');
    });

    it('should display all order statuses as tabs', () => {
      cy.visit(`/orders/by-status`);
      cy.wait(2000);

      cy.get('[data-testid="status-tab-Pending"]', { timeout: 10000 }).should('exist');
      cy.get('[data-testid="status-tab-Processing"]').should('exist');
      cy.get('[data-testid="status-tab-Completed"]').should('exist');
      cy.get('[data-testid="status-tab-Cancelled"]').should('exist');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full order fulfillment workflow', () => {
      // Step 1: Check inventory availability
      cy.intercept('POST', `${apiUrl}/orders/check-availability`, {
        statusCode: 200,
        body: { available: true, availableQuantity: 50 }
      }).as('checkAvail');

      cy.visit(`/orders/check-availability`);
      cy.get('[data-testid="product-id-input"]', { timeout: 10000 }).type('550e8400-e29b-41d4-a716-446655440001', { force: true });
      cy.get('[data-testid="quantity-input"]').type('20', { force: true });
      cy.get('[data-testid="check-btn"]').click();
      cy.wait('@checkAvail');
      cy.wait(1000);

      cy.get('[data-testid="availability-result"]').should('exist');

      // Step 2: View low-stock items
      cy.intercept('GET', `${apiUrl}/inventory/low-stock`, {
        statusCode: 200,
        body: []
      }).as('getLowStock');

      cy.visit(`/inventory/low-stock`);
      cy.wait('@getLowStock');
      cy.wait(1000);

      cy.get('[data-testid="low-stock-items"]', { timeout: 10000 }).should('exist');

      // Step 3: Filter orders by status
      cy.intercept('GET', `${apiUrl}/orders/by-status/Processing`, {
        statusCode: 200,
        body: [
          {
            id: '650e8400-e29b-41d4-a716-446655440001',
            customerId: '750e8400-e29b-41d4-a716-446655440001',
            customerName: 'Test Customer',
            orderStatus: 'Processing',
            orderDate: new Date().toISOString(),
            totalAmount: 150.00
          }
        ]
      }).as('getProcessing');

      cy.visit(`/orders/by-status`);
      cy.wait(1000);
      cy.get('[data-testid="status-tab-Processing"]', { timeout: 10000 }).click();
      cy.wait('@getProcessing');
      cy.wait(1000);

      cy.get('[data-testid="orders-table"]', { timeout: 10000 }).should('exist');
    });
  });
});
