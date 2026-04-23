describe('Navigation', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[formcontrolname="username"]').type('basic');
    cy.get('input[formcontrolname="password"]').type('password');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });

  it('should navigate to dashboard', () => {
    cy.get('[data-testid="nav-dashboard"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('h1').should('contain', 'Dashboard');
  });

  it('should navigate to orders page', () => {
    cy.get('[data-testid="nav-orders"]').click();
    cy.url().should('include', '/orders');
  });

  it('should navigate to inventory page', () => {
    cy.get('[data-testid="nav-inventory"]').click();
    cy.url().should('include', '/inventory');
  });

  it('should show user profile on menu click', () => {
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="user-profile"]').should('be.visible');
  });
});
