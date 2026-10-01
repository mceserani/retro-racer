/*
 * Retro Racer - avvio e ciclo principale.
 *
 * La simulazione avanza a passo fisso (1/60 s) indipendentemente dal
 * refresh del monitor; il disegno avviene una volta per frame.
 */
(function () {
  'use strict';

  const C = RR.Config;

  /* localStorage può essere assente o bloccato (es. navigazione privata). */
  const storage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* ignorato */ }
    }
  };

  const canvas = document.getElementById('game');
  canvas.width = C.WIDTH;
  canvas.height = C.HEIGHT;

  const audio = new RR.Audio(storage);
  const game = new RR.Game({ audio: audio, storage: storage, seed: Date.now() & 0xffffffff });
  const renderer = new RR.Renderer(canvas, RR.Sprites.build());

  const input = new RR.Input(window, document.getElementById('screen'), function (action) {
    audio.init();  // il primo input sblocca l'audio del browser
    switch (action) {
      case 'start': game.pressStart(); break;
      case 'pause': game.togglePause(); break;
      case 'mute': audio.toggleMute(); break;
      case 'back': game.back(); break;
      case 'tap': game.tap(); break;
    }
  });

  // Mette in pausa se la scheda viene nascosta
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) game.pause();
  });

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += dt;
    while (accumulator >= C.STEP) {
      game.update(C.STEP, input.controls());
      accumulator -= C.STEP;
    }
    renderer.render(game, { muted: audio.muted });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Accesso da console per il debug
  RR.game = game;
})();
