describe('Test for Step actions from the canvas', () => {
    beforeEach(() => {
        cy.intercept('/v1/integrations/dsls').as('getDSLs');
        cy.intercept('/v1/view-definitions').as('getViewDefinitions');
        cy.intercept('/v1/integrations*').as('getIntegration');

        cy.openHomePage();
        cy.uploadInitialState('TimerLogCamelRoute.yaml');
    });

    it(' User inserts a step between two steps (+ button in between two nodes)', () => {
        cy.insertStepMiniCatalog('aggregate');
        cy.syncUpCodeChanges();

        // CHECK that the step is added between two steps
        cy.get('[data-testid="viz-step-aggregate"]').should('be.visible');
        // CHECK that stepNodes contains of the three steps
        cy.get('.stepNode').should('have.length', 3);
        // CHECK that stepNodes are in the correct order
        cy.get('.stepNode').eq(0).should('have.attr', 'data-testid', 'viz-step-timer');
        cy.get('.stepNode').eq(1).should('have.attr', 'data-testid', 'viz-step-aggregate');
        cy.get('.stepNode').eq(2).should('have.attr', 'data-testid', 'viz-step-log');
    });

    it('In an integration with at least two steps, user deletes the first step, showing a placeholder step in its place (start-end)', () => {
        cy.deleteStep('timer');
        cy.syncUpCodeChanges();

        // CHECK that the step is deleted
        cy.get('[data-testid="viz-step-timer"]').should('not.exist');
        // CHECK that stepNodes contains of the two steps
        cy.get('.stepNode').should('have.length', 2);
        // CHECK that stepNodes are in the correct order
        cy.get('.stepNode').eq(0).should('have.attr', 'data-testid', 'viz-step-slot');
        cy.get('.stepNode').eq(1).should('have.attr', 'data-testid', 'viz-step-log');
    });

    it('In an integration with at least two steps, user deletes the first step, showing a placeholder step in its place (start-action)', () => {
        cy.insertStepMiniCatalog('arangodb');
        cy.deleteStep('timer');
        cy.syncUpCodeChanges();

        // CHECK that the step is deleted
        cy.get('[data-testid="viz-step-timer"]').should('not.exist');
        // CHECK that stepNodes are in the correct order
        cy.get('.stepNode').eq(0).should('have.attr', 'data-testid', 'viz-step-slot');
        cy.get('.stepNode').eq(1).should('have.attr', 'data-testid', 'viz-step-arangodb');
        cy.get('.stepNode').eq(2).should('have.attr', 'data-testid', 'viz-step-log');
        // CHECK that stepNodes contains of the two steps
        cy.get('.stepNode').should('have.length', 3);
    });

    it('In an integration with at least two steps, user deletes the first step, showing a placeholder step in its place (start-action_EIP)', () => {
        cy.insertStepMiniCatalog('aggregate');
        cy.deleteStep('timer');
        cy.syncUpCodeChanges();

        // CHECK that the step is deleted
        cy.get('[data-testid="viz-step-timer"]').should('not.exist');
        // CHECK that stepNodes contains of the three steps
        cy.get('.stepNode').should('have.length', 3);
        // CHECK that stepNodes are in the correct order
        cy.get('.stepNode').eq(0).should('have.attr', 'data-testid', 'viz-step-slot');
        cy.get('.stepNode').eq(1).should('have.attr', 'data-testid', 'viz-step-aggregate');
        cy.get('.stepNode').eq(2).should('have.attr', 'data-testid', 'viz-step-log');
    });

    it('User appends a step(+ button to the right of the node)', () => {
        cy.deleteStep('log');
        cy.appendStepMiniCatalog('timer', 'aggregate');
        cy.appendStepMiniCatalog('aggregate', 'log', 'end');
        cy.syncUpCodeChanges();

        // CHECK that stepNodes are in the correct order
        cy.get('.stepNode').eq(0).should('have.attr', 'data-testid', 'viz-step-timer');
        cy.get('.stepNode').eq(1).should('have.attr', 'data-testid', 'viz-step-aggregate');
        cy.get('.stepNode').eq(2).should('have.attr', 'data-testid', 'viz-step-log');
        // CHECK that stepNodes contains of the three steps
        cy.get('.stepNode').should('have.length', 3);
    });

    it('Step Detail - User configures a normal step, which updates the YAML)', () => {
        cy.openStepConfigurationTab('log');

        // Enable checkbox "Log mask"
        cy.get('[name="logMask"]').click();
        // CHECK that the YAML is updated logMask: 'true'
        cy.checkCodeSpanLine('logMask', "'true'");

        // Disable checkbox "Log mask"
        cy.get('[name="logMask"]').click();
        // CHECK that the YAML is updated logMask: 'false'
        cy.checkCodeSpanLine('logMask', "'false'");

        // Change the value of the "groupDelay" integer field
        cy.get('[name="groupDelay"]').clear().type('15000');
        // CHECK that the YAML is updated groupDelay: 15000
        cy.checkCodeSpanLine('groupDelay', "15000");
    });
});