// <reference types="Cypress" />
describe('Preview Document Controls', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileId = Cypress.env('FILE_ID_DOC');

    beforeEach(() => {
        cy.visit('/');
        cy.showPreview(token, fileId);
        cy.getByTestId('current-page').as('currentPage');
        cy.getPreviewPage(1);
    });

    it('Should zoom in and out', () => {
        // Assert document content is present
        cy.contains('The Content Platform for Your Apps');
        // Get the current dimensions of the page
        cy.getPreviewPage(1).then(($page) => {
            cy.wrap($page[0].scrollWidth).as('originalWidth');
            cy.wrap($page[0].scrollHeight).as('originalHeight');
        });

        cy.showDocumentControls();

        cy.getByTitle('Zoom out').click();

        cy.getPreviewPage(1).then(($page) => {
            const zoomedOutWidth = $page[0].scrollWidth;
            const zoomedOutHeight = $page[0].scrollHeight;

            cy.get('@originalWidth').then((originalWidth) => expect(originalWidth).to.be.above(zoomedOutWidth));
            cy.get('@originalHeight').then((originalHeight) => expect(originalHeight).to.be.above(zoomedOutHeight));

            cy.wrap(zoomedOutWidth).as('zoomedOutWidth');
            cy.wrap(zoomedOutHeight).as('zoomedOutHeight');
        });

        cy.showDocumentControls();

        cy.getByTitle('Zoom in').click();

        cy.getPreviewPage(1).then(($page) => {
            const zoomedInWidth = $page[0].scrollWidth;
            const zoomedInHeight = $page[0].scrollHeight;

            cy.get('@zoomedOutWidth').then((zoomedOutWidth) => expect(zoomedOutWidth).to.be.below(zoomedInWidth));
            cy.get('@zoomedOutHeight').then((zoomedOutHeight) => expect(zoomedOutHeight).to.be.below(zoomedInHeight));
        });
    });

    it('Should handle page navigation via buttons', () => {
        cy.getPreviewPage(1).should('be.visible');
        cy.contains('The Content Platform for Your Apps');
        cy.get('@currentPage').invoke('text').should('equal', '1');

        cy.showDocumentControls();
        cy.getByTitle('Next page').click();

        cy.getPreviewPage(2).should('be.visible');
        cy.contains('Discover how your business can use Box Platform');
        cy.get('@currentPage').invoke('text').should('equal', '2');

        cy.showDocumentControls();
        cy.getByTitle('Previous page').click();

        cy.getPreviewPage(1).should('be.visible');
        cy.contains('The Content Platform for Your Apps');
        cy.get('@currentPage').invoke('text').should('equal', '1');
    });

    it('Should handle page navigation via input', () => {
        cy.getPreviewPage(1).should('be.visible');
        cy.contains('The Content Platform for Your Apps');
        cy.get('@currentPage').invoke('text').should('equal', '1');

        cy.showDocumentControls();
        cy.getByTitle('Click to enter page number').click();
        cy.getByTestId('page-num-input').should('be.visible').type('2').blur();

        cy.getPreviewPage(2).should('be.visible');
        cy.contains('Discover how your business can use Box Platform');
        cy.get('@currentPage').invoke('text').should('equal', '2');
    });

    // Fullscreen won't allow a non user gesture to trigger fullscreen
    // There is an open issue for cypress to allow this
    // https://github.com/cypress-io/cypress/issues/1213
    //
    // it('Should handle going fullscreen', () => {
    //     cy.getPreviewPage(1).should('be.visible');
    //     cy.contains('The Content Platform for Your Apps');
    //     cy.showDocumentControls();
    //     cy.getByTitle('Enter fullscreen').should('be.visible').click();
    //     cy.getByTitle('Exit fullscreen').should('be.visible');
    // });
});
