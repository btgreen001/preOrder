describe('Phase 4 - PIN Admin Management', () => {
  const BASE_URL = 'https://localhost:4200';
  const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  beforeEach(() => {
    cy.login('ba', 'password');
  });

  describe('PIN Admin Dashboard', () => {
    it('should display PIN admin dashboard with all sections', () => {
      cy.visit(`${BASE_URL}/pin-admin/dashboard`, { failOnStatusCode: false });
      cy.contains('h1', 'PIN Admin Dashboard').should('be.visible');
      
      // Check metric cards
      cy.contains('Total PIN Users').should('be.visible');
      cy.contains('Locked Users').should('be.visible');
      cy.contains('Total Failed Attempts').should('be.visible');
      cy.contains('Health Status').should('be.visible');
    });

    it('should load PIN users successfully', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 2,
            pinSetOn: new Date()
          },
          {
            userId: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            hasPinEnabled: true,
            isLocked: true,
            pinAttempts: 5,
            pinSetOn: new Date()
          }
        ]
      }).as('getUsersList');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getUsersList');

      cy.contains('Total PIN Users').parent().should('contain', '2');
      cy.contains('Locked Users').parent().should('contain', '1');
    });

    it('should display locked users list', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'locked-user',
            firstName: 'Locked',
            lastName: 'User',
            email: 'locked@example.com',
            hasPinEnabled: true,
            isLocked: true,
            pinAttempts: 5,
            pinSetOn: new Date()
          }
        ]
      }).as('getLockedUsers');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getLockedUsers');

      cy.contains('Locked User').should('be.visible');
      cy.contains('locked@example.com').should('be.visible');
    });

    it('should unlock a locked user', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'locked-user',
            firstName: 'Locked',
            lastName: 'User',
            email: 'locked@example.com',
            hasPinEnabled: true,
            isLocked: true,
            pinAttempts: 5,
            pinSetOn: new Date()
          }
        ]
      }).as('getLockedUsers');

      cy.intercept('POST', '**/api/PinAdmin/users/locked-user/unlock', {
        statusCode: 200,
        body: { message: 'User unlocked successfully' }
      }).as('unlockUser');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getLockedUsers');

      cy.get('[data-testid="unlock-locked-user"]').click();
      cy.wait('@unlockUser');

      cy.contains('successfully unlocked').should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('getUsersError');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getUsersError');

      cy.contains('Error loading dashboard').should('be.visible');
    });

    it('should display empty state when no locked users', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'active-user',
            firstName: 'Active',
            lastName: 'User',
            email: 'active@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 0,
            pinSetOn: new Date()
          }
        ]
      }).as('getActiveUsers');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getActiveUsers');

      cy.contains('Locked Users').parent().should('contain', '0');
      cy.contains('No locked users').should('be.visible');
    });

    it('should load recent audit logs', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.intercept('GET', '**/api/PinAdmin/audit-logs*', {
        statusCode: 200,
        body: [
          {
            auditLogId: 'log-1',
            action: 'RESET_PIN',
            details: 'Reset PIN for user user-1',
            performedBy: 'admin',
            loggedAt: new Date().toISOString()
          },
          {
            auditLogId: 'log-2',
            action: 'UNLOCK_USER',
            details: 'Unlocked user user-2',
            performedBy: 'admin',
            loggedAt: new Date().toISOString()
          }
        ]
      }).as('getAuditLogs');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getUsers');
      cy.wait('@getAuditLogs');

      cy.contains('Recent Activity').should('be.visible');
      cy.contains('RESET_PIN').should('be.visible');
      cy.contains('UNLOCK_USER').should('be.visible');
    });

    it('should display health status as Healthy when no locked users', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'user-1',
            firstName: 'Active',
            lastName: 'User',
            email: 'active@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 0,
            pinSetOn: new Date()
          }
        ]
      }).as('getHealthyUsers');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getHealthyUsers');

      cy.contains('Health Status').parent().should('contain', 'Healthy');
    });

    it('should have navigation buttons to other admin pages', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.intercept('GET', '**/api/PinAdmin/audit-logs*', {
        statusCode: 200,
        body: []
      }).as('getAuditLogs');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getUsers');
      cy.wait('@getAuditLogs');

      cy.get('[data-testid="manage-users-btn"]').should('be.visible');
      cy.get('[data-testid="audit-log-btn"]').should('be.visible');
      cy.get('[data-testid="sessions-btn"]').should('be.visible');
    });
  });

  describe('PIN User Management - CRUD Operations', () => {
    it('should load user management page with list of users', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 2,
            pinSetOn: new Date()
          }
        ]
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`, { failOnStatusCode: false });
      cy.wait('@getUsers');

      cy.contains('PIN User Management').should('be.visible');
      cy.contains('John Doe').should('be.visible');
      cy.contains('john@example.com').should('be.visible');
    });

    it('should display "Add New User" button on user management page', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      cy.get('[data-testid="add-user-btn"]').should('be.visible').should('contain', 'Add New User');
    });

    it('should create new PIN user successfully', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.intercept('POST', '**/api/PinAdmin/users', {
        statusCode: 201,
        body: {
          userId: 'new-user',
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          hasPinEnabled: true,
          isLocked: false,
          pinAttempts: 0,
          pinSetOn: new Date()
        }
      }).as('createUser');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      // Click add user button
      cy.get('[data-testid="add-user-btn"]').click();

      // Fill form fields
      cy.get('[data-testid="userId-input"]').type('new-user');
      cy.get('[data-testid="firstName-input"]').type('New');
      cy.get('[data-testid="lastName-input"]').type('User');
      cy.get('[data-testid="email-input"]').type('new@example.com');

      // Submit form
      cy.get('[data-testid="add-user-submit"]').click();
      cy.wait('@createUser');

      cy.contains('User created successfully').should('be.visible');
    });

    it('should display user status badges correctly', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'active-user',
            firstName: 'Active',
            lastName: 'User',
            email: 'active@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 0,
            pinSetOn: new Date()
          },
          {
            userId: 'locked-user',
            firstName: 'Locked',
            lastName: 'User',
            email: 'locked@example.com',
            hasPinEnabled: true,
            isLocked: true,
            pinAttempts: 5,
            pinSetOn: new Date()
          }
        ]
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      // Active user should have green badge
      cy.contains('Active User').parent().find('.status-badge.status-active').should('contain', 'ACTIVE');

      // Locked user should have red badge
      cy.contains('Locked User').parent().find('.status-badge.status-locked').should('contain', 'LOCKED');
    });

    it('should edit user details', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 2,
            pinSetOn: new Date()
          }
        ]
      }).as('getUsers');

      cy.intercept('PUT', '**/api/PinAdmin/users/user-1', {
        statusCode: 200,
        body: {
          userId: 'user-1',
          firstName: 'Jonathan',
          lastName: 'Doe',
          email: 'jonathan@example.com',
          hasPinEnabled: true,
          isLocked: false,
          pinAttempts: 2,
          pinSetOn: new Date()
        }
      }).as('updateUser');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      // Click edit button
      cy.contains('John Doe').parent().find('[data-testid="edit-user-btn"]').click();

      // Update fields
      cy.get('[data-testid="firstName-edit-input"]').clear().type('Jonathan');
      cy.get('[data-testid="email-edit-input"]').clear().type('jonathan@example.com');

      // Save changes
      cy.get('[data-testid="save-edit-btn"]').click();
      cy.wait('@updateUser');

      cy.contains('User updated successfully').should('be.visible');
    });

    it('should reset PIN with confirmation dialog', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 2,
            pinSetOn: new Date()
          }
        ]
      }).as('getUsers');

      cy.intercept('POST', '**/api/PinAdmin/users/user-1/reset-pin', {
        statusCode: 200,
        body: { newPin: '123456' }
      }).as('resetPin');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      // Click reset PIN button
      cy.contains('John Doe').parent().find('[data-testid="reset-pin-btn"]').click();

      // Confirm in dialog
      cy.get('[data-testid="confirm-reset-btn"]').click();
      cy.wait('@resetPin');

      cy.contains('PIN reset successfully').should('be.visible');
    });

    it('should validate required fields on add user form', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      // Click add user button
      cy.get('[data-testid="add-user-btn"]').click();

      // Try to submit without filling fields
      cy.get('[data-testid="add-user-submit"]').click();

      // Should show validation error
      cy.contains('User ID is required').should('be.visible');
      cy.contains('First name is required').should('be.visible');
      cy.contains('Email is required').should('be.visible');
    });

    it('should handle error when creating duplicate user', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.intercept('POST', '**/api/PinAdmin/users', {
        statusCode: 400,
        body: { error: 'User ID already exists' }
      }).as('createUserError');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      cy.get('[data-testid="add-user-btn"]').click();
      cy.get('[data-testid="userId-input"]').type('existing-user');
      cy.get('[data-testid="firstName-input"]').type('Test');
      cy.get('[data-testid="lastName-input"]').type('User');
      cy.get('[data-testid="email-input"]').type('test@example.com');

      cy.get('[data-testid="add-user-submit"]').click();
      cy.wait('@createUserError');

      cy.contains('User ID already exists').should('be.visible');
    });

    it('should display empty state when no users', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      cy.contains('No users found').should('be.visible');
    });

    it('should display user count correctly', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: [
          {
            userId: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 0,
            pinSetOn: new Date()
          },
          {
            userId: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 0,
            pinSetOn: new Date()
          },
          {
            userId: 'user-3',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob@example.com',
            hasPinEnabled: true,
            isLocked: false,
            pinAttempts: 0,
            pinSetOn: new Date()
          }
        ]
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      cy.contains('3 total users').should('be.visible');
    });
  });

  describe('PIN Admin Audit Logs', () => {
    it('should load audit logs with recent actions', () => {
      cy.intercept('GET', '**/api/PinAdmin/audit-logs*', {
        statusCode: 200,
        body: [
          {
            auditLogId: 'log-1',
            action: 'CREATE_USER',
            details: 'Created user john@example.com',
            performedBy: 'admin',
            loggedAt: new Date().toISOString()
          },
          {
            auditLogId: 'log-2',
            action: 'RESET_PIN',
            details: 'Reset PIN for user john@example.com',
            performedBy: 'admin',
            loggedAt: new Date().toISOString()
          }
        ]
      }).as('getAuditLogs');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getAuditLogs');

      cy.contains('CREATE_USER').should('be.visible');
      cy.contains('RESET_PIN').should('be.visible');
    });
  });

  describe('PIN Admin Routing', () => {
    it('should redirect to dashboard when accessing /pin-admin', () => {
      cy.visit(`${BASE_URL}/pin-admin`, { failOnStatusCode: false });
      cy.url().should('include', '/pin-admin/dashboard');
    });

    it('should navigate from dashboard to user management', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.intercept('GET', '**/api/PinAdmin/audit-logs*', {
        statusCode: 200,
        body: []
      }).as('getAuditLogs');

      cy.visit(`${BASE_URL}/pin-admin/dashboard`);
      cy.wait('@getUsers');
      cy.wait('@getAuditLogs');

      cy.get('[data-testid="manage-users-btn"]').click();
      cy.url().should('include', '/pin-admin/users');
    });

    it('should navigate from user management back to dashboard', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', {
        statusCode: 200,
        body: []
      }).as('getUsers');

      cy.visit(`${BASE_URL}/pin-admin/users`);
      cy.wait('@getUsers');

      cy.get('[data-testid="back-to-dashboard"]').click();
      cy.url().should('include', '/pin-admin/dashboard');
    });
  });

  describe('PIN Admin Security', () => {
    it('should require authentication for dashboard access', () => {
      cy.visit(`${BASE_URL}/pin-admin/dashboard`, { failOnStatusCode: false });
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should require authentication for user management access', () => {
      cy.visit(`${BASE_URL}/pin-admin/users`, { failOnStatusCode: false });
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should verify auth headers are included in API calls', () => {
      cy.intercept('GET', '**/api/PinAdmin/users', (req) => {
        expect(req.headers['authorization']).to.exist;
        expect(req.headers['authorization']).to.include('Bearer');
      }).as('getUsers');

      cy.login('ba', 'password');
      cy.visit(`${BASE_URL}/pin-admin/users`, { failOnStatusCode: false });
      cy.wait('@getUsers');
    });
  });
});
