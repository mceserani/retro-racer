/*
 * Retro Racer - gestione di tastiera e touch.
 *
 * I comandi "continui" (sterzo, gas, freno) sono letti a ogni passo di
 * simulazione con controls(); le azioni "a scatto" (Invio, pausa, audio...)
 * sono notificate una sola volta tramite la callback onAction.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Input = (function () {
  'use strict';

  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'accelerate', KeyW: 'accelerate',
    ArrowDown: 'brake', KeyS: 'brake'
  };

  const ACTIONS = {
    Enter: 'start', Space: 'start', NumpadEnter: 'start',
    KeyP: 'pause',
    KeyM: 'mute',
    Escape: 'back'
  };

  function emptyControls() {
    return { left: false, right: false, accelerate: false, brake: false };
  }

  class Input {
    constructor(keyTarget, touchTarget, onAction) {
      this.keys = emptyControls();
      this.touch = emptyControls();
      this.onAction = onAction || function () {};
      this.touchTarget = touchTarget;

      keyTarget.addEventListener('keydown', (e) => {
        const k = KEYS[e.code];
        const a = ACTIONS[e.code];
        if (k) {
          this.keys[k] = true;
          e.preventDefault();
        }
        if (a) {
          e.preventDefault();
          if (!e.repeat) this.onAction(a);
        }
      });
      keyTarget.addEventListener('keyup', (e) => {
        const k = KEYS[e.code];
        if (k) this.keys[k] = false;
      });
      // Se la finestra perde il focus i tasti non devono restare "premuti"
      keyTarget.addEventListener('blur', () => {
        this.keys = emptyControls();
      });

      if (touchTarget) {
        const onTouch = (e) => {
          e.preventDefault();
          this.updateTouches(e.touches);
        };
        touchTarget.addEventListener('touchstart', (e) => {
          onTouch(e);
          this.onAction('tap');
        }, { passive: false });
        touchTarget.addEventListener('touchmove', onTouch, { passive: false });
        touchTarget.addEventListener('touchend', onTouch, { passive: false });
        touchTarget.addEventListener('touchcancel', onTouch, { passive: false });
      }
    }

    /*
     * Schema touch: terzo sinistro = sterza a sinistra e accelera,
     * terzo destro = sterza a destra e accelera, centro in alto = accelera,
     * centro in basso = frena.
     */
    updateTouches(list) {
      const t = emptyControls();
      const rect = this.touchTarget.getBoundingClientRect();
      for (let i = 0; i < list.length; i++) {
        const rx = (list[i].clientX - rect.left) / rect.width;
        const ry = (list[i].clientY - rect.top) / rect.height;
        if (rx < 1 / 3) {
          t.left = true;
          t.accelerate = true;
        } else if (rx > 2 / 3) {
          t.right = true;
          t.accelerate = true;
        } else if (ry < 0.6) {
          t.accelerate = true;
        } else {
          t.brake = true;
        }
      }
      this.touch = t;
    }

    controls() {
      return {
        left: this.keys.left || this.touch.left,
        right: this.keys.right || this.touch.right,
        accelerate: this.keys.accelerate || this.touch.accelerate,
        brake: this.keys.brake || this.touch.brake
      };
    }
  }

  return Input;
})();
