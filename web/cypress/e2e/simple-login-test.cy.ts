/// <reference types="cypress" />

describe('Simple Login Test', () => {
  const API_URL = 'https://localhost:5124/api';
  
  it('Should successfully log in and check redirect', () => {
    // Intercept login request
    cy.intercept('POST', `${API_URL}/auth/login`).as('loginRequest');
    
    // Visit login page
    cy.visit('/login');
    
    // Wait for page load
    cy.get('[data-testid="login-card"]', { timeout: 10000 }).should('be.visible');
    
    // Fill form
    cy.get('[data-testid="username-input"]').clear().type('ba');
    cy.get('[data-testid="password-input"]').clear().type('password');
    
    // Check button is enabled
    cy.get('[data-testid="login-submit-button"]').should('not.be.disabled');
    
    // Click button
    cy.get('[data-testid="login-submit-button"]').click();
    
    // Wait for request
    cy.wait('@loginRequest', { timeout: 15000 }).then((interception) => {
      cy.log('Login response:', JSON.stringify(interception.response?.body));
      expect(interception.response?.statusCode).to.equal(200);
    });
    
    // Check URL after login
    cy.url({ timeout: 10000 }).then((url) => {
      cy.log('Current URL:', url);
      if (url.includes('/terminal-selection')) {
        cy.log('✅ Redirected to terminal selection');
      } else if (url.includes('/dashboard')) {
        cy.log('✅ Redirected to dashboard (terminal context already exists)');
      } else {
        cy.log('❌ Unexpected URL:', url);
      }
    });
  });
});
