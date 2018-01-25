import { CLASS_INVISIBLE } from '../../constants';

class ScratchCanvas {
    canvas;
    ctx;

    minWidth = 0;
    minHeight = 0;

    constructor(wrapperEl) {
        this.wrapperEl = wrapperEl;
        this.canvas = wrapperEl.appendChild(document.createElement('canvas'));
        this.ctx = this.canvas.getContext('2d');

        this.minWidth = wrapperEl.scrollWidth;
        this.minHeight = wrapperEl.scrollHeight;
        this.resize();
    }

    resize(width, height) {
        // capture current state of whole canvas, to re-render after we're done resizing
        // since resizing ALWAYS clears the canvas.
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        this.minWidth = Math.max(this.minWidth, width || this.wrapperEl.scrollWidth);
        this.minHeight = Math.max(this.minHeight, height || this.wrapperEl.scrollHeight);

        this.canvas.width = this.minWidth;
        this.canvas.height = this.minHeight;

        this.ctx.putImageData(imageData, 0, 0);
    }

    renderImage(image, x = 0, y = 0) {
        this.ctx.drawImage(image, x, y);
    }

    bezierTo(srcX, srcY, dstX, dstY) {
        this.ctx.beginPath();
        this.ctx.moveTo(srcX, srcY);
        this.ctx.quadraticCurveTo(dstX, dstY, dstX, dstY);
        this.ctx.stroke();
    }

    hide() {
        this.canvas.classList.add(CLASS_INVISIBLE);
    }

    show() {
        this.canvas.classList.remove(CLASS_INVISIBLE);
    }
}

export default ScratchCanvas;
