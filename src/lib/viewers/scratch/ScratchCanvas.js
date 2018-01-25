import { CLASS_INVISIBLE } from '../../constants';

export const LINE_WIDTH = {
    tiny: 2,
    medium: 4,
    large: 8,
    mega: 16
};

class ScratchCanvas {
    canvas;
    ctx;

    minWidth = 0;
    minHeight = 0;

    lineWidth = LINE_WIDTH.tiny;

    constructor(wrapperEl) {
        this.wrapperEl = wrapperEl;
        this.canvas = wrapperEl.appendChild(document.createElement('canvas'));
        this.ctx = this.canvas.getContext('2d');

        this.minWidth = wrapperEl.scrollWidth;
        this.minHeight = wrapperEl.scrollHeight;
        this.resize();
    }

    resize(width = 0, height = 0) {
        // capture current state of whole canvas, to re-render after we're done resizing
        // since resizing ALWAYS clears the canvas.
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        this.minWidth = Math.max(this.minWidth, width, this.wrapperEl.scrollWidth);
        this.minHeight = Math.max(this.minHeight, height, this.wrapperEl.scrollHeight);

        this.canvas.width = this.minWidth;
        this.canvas.height = this.minHeight;

        this.ctx.putImageData(imageData, 0, 0);
    }

    setLineWidth(lineWidth) {
        this.lineWidth = lineWidth;
    }

    renderImage(image, x = 0, y = 0) {
        this.ctx.drawImage(image, x, y);
    }

    bezierTo(srcX, srcY, dstX, dstY) {
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.beginPath();
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(srcX, srcY);
        this.ctx.quadraticCurveTo((srcX + dstX) / 2, (srcY + dstY) / 2, dstX, dstY);
        this.ctx.stroke();
    }

    erase(x, y) {
        // this.ctx.clearRect(x - 8, y - 8, 16, 16);
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.lineWidth, 50, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
    }

    hide() {
        this.canvas.classList.add(CLASS_INVISIBLE);
    }

    show() {
        this.canvas.classList.remove(CLASS_INVISIBLE);
    }
}

export default ScratchCanvas;
