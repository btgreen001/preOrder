describe('Navigation', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('[data-testid="username-input"]').clear().type('demo-pre-order');
    cy.get('[data-testid="password-input"]').clear().type('password');
    cy.get('[data-testid="login-submit-button"]').click();
    cy.url({ timeout: 15000 }).should('not.include', '/login');
  });

  it('should navigate to events from sidebar', () => {
    cy.get('aside.sidebar a[routerlink="/admin/events"], aside.sidebar a[href="/admin/events"]').first().click();
    cy.url().should('include', '/admin/events');
  });

  it('should navigate to orders from sidebar', () => {
    cy.get('aside.sidebar a[routerlink="/admin/orders"], aside.sidebar a[href="/admin/orders"]').first().click();
    cy.url().should('include', '/admin/orders');
    cy.contains('h1', 'Event Orders').should('be.visible');
  });

  it('should navigate to profile from sidebar', () => {
    cy.get('aside.sidebar a[routerlink="/profile"], aside.sidebar a[href="/profile"]').first().click();
    cy.url().should('include', '/profile');
  });

  it('should show logout control in top navigation', () => {
    cy.get('[data-testid="logout-button"]').should('be.visible');
  });
});
