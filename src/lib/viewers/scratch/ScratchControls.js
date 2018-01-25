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
        const dotSm = document.createElement('div');
        dotSm.classList.add('dot');
        lineSmItemEl.appendChild(dotSm);
        this.addSubMenuEvent(lineSmItemEl, CONTROL_EVENT.line.tiny);

        const lineMedItemEl = document.createElement('div');
        lineMedItemEl.classList.add('menu-item');
        lineMedItemEl.classList.add('line-item-md');
        lineMedItemEl.classList.add('selected');
        const dotMed = document.createElement('div');
        dotMed.classList.add('dot');
        lineMedItemEl.appendChild(dotMed);
        this.addSubMenuEvent(lineMedItemEl, CONTROL_EVENT.line.medium);

        const lineLargeItemEl = document.createElement('div');
        lineLargeItemEl.classList.add('menu-item');
        lineLargeItemEl.classList.add('line-item-lg');
        const dotLg = document.createElement('div');
        dotLg.classList.add('dot');
        lineLargeItemEl.appendChild(dotLg);
        this.addSubMenuEvent(lineLargeItemEl, CONTROL_EVENT.line.large);

        const lineMegaItemEl = document.createElement('div');
        lineMegaItemEl.classList.add('menu-item');
        lineMegaItemEl.classList.add('line-item-mg');
        const dotMg = document.createElement('div');
        dotMg.classList.add('dot');
        lineMegaItemEl.appendChild(dotMg);
        this.addSubMenuEvent(lineMegaItemEl, CONTROL_EVENT.line.mega);

        const eraseItemEl = document.createElement('div');
        eraseItemEl.classList.add('menu-item');
        eraseItemEl.classList.add('erase-item');
        this.addSubMenuEvent(eraseItemEl, CONTROL_EVENT.erase.enable);

        const eraserSVG = '<svg width="25" height="25" viewBox="0 0 550 550" ><g stroke="none"><path d="M372.586,460.16H254.974c10.961-10.961,212.791-212.791,224.214-224.215c23.128-23.128,23.128-60.76,0-83.887L352.222,25.091c-23.128-23.127-60.758-23.125-83.887,0.001L17.387,276.041c-23.18,23.18-23.185,60.704,0,83.887l126.965,126.965v0.001c11.442,11.441,26.432,17.211,41.46,17.333c0.162,0.003,0.32,0.025,0.484,0.025h186.291 c12.175,0,22.046-9.871,22.046-22.046C394.632,470.031,384.761,460.16,372.586,460.16z M299.513,56.271 c5.935-5.935,15.593-5.938,21.531,0l126.965,126.965c5.936,5.936,5.936,15.594,0,21.531L338.124,314.652L189.628,166.156 L299.513,56.271z M175.53,455.715L48.565,328.75c-5.95-5.947-5.951-15.579,0-21.531L158.45,197.334L306.946,345.83 L197.061,455.715C191.148,461.628,181.474,461.66,175.53,455.715z"/></g> </svg>'.trim();
        eraseItemEl.innerHTML = eraserSVG;

        controlEl.appendChild(lineSmItemEl);
        controlEl.appendChild(lineMedItemEl);
        controlEl.appendChild(lineLargeItemEl);
        controlEl.appendChild(lineMegaItemEl);
        controlEl.appendChild(eraseItemEl);

        this.controlsEl = controlEl;

        return controlEl;
    }

    addSubMenuEvent(el, eventName) {
        el.addEventListener('click', () => {
            if (eventName) {
                this.emit(eventName);
            }

            if (!el.classList.contains('selected')) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }

            if (el.classList.contains('erase-item')) {
                return;
            }

            this.controlsEl.childNodes.forEach((btn) => {
                btn.classList.remove('selected');
            });

            el.classList.add('selected');
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
