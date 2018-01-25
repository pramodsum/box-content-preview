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
        enable: 'enable_pan'
    },
    erase: {
        enable: 'enable_erase'
    }
};

class ScratchControls extends EventEmitter {
    constructor(wrapperEl) {
        super();

        const controlEl = this.createHTML();
        wrapperEl.appendChild(controlEl);
    }

    createHTML() {
        const controlEl = document.createElement('div');
        controlEl.classList.add('bp-scratch-controls');

        const lineSmItemEl = document.createElement('div');
        lineSmItemEl.classList.add('menu-item');
        lineSmItemEl.classList.add('line-item-sm');
        this.addSubMenuEvent(lineSmItemEl, CONTROL_EVENT.line.tiny);

        const lineMedItemEl = document.createElement('div');
        lineMedItemEl.classList.add('menu-item');
        lineMedItemEl.classList.add('line-item-md');
        this.addSubMenuEvent(lineMedItemEl, CONTROL_EVENT.line.medium);

        const lineLargeItemEl = document.createElement('div');
        lineLargeItemEl.classList.add('menu-item');
        lineLargeItemEl.classList.add('line-item-lg');
        this.addSubMenuEvent(lineLargeItemEl, CONTROL_EVENT.line.large);

        const lineMegaItemEl = document.createElement('div');
        lineMegaItemEl.classList.add('menu-item');
        lineMegaItemEl.classList.add('line-item-mg');
        this.addSubMenuEvent(lineMegaItemEl, CONTROL_EVENT.line.mega);

        const eraseItemEl = document.createElement('div');
        eraseItemEl.classList.add('menu-item');
        eraseItemEl.classList.add('erase-item');
        this.addSubMenuEvent(eraseItemEl, CONTROL_EVENT.erase.enable);

        controlEl.appendChild(lineSmItemEl);
        controlEl.appendChild(lineMedItemEl);
        controlEl.appendChild(lineLargeItemEl);
        controlEl.appendChild(lineMegaItemEl);
        controlEl.appendChild(eraseItemEl);

        return controlEl;
    }

    addSubMenuEvent(el, eventName) {
        el.addEventListener('click', () => {
            if (eventName) {
                this.emit(eventName);
            }

            if (el.classList.contains('open')) {
                el.classList.remove('open');
            } else {
                el.classList.remove('open');
            }
        });
    }

    addSubMenuItem(parentEl, className, eventName) {
        const itemEl = document.createElement('div');
        itemEl.classList.add('menu-item');
        itemEl.classList.add(className);
        this.addSubMenuEvent(itemEl, this.emit.bind(this, eventName));
        parentEl.appendChild(itemEl);
    }
}

export default ScratchControls;
