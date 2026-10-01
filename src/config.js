/*
 * Retro Racer - configurazione globale.
 * Tutte le costanti di gioco sono raccolte qui: modificare questi valori
 * è il modo più semplice per cambiare il bilanciamento del gioco.
 */
var RR = globalThis.RR || (globalThis.RR = {});

RR.Config = (function () {
  'use strict';

  const C = {
    // Schermo (risoluzione interna, poi ingrandita via CSS)
    WIDTH: 320,
    HEIGHT: 240,
    FPS: 60,

    // Strada e camera
    SEGMENT_LENGTH: 200,   // lunghezza di un segmento di strada (unità mondo)
    RUMBLE_LENGTH: 3,      // segmenti per ogni striscia bianca/rossa del cordolo
    ROAD_WIDTH: 2000,      // metà larghezza della strada (unità mondo)
    LANES: 3,
    FIELD_OF_VIEW: 100,    // gradi
    CAMERA_HEIGHT: 1000,
    DRAW_DISTANCE: 200,    // segmenti disegnati davanti alla camera
    FOG_DENSITY: 5,
    CENTRIFUGAL: 0.3,      // quanto le curve spingono l'auto verso l'esterno

    // Scorrimento dello sfondo in curva (frazione dell'immagine per segmento)
    FAR_SPEED: 0.0006,
    NEAR_SPEED: 0.0012,

    // Regole di gioco
    START_TIME: 30,            // secondi iniziali
    CHECKPOINTS_PER_LAP: 4,    // l'ultimo coincide con la linea del traguardo
    START_INDEX: 10,           // segmento della linea di partenza
    CHECKPOINT_BONUS: 16,      // secondi extra al checkpoint nel primo giro
    CHECKPOINT_BONUS_MIN: 9,   // il bonus cala di 1 s a giro fino a questo minimo
    CHECKPOINT_SCORE: 1000,    // punti per checkpoint (moltiplicati per il giro)
    OVERTAKE_BONUS: 100,       // punti per ogni sorpasso
    SCORE_PER_UNIT: 0.01,      // punti per unità di distanza percorsa
    COUNTDOWN: 3,              // secondi del semaforo iniziale
    BASE_CARS: 30,             // auto avversarie al primo giro
    CARS_PER_LAP: 8,           // auto aggiunte a ogni nuovo giro
    MAX_CARS: 80,
    MAX_KMH: 290,              // velocità massima mostrata nell'HUD
    TRACK_SEED: 1987,          // seme del generatore per gli elementi del tracciato

    STORAGE_KEY: 'retro-racer.highscore',
    MUTE_KEY: 'retro-racer.muted',

    // Palette
    COLORS: {
      SKY: ['#14072e', '#1f0a45', '#2d0f5a', '#45146d', '#63197a', '#862083',
            '#ab2b83', '#cf3a7c', '#ec5470', '#ff7a62', '#ff9f5a'],
      SUN: ['#fff27a', '#ffd84f', '#ffb840', '#ff9440', '#ff6f45', '#ff4f5a'],
      MOUNTAINS: '#6e2f7f',
      MOUNTAINS_LIGHT: '#8a3f8f',
      HILLS: '#4a2a63',
      FOG: '#4a2a63',
      LIGHT: { road: '#6b6b74', grass: '#2f8f3a', rumble: '#f2f2f2', lane: '#f2f2f2' },
      DARK: { road: '#62626b', grass: '#277a31', rumble: '#d8281e' },
      START: { road: '#f2f2f2', road2: '#1a1a1a', grass: '#2f8f3a', rumble: '#f2f2f2', checker: true },
      CHECKPOINT: { road: '#ffd23f', road2: '#1a1a1a', grass: '#2f8f3a', rumble: '#ffd23f', checker: true },
      HUD: '#ffffff',
      HUD_LABEL: '#ffd23f',
      HUD_SHADOW: '#1a0b3a',
      ACCENT: '#ff3d7f'
    },

    /*
     * Dimensioni degli sprite nel mondo, in unità di ROAD_WIDTH
     * (1 = metà larghezza della strada). "collide" è la frazione della
     * larghezza usata per le collisioni (0 = attraversabile).
     */
    SPRITES: {
      PLAYER_STRAIGHT: { w: 0.24 },
      PLAYER_LEFT: { w: 0.24 },
      PLAYER_RIGHT: { w: 0.24 },
      CAR_BLUE: { w: 0.24 },
      CAR_GREEN: { w: 0.24 },
      CAR_YELLOW: { w: 0.24 },
      CAR_WHITE: { w: 0.24 },
      TRUCK: { w: 0.3 },
      PALM: { w: 0.5, collide: 0.3 },
      PINE: { w: 0.45, collide: 0.3 },
      BUSH: { w: 0.35, collide: 0 },
      BILLBOARD1: { w: 0.9, collide: 0.9 },
      BILLBOARD2: { w: 0.9, collide: 0.9 },
      BILLBOARD3: { w: 0.9, collide: 0.9 },
      BILLBOARD4: { w: 0.9, collide: 0.9 },
      SIGN_LEFT: { w: 0.18, collide: 0.6 },
      SIGN_RIGHT: { w: 0.18, collide: 0.6 },
      BANNER_START: { w: 2.7, collide: 0 },
      BANNER_CHECK: { w: 2.7, collide: 0 }
    },

    CAR_SPRITES: ['CAR_BLUE', 'CAR_GREEN', 'CAR_YELLOW', 'CAR_WHITE', 'TRUCK'],
    BILLBOARDS: ['BILLBOARD1', 'BILLBOARD2', 'BILLBOARD3', 'BILLBOARD4']
  };

  // Valori derivati
  C.STEP = 1 / C.FPS;
  C.CAMERA_DEPTH = 1 / Math.tan((C.FIELD_OF_VIEW / 2) * Math.PI / 180);
  C.PLAYER_Z = C.CAMERA_HEIGHT * C.CAMERA_DEPTH;  // distanza auto-camera
  C.MAX_SPEED = C.SEGMENT_LENGTH / C.STEP;         // un segmento per frame
  C.ACCEL = C.MAX_SPEED / 5;
  C.BRAKING = -C.MAX_SPEED;
  C.DECEL = -C.MAX_SPEED / 5;
  C.OFF_ROAD_DECEL = -C.MAX_SPEED / 2;
  C.OFF_ROAD_LIMIT = C.MAX_SPEED / 4;

  return C;
})();
