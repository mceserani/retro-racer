# Retro Racer — Documentazione tecnica

Questo documento descrive l'architettura del gioco, gli algoritmi principali
e come estenderlo. È pensato per chi vuole leggere o modificare il codice.

## Indice

1. [Scelte tecnologiche](#1-scelte-tecnologiche)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Architettura](#3-architettura)
4. [Ciclo di gioco](#4-ciclo-di-gioco)
5. [Il tracciato](#5-il-tracciato)
6. [Rendering pseudo-3D](#6-rendering-pseudo-3d)
7. [Fisica e collisioni](#7-fisica-e-collisioni)
8. [Traffico](#8-traffico)
9. [Regole: tempo, checkpoint, punteggio](#9-regole-tempo-checkpoint-punteggio)
10. [Grafica e audio procedurali](#10-grafica-e-audio-procedurali)
11. [Input](#11-input)
12. [Test](#12-test)
13. [Come modificare il gioco](#13-come-modificare-il-gioco)
14. [Pubblicazione](#14-pubblicazione)
15. [Limiti noti e sviluppi futuri](#15-limiti-noti-e-sviluppi-futuri)

---

## 1. Scelte tecnologiche

| Scelta | Motivazione |
|---|---|
| **HTML5 Canvas 2D + JavaScript (ES2015+)** | Gira in qualsiasi browser senza installazioni; distribuibile con GitHub Pages. |
| **Zero dipendenze, nessun build** | Il codice sorgente è esattamente ciò che gira nel browser: facile da leggere e modificare. |
| **Script classici, non moduli ES** | I moduli ES vengono bloccati quando la pagina è aperta da `file://`; con script classici il gioco parte con un doppio clic su `index.html`. |
| **Namespace globale `RR`** | Sostituisce i moduli: ogni file aggiunge una proprietà (`RR.Config`, `RR.Game`, …). |
| **Risoluzione interna 320×240** | Look da cabinato anni '80; il CSS ingrandisce il canvas con `image-rendering: pixelated`. |
| **Grafica e audio generati da codice** | Nessun asset esterno: niente licenze, niente caricamenti, repository leggero. |
| **Test con `node --test`** | Test runner integrato in Node.js, nessuna dipendenza da installare. |

## 2. Struttura del progetto

```
retro-racer/
├── index.html            pagina; carica gli script nell'ordine delle dipendenze
├── css/style.css         layout 4:3 responsive, pixel netti, effetto CRT
├── src/
│   ├── config.js         costanti di gioco, palette, dimensioni degli sprite
│   ├── utils.js          matematica pura: proiezione, easing, collisioni, RNG
│   ├── font.js           font bitmap 5x7 disegnato a pixel
│   ├── track.js          costruzione del circuito, checkpoint, scenario
│   ├── sprites.js        sprite e sfondi pixel art generati su canvas
│   ├── audio.js          motore e effetti sonori (Web Audio API)
│   ├── input.js          tastiera e touch
│   ├── game.js           stato, fisica, traffico, regole (senza DOM)
│   ├── renderer.js       disegno di mondo, sprite, HUD e schermate
│   └── main.js           avvio e ciclo principale
├── tests/                test automatici (Node.js)
└── docs/                 questa documentazione e il manuale utente
```

## 3. Architettura

```
                ┌────────────┐
   tastiera ───►│  Input     │── controls() ─────────┐
   touch    ───►│            │── onAction(...) ──┐   │
                └────────────┘                   ▼   ▼
                                             ┌──────────┐     ┌─────────┐
  Config, Util ─────────────────────────────►│  Game    │────►│  Audio  │
                ┌────────────┐               │ (logica) │     └─────────┘
                │  Track     │◄──────────────│          │
                │ (segmenti) │               └────┬─────┘
                └────────────┘                    │ stato (sola lettura)
                ┌────────────┐               ┌────▼─────┐
                │  Sprites   │──immagini────►│ Renderer │──► canvas 320x240
                └────────────┘               └──────────┘
```

Principi:

- **`Game` non conosce il DOM.** Audio e storage sono passati al costruttore e
  sono opzionali, quindi la logica gira identica in Node.js nei test.
- **`Renderer` legge lo stato del gioco ma non lo modifica** (tranne i dati di
  proiezione temporanei dei segmenti, ricalcolati a ogni frame).
- **`main.js` è l'unico punto di collegamento** fra browser e componenti.

### Macchina a stati (`Game.state`)

```
title ──Invio──► countdown ──3 s──► playing ──tempo = 0──► gameover
                                     │  ▲
                              P / Esc│  │P / Invio
                                     ▼  │
                                    paused
```

| Da | Evento | A |
|---|---|---|
| `title` | Invio / tocco | `countdown` |
| `countdown` | fine dei 3 secondi | `playing` |
| `playing` | P o Esc, scheda nascosta | `paused` |
| `paused` | P, Invio o tocco | `playing` |
| `paused` | Esc | `title` |
| `playing` | tempo esaurito | `gameover` |
| `gameover` | Invio / tocco (dopo 1,5 s) | `countdown` |
| `gameover` | Esc | `title` |

Nello stato `title` la pista scorre in modalità dimostrativa (`updateDemo`);
in `gameover` l'auto continua per inerzia fino a fermarsi.

## 4. Ciclo di gioco

`main.js` usa un **passo di simulazione fisso** (`C.STEP = 1/60 s`) con
accumulatore:

```js
accumulator += dt;                     // tempo reale trascorso (max 0,25 s)
while (accumulator >= C.STEP) {
  game.update(C.STEP, input.controls());
  accumulator -= C.STEP;
}
renderer.render(game);
```

La fisica è quindi identica su monitor a 60, 144 o 240 Hz. Il limite di
0,25 s evita la "spirale della morte" dopo che la scheda è stata in background.
Le animazioni di lampeggio dell'HUD usano il tempo reale (`performance.now()`).

## 5. Il tracciato

Il circuito (`track.js`) è un **anello di segmenti** lunghi
`SEGMENT_LENGTH = 200` unità. Ogni segmento contiene:

```js
{
  index,
  p1: { world: {x, y, z}, camera: {}, screen: {} },  // bordo vicino
  p2: { world: {x, y, z}, camera: {}, screen: {} },  // bordo lontano
  curve,      // curvatura (positiva = destra)
  sprites,    // oggetti a bordo pista { source, offset, w, collide }
  cars,       // auto attualmente nel segmento
  color,      // palette (chiaro/scuro alternati, start, checkpoint)
  fog, clip, looped                                   // dati di rendering
}
```

- Le **curve** non spostano i punti nel mondo (`x` è sempre 0): la curvatura
  viene accumulata in fase di disegno (vedi §6).
- Le **colline** sono le quote `y` dei punti.
- I tratti si aggiungono con `addRoad(enter, hold, leave, curve, height)`:
  la curvatura entra con `easeIn` ed esce con `easeInOut`, la quota segue
  `easeInOut` su tutto il tratto. Funzioni di comodo: `addStraight`,
  `addCurve`, `addHill`, `addSCurves`, `addLowRollingHills`, `addBumps`.
- `addDownhillToEnd` riporta la quota a 0 per chiudere l'anello senza scalini.
- Lo **scenario** (palme nella prima e ultima parte, pini nella zona
  collinare, cespugli, cartelloni) è piazzato con un generatore pseudo-casuale
  con seme fisso (`C.TRACK_SEED`): il tracciato è sempre identico.
- All'ingresso di ogni curva con `|curve| >= MEDIUM` vengono messi 4 cartelli
  con la freccia sul lato esterno, uno ogni 6 segmenti.

Lunghezza attuale: circa 2.900 segmenti (≈ 50 s a velocità massima).

## 6. Rendering pseudo-3D

### Proiezione

Ogni punto viene trasformato da coordinate mondo a coordinate camera e poi
proiettato sullo schermo (`Util.project`):

```
camera = world - cameraPos
scale  = cameraDepth / camera.z          cameraDepth = 1 / tan(FOV / 2)
screen.x = W/2 + scale * camera.x * W/2
screen.y = H/2 - scale * camera.y * H/2
screen.w = scale * ROAD_WIDTH * W/2       (metà larghezza della strada)
```

La camera sta a `CAMERA_HEIGHT` sopra la strada e `PLAYER_Z` dietro l'auto.

### Curve

Per ogni segmento, dal più vicino al più lontano, si accumula uno spostamento
orizzontale:

```js
x  = 0;
dx = -(baseSegment.curve * basePercent);
for (ogni segmento) {
  project(p1, playerX * ROAD_WIDTH - x, ...);
  project(p2, playerX * ROAD_WIDTH - x - dx, ...);
  x  += dx;
  dx += segment.curve;      // derivata seconda = curvatura
}
```

Lo spostamento cresce in modo quadratico con la distanza, quindi la strada
"piega" in modo credibile senza vera geometria 3D.

### Disegno della strada a scanline

Invece di poligoni (che il canvas sfuma ai bordi), ogni segmento viene
disegnato **riga per riga**, interpolando centro e larghezza fra `p1` e `p2`:
erba, cordoli, asfalto (o scacchi per start/checkpoint) e linee di corsia sono
semplici `fillRect` alti 1 pixel. Il risultato è un look a pixel netti.

### Colline e clipping

Si disegna **dal vicino al lontano** mantenendo `maxy`, la riga più alta
già coperta. Le righe di un segmento sotto `maxy` sono nascoste da una collina
più vicina e non vengono disegnate; i segmenti con `p2.y >= p1.y` (strada che
scende allontanandosi) vengono saltati.

### Sprite

Dopo la strada, sprite e auto sono disegnati **dal lontano al vicino**
(algoritmo del pittore). Ogni sprite usa la scala del suo segmento e viene
tagliato in basso alla riga `segment.clip` per sparire dietro i dossi.
L'auto del giocatore viene disegnata quando il ciclo arriva al suo segmento,
così risulta davanti agli oggetti più lontani e dietro a quelli più vicini.

### Nebbia e sfondi

- La nebbia è un velo del colore delle colline con opacità
  `1 - e^(-d² · FOG_DENSITY)`, dove `d` è la distanza normalizzata.
- Lo sfondo ha tre livelli: cielo fisso, sole e montagne lontane, colline
  vicine. I due livelli larghi 640 px si ripetono in orizzontale e scorrono in
  curva con velocità diverse (`FAR_SPEED`, `NEAR_SPEED`) per l'effetto parallasse.

## 7. Fisica e collisioni

Tutto in `Game.updatePlayer(dt, controls)`. Velocità massima:
`MAX_SPEED = SEGMENT_LENGTH / STEP` (un segmento per passo).

| Grandezza | Valore |
|---|---|
| Accelerazione | `MAX_SPEED / 5` (0 → max in 5 s) |
| Frenata | `-MAX_SPEED` |
| Decelerazione senza gas | `-MAX_SPEED / 5` |
| Fuori strada | `-MAX_SPEED / 2` finché la velocità supera `MAX_SPEED / 4` |
| Sterzo | `dx = dt · 2 · speedPercent` per passo |
| Forza centrifuga | `playerX -= dx · speedPercent · curve · CENTRIFUGAL` |

`playerX` è la posizione laterale in unità di mezza carreggiata: `-1..1` è
asfalto, oltre è erba (limitata a ±3).

**Collisioni**, sempre come sovrapposizione di intervalli 1D sull'asse x
(`Util.overlap`) nel segmento del giocatore:

- *Ostacoli a bordo pista* (solo fuori strada): larghezza
  `sprite.w × sprite.collide`; l'urto riporta la velocità a `MAX_SPEED / 5`,
  arretra l'auto all'inizio del segmento e fa tremare lo schermo.
- *Auto avversarie*: se il giocatore è più veloce e si sovrappone (80% della
  larghezza), la sua velocità diventa `car.speed² / speed` e viene
  posizionato subito dietro l'auto.

## 8. Traffico

Le auto (`Game.cars`) hanno `z`, `offset`, `speed`, `sprite`; ognuna è anche
registrata nell'array `cars` del segmento in cui si trova, così collisioni e
rendering guardano solo il segmento interessato.

A ogni passo `updateCarOffset` guarda 20 segmenti avanti: se l'auto sta per
raggiungere il giocatore o un'auto più lenta sulla stessa traiettoria, sterza
dalla parte libera con un'intensità proporzionale alla differenza di velocità
e inversamente proporzionale alla distanza. Se non ci sono ostacoli e l'auto è
vicina al bordo, rientra in carreggiata. Le auto oltre la distanza di disegno
non vengono simulate lateralmente (ottimizzazione).

Le nuove auto (inizio partita e a ogni giro) non compaiono mai nel campo
visivo del giocatore.

## 9. Regole: tempo, checkpoint, punteggio

- `track.checkpointZ` contiene le distanze dei checkpoint dall'inizio del giro;
  l'ultimo coincide con la linea di partenza (`START_INDEX + N` segmenti).
- `Game.traveled` è la **distanza totale non avvolta** percorsa; il checkpoint
  successivo viene superato quando
  `traveled + PLAYER_Z >= (lap - 1) · lunghezzaGiro + checkpointZ[next]`.
- Bonus tempo: `max(CHECKPOINT_BONUS_MIN, CHECKPOINT_BONUS - (lap - 1))`.
- **Sorpassi:** per ogni auto si memorizza la distanza relativa con segno
  (`wrapDelta`) dal giocatore; quando passa da `>= 0` a `< 0` è un sorpasso.
- Il record è salvato in `localStorage` (chiave `retro-racer.highscore`),
  tramite un wrapper che ignora gli errori se lo storage non è disponibile.

## 10. Grafica e audio procedurali

**Sprite** (`sprites.js`): ogni immagine è un piccolo canvas fuori schermo
disegnato con rettangoli (auto 40×22, camion 40×34, palma 32×56, striscione
160×64, …). Il renderer le scala con `imageSmoothingEnabled = false`. Le
dimensioni nel mondo sono in `C.SPRITES` (in unità di mezza carreggiata);
l'altezza deriva dalle proporzioni dell'immagine.

I profili di montagne e colline sono somme di sinusoidi con un numero intero
di periodi sulla larghezza, quindi l'immagine si ripete senza giunture.

**Font** (`font.js`): 5×7 pixel, glifi codificati come 7 numeri a 5 bit;
supporta cifre, lettere maiuscole e punteggiatura base (niente accenti).

**Audio** (`audio.js`), Web Audio API:

| Suono | Sintesi |
|---|---|
| Motore | dente di sega + onda quadra un'ottava sotto, filtro passa-basso; frequenza 45→215 Hz con la velocità |
| Semaforo | bip a onda quadra 440 Hz, "VIA" a 880 Hz |
| Urto / schianto | rumore bianco filtrato + tono che scende |
| Checkpoint / giro | arpeggio do-mi-sol-do |
| Sorpasso | due bip acuti |
| Game over | arpeggio discendente a onda triangolare |

Il contesto audio si crea al primo input (politica *autoplay* dei browser).

## 11. Input

`Input` distingue:

- **comandi continui** (`left`, `right`, `accelerate`, `brake`), letti con
  `controls()` a ogni passo;
- **azioni** (`start`, `pause`, `mute`, `back`, `tap`), notificate una volta
  per pressione (le ripetizioni automatiche della tastiera sono ignorate).

I tasti usano `KeyboardEvent.code`, quindi funzionano con qualsiasi layout
(WASD resta nella stessa posizione fisica anche su tastiere AZERTY).
Alla perdita del focus tutti i tasti vengono rilasciati.

## 12. Test

```bash
npm test            # oppure: node --test
```

I test (`tests/*.test.js`) caricano i moduli senza DOM tramite
`tests/helpers.js` e coprono:

- **utils**: avvolgimento, easing, proiezione, sovrapposizioni, RNG;
- **track**: continuità delle quote e chiusura dell'anello, determinismo,
  checkpoint, nessun ostacolo solido sulla carreggiata;
- **game**: transizioni di stato, accelerazione e frenata, sterzo, fuori
  strada, urti con ostacoli e auto, sorpassi, checkpoint e giri, game over e
  salvataggio del record, pausa, coerenza del traffico, una partita di 2
  minuti con pilota automatico senza valori non validi.

Il rendering, l'audio e l'input sono stati verificati manualmente in Chrome.

## 13. Come modificare il gioco

### Bilanciamento
Quasi tutto è in `src/config.js`: tempo iniziale, bonus, numero di auto,
punti, velocità, densità della nebbia, distanza di disegno.

### Cambiare il circuito
Modifica `Track.build()` in `src/track.js`, per esempio:

```js
this.addStraight(LENGTH.SHORT);
this.addCurve(LENGTH.MEDIUM, CURVE.HARD, HILL.LOW);   // curva destra in salita
this.addCurve(LENGTH.MEDIUM, -CURVE.HARD, -HILL.LOW); // curva sinistra in discesa
```

Lascia `addDownhillToEnd(...)` e un rettilineo come ultimi tratti, così
l'anello si chiude in piano. Cambiando `TRACK_SEED` cambia la disposizione
dello scenario.

### Aggiungere uno sprite
1. Scrivi una funzione di disegno in `src/sprites.js` e aggiungila a `images`
   in `build()` con una nuova chiave.
2. Aggiungi la chiave in `C.SPRITES` con larghezza `w` ed eventuale `collide`.
3. Piazzala con `this.addSprite(indice, 'CHIAVE', offset)` in `track.js`
   (offset negativo = a sinistra; |offset| > 1 = fuori strada).

### Nuovi colori
La palette è in `C.COLORS`; per un'ambientazione notturna basta cambiare
cielo, colline, nebbia ed erba.

## 14. Pubblicazione

Il sito è pubblicato con **GitHub Pages** dal branch `main`, cartella radice:
ogni push su `main` aggiorna https://mceserani.github.io/retro-racer/.
Non c'è alcun passaggio di build.

## 15. Limiti noti e sviluppi futuri

- Un solo circuito; si potrebbero aggiungere più tracciati o bivi come in *OutRun*.
- Le collisioni sono solo sull'asse laterale del segmento corrente: a velocità
  massima un ostacolo molto stretto può raramente essere "saltato".
- I comandi touch sono semplici zone dello schermo; non c'è supporto gamepad
  (la Gamepad API sarebbe un'aggiunta naturale in `input.js`).
- Possibili miglioramenti: classifica dei migliori 10 punteggi con iniziali,
  musica di sottofondo sintetizzata, cambio marcia, notte/pioggia, mappa del
  circuito nell'HUD.
