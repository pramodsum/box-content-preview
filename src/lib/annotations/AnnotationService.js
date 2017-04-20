import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import Annotation from './Annotation';
import { getHeaders } from '../util';

const ANONYMOUS_USER = {
    id: '0',
    name: __('annotation_anonymous_user_name')
};
const io = require('socket.io-client');

@autobind
class AnnotationService extends EventEmitter {

    //--------------------------------------------------------------------------
    // Static
    //--------------------------------------------------------------------------

    /**
     * Generates a rfc4122v4-compliant GUID, from
     * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript.
     *
     * @return {string} UUID for annotation
     */
    static generateID() {
        /* eslint-disable */
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        /* eslint-enable */
    }

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing an Annotation Service.
     * @typedef {Object} AnnotationServiceData
     * @property {string} apiHost API root
     * @property {string} fileId File ID
     * @property {string} token Access token
     * @property {boolean} canAnnotate Can user annotate
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationServiceData} data - Annotation Service data
     * @return {AnnotationService} AnnotationService instance
     */
    constructor(data) {
        super();
        this._api = data.apiHost;
        this._fileId = data.fileId;
        this._headers = getHeaders({}, data.token);
        this._canAnnotate = data.canAnnotate;
        this._user = ANONYMOUS_USER;
        this.versionId = data.fileVersionID;

        this.socket = io.connect('https://172.18.65.11:9001', {
            query: `fileID=${this._fileId}&fileVersionID=${this.versionId}&token=${data.token}`
        });

        this.socket.on('connect', () => {
            this.socket.on('oncreate', (response) => {
                const responseData = response.body;
                if (responseData.type !== 'error' && responseData.id) {
                    // @TODO(tjin): Remove this when responseData has permissions
                    const tempData = responseData;
                    tempData.permissions = {
                        can_edit: true,
                        can_delete: true
                    };
                    const createdAnnotation = this.createAnnotation(tempData);

                    // Set user if not set already
                    if (this._user.id === '0') {
                        this._user = createdAnnotation.user;
                    }

                    this.resolve(createdAnnotation);
                } else {
                    this.reject(new Error('Could not create annotation'));
                    this.emit('annotationerror', {
                        reason: 'create'
                    });
                }
            });

            this.socket.on('ondelete', (response) => {
                if (response.statusCode === 204) {
                    this.resolve();
                } else {
                    this.reject(new Error('Could not delete annotation'));
                    this.emit('annotationerror', {
                        reason: 'delete'
                    });
                }
            });

            this.socket.on('onfetch', (response) => {
                if (response.type === 'error' || !Array.isArray(response.entries)) {
                    this.reject(new Error(`Could not read annotations from file version with ID ${this.versionID}`));
                    this.emit('annotationerror', {
                        reason: 'read'
                    });
                } else {
                    response.entries.forEach((annotationData) => {
                        const tempData = annotationData;
                        tempData.permissions = {
                            can_edit: true,
                            can_delete: true
                        };
                        const createdAnnotation = this.createAnnotation(tempData);
                        this._annotations.push(createdAnnotation);
                    });

                    this.resolve(this._annotations);
                }
            });

            this.socket.on('update:create', (response) => {
                this.emit('onannotationcreate', response.body);
            });

            this.socket.on('update:delete', (response) => {
                this.emit('onannotationdelete', response.body);
            });

            this.socket.on('error', (error) => {
                this.emit('annotationerror', {
                    reason: error
                });
            });
        });

        this.socket.on('disconnect', () => {
            this.socket.disconnect();
        });
    }

    /**
     * Create an annotation.
     *
     * @param {Annotation} annotation - Annotation to save
     * @return {Promise} Promise that resolves with created annotation
     */
    create(annotation) {
        if (this.socket.disconnected) { return null; }

        this.createPromise = new Promise((success, failure) => {
            this.resolve = success;
            this.reject = failure;
        });

        this.socket.emit('create', {
            item: {
                type: 'file_version',
                id: annotation.fileVersionID
            },
            details: {
                type: annotation.type,
                location: annotation.location,
                threadID: annotation.threadID
            },
            message: annotation.text,
            thread: annotation.thread
        });

        return this.createPromise;
    }

    /**
     * Reads annotations from file version ID.
     *
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @return {Promise} Promise that resolves with fetched annotations
     */
    read() {
        if (this.socket.disconnected) { return null; }

        this._annotations = [];
        this.fetchPromise = new Promise((success, failure) => {
            this.resolve = success;
            this.reject = failure;
        });

        this.socket.emit('fetch');
        return this.fetchPromise;
    }

    /**
     * Delete an annotation.
     *
     * @param {string} annotationID - Id of annotation to delete
     * @return {Promise} Promise to delete annotation
     */
    delete(annotationID, threadID) {
        if (this.socket.disconnected) { return null; }

        this.deletePromise = new Promise((success, failure) => {
            this.resolve = success;
            this.reject = failure;
        });

        this.socket.emit('delete', { annotationID, threadID });
        return this.deletePromise;
    }

    /**
     * Gets a map of thread ID to annotations in that thread.
     *
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @return {Promise} Promise that resolves with thread map
     */
    getThreadMap(fileVersionID) {
        return this.read(fileVersionID).then(this.createThreadMap);
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets canAnnotate.
     *
     * @return {boolean} Whether or not user can create or modify annotations.
     */
    get canAnnotate() {
        return this._canAnnotate;
    }

    /**
     * Gets canDelete.
     *
     * @return {boolean} Whether or not user can create or modify annotations.
     */
    get canDelete() {
        return this._canDelete;
    }

    /**
     * Gets user.
     *
     * @return {Object} User object
     */
    get user() {
        return this._user;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Generates a map of thread ID to annotations in thread.
     *
     * @private
     * @param {Annotation[]} annotations - Annotations to generate map from
     * @return {Object} Map of thread ID to annotations in that thread
     */
    createThreadMap(annotations) {
        const threadMap = {};

        // Construct map of thread ID to annotations
        annotations.forEach((annotation) => {
            const threadID = annotation.threadID;
            threadMap[threadID] = threadMap[threadID] || [];
            threadMap[threadID].push(annotation);
        });

        // Sort annotations by date created
        Object.keys(threadMap).forEach((threadID) => {
            threadMap[threadID].sort((a, b) => {
                return new Date(a.created) - new Date(b.created);
            });
        });

        return threadMap;
    }

    /**
     * Generates an Annotation object from an API response.
     *
     * @private
     * @param {Object} data - API response data
     * @return {Annotation} Created annotation
     */
    createAnnotation(data) {
        return new Annotation({
            annotationID: data.id,
            fileVersionID: data.item.id,
            threadID: data.details.threadID,
            type: data.details.type,
            thread: data.thread,
            text: data.message,
            location: data.details.location,
            user: {
                id: data.created_by.id,
                name: data.created_by.name,
                avatarUrl: data.created_by.profile_image
            },
            permissions: data.permissions,
            created: data.created_at,
            modified: data.modified_at
        });
    }

    /**
     * Construct the URL to read annotations with a marker or limit added
     *
     * @private
     * @param {string} fileVersionID - File version ID to fetch annotations for
     * @param {string} marker - marker to use if there are more than limit annotations
     *  * @param {int} limit - the amout of annotations the API will return per call
     * @return {Promise} Promise that resolves with fetched annotations
     */
    getReadUrl(fileVersionID, marker = null, limit = null) {
        let apiUrl = `${this._api}/2.0/files/${this._fileId}/annotations?version=${fileVersionID}&fields=item,thread,details,message,created_by,created_at,modified_at,permissions`;
        if (marker) {
            apiUrl += `&marker=${marker}`;
        }

        if (limit) {
            apiUrl += `&limit=${limit}`;
        }

        return apiUrl;
    }
}
export default AnnotationService;
