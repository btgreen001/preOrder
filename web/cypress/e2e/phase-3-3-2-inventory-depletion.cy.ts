// Phase 3.3.2 Inventory Depletion - E2E Tests
// Coverage: DepletionHistoryComponent, InventoryWarningsComponent, API integration

describe('Phase 3.3.2 Inventory Depletion', () => {
  const testUser = 'ba';
  const testPassword = 'password';
  const apiUrl = 'https://localhost:5124';

  beforeEach(() => {
    cy.visit('http://localhost:4200/login');
    cy.get('input[type="text"]').eq(0).type(testUser);
    cy.get('input[type="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    cy.wait(3000);
  });

  // Test 1: Navigate to Depletion History page
  it('displays depletion history page with product filter', () => {
    cy.visit('http://localhost:4200/inventory/depletion-history');
    cy.wait(2000);
    
    // Verify page elements
    cy.contains('h2', 'Depletion History').should('be.visible');
    cy.get('[data-testid="product-id-input"]').should('be.visible');
    cy.get('[data-testid="start-date-picker"]').should('be.visible');
    cy.get('[data-testid="end-date-picker"]').should('be.visible');
    cy.get('[data-testid="filter-button"]').should('be.visible');
    cy.get('[data-testid="depletion-table"]').should('be.visible');
  });

  // Test 2: Load depletion history for a product
  it('loads and displays depletion history when filter applied', () => {
    cy.visit('http://localhost:4200/inventory/depletion-history');
    cy.wait(2000);
    
    // Mock API response
    cy.intercept('GET', `${apiUrl}/api/inventory-depletion/history*`, {
      statusCode: 200,
      body: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          productName: 'Sourdough Bread',
          quantity: 5,
          unit: 'loaves',
          costImpact: 12.50,
          timestamp: '2025-11-06T10:00:00Z',
          recipe: 'Sourdough Master Recipe',
          notes: 'Morning batch production'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          productName: 'Sourdough Bread',
          quantity: 3,
          unit: 'loaves',
          costImpact: 7.50,
          timestamp: '2025-11-05T14:00:00Z',
          recipe: 'Sourdough Master Recipe',
          notes: 'Afternoon batch production'
        }
      ]
    }).as('getHistory');
    
    // Enter product ID and filter
    cy.get('[data-testid="product-id-input"]').type('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="filter-button"]').click();
    
    // Verify table displays data
    cy.wait('@getHistory');
    cy.get('[data-testid="depletion-table"] tbody tr').should('have.length', 2);
    cy.get('[data-testid="depletion-table"]').should('contain', 'Sourdough Bread');
    cy.get('[data-testid="depletion-table"]').should('contain', '5');
    cy.get('[data-testid="depletion-table"]').should('contain', '$12.50');
  });

  // Test 3: Filter depletion history by date range
  it('filters depletion history by date range', () => {
    cy.visit('http://localhost:4200/inventory/depletion-history');
    cy.wait(2000);
    
    cy.intercept('GET', `${apiUrl}/api/inventory-depletion/history*`, {
      statusCode: 200,
      body: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          productName: 'Sourdough',
          quantity: 5,
          unit: 'loaves',
          costImpact: 12.50,
          timestamp: '2025-11-06T10:00:00Z',
          recipe: 'Master Recipe',
          notes: 'Test'
        }
      ]
    }).as('getHistoryFiltered');
    
    // Set date range
    cy.get('[data-testid="start-date-picker"]').click();
    cy.get('[data-testid="date-day-1"]').click(); // Select 1st
    
    cy.get('[data-testid="end-date-picker"]').click();
    cy.get('[data-testid="date-day-30"]').click(); // Select 30th
    
    cy.get('[data-testid="filter-button"]').click();
    cy.wait('@getHistoryFiltered');
    cy.get('[data-testid="depletion-table"] tbody').should('not.be.empty');
  });

  // Test 4: Display inventory warnings page
  it('displays inventory warnings with all alert categories', () => {
    cy.visit('http://localhost:4200/inventory/warnings');
    cy.wait(2000);
    
    // Verify page elements
    cy.contains('h2', 'Inventory Warnings').should('be.visible');
    cy.get('[data-testid="refresh-button"]').should('be.visible');
    cy.get('[data-testid="low-stock-section"]').should('be.visible');
    cy.get('[data-testid="expiring-soon-section"]').should('be.visible');
    cy.get('[data-testid="expired-section"]').should('be.visible');
  });

  // Test 5: Load and categorize inventory alerts
  it('loads alerts and categorizes them correctly', () => {
    cy.visit('http://localhost:4200/inventory/warnings');
    cy.wait(2000);
    
    cy.intercept('GET', `${apiUrl}/api/inventory-depletion/alerts`, {
      statusCode: 200,
      body: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          itemName: 'Flour - All Purpose',
          sku: 'FLOUR-001',
          quantity: 5,
          unit: 'lbs',
          reorderPoint: 25,
          alertType: 'LOW_STOCK',
          metric: 5,
          severity: 'CRITICAL'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          itemName: 'Butter - Salted',
          sku: 'BUTT-001',
          quantity: 2,
          unit: 'lbs',
          reorderPoint: 10,
          alertType: 'EXPIRING_SOON',
          metric: 3,
          severity: 'HIGH'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          itemName: 'Eggs - Grade A',
          sku: 'EGGS-001',
          quantity: 0,
          unit: 'dozen',
          reorderPoint: 5,
          alertType: 'EXPIRED',
          metric: 0,
          severity: 'CRITICAL'
        }
      ]
    }).as('getAlerts');
    
    // Refresh to load alerts
    cy.get('[data-testid="refresh-button"]').click();
    cy.wait('@getAlerts');
    
    // Verify alerts are categorized
    cy.get('[data-testid="low-stock-section"]').should('contain', 'Flour - All Purpose');
    cy.get('[data-testid="expiring-soon-section"]').should('contain', 'Butter - Salted');
    cy.get('[data-testid="expired-section"]').should('contain', 'Eggs - Grade A');
  });

  // Test 6: Handle API errors gracefully
  it('displays error message when API returns error', () => {
    cy.visit('http://localhost:4200/inventory/warnings');
    cy.wait(2000);
    
    // Mock API error
    cy.intercept('GET', `${apiUrl}/api/inventory-depletion/alerts`, {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('getAlertsError');
    
    // Attempt to refresh
    cy.get('[data-testid="refresh-button"]').click();
    cy.wait('@getAlertsError');
    
    // Verify error notification
    cy.get('[data-testid="error-snackbar"]').should('be.visible');
    cy.get('[data-testid="error-snackbar"]').should('contain', 'Failed to load alerts');
  });

  // Test 7: Cost formatting displays correctly
  it('formats costs correctly in depletion history', () => {
    cy.visit('http://localhost:4200/inventory/depletion-history');
    cy.wait(2000);
    
    cy.intercept('GET', `${apiUrl}/api/inventory-depletion/history*`, {
      statusCode: 200,
      body: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          productName: 'Premium Cake',
          quantity: 1,
          unit: 'cake',
          costImpact: 25.50,
          timestamp: '2025-11-06T10:00:00Z',
          recipe: 'Premium Recipe',
          notes: 'Test'
        }
      ]
    }).as('getHistoryFormatting');
    
    cy.get('[data-testid="product-id-input"]').type('550e8400-e29b-41d4-a716-446655440000');
    cy.get('[data-testid="filter-button"]').click();
    cy.wait('@getHistoryFormatting');
    
    // Verify cost is formatted as currency
    cy.get('[data-testid="depletion-table"]').should('contain', '$25.50');
  });

  // Test 8: Empty state displays when no alerts
  it('displays empty state when no inventory alerts', () => {
    cy.visit('http://localhost:4200/inventory/warnings');
    cy.wait(2000);
    
    cy.intercept('GET', `${apiUrl}/api/inventory-depletion/alerts`, {
      statusCode: 200,
      body: []
    }).as('getEmptyAlerts');
    
    cy.get('[data-testid="refresh-button"]').click();
    cy.wait('@getEmptyAlerts');
    
    // Verify empty states
    cy.get('[data-testid="low-stock-empty"]').should('be.visible');
    cy.get('[data-testid="expiring-soon-empty"]').should('be.visible');
    cy.get('[data-testid="expired-empty"]').should('be.visible');
  });
});
