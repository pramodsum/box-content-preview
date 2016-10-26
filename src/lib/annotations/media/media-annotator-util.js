/**
 * @fileoverview Media annotator utility functions.
 * @author spramod
 */

 import * as annotatorUtil from '../annotator-util';
 import { SELECTOR_BOX_PREVIEW_BTN_ANNOTATE } from '../../constants';

 /**
  * Hides all annotations on the media. Also hides button in header that
  * enables point annotation mode
  *
  * @returns {void}
  */
 export function hideAllAnnotations() {
     const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
     const annotations = this._annotatedElement.getElementsByClassName('box-preview-point-annotation-btn');
     for (let i = 0; i < annotations.length; i++) {
         annotatorUtil.hideElement(annotations[i]);
     }
     annotatorUtil.hideElement(annotateButton);
 }

 /**
  * Shows all annotations on the media. Shows button in header that
  * enables point annotation mode
  *
  * @returns {void}
  */
 export function showAllAnnotations() {
     const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
     const annotations = this._annotatedElement.getElementsByClassName('box-preview-point-annotation-btn');
     for (let i = 0; i < annotations.length; i++) {
         annotatorUtil.showElement(annotations[i]);
     }
     annotatorUtil.showElement(annotateButton);
 }

 /**
  * Returns browser coordinates given an annotation location object and
  * the HTML element being annotated on.
  * @param {Object} location Annotation location object
  * @param {HTMLElement} annotatedElement HTML element being annotated on
  * @returns {number[]} [x,y] browser coordinates
  */
 export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
     const mediaEl = annotatedElement.querySelector('video');
     const wrapperDimensions = annotatedElement.getBoundingClientRect();
     const mediaDimensions = mediaEl.getBoundingClientRect();

     // Get media padding
     const topPadding = mediaDimensions.top - wrapperDimensions.top;
     const leftPadding = mediaDimensions.left - wrapperDimensions.left;

     // Adjust annotation location if media is rotated
     // todo(@spramod): Fix annotation locations on zoom when rotated
     let [x, y] = [location.x, location.y];

     // Add padding based on current zoom
     if (leftPadding >= 0) {
         x += leftPadding;
     }

     if (topPadding >= 0) {
         y += topPadding;
     }

     return [x, y];
 }
