/* eslint-disable no-unused-expressions */
import AnnotationThread from '../AnnotationThread';
import Annotation from '../Annotation';
import * as annotatorUtil from '../annotatorUtil';
import * as constants from '../annotationConstants';
import { CLASS_HIDDEN } from '../../constants';

let thread;
const sandbox = sinon.sandbox.create();
let stubs = {};

describe('lib/annotations/AnnotationThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/AnnotationThread-test.html');

        thread = new AnnotationThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionID: '1',
            location: {},
            threadID: '2',
            thread: '1',
            type: 'point'
        });

        thread._dialog = {
            addListener: () => {},
            addAnnotation: () => {},
            destroy: () => {},
            setup: () => {},
            removeAllListeners: () => {},
            show: () => {},
            hide: () => {}
        };
        stubs.dialogMock = sandbox.mock(thread._dialog);

        thread._annotationService = {
            user: { id: '1' }
        };

        stubs.emit = sandbox.stub(thread, 'emit');
    });

    afterEach(() => {
        thread._annotationService = undefined;
        sandbox.verifyAndRestore();
        if (typeof stubs.destroy === 'function') {
            stubs.destroy();
            thread = null;
        }
        stubs = {};
    });

    describe('destroy()', () => {
        it('should unbind listeners and remove thread element and broadcast that the thread was deleted', () => {
            stubs.unbindCustom = sandbox.stub(thread, 'unbindCustomListenersOnDialog');
            stubs.unbindDOM = sandbox.stub(thread, 'unbindDOMListeners');

            thread.destroy();
            expect(stubs.unbindCustom).to.be.called;
            expect(stubs.unbindDOM).to.be.called;
            expect(stubs.emit).to.be.calledWith('threaddeleted');
        });
    });

    describe('hide()', () => {
        it('should hide the thread element', () => {
            thread.hide();
            expect(thread._element).to.have.class(CLASS_HIDDEN);
        });
    });

    describe('reset()', () => {
        it('should set the thread state to inactive', () => {
            thread.reset();
            expect(thread._state).to.equal(constants.ANNOTATION_STATE_INACTIVE);
        });
    });

    describe('showDialog()', () => {
        it('should setup the thread dialog if the dialog element does not already exist', () => {
            thread._dialog._element = null;
            stubs.dialogMock.expects('setup');
            stubs.dialogMock.expects('show');
            thread.showDialog();
        });

        it('should not setup the thread dialog if the dialog element already exists', () => {
            thread._dialog._element = {};
            stubs.dialogMock.expects('setup').never();
            stubs.dialogMock.expects('show');
            thread.showDialog();
        });
    });

    describe('hideDialog()', () => {
        it('should hide the thread dialog', () => {
            stubs.dialogMock.expects('hide');
            thread.hideDialog();
        });
    });

    describe('saveAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                create: () => {}
            };

            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [],
                annotationService,
                fileVersionID: '1',
                location: {},
                threadID: '2',
                thread: '1',
                type: 'point'
            });

            stubs.create = sandbox.stub(annotationService, 'create');
        });

        it('should save an annotation with the specified type and text', () => {
            stubs.create.returns(Promise.resolve({}));

            thread.saveAnnotation('point', 'blah');
            expect(stubs.create).to.be.calledWith(sinon.match({
                fileVersionID: '1',
                type: 'point',
                text: 'blah',
                threadID: '2',
                thread: '1'
            }));
            expect(thread.state).to.equal(constants.ANNOTATION_STATE_HOVER);
        });

        it('should delete the temporary annotation and broadcast an error if there was an error saving', (done) => {
            stubs.create.returns(Promise.reject());
            stubs.delete = sandbox.stub(thread, 'deleteAnnotation');

            thread.on('annotationcreateerror', () => {
                expect(stubs.delete).to.be.called;
                done();
            });

            thread.saveAnnotation('point', 'blah');
            expect(stubs.create).to.be.called;
        });
    });

    describe('deleteAnnotation()', () => {
        let annotationService;

        beforeEach(() => {
            annotationService = {
                delete: () => {}
            };

            stubs.annotation = {
                annotationID: 'someID',
                permissions: {
                    can_delete: true
                }
            };

            stubs.annotation2 = {
                annotationID: 'someID2',
                permissions: {
                    can_delete: false
                }
            };

            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [stubs.annotation],
                annotationService,
                fileVersionID: '1',
                location: {},
                threadID: '2',
                thread: '1',
                type: 'point'
            });

            thread._dialog = {
                addListener: () => {},
                addAnnotation: () => {},
                destroy: () => {},
                removeAllListeners: () => {},
                show: () => {},
                hide: () => {},
                removeAnnotation: () => {}
            };
            stubs.dialogMock = sandbox.mock(thread._dialog);

            stubs.delete = sandbox.stub(annotationService, 'delete');
            stubs.isPlain = sandbox.stub(annotatorUtil, 'isPlainHighlight');
            stubs.cancel = sandbox.stub(thread, 'cancelFirstComment');
            stubs.destroy = sandbox.stub(thread, 'destroy');
        });

        it('should destroy the thread if the deleted annotation was the last annotation in the thread', () => {
            thread.deleteAnnotation('someID', false);
            expect(stubs.destroy).to.be.called;
        });

        it('should remove the relevant annotation from its dialog if the deleted annotation was not the last one', () => {
            // Add another annotation to thread so 'someID' isn't the only annotation
            thread._annotations.push(stubs.annotation2);
            stubs.dialogMock.expects('removeAnnotation').withArgs('someID');
            thread.deleteAnnotation('someID', false);
        });

        it('should make a server call to delete an annotation with the specified ID if useServer is true', () => {
            stubs.delete.returns(Promise.resolve());
            thread.deleteAnnotation('someID', true);
            expect(stubs.delete).to.be.calledWith('someID');
        });

        it('should make also delete blank highlight comment from the server when removing the last comment on a highlight thread', () => {
            stubs.annotation2.permissions.can_delete = false;
            thread._annotations.push(stubs.annotation2);
            stubs.isPlain.returns(true);
            stubs.delete.returns(Promise.resolve());
            thread.deleteAnnotation('someID', true);
            expect(stubs.delete).to.be.calledWith('someID');
        });

        it('should not make a server call to delete an annotation with the specified ID if useServer is false', () => {
            stubs.delete.returns(Promise.resolve());
            thread.deleteAnnotation('someID', false);
            expect(stubs.delete).to.not.be.called;
        });

        it('should broadcast an error if there was an error deleting from server', (done) => {
            stubs.delete.returns(Promise.reject());
            thread.on('annotationdeleteerror', () => {
                done();
            });
            thread.deleteAnnotation('someID', true);
            expect(stubs.delete).to.be.called;
        });

        it('should toggle highlight dialogs with the delete of the last comment if user does not have permission to delete the entire annotation', () => {
            thread._annotations.push(stubs.annotation2);
            stubs.isPlain.returns(true);
            thread.deleteAnnotation('someID', false);
            expect(stubs.cancel).to.be.called;
            expect(stubs.destroy).to.not.be.called;
        });

        it('should destroy the annotation with the delete of the last comment if the user has permissions', () => {
            stubs.annotation2.permissions.can_delete = true;
            thread._annotations.push(stubs.annotation2);
            stubs.isPlain.returns(true);
            thread.deleteAnnotation('someID', false);
            expect(stubs.cancel).to.not.be.called;
            expect(stubs.destroy).to.be.called;
        });
    });

    describe('location()', () => {
        it('should get location', () => {
            expect(thread.location).to.equal(thread._location);
        });
    });

    describe('threadID()', () => {
        it('should get threadID', () => {
            expect(thread.threadID).to.equal(thread._threadID);
        });
    });

    describe('thread()', () => {
        it('should get thread', () => {
            expect(thread.thread).to.equal(thread._thread);
        });
    });

    describe('type()', () => {
        it('should get type', () => {
            expect(thread.type).to.equal(thread._type);
        });
    });

    describe('state()', () => {
        it('should get state', () => {
            expect(thread.state).to.equal(thread._state);
        });
    });

    describe('setup()', () => {
        beforeEach(() => {
            stubs.create = sandbox.stub(thread, 'createDialog');
            stubs.bind = sandbox.stub(thread, 'bindCustomListenersOnDialog');
            stubs.setup = sandbox.stub(thread, 'setupElement');
        });

        it('should setup dialog', () => {
            thread.setup();
            expect(stubs.create).to.be.called;
            expect(stubs.bind).to.be.called;
            expect(stubs.setup).to.be.called;
        });

        it('should set state to pending if thread is initialized with no annotations', () => {
            thread.setup();
            expect(thread._state).to.equal(constants.ANNOTATION_STATE_PENDING);
        });

        it('should set state to inactive if thread is initialized with annotations', () => {
            thread = new AnnotationThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [{}],
                annotationService: {},
                fileVersionID: '1',
                location: {},
                threadID: '2',
                thread: '1',
                type: 'point'
            });

            thread.setup();
            expect(thread._state).to.equal(constants.ANNOTATION_STATE_INACTIVE);
        });
    });

    describe('setupElement()', () => {
        it('should create element and bind listeners', () => {
            stubs.bind = sandbox.stub(thread, 'bindDOMListeners');

            thread.setupElement();
            expect(thread._element instanceof HTMLElement).to.be.true;
            expect(thread._element).to.have.class('bp-point-annotation-btn');
            expect(stubs.bind).to.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind DOM listeners', () => {
            thread._element = document.createElement('div');
            stubs.add = sandbox.stub(thread._element, 'addEventListener');

            thread.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('click', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            thread._element = document.createElement('div');
            stubs.remove = sandbox.stub(thread._element, 'removeEventListener');

            thread.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('click', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('bindCustomListenersOnDialog()', () => {
        it('should do nothing if dialog does not exist', () => {
            thread._dialog = null;
            stubs.dialogMock.expects('addListener').never();
            thread.bindCustomListenersOnDialog();
        });

        it('should bind custom listeners on dialog', () => {
            stubs.dialogMock.expects('addListener').withArgs('annotationcreate', sinon.match.func);
            stubs.dialogMock.expects('addListener').withArgs('annotationcancel', sinon.match.func);
            stubs.dialogMock.expects('addListener').withArgs('annotationdelete', sinon.match.func);
            thread.bindCustomListenersOnDialog();
        });
    });

    describe('unbindCustomListenersOnDialog()', () => {
        it('should do nothing if dialog does not exist', () => {
            thread._dialog = null;
            stubs.dialogMock.expects('removeAllListeners').never();
            thread.unbindCustomListenersOnDialog();
        });

        it('should unbind custom listeners from dialog', () => {
            stubs.dialogMock.expects('removeAllListeners').withArgs('annotationcreate');
            stubs.dialogMock.expects('removeAllListeners').withArgs('annotationcancel');
            stubs.dialogMock.expects('removeAllListeners').withArgs('annotationdelete');
            thread.unbindCustomListenersOnDialog();
        });
    });

    describe('createElement()', () => {
        it('should create an element with the right class and attribute', () => {
            const element = thread.createElement();
            expect(element).to.have.class('bp-point-annotation-btn');
            expect(element).to.have.attribute('data-type', 'annotation-indicator');
        });
    });

    describe('mouseoutHandler()', () => {
        it('should not call hideDialog if there are no annotations in the thread', () => {
            stubs.hide = sandbox.stub(thread, 'hideDialog');
            thread.mouseoutHandler();
            expect(stubs.hide).to.not.be.called;
        });

        it('should call hideDialog if there are annotations in the thread', () => {
            stubs.hide = sandbox.stub(thread, 'hideDialog');
            const annotation = new Annotation({
                fileVersionID: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            thread._annotations = [annotation];
            thread.mouseoutHandler();
            expect(stubs.hide).to.be.called;
        });
    });

    describe('saveAnnotationToThread()', () => {
        it('should push the annotation, and add to the dialog when the dialog exists', () => {
            stubs.add = sandbox.stub(thread._dialog, 'addAnnotation');
            stubs.push = sandbox.stub(thread._annotations, 'push');
            const annotation = new Annotation({
                fileVersionID: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            thread.saveAnnotationToThread(annotation);
            expect(stubs.add).to.be.calledWith(annotation);
            expect(stubs.push).to.be.calledWith(annotation);
        });

        it('should not try to push an annotation to the dialog if it doesn\'t exist', () => {
            stubs.add = sandbox.stub(thread._dialog, 'addAnnotation');
            const annotation = new Annotation({
                fileVersionID: '2',
                threadID: '1',
                type: 'point',
                text: 'blah',
                thread: '1',
                location: { x: 0, y: 0 },
                created: Date.now()
            });

            thread._dialog = undefined;
            thread.saveAnnotationToThread(annotation);
            expect(stubs.add).to.not.be.called;
        });
    });

    describe('createAnnotationDialog()', () => {
        it('should correctly create the annotation data object', () => {
            const annotationData = thread.createAnnotationData('highlight', 'test');
            expect(annotationData.location).to.equal(thread._location);
            expect(annotationData.fileVersionID).to.equal(thread._fileVersionID);
            expect(annotationData.thread).to.equal(thread._thread);
            expect(annotationData.user.id).to.equal('1');
        });
    });

    describe('createAnnotation()', () => {
        it('should create a new point annotation', () => {
            sandbox.stub(thread, 'saveAnnotation');
            thread.createAnnotation({ text: 'bleh' });
            expect(thread.saveAnnotation).to.be.calledWith(constants.ANNOTATION_TYPE_POINT, 'bleh');
        });
    });

    describe('deleteAnnotationWithID()', () => {
        it('should delete a point annotation with the matching annotationID', () => {
            sandbox.stub(thread, 'deleteAnnotation');
            thread.deleteAnnotationWithID({ annotationID: 1 });
            expect(thread.deleteAnnotation).to.be.calledWith(1);
        });
    });
});