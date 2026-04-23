// ***********************************************************
// Cypress E2E support file
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Disable Chrome web security for testing with self-signed certs
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});
