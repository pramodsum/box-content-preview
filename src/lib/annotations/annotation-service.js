/**
 * @fileoverview Annotations service that performs annotations CRUD using the
 * Box content API.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotation from './annotation';
import fetch from 'isomorphic-fetch';
import { getHeaders } from '../util';

const ANONYMOUS_USER = {
    id: 0,
    name: __('annotation_anonymous_user_name')
};

@autobind
class AnnotationService {

    //--------------------------------------------------------------------------
    // Static
    //--------------------------------------------------------------------------

    /**
     * Generates a rfc4122v4-compliant GUID, from
     * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript.
     *
     * @returns {string} UUID for annotation
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
     * @property {String} api API root
     * @property {String} fileID File ID
     * @property {String} token Access token
     * @property {Boolean} canAnnotate Can user annotate
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationServiceData} data Annotation Service data
     * @returns {AnnotationService} AnnotationService instance
     */
    constructor(data) {
        this._api = data.api;
        this._fileID = data.fileID;
        this._headers = getHeaders({}, data.token);
        this._canAnnotate = data.canAnnotate;
        this._user = ANONYMOUS_USER;
    }

    /**
     * Create an annotation.
     *
     * @param {Annotation} annotation Annotation to save
     * @returns {Promise} Promise that resolves with created annotation
     */
    create(annotation) {
        return new Promise((resolve, reject) => {
            fetch(`${this._api}/2.0/annotations`, {
                method: 'POST',
                headers: this._headers,
                body: JSON.stringify({
                    item: {
                        type: 'file_version',
                        id: annotation.fileVersionID
                    },
                    details: {
                        type: annotation.type,
                        location: annotation.location,
                        threadID: annotation.threadID
                    },
                    message: annotation.text
                })
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.type !== 'error' && data.id) {
                    // @TODO(tjin): Remove this when response has permissions
                    const tempData = data;
                    tempData.permissions = {
                        can_edit: true,
                        can_delete: true
                    };
                    const createdAnnotation = this._createAnnotation(tempData);

                    // Set user if not set already
                    if (this._user.id === 0) {
                        this._user = createdAnnotation.user;
                    }

                    resolve(createdAnnotation);
                } else {
                    reject(new Error('Could not create annotation'));
                }
            })
            .catch(() => {
                reject(new Error('Could not create annotation'));
            });
        });
    }

    /**
     * Reads annotations from file version ID.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with fetched annotations
     */
    read(fileVersionID) {
        return new Promise((resolve, reject) => {
            fetch(`${this._api}/2.0/files/${this._fileID}/annotations?version=${fileVersionID}&fields=item,details,message,created_by,created_at,modified_at,permissions`, {
                headers: this._headers
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.type === 'error') {
                    reject(new Error(`Could not read annotations from file version with ID ${fileVersionID}`));
                }

                if (data.entries) {
                    // @TODO(tjin) load more than 100 annotations
                    const annotations = [];
                    data.entries.forEach((annotationData) => {
                        annotations.push(this._createAnnotation(annotationData));
                    });
                    resolve(annotations);
                } else {
                    reject(new Error(`Could not read annotations from file version with ID ${fileVersionID}`));
                }
            })
            .catch(() => {
                reject(new Error(`Could not read annotations from file version with ID ${fileVersionID}`));
            });
        });
    }

    /**
     * Update an annotation.
     *
     * @param {Annotation} annotation Annotation to update
     * @returns {Promise} Promise that resolves with updated annotation
     */
    update(annotation) {
        const annotationData = annotation;
        const annotationID = annotationData.annotationID;

        return new Promise((resolve, reject) => {
            // @TODO(tjin): Call to annotations update API with annotationData

            reject(new Error(`Could not update annotation with ID ${annotationID}`));
        });
    }

    /**
     * Delete an annotation.
     *
     * @param {string} annotationID Id of annotation to delete
     * @returns {Promise} Promise to delete annotation
     */
    delete(annotationID) {
        return new Promise((resolve, reject) => {
            fetch(`${this._api}/2.0/annotations/${annotationID}`, {
                method: 'DELETE',
                headers: this._headers
            })
            .then((response) => {
                if (response.status === 204) {
                    resolve();
                } else {
                    reject(new Error(`Could not delete annotation with ID ${annotationID}`));
                }
            })
            .catch(() => {
                reject(new Error(`Could not delete annotation with ID ${annotationID}`));
            });
        });
    }

    /**
     * Gets a map of thread ID to annotations in that thread.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with thread map
     */
    getThreadMap(fileVersionID) {
        return this.read(fileVersionID).then(this._createThreadMap);
    }

    /**
     * Returns the annotation user.
     * @TODO(tjin): Update this with API for transactional annotation user
     * when available
     *
     * @returns {Promise} Promise to get annotation user
     */
    getAnnotationUser() {
        return new Promise((resolve, reject) => {
            fetch(`${this._api}/2.0/users/me`, {
                headers: this._headers
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.type !== 'error' && data.id) {
                    resolve({
                        id: data.id,
                        name: data.name
                    });
                } else {
                    reject(new Error('Could not get annotation user'));
                }
            })
            .catch(() => {
                reject(new Error('Could not get annotation user'));
            });
        });
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets canAnnotate.
     *
     * @returns {Boolean} Whether or not user can create or modify annotations.
     */
    get canAnnotate() {
        return this._canAnnotate;
    }

    /**
     * Gets user.
     *
     * @returns {Object} User object
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
     * @param {Annotation[]} annotations Annotations to generate map from
     * @returns {Object} Map of thread ID to annotations in that thread
     * @private
     */
    _createThreadMap(annotations) {
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
                return a.created - b.created;
            });
        });

        return threadMap;
    }

    /**
     * Generates an Annotation object from an API response.
     *
     * @param {Object} data API response data
     * @returns {Annotation} Created annotation
     * @private
     */
    _createAnnotation(data) {
        return new Annotation({
            annotationID: data.id,
            fileVersionID: data.item.id,
            threadID: data.details.threadID,
            type: data.details.type,
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
}

export default AnnotationService;