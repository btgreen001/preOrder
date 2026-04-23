describe('Phase 3.1 - Recipes, Batches & Waste Management', () => {
  const apiUrl = Cypress.env('apiUrl') || 'https://localhost:5124/api';

  const login = () => {
    cy.visit('/login', { timeout: 15000 });
    cy.wait(1000);
    cy.get('form', { timeout: 10000 }).should('exist');
    cy.get('input').eq(0).clear().type('ba');
    cy.get('input').eq(1).clear().type('password');
    cy.get('[data-testid="login-submit-button"]', { timeout: 10000 }).click();
    cy.wait(5000);
    cy.url({ timeout: 20000 }).should('not.include', '/login');
    cy.wait(3000);
  };

  beforeEach(() => {
    login();
  });

  describe('Recipe Management - Navigation & List', () => {
    it('should navigate to recipes list from dashboard', () => {
      cy.visit('/dashboard', { timeout: 10000 });
      cy.wait(2000);
      cy.get('a[routerLink="/recipes/list"]', { timeout: 10000 }).first().click();
      cy.url({ timeout: 10000 }).should('include', '/recipes/list');
      cy.wait(1000);
    });

    it('should load recipes list page successfully', () => {
      cy.visit('/recipes/list', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.recipe-list-container', { timeout: 10000 }).should('exist');
      cy.get('mat-card', { timeout: 10000 }).should('exist');
    });

    it('should have add recipe button on recipes list', () => {
      cy.visit('/recipes/list', { timeout: 10000 });
      cy.wait(2000);
      cy.get('[data-testid="add-recipe-btn"]', { timeout: 10000 }).should('exist').and('be.visible');
    });

    it('should navigate to recipe editor when add button clicked', () => {
      cy.visit('/recipes/list', { timeout: 10000 });
      cy.wait(2000);
      cy.get('[data-testid="add-recipe-btn"]', { timeout: 10000 }).click();
      cy.url({ timeout: 10000 }).should('include', '/recipes/add');
      cy.wait(1000);
    });
  });

  describe('Recipe Editor - Create & Update', () => {
    it('should load recipe editor for new recipe', () => {
      cy.visit('/recipes/add', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.recipe-editor-container', { timeout: 10000 }).should('exist');
      cy.get('form', { timeout: 10000 }).should('exist');
    });

    it('should have recipe form fields', () => {
      cy.visit('/recipes/add', { timeout: 10000 });
      cy.wait(2000);
      cy.get('form input', { timeout: 10000 }).should('have.length.greaterThan', 0);
      cy.get('form', { timeout: 10000 }).should('exist');
    });
  });

  describe('Batch Management - Navigation & List', () => {
    it('should navigate to batches list from dashboard', () => {
      cy.visit('/dashboard', { timeout: 10000 });
      cy.wait(2000);
      cy.get('a[routerLink="/batches/list"]', { timeout: 10000 }).first().click();
      cy.url({ timeout: 10000 }).should('include', '/batches/list');
      cy.wait(1000);
    });

    it('should load batches list page successfully', () => {
      cy.visit('/batches/list', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.batch-list-container', { timeout: 10000 }).should('exist');
      cy.get('mat-card', { timeout: 10000 }).should('exist');
    });

    it('should have add batch button on batches list', () => {
      cy.visit('/batches/list', { timeout: 10000 });
      cy.wait(2000);
      cy.get('[data-testid="add-batch-btn"]', { timeout: 10000 }).should('exist').and('be.visible');
    });
  });

  describe('Batch Editor - Create & Update', () => {
    it('should load batch editor for new batch', () => {
      cy.visit('/batches/add', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.batch-editor-container', { timeout: 10000 }).should('exist');
      cy.get('form', { timeout: 10000 }).should('exist');
    });

    it('should have batch form fields', () => {
      cy.visit('/batches/add', { timeout: 10000 });
      cy.wait(2000);
      cy.get('form input', { timeout: 10000 }).should('have.length.greaterThan', 0);
      cy.get('form', { timeout: 10000 }).should('exist');
    });
  });

  describe('Waste Management - Navigation & List', () => {
    it('should navigate to waste logger from dashboard', () => {
      cy.visit('/dashboard', { timeout: 10000 });
      cy.wait(2000);
      cy.get('a[routerLink="/waste/log"]', { timeout: 10000 }).first().click();
      cy.url({ timeout: 10000 }).should('include', '/waste/log');
      cy.wait(1000);
    });

    it('should load waste logger page successfully', () => {
      cy.visit('/waste/log', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.waste-logger-container', { timeout: 10000 }).should('exist');
      cy.get('form', { timeout: 10000 }).should('exist');
    });

    it('should load waste list page', () => {
      cy.visit('/waste/list', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.waste-list-container', { timeout: 10000 }).should('exist');
    });

    it('should load waste analytics page', () => {
      cy.visit('/waste/analytics', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.waste-analytics-container', { timeout: 10000 }).should('exist');
    });
  });

  describe('Dashboard Navigation', () => {
    it('should display all 7 navigation cards on dashboard', () => {
      cy.visit('/dashboard', { timeout: 10000 });
      cy.wait(2000);
      cy.get('.nav-grid', { timeout: 10000 }).should('exist');
      cy.get('.nav-card', { timeout: 10000 }).should('have.length', 7);
    });

    it('should have working links to all Phase 3.1 features', () => {
      cy.visit('/dashboard', { timeout: 10000 });
      cy.wait(2000);
      cy.get('a[routerLink="/recipes/list"]', { timeout: 10000 }).should('exist');
      cy.get('a[routerLink="/recipes/add"]', { timeout: 10000 }).should('exist');
      cy.get('a[routerLink="/batches/list"]', { timeout: 10000 }).should('exist');
      cy.get('a[routerLink="/batches/add"]', { timeout: 10000 }).should('exist');
      cy.get('a[routerLink="/waste/log"]', { timeout: 10000 }).should('exist');
      cy.get('a[routerLink="/waste/list"]', { timeout: 10000 }).should('exist');
      cy.get('a[routerLink="/waste/analytics"]', { timeout: 10000 }).should('exist');
    });
  });

  describe('Authentication', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.window().then((win) => {
        win.sessionStorage.clear();
        win.localStorage.clear();
      });
      cy.visit('/recipes/list', { failOnStatusCode: false });
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should include JWT token in API requests', () => {
      cy.intercept('GET', `${apiUrl}/recipes*`, (req) => {
        expect(req.headers.authorization).to.exist;
        expect(req.headers.authorization).to.match(/^Bearer /);
        req.reply({
          statusCode: 200,
          body: []
        });
      }).as('getRecipesWithAuth');

      cy.visit('/recipes/list', { timeout: 10000 });
      cy.wait('@getRecipesWithAuth');
    });
  });
});
