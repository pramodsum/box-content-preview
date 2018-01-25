import EventEmitter from 'events';
import './ScratchControls.scss';

export const CONTROL_EVENT = {
    color: {},
    line: {
        tiny: 'tiny_line',
        medium: 'medium_line',
        large: 'large_line',
        mega: 'mega_line'
    },
    shape: {},
    pan: {
        toggle: 'toggle_pan'
    },
    erase: {}
}

class ScratchControls extends EventEmitter {

    constructor(wrapperEl) {
        super();

        const controlEl = this.createHTML();
        wrapperEl.appendChild(controlEl);
    }

    createHTML() {
        const controlEl = document.createElement('div');
        controlEl.classList.add('bp-scratch-controls');

        const openItemEl = document.createElement('div');
        openItemEl.classList.add('menu-item');
        openItemEl.classList.add('open-item');
        openItemEl.addEventListener('click', () => {
            if (controlEl.classList.contains('open')) {
                controlEl.classList.remove('open');
            } else {
                controlEl.classList.add('open');
            }
        });

        const colorItemEl = document.createElement('div');
        colorItemEl.classList.add('menu-item');
        colorItemEl.classList.add('color-item');

        const lineItemEl = document.createElement('div');
        lineItemEl.classList.add('menu-item');
        lineItemEl.classList.add('line-item');
        lineItemEl.addEventListener('click', this.emit.bind(this, CONTROL_EVENT.line.tiny));

        const shapeItemEl = document.createElement('div');
        shapeItemEl.classList.add('menu-item');
        shapeItemEl.classList.add('shape-item');

        const panItemEl = document.createElement('div');
        panItemEl.classList.add('menu-item');
        panItemEl.classList.add('pan-item');
        panItemEl.addEventListener('click', this.emit.bind(this, CONTROL_EVENT.pan.toggle));

        const eraseItemEl = document.createElement('div');
        eraseItemEl.classList.add('menu-item');
        eraseItemEl.classList.add('erase-item');

        controlEl.appendChild(openItemEl);
        controlEl.appendChild(colorItemEl);
        controlEl.appendChild(lineItemEl);
        controlEl.appendChild(shapeItemEl);
        controlEl.appendChild(panItemEl);
        controlEl.appendChild(eraseItemEl);

        return controlEl;
    }

    addSubMenuEvent(el, eventName) {
        el.addEventListener('click', () => {
            this.emit.bind(this, eventName);
            const prevOpen = el.parentNode.querySelector('> .open');
            if (prevOpen) {
                prevOpen.classList.remove('open');
            }
            el.classList.add('open');
        });
    }
}

export default ScratchControls;
