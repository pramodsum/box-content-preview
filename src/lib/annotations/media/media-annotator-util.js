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
