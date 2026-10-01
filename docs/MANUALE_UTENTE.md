# Retro Racer — Manuale utente

Benvenuto al volante! Retro Racer è un gioco di corse arcade in stile anni '80:
guidi una spider rossa su un circuito tra spiagge e colline, sorpassi il traffico
e devi raggiungere ogni checkpoint prima che il tempo arrivi a zero.

---

## 1. Come avviare il gioco

### Online
Apri https://mceserani.github.io/retro-racer/ con un browser moderno.

### Sul tuo computer
1. Scarica il progetto da GitHub (*Code → Download ZIP*) ed estrai l'archivio,
   oppure clonalo con `git clone https://github.com/mceserani/retro-racer.git`.
2. Fai doppio clic su **`index.html`**. Il gioco si apre nel browser predefinito.

Non serve installare nulla e non serve una connessione Internet.

**Browser supportati:** versioni recenti di Chrome, Edge, Firefox e Safari.

> 💡 La prima volta che premi un tasto il browser attiva l'audio: è normale che
> la schermata del titolo sia silenziosa.

---

## 2. Comandi

### Tastiera

| Tasto | Azione |
|---|---|
| **↑** oppure **W** | Accelera |
| **↓** oppure **S** | Frena |
| **←** / **→** oppure **A** / **D** | Sterza a sinistra / destra |
| **Invio** oppure **Spazio** | Inizia la partita, riprende dalla pausa, rigioca dopo il game over |
| **P** | Mette in pausa / riprende |
| **M** | Attiva / disattiva l'audio (la scelta viene ricordata) |
| **Esc** | Durante la gara mette in pausa; in pausa o a fine partita torna al menu |

Se cambi scheda o finestra durante la gara, il gioco va in pausa da solo.

### Touch (tablet e smartphone)

Lo schermo di gioco è diviso in tre colonne:

```
+-----------+-----------+-----------+
|           | ACCELERA  |           |
|  SINISTRA |           |  DESTRA   |
| + accelera|-----------| + accelera|
|           |   FRENA   |           |
+-----------+-----------+-----------+
```

- Un tocco qualsiasi avvia la partita dalla schermata del titolo o dal game over.
- Un tocco durante la pausa fa ripartire la gara.

---

## 3. Regole del gioco

1. **Partenza:** dopo l'Invio parte il semaforo (3, 2, 1… **VIA!**). Durante il
   conto alla rovescia l'auto è ferma.
2. **Tempo:** si parte con **30 secondi**. Il contatore *TEMPO* in alto a sinistra
   scende continuamente; negli ultimi 10 secondi diventa rosso e lampeggia,
   negli ultimi 5 suona un bip ogni secondo.
3. **Checkpoint:** il circuito ha 3 checkpoint (striscioni gialli con la strada
   a scacchi gialli e neri) più il traguardo (striscione rosa *START*).
   Passandoci sotto guadagni secondi extra:
   - 1° giro: **+16 secondi** per checkpoint;
   - ogni giro successivo il bonus cala di 1 secondo, fino a un minimo di **9**.
4. **Giri:** passando sotto lo striscione *START* completi un giro. A ogni nuovo
   giro aumentano le auto in pista.
5. **Fine partita:** quando il tempo arriva a zero è **GAME OVER**. Premi Invio
   per rigiocare o Esc per tornare al menu.

### Guida

- **Curve:** la forza centrifuga spinge l'auto verso l'esterno, tanto più quanto
  vai veloce. Sterza per tempo! I cartelli gialli con la freccia annunciano le
  curve più strette.
- **Fuori strada:** sull'erba l'auto rallenta molto (non supera circa un quarto
  della velocità massima).
- **Ostacoli:** palme, pini, cartelli e cartelloni a bordo pista sono solidi:
  urtarli ti fa perdere quasi tutta la velocità. I cespugli si possono attraversare.
- **Traffico:** tamponare un'auto ti rallenta sotto la sua velocità. Le auto più
  veloci cercano di scansarti, i camion sono i più lenti.

---

## 4. Punteggio

| Azione | Punti |
|---|---|
| Distanza percorsa | circa 120 punti al secondo a velocità massima |
| Sorpasso di un'auto | **+100** |
| Checkpoint | **+1000 × numero del giro** |

Il **record** viene salvato nel browser e mostrato nel menu e durante la gara
(*REC*). Se lo superi, a fine partita compare **NUOVO RECORD!**

---

## 5. Schermo di gioco

```
TEMPO            PUNTI              GIRO
 25             0012345               2
            REC 0040000

               (messaggi:
            CHECKPOINT! +16 SEC)

210 KM/H
▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯   <- tachimetro (verde, giallo, rosso)
```

---

## 6. Consigli

- Tieni l'acceleratore sempre premuto: frenare serve quasi solo a evitare un
  tamponamento.
- In curva sposta l'auto verso l'interno **prima** di entrarci.
- Scegli la corsia libera da lontano: il traffico è più facile da evitare
  che da recuperare dopo un urto.
- L'ultimo quarto del giro ha le curve più strette: arrivaci con un po' di
  margine di tempo.

---

## 7. Problemi frequenti

| Problema | Soluzione |
|---|---|
| Non sento l'audio | Premi un tasto qualsiasi (il browser blocca l'audio prima di un'interazione); controlla che in basso a destra non ci sia *AUDIO OFF* (tasto **M**). |
| I tasti non rispondono | Fai clic sulla pagina del gioco per darle il focus. |
| Il record non viene salvato | Il browser potrebbe bloccare la memoria locale (navigazione privata o cookie disattivati). |
| Il gioco è troppo piccolo o troppo grande | Si adatta alla finestra: ridimensionala o usa la modalità a schermo intero del browser (F11). |
| Schermo nero | Verifica che JavaScript sia abilitato e che tutti i file del progetto siano nella stessa cartella di `index.html`. |
