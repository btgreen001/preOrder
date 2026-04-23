describe('Phase 3.2.3 - FIFO Batch Selector', () => {
  const baseUrl = 'https://localhost:4200';
  const testUser = { username: 'ba', password: 'password' };

  beforeEach(() => {
    cy.visit(`${baseUrl}/login`);
    cy.get('input[type="text"]').eq(0).type(testUser.username);
    cy.get('input[type="password"]').type(testUser.password);
    cy.get('button').contains('Login').click();
    cy.wait(3000);
  });

  afterEach(() => {
    cy.visit(`${baseUrl}/dashboard`);
  });

  it('should display FIFO batch selector page', () => {
    cy.visit(`${baseUrl}/batches/fifo`);
    cy.get('[data-testid="query-fifo-btn"]').should('be.visible');
    cy.contains('FIFO Batch Selector').should('be.visible');
  });

  it('should load products in dropdown', () => {
    cy.visit(`${baseUrl}/batches/fifo`);
    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').should('have.length.greaterThan', 0);
  });

  it('should query FIFO batches for selected product', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    // Mock API response
    cy.intercept('GET', '**/api/batches/fifo?*', {
      statusCode: 200,
      body: [
        {
          ExternalId: '11111111-1111-1111-1111-111111111111',
          BatchNumber: 'BREAD-20251105-001',
          ProductExternalId: '22222222-2222-2222-2222-222222222222',
          QuantityAvailable: 50,
          ProductionDate: '2025-11-05',
          ExpirationDate: '2025-11-07',
          CostPerUnit: 2.50,
          DaysUntilExpiration: 2,
          ExpirationStatus: 'CRITICAL',
          TotalCost: 125.00
        }
      ]
    }).as('getFIFOBatches');

    // Select product and quantity
    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('[data-testid="quantity-input"]').clear().type('25');
    cy.get('[data-testid="query-fifo-btn"]').click();

    cy.wait('@getFIFOBatches');
    cy.get('[data-testid="batches-table"]').should('be.visible');
  });

  it('should display batch details in table', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    cy.intercept('GET', '**/api/batches/fifo?*', {
      statusCode: 200,
      body: [
        {
          ExternalId: '11111111-1111-1111-1111-111111111111',
          BatchNumber: 'BREAD-20251105-001',
          ProductExternalId: '22222222-2222-2222-2222-222222222222',
          QuantityAvailable: 50,
          ProductionDate: '2025-11-05',
          ExpirationDate: '2025-11-07',
          CostPerUnit: 2.50,
          DaysUntilExpiration: 2,
          ExpirationStatus: 'CRITICAL',
          TotalCost: 125.00
        },
        {
          ExternalId: '33333333-3333-3333-3333-333333333333',
          BatchNumber: 'BREAD-20251106-002',
          ProductExternalId: '22222222-2222-2222-2222-222222222222',
          QuantityAvailable: 75,
          ProductionDate: '2025-11-06',
          ExpirationDate: '2025-11-08',
          CostPerUnit: 2.50,
          DaysUntilExpiration: 3,
          ExpirationStatus: 'WARNING',
          TotalCost: 187.50
        }
      ]
    }).as('getFIFOBatches');

    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('[data-testid="quantity-input"]').clear().type('100');
    cy.get('[data-testid="query-fifo-btn"]').click();

    cy.wait('@getFIFOBatches');

    // Verify batches displayed in FIFO order (oldest first)
    cy.get('[data-testid="batches-table"]')
      .find('tbody tr')
      .should('have.length', 2);

    // First batch (oldest - CRITICAL)
    cy.get('[data-testid="batches-table"]').find('tbody tr').eq(0).contains('BREAD-20251105-001');
    cy.get('[data-testid="batches-table"]').find('tbody tr').eq(0).contains('CRITICAL');

    // Second batch (newer - WARNING)
    cy.get('[data-testid="batches-table"]').find('tbody tr').eq(1).contains('BREAD-20251106-002');
    cy.get('[data-testid="batches-table"]').find('tbody tr').eq(1).contains('WARNING');
  });

  it('should select and deselect batches', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    cy.intercept('GET', '**/api/batches/fifo?*', {
      statusCode: 200,
      body: [
        {
          ExternalId: '11111111-1111-1111-1111-111111111111',
          BatchNumber: 'BREAD-20251105-001',
          ProductExternalId: '22222222-2222-2222-2222-222222222222',
          QuantityAvailable: 50,
          ProductionDate: '2025-11-05',
          ExpirationDate: '2025-11-07',
          CostPerUnit: 2.50,
          DaysUntilExpiration: 2,
          ExpirationStatus: 'CRITICAL',
          TotalCost: 125.00
        }
      ]
    }).as('getFIFOBatches');

    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('[data-testid="quantity-input"]').clear().type('50');
    cy.get('[data-testid="query-fifo-btn"]').click();

    cy.wait('@getFIFOBatches');

    // Click select button
    cy.get('[data-testid="select-batch-btn"]').first().click();

    // Verify batch is selected (icon changes to check_circle)
    cy.get('[data-testid="select-batch-btn"]')
      .first()
      .find('mat-icon')
      .should('contain', 'check_circle');

    // Click again to deselect
    cy.get('[data-testid="select-batch-btn"]').first().click();

    // Verify batch is deselected (icon changes back)
    cy.get('[data-testid="select-batch-btn"]')
      .first()
      .find('mat-icon')
      .should('contain', 'radio_button_unchecked');
  });

  it('should apply FIFO rotation', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    cy.intercept('GET', '**/api/batches/fifo?*', {
      statusCode: 200,
      body: [
        {
          ExternalId: '11111111-1111-1111-1111-111111111111',
          BatchNumber: 'BREAD-20251105-001',
          ProductExternalId: '22222222-2222-2222-2222-222222222222',
          QuantityAvailable: 50,
          ProductionDate: '2025-11-05',
          ExpirationDate: '2025-11-07',
          CostPerUnit: 2.50,
          DaysUntilExpiration: 2,
          ExpirationStatus: 'CRITICAL',
          TotalCost: 125.00
        }
      ]
    }).as('getFIFOBatches');

    cy.intercept('POST', '**/api/batches/fifo-rotate', {
      statusCode: 200,
      body: [
        {
          BatchExternalId: '11111111-1111-1111-1111-111111111111',
          QuantitySelected: 50,
          ExpirationDate: '2025-11-07',
          DaysUntilExpiration: 2,
          TotalCost: 125.00
        }
      ]
    }).as('applyFIFO');

    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('[data-testid="quantity-input"]').clear().type('50');
    cy.get('[data-testid="query-fifo-btn"]').click();

    cy.wait('@getFIFOBatches');

    // Select a batch
    cy.get('[data-testid="select-batch-btn"]').first().click();

    // Apply FIFO rotation
    cy.get('[data-testid="apply-fifo-btn"]').click();

    cy.wait('@applyFIFO');

    // Verify success message
    cy.contains('FIFO rotation applied successfully').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    cy.intercept('GET', '**/api/batches/fifo?*', {
      statusCode: 500,
      body: { message: 'Internal server error' }
    }).as('getFIFOBatchesError');

    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('[data-testid="quantity-input"]').clear().type('50');
    cy.get('[data-testid="query-fifo-btn"]').click();

    cy.wait('@getFIFOBatchesError');

    // Verify error message
    cy.contains('Error loading FIFO batches').should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    // Try to query without selecting product
    cy.get('[data-testid="query-fifo-btn"]').click();

    // Verify error message
    cy.contains('Please fill in all required fields').should('be.visible');
  });

  it('should display empty state when no batches available', () => {
    cy.visit(`${baseUrl}/batches/fifo`);

    cy.intercept('GET', '**/api/batches/fifo?*', {
      statusCode: 200,
      body: []
    }).as('getFIFOBatchesEmpty');

    cy.get('[data-testid="product-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('[data-testid="quantity-input"]').clear().type('50');
    cy.get('[data-testid="query-fifo-btn"]').click();

    cy.wait('@getFIFOBatchesEmpty');

    // Verify empty state message
    cy.contains('No available batches for this product').should('be.visible');
  });
});
