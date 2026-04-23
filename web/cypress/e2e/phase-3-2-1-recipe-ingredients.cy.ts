describe('Phase 3.2.1 - Recipe Ingredients', () => {
  const API_URL = 'https://localhost:5124';
  const FRONTEND_URL = 'https://localhost:4200';
  const TEST_CREDENTIALS = { username: 'ba', password: 'password' };

  let jwtToken: string;
  let recipeExternalId: string;
  let inventoryItemId: string;

  before(() => {
    // Login once for all tests
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/auth/login`,
      headers: {
        'Authorization': `Basic ${btoa(`${TEST_CREDENTIALS.username}:${TEST_CREDENTIALS.password}`)}`,
        'Content-Type': 'application/json'
      },
      body: {}
    }).then((response) => {
      expect(response.status).to.equal(200);
      jwtToken = response.body.accessToken;
      cy.log('JWT Token obtained:', jwtToken.substring(0, 20) + '...');
    });

    // Create a test recipe
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/recipes`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        recipeName: 'Test Recipe for Ingredients',
        description: 'Test recipe',
        productId: 2,
        YieldServingCnt: 10,
        yieldUnit: 'pieces',
        costPerUnit: 5.00
      }
    }).then((response) => {
      expect(response.status).to.equal(201);
      recipeExternalId = response.body.externalId;
      cy.log('Test recipe created:', recipeExternalId);
    });

    // Get first inventory item
    cy.request({
      method: 'GET',
      url: `${API_URL}/api/inventory`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.length).to.be.greaterThan(0);
      inventoryItemId = response.body[0].externalId;
      cy.log('First inventory item:', inventoryItemId);
    });
  });

  beforeEach(() => {
    // Login before each test
    cy.visit(`${FRONTEND_URL}/login`, { failOnStatusCode: false });
    cy.get('input[data-testid="username-input"]', { timeout: 5000 }).type(TEST_CREDENTIALS.username);
    cy.get('input[data-testid="password-input"]').type(TEST_CREDENTIALS.password);
    cy.get('button[data-testid="login-button"]').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
  });

  it('should display recipe ingredients page', () => {
    cy.visit(`${FRONTEND_URL}/recipes/edit/${recipeExternalId}/ingredients`, { failOnStatusCode: false });
    cy.contains('Recipe Ingredients', { timeout: 5000 }).should('be.visible');
    cy.get('button[data-testid="add-ingredient-btn"]').should('be.visible');
  });

  it('should add ingredient to recipe', () => {
    cy.visit(`${FRONTEND_URL}/recipes/edit/${recipeExternalId}/ingredients`, { failOnStatusCode: false });
    
    // Click add ingredient button
    cy.get('button[data-testid="add-ingredient-btn"]').click();
    cy.get('form[data-testid="add-ingredient-form"]', { timeout: 3000 }).should('be.visible');

    // Select inventory item
    cy.get('mat-select[data-testid="inventory-item-select"]').click();
    cy.get('mat-option').first().click();

    // Enter quantity
    cy.get('input[data-testid="quantity-input"]').clear().type('2.5');

    // Enter unit
    cy.get('input[data-testid="unit-input"]').clear().type('cups');

    // Enter cost per unit
    cy.get('input[data-testid="cost-input"]').clear().type('1.50');

    // Submit form
    cy.get('button[data-testid="submit-ingredient-btn"]').click();

    // Verify ingredient appears in table
    cy.get('table[data-testid="ingredients-table"]', { timeout: 5000 }).should('exist');
    cy.contains('2.5').should('be.visible');
    cy.contains('cups').should('be.visible');
  });

  it('should display empty state when no ingredients', () => {
    // Create a new recipe without ingredients
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/recipes`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        recipeName: 'Empty Recipe',
        description: 'Recipe with no ingredients',
        productId: 2,
        YieldServingCnt: 1,
        yieldUnit: 'piece',
        costPerUnit: 0
      }
    }).then((response) => {
      const emptyRecipeId = response.body.externalId;

      cy.visit(`${FRONTEND_URL}/recipes/edit/${emptyRecipeId}/ingredients`, { failOnStatusCode: false });
      cy.get('div[data-testid="empty-ingredients"]', { timeout: 5000 }).should('contain', 'No ingredients added yet');
    });
  });

  it('should remove ingredient from recipe', () => {
    // First add an ingredient
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/recipes/${recipeExternalId}/ingredients`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        inventoryItemExternalId: inventoryItemId,
        quantityRequired: 1.5,
        unit: 'pounds',
        costPerUnit: 2.00
      }
    }).then((response) => {
      expect(response.status).to.equal(201);
      const ingredientId = response.body.externalId;

      cy.visit(`${FRONTEND_URL}/recipes/edit/${recipeExternalId}/ingredients`, { failOnStatusCode: false });
      cy.get('table[data-testid="ingredients-table"]', { timeout: 5000 }).should('exist');

      // Click remove button
      cy.get(`button[data-testid="remove-${ingredientId}"]`).click();

      // Confirm deletion
      cy.on('window:confirm', () => true);

      // Verify ingredient removed
      cy.get(`button[data-testid="remove-${ingredientId}"]`, { timeout: 3000 }).should('not.exist');
    });
  });

  it('should handle API errors gracefully', () => {
    cy.visit(`${FRONTEND_URL}/recipes/edit/${recipeExternalId}/ingredients`, { failOnStatusCode: false });
    
    // Intercept and fail the add ingredient request
    cy.intercept('POST', '**/api/recipes/*/ingredients', {
      statusCode: 500,
      body: { message: 'Server error' }
    });

    cy.get('button[data-testid="add-ingredient-btn"]').click();
    cy.get('form[data-testid="add-ingredient-form"]', { timeout: 3000 }).should('be.visible');

    // Try to submit
    cy.get('mat-select[data-testid="inventory-item-select"]').click();
    cy.get('mat-option').first().click();
    cy.get('input[data-testid="quantity-input"]').clear().type('1');
    cy.get('button[data-testid="submit-ingredient-btn"]').click();

    // Verify error message appears
    cy.contains('Failed to add ingredient', { timeout: 5000 }).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit(`${FRONTEND_URL}/recipes/edit/${recipeExternalId}/ingredients`, { failOnStatusCode: false });
    
    cy.get('button[data-testid="add-ingredient-btn"]').click();
    cy.get('form[data-testid="add-ingredient-form"]', { timeout: 3000 }).should('be.visible');

    // Try to submit without selecting inventory item
    cy.get('button[data-testid="submit-ingredient-btn"]').click();

    // Verify error message
    cy.contains('Please fill in all required fields', { timeout: 3000 }).should('be.visible');
  });

  it('should calculate total cost correctly', () => {
    // Add ingredient via API
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/recipes/${recipeExternalId}/ingredients`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        inventoryItemExternalId: inventoryItemId,
        quantityRequired: 5,
        unit: 'ounces',
        costPerUnit: 2.50
      }
    }).then((response) => {
      expect(response.status).to.equal(201);
      // Total cost should be 5 * 2.50 = 12.50
      expect(response.body.totalCost).to.equal(12.50);

      cy.visit(`${FRONTEND_URL}/recipes/edit/${recipeExternalId}/ingredients`, { failOnStatusCode: false });
      cy.get('table[data-testid="ingredients-table"]', { timeout: 5000 }).should('exist');
      
      // Verify total cost is displayed
      cy.contains('$12.50').should('be.visible');
    });
  });

  afterEach(() => {
    // Cleanup - logout
    cy.visit(`${FRONTEND_URL}/dashboard`);
  });

  after(() => {
    // Cleanup - delete test recipe
    cy.request({
      method: 'DELETE',
      url: `${API_URL}/api/recipes/${recipeExternalId}`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }).then((response) => {
      expect(response.status).to.equal(204);
    });
  });
});
