describe('Orders Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').type('basic');
    cy.get('input[formcontrolname="password"]').type('password');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');

    // Navigate to orders
    cy.get('[data-testid="nav-orders"]').click();
    cy.url().should('include', '/orders');
  });

  it('should display orders list', () => {
    cy.get('[data-testid="orders-list"]').should('exist');
    cy.get('[data-testid="order-item"]').should('have.length.greaterThan', 0);
  });

  it('should display order details when clicking an order', () => {
    cy.get('[data-testid="order-item"]').first().click();
    cy.get('[data-testid="order-detail"]').should('be.visible');
    cy.get('[data-testid="order-id"]').should('exist');
    cy.get('[data-testid="order-total"]').should('exist');
  });

  it('should navigate back from order detail', () => {
    cy.get('[data-testid="order-item"]').first().click();
    cy.get('[data-testid="order-detail"]').should('be.visible');

    cy.get('[data-testid="back-button"]').click();
    cy.get('[data-testid="orders-list"]').should('be.visible');
  });

  it('should filter orders by status', () => {
    cy.get('[data-testid="status-filter"]').click();
    cy.get('[data-testid="filter-pending"]').click();
    cy.url().should('include', 'status=pending');
    cy.get('[data-testid="order-status"]').each(($el) => {
      cy.wrap($el).should('contain', 'Pending');
    });
  });

  it('should search for orders by order number', () => {
    cy.get('[data-testid="search-input"]').type('ORD-001');
    cy.get('[data-testid="search-button"]').click();
    cy.get('[data-testid="order-item"]').should('have.length', 1);
  });

  it('should create new order', () => {
    cy.get('[data-testid="create-order-button"]').click();
    cy.url().should('include', '/orders/add');

    // Fill order form
    cy.get('[data-testid="order-form"]').should('be.visible');
    cy.get('[data-testid="customer-select"]').click();
    cy.get('[data-testid="customer-option"]').first().click();

    cy.get('[data-testid="add-item-button"]').click();
    cy.get('[data-testid="product-select"]').first().click();
    cy.get('[data-testid="product-option"]').first().click();

    cy.get('[data-testid="submit-order"]').click();
    cy.url().should('include', '/orders');
  });

  it('should paginate through orders', () => {
    cy.get('[data-testid="next-page"]').click();
    cy.url().should('include', 'page=2');

    cy.get('[data-testid="prev-page"]').click();
    cy.url().should('include', 'page=1');
  });
});
