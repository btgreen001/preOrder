describe('Phase 3.2.3 - FIFO Inventory Rotation', () => {
  const loginUser = { username: 'ba', password: 'password' };
  const apiUrl = 'https://localhost:5124/api';

  beforeEach(() => {
    // Login before each test
    cy.visit('https://localhost:5124/login');
    cy.get('input[name="username"]').type(loginUser.username);
    cy.get('input[name="password"]').type(loginUser.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.wait(2000);
  });

  it('Display FIFO batches page and load products', () => {
    cy.visit('https://localhost:5124/batches/fifo');
    cy.get('[data-testid="product-select"]').should('exist');
    cy.get('[data-testid="quantity-input"]').should('exist');
    cy.get('[data-testid="get-fifo-btn"]').should('exist');
    cy.get('h1, h2').should('contain', 'FIFO');
  });

  it('Query FIFO batches and display in table', () => {
    cy.intercept('GET', `${apiUrl}/batches/fifo*`, {
      statusCode: 200,
      body: [
        {
          externalId: '550e8400-e29b-41d4-a716-446655440001',
          batchNumber: 'SAV-20251101-001',
          quantityAvailable: 100,
          productionDate: '2025-10-31T10:00:00Z',
          expirationDate: '2025-11-07T10:00:00Z',
          daysUntilExpiration: 2,
          expirationStatus: 'CRITICAL',
          costPerUnit: 2.5,
          productId: '550e8400-e29b-41d4-a716-446655440000',
          productName: 'Sourdough Bread',
        },
        {
          externalId: '550e8400-e29b-41d4-a716-446655440002',
          batchNumber: 'SAV-20251102-001',
          quantityAvailable: 150,
          productionDate: '2025-11-01T10:00:00Z',
          expirationDate: '2025-11-10T10:00:00Z',
          daysUntilExpiration: 5,
          expirationStatus: 'WARNING',
          costPerUnit: 2.5,
          productId: '550e8400-e29b-41d4-a716-446655440000',
          productName: 'Sourdough Bread',
        },
      ],
    }).as('getFIFOBatches');

    cy.visit('https://localhost:5124/batches/fifo');
    cy.get('[data-testid="product-select"]').select('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="quantity-input"]').type('50');
    cy.get('[data-testid="get-fifo-btn"]').click();
    cy.wait('@getFIFOBatches');
    cy.get('[data-testid="fifo-batches-table"]').should('exist');
    cy.get('table tbody tr').should('have.length', 2);
    cy.get('table tbody tr').first().should('contain', 'SAV-20251101-001');
  });

  it('Display FIFO metrics - total batches and critical count', () => {
    cy.intercept('GET', `${apiUrl}/batches/fifo*`, {
      statusCode: 200,
      body: [
        {
          externalId: '550e8400-e29b-41d4-a716-446655440001',
          batchNumber: 'SAV-20251101-001',
          quantityAvailable: 100,
          productionDate: '2025-10-31T10:00:00Z',
          expirationDate: '2025-11-07T10:00:00Z',
          daysUntilExpiration: 2,
          expirationStatus: 'CRITICAL',
          costPerUnit: 2.5,
          productId: '550e8400-e29b-41d4-a716-446655440000',
        },
        {
          externalId: '550e8400-e29b-41d4-a716-446655440002',
          batchNumber: 'SAV-20251102-001',
          quantityAvailable: 150,
          productionDate: '2025-11-01T10:00:00Z',
          expirationDate: '2025-11-10T10:00:00Z',
          daysUntilExpiration: 5,
          expirationStatus: 'WARNING',
          costPerUnit: 2.5,
          productId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    }).as('getFIFOBatches');

    cy.visit('https://localhost:5124/batches/fifo');
    cy.get('[data-testid="product-select"]').select('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="quantity-input"]').type('50');
    cy.get('[data-testid="get-fifo-btn"]').click();
    cy.wait('@getFIFOBatches');

    // Check metric cards
    cy.contains('Total Batches').parent().should('contain', '2');
    cy.contains('Critical').parent().should('contain', '1');
    cy.contains('At Risk').parent().should('contain', '1');
  });

  it('Apply FIFO rotation and display selected batches', () => {
    cy.intercept('GET', `${apiUrl}/batches/fifo*`, {
      statusCode: 200,
      body: [
        {
          externalId: '550e8400-e29b-41d4-a716-446655440001',
          batchNumber: 'SAV-20251101-001',
          quantityAvailable: 100,
          productionDate: '2025-10-31T10:00:00Z',
          expirationDate: '2025-11-07T10:00:00Z',
          daysUntilExpiration: 2,
          expirationStatus: 'CRITICAL',
          costPerUnit: 2.5,
          productId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    }).as('getFIFOBatches');

    cy.intercept('POST', `${apiUrl}/batches/fifo-rotate`, {
      statusCode: 200,
      body: [
        {
          batchExternalId: '550e8400-e29b-41d4-a716-446655440001',
          batchNumber: 'SAV-20251101-001',
          quantitySelected: 50,
          expirationDate: '2025-11-07T10:00:00Z',
          daysUntilExpiration: 2,
          costPerUnit: 2.5,
          totalCost: 125.0,
        },
      ],
    }).as('rotateFIFO');

    cy.visit('https://localhost:5124/batches/fifo');
    cy.get('[data-testid="product-select"]').select('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="quantity-input"]').type('50');
    cy.get('[data-testid="get-fifo-btn"]').click();
    cy.wait('@getFIFOBatches');
    cy.get('[data-testid="rotate-btn"]').click();
    cy.wait('@rotateFIFO');

    cy.get('[data-testid="selection-table"]').should('exist');
    cy.get('table tbody tr').first().should('contain', 'SAV-20251101-001');
    cy.contains('50 units').should('exist');
    cy.contains('$125.00').should('exist');
  });

  it('Show expiration info when clicking info button', () => {
    cy.intercept('GET', `${apiUrl}/batches/fifo*`, {
      statusCode: 200,
      body: [
        {
          externalId: '550e8400-e29b-41d4-a716-446655440001',
          batchNumber: 'SAV-20251101-001',
          quantityAvailable: 100,
          productionDate: '2025-10-31T10:00:00Z',
          expirationDate: '2025-11-07T10:00:00Z',
          daysUntilExpiration: 2,
          expirationStatus: 'CRITICAL',
          costPerUnit: 2.5,
          productId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    }).as('getFIFOBatches');

    cy.intercept('GET', `${apiUrl}/batches/550e8400-e29b-41d4-a716-446655440001/expiration-info`, {
      statusCode: 200,
      body: {
        batchExternalId: '550e8400-e29b-41d4-a716-446655440001',
        batchNumber: 'SAV-20251101-001',
        daysUntilExpiration: 2,
        isExpired: false,
        percentageTimeRemaining: 28.6,
        expirationStatus: 'CRITICAL',
        productionDate: '2025-10-31T10:00:00Z',
        expirationDate: '2025-11-07T10:00:00Z',
        quantityAvailable: 100,
      },
    }).as('getExpirationInfo');

    cy.visit('https://localhost:5124/batches/fifo');
    cy.get('[data-testid="product-select"]').select('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="quantity-input"]').type('50');
    cy.get('[data-testid="get-fifo-btn"]').click();
    cy.wait('@getFIFOBatches');
    cy.get('[data-testid="info-btn"]').first().click();
    cy.wait('@getExpirationInfo');

    cy.get('.mat-snack-bar-container').should('contain', '2 days remaining');
  });

  it('Handle API errors gracefully', () => {
    cy.intercept('GET', `${apiUrl}/batches/fifo*`, {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getFIFOBatchesError');

    cy.visit('https://localhost:5124/batches/fifo');
    cy.get('[data-testid="product-select"]').select('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="quantity-input"]').type('50');
    cy.get('[data-testid="get-fifo-btn"]').click();
    cy.wait('@getFIFOBatchesError');

    cy.get('.mat-snack-bar-container').should('contain', 'Error loading FIFO batches');
  });
});
