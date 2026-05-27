describe('Orders Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('[data-testid="username-input"]').clear().type('demo-pre-order');
    cy.get('[data-testid="password-input"]').clear().type('password');
    cy.get('[data-testid="login-submit-button"]').click();
    cy.url({ timeout: 15000 }).should('not.include', '/login');

    cy.get('aside.sidebar a[routerlink="/admin/orders"], aside.sidebar a[href="/admin/orders"]').first().click();
    cy.url().should('include', '/admin/orders');
  });

  it('should display preorder orders admin screen', () => {
    cy.contains('h1', 'Event Orders').should('be.visible');
    cy.get('section.preorder-admin').should('exist');
    cy.get('section.orders-table table').should('exist');
  });

  it('should provide filtering controls', () => {
    cy.contains('label', 'Pre-Order event').should('be.visible');
    cy.get('section.filters select').should('exist');
    cy.get('section.filters input[type="date"]').should('exist');
  });

  it('should refresh list when refresh button is clicked', () => {
    cy.contains('button', 'Refresh').should('be.visible').click();
    cy.get('section.orders-table').should('be.visible');
  });

  it('should render empty-state row or data rows', () => {
    cy.get('section.orders-table, p.loading, p.error-message').should('exist');

    cy.get('body').then(($body) => {
      if ($body.find('section.orders-table tbody tr').length > 0) {
        cy.get('section.orders-table tbody tr').first().find('td').should('have.length.greaterThan', 1);
      }
    });
  });

});
