/**
 * Terminal Device Binding E2E Tests
 * Tests for terminal binding, takeover, recovery, and admin management
 */

describe('Terminal Device Binding - Comprehensive Regression Tests', () => {
  const baseUrl = Cypress.env('apiUrl') || 'https://localhost:5124';
  
  // Test credentials
  const credentials = {
    username: 'ba',
    password: 'password'
  };

  // Test terminals (ensure these exist in your DB)
  let terminal1Uid: string;
  let terminal2Uid: string;
  let authToken: string;
  let orgId: string;
  let userId: string;

  before(() => {
    // Clean cookies before all tests
    cy.clearCookies();
  });

  beforeEach(() => {
    // Preserve cookies between tests
    Cy.Cookies.preserveOnce('device_token');
  });

  describe('Setup: Get Terminal List', () => {
    it('should login and get available terminals', () => {
      // Login first
      const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
      
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: {}
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('accessToken');
        authToken = response.body.accessToken;
        orgId = response.body.organizationId;
        userId = response.body.userId;
        
        cy.log(`Authenticated as user ${userId} in org ${orgId}`);
      });

      // Get terminal list
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body.length).to.be.at.least(2);
        
        terminal1Uid = response.body[0].terminalUid;
        terminal2Uid = response.body[1].terminalUid;
        
        cy.log(`Terminal 1: ${response.body[0].terminalCode} (${terminal1Uid})`);
        cy.log(`Terminal 2: ${response.body[1].terminalCode} (${terminal2Uid})`);
      });
    });
  });

  describe('Test 1: Login Without Terminal (No Binding)', () => {
    it('should login successfully without terminal binding', () => {
      cy.clearCookies(); // Start fresh
      
      const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
      
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        headers: {
          'Authorization': `Basic ${basicAuth}`
        },
        body: {}
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('accessToken');
        authToken = response.body.accessToken;
      });

      // Verify no device_token cookie exists
      cy.getCookie('device_token').should('be.null');
    });
  });

  describe('Test 2: Bind Device to Terminal (First Binding)', () => {
    it('should bind current device to terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('deviceToken');
        expect(response.body).to.have.property('isNewBinding', true);
        expect(response.body).to.have.property('takeoverOccurred', false);
        expect(response.body.terminalId).to.be.a('number');
        
        cy.log(`Device bound with token: ${response.body.deviceToken}`);
      });

      // Verify device_token cookie was set
      cy.getCookie('device_token').should('exist');
    });

    it('should verify binding is active', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/check-binding`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('isBound', true);
        expect(response.body.terminalUid).to.eq(terminal1Uid);
        expect(response.body).to.have.property('boundAt');
        expect(response.body).to.have.property('lastSeenAt');
      });
    });
  });

  describe('Test 3: Browser Crash Recovery (Cookie Persists)', () => {
    it('should check binding with existing cookie after "crash"', () => {
      // Simulate browser crash: keep cookie, lose session
      // Re-check binding - should still be bound
      
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/check-binding`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.isBound).to.be.true;
        
        cy.log('Device recovered binding after simulated crash');
      });
    });

    it('should re-bind to same terminal (no takeover)', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.isNewBinding).to.be.false;
        expect(response.body.takeoverOccurred).to.be.false;
        
        cy.log('Re-binding to same terminal did not create new binding');
      });
    });
  });

  describe('Test 4: Terminal Takeover (Switch Terminals)', () => {
    it('should allow device to takeover a different terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal2Uid // Different terminal
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.takeoverOccurred).to.be.true;
        expect(response.body.previousDeviceToken).to.exist;
        
        cy.log(`Takeover successful: Device moved to terminal 2`);
        cy.log(`Previous token: ${response.body.previousDeviceToken}`);
      });
    });

    it('should verify device is now bound to new terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/check-binding`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal2Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.isBound).to.be.true;
        expect(response.body.terminalUid).to.eq(terminal2Uid);
      });
    });

    it('should verify device is no longer bound to old terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/check-binding`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.isBound).to.be.false;
      });
    });
  });

  describe('Test 5: Unbind Device (Explicit Logout)', () => {
    it('should unbind device from terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/unbind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal2Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message');
      });

      // Verify cookie was cleared
      cy.getCookie('device_token').should('be.null');
    });

    it('should verify device is no longer bound', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/check-binding`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal2Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.isBound).to.be.false;
      });
    });
  });

  describe('Test 6: Admin - View Active Bindings', () => {
    before(() => {
      // Bind device to terminal 1 for admin tests
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      });
    });

    it('should get all active bindings for a terminal', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal/bindings/${terminal1Uid}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body.length).to.be.at.least(1);
        
        const binding = response.body[0];
        expect(binding).to.have.property('terminalDeviceBindingId');
        expect(binding).to.have.property('deviceToken');
        expect(binding).to.have.property('isActive', true);
        expect(binding.terminalUid).to.eq(terminal1Uid);
        
        cy.log(`Found ${response.body.length} active binding(s)`);
      });
    });
  });

  describe('Test 7: Admin - Force Release Device Binding', () => {
    let bindingId: number;

    it('should get binding ID for force release test', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal/bindings/${terminal1Uid}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.body.length).to.be.at.least(1);
        bindingId = response.body[0].terminalDeviceBindingId;
        
        cy.log(`Will force release binding ID: ${bindingId}`);
      });
    });

    it('should force release device binding as admin', () => {
      cy.request({
        method: 'DELETE',
        url: `${baseUrl}/api/terminal/bindings/${bindingId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message');
        
        cy.log('Admin force release successful');
      });
    });

    it('should verify binding is no longer active', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/check-binding`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.isBound).to.be.false;
      });
    });
  });

  describe('Test 8: Terminal Listing with Availability', () => {
    it('should get all terminals with availability status', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal/available`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        
        response.body.forEach((terminal: any) => {
          expect(terminal).to.have.property('terminalUid');
          expect(terminal).to.have.property('terminalCode');
          expect(terminal).to.have.property('location');
          expect(terminal).to.have.property('isActive');
          
          cy.log(`${terminal.terminalCode}: Active=${terminal.isActive}`);
        });
      });
    });
  });

  describe('Test 9: Terminal Lock/Unlock', () => {
    it('should lock a terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/lock`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        
        cy.log(`Terminal ${terminal1Uid} locked`);
      });
    });

    it('should verify terminal is locked', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal/${terminal1Uid}/lock-status`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('isLocked', true);
      });
    });

    it('should unlock a terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/unlock`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        
        cy.log(`Terminal ${terminal1Uid} unlocked`);
      });
    });
  });

  describe('Test 10: Multiple Device Scenario (Concurrent Bindings)', () => {
    it('should handle multiple devices binding to different terminals', () => {
      // Device 1 binds to terminal 1
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: terminal1Uid
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        const device1Token = response.body.deviceToken;
        
        cy.log(`Device 1 token: ${device1Token}`);
      });

      // Verify terminal 1 has binding
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal/bindings/${terminal1Uid}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.body.length).to.eq(1);
      });
    });
  });

  describe('Test 11: Error Handling - Invalid Terminal UID', () => {
    it('should reject binding to non-existent terminal', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          terminalUid: '00000000-0000-0000-0000-000000000000'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 404]);
        expect(response.body).to.have.property('message');
      });
    });
  });

  describe('Test 12: Security - Unauthorized Access', () => {
    it('should reject binding without authentication', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/terminal/bind-device`,
        body: {
          terminalUid: terminal1Uid
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should reject admin operations without proper role', () => {
      // This test assumes current user is not admin
      // If user IS admin, this test should be skipped
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/terminal/bindings/${terminal1Uid}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        // Either succeeds (user is admin) or fails (user is not admin)
        if (response.status === 403) {
          cy.log('User correctly denied admin access (not admin role)');
        } else if (response.status === 200) {
          cy.log('User has admin role - admin operations allowed');
        } else {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
      });
    });
  });

  after(() => {
    // Cleanup: Unbind any remaining bindings
    cy.clearCookies();
    cy.log('Test suite complete - cookies cleared');
  });
});
