/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../../image/image-point-dialog';
import * as annotatorUtil from '../../annotator-util';
import * as imageAnnotatorUtil from '../../image/image-annotator-util';

let pointDialog;
const sandbox = sinon.sandbox.create();

describe('image-point-dialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotation/__tests__/image/image-point-dialog-test.html');

        pointDialog = new ImagePointDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('position()', () => {
        it('should position the dialog at the right place and show it', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointDialog.position();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
        });
    });
});