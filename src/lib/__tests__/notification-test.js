import Notification from '../notification';
let notif;

describe('Notification', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/notification-test.html');
        notif = new Notification(document.getElementById('test-notif-container'));
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('Notification()', () => {
        it('should have the right classes assigned', () => {
            assert.equal(notif.notificationEl.className, 'notification box-preview-is-hidden');
        });
        it('shouldn\'t have any message or button text', () => {
            assert.equal(notif.buttonEl.textContext, undefined);
            assert.equal(notif.messageEl.textContext, undefined);
        });
        it('should have the correct parent wrapper', () => {
            assert.notEqual(notif.notificationEl.parentNode, 'undefined');
            assert.equal(notif.notificationEl.parentNode.className, 'notifications-wrapper');
        });
    });
    describe('show()', () => {
        it('should properly show the notification', () => {
            notif.show('test', 'test');
            assert.equal(notif.notificationEl.className, 'notification');
        });
        it('should add text to both the button and the message', () => {
            notif.show('test', 'test');
            assert.equal(notif.messageEl.textContent, 'test');
            assert.equal(notif.buttonEl.textContent, 'test');
        });
        it('should not show button text if the notification is hidden and re-shown with no text', () => {
            notif.show('test', 'test');
            notif.hide();
            notif.show('test');
            assert.equal(notif.messageEl.textContent, 'test');
            assert.equal(notif.buttonEl.textContent, __('notification_button_default_text'));
        });
    });
    describe('hide()', () => {
        it('should be properly hidden', () => {
            notif.hide();
            assert.equal(notif.notificationEl.className, 'notification box-preview-is-hidden');
        });
    });
});