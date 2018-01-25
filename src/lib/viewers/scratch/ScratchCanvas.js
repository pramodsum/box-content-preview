import { CLASS_INVISIBLE } from '../../constants';

class ScratchCanvas {
    canvas;
    ctx;

    constructor(wrapperEl) {
        this.wrapperEl = wrapperEl;
        this.canvas = wrapperEl.appendChild(document.createElement('canvas'));
        this.ctx = this.canvas.getContext('2d');

        this.resize(wrapperEl.offsetWidth, wrapperEl.offsetHeight);
    }

    resize(width, height) {
        if (width && height) {
            this.canvas.width = width;
            this.canvas.height = height;
        } else {
            this.resize(this.wrapperEl.offsetWidth, this.wrapperEl.offsetHeight);
        }
    }

    renderImage(x, y, image) {
        this.ctx.drawImage(image, x, y);
    }

    hide() {
        this.canvas.classList.add(CLASS_INVISIBLE);
    }

    show() {
        this.canvas.classList.remove(CLASS_INVISIBLE);
    }
}

export default ScratchCanvas;
