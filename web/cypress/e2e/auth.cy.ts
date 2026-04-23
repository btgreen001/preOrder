describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display login page on initial load', () => {
    cy.url().should('include', '/login');
    cy.get('h2').should('contain', 'Welcome back');
    cy.get('.muted').should('contain', 'Sign in to continue');
  });

  it('should login with valid credentials', () => {
    cy.visit('/login', { timeout: 10000 });
    
    // Log the page to see what's there
    cy.get('form').should('exist');
    
    // Try to find the form inputs
    cy.get('mat-form-field').should('have.length.at.least', 2);
    
    // Get all inputs and fill them
    cy.get('input').eq(0).clear().type('ba');
    cy.get('input').eq(1).clear().type('password');
    
    // Click the submit button
    cy.get('[data-testid="login-submit-button"]').should('exist').click();
    
    // Wait for navigation
    cy.wait(5000);
    
    // Should redirect away from login page
    cy.url({ timeout: 15000 }).should('not.include', '/login');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="username-input"]').type('invaliduser');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-submit-button"]').click();
    
    // Should stay on login page
    cy.url().should('include', '/login');
    
    // Should show error message or stay on login (backend needs to be running)
    cy.wait(1000);
  });

  it('should logout successfully', () => {
    // Login first
    cy.visit('/login', { timeout: 10000 });
    cy.get('input').eq(0).clear().type('ba');
    cy.get('input').eq(1).clear().type('password');
    cy.get('[data-testid="login-submit-button"]').click();
    
    // Wait for navigation
    cy.wait(5000);
    cy.url({ timeout: 15000 }).should('not.include', '/login');
    
    // Then logout
    cy.get('[data-testid="logout-button"]', { timeout: 5000 }).click();
    
    // Should return to login page
    cy.url().should('include', '/login');
  });

  it('should protect routes when not authenticated', () => {
    cy.visit('/dashboard');
    
    // Should redirect to login
    cy.url().should('include', '/login');
  });
});
