# Uitgebreide Uitleg van layoutAlgorithm.ts

## Overzicht

Dit bestand bevat de logica voor het genereren van willekeurige collage-layouts met behulp van **recursieve binaire partitionering**. In plaats van vaste posities in te stellen, wordt het canvas achtereenvolgens verdeeld in kleinere rechthoeken, telkens voor één foto. Dit zorgt ervoor dat:
- Elke foto precies één plek krijgt
- Het hele canvas wordt gebruikt (behalve marges en gaten)
- Geen ruimte verloren gaat

## Functie 1: `generateLayout()`

### Doel
Dit is de hoofdfunctie die door andere modules wordt aangeroepen. Ze bereid het canvas voor en roept de recursieve functie `partition()` aan.

### Parameters
```typescript
generateLayout(
  photos: Photo[],           // Array van foto-objecten
  collageWidth: number,      // Breedte van het gehele canvas in pixels
  collageHeight: number,     // Hoogte van het gehele canvas in pixels
  margin: number,            // Ruimte aan alle vier de zijden in pixels
  gap: number,               // Afstand tussen foto's in pixels
)
```

### Stap-voor-stap uitleg

**Regel 15-16: Lege controleren**
```typescript
if (photos.length === 0) return { placements: [], unplaced: [] };
```
Als er geen foto's zijn, geven we meteen een leeg resultaat terug. Dit voorkomt onnodige berekeningen.

**Regel 18-19: Werkruimte berekenen**
```typescript
const aw = collageWidth  - 2 * margin;
const ah = collageHeight - 2 * margin;
```
We trekken de marges af van twee zijden (links en rechts voor `aw`, boven en onder voor `ah`). Dit geeft ons de beschikbare werkruimte voor foto's.

Voorbeeld: Als het canvas 1000×800 pixels is en de marge is 20 pixels:
- `aw = 1000 - 40 = 960` pixels
- `ah = 800 - 40 = 760` pixels

**Regel 21-22: Ongeldig canvas controleren**
```typescript
if (aw <= 0 || ah <= 0) return { placements: [], unplaced: [...photos] };
```
Als de marge groter is dan het canvas, kunnen we geen foto's plaatsen. We markeren alle foto's als "ongeplaatst".

**Regel 25: Foto's shufflen (omwisselen)**
```typescript
const shuffled = [...photos].sort(() => Math.random() - 0.5);
```
Dit is essentieel voor willekeurigheid. Door de foto's in een willekeurige volgorde te zetten, creëren we elke keer een ander resultaat. De volgorde bepaalt welke foto's in welke regio's terechtkomen.

Voorbeeld van shufflen:
- Begin: `[foto1, foto2, foto3, foto4]`
- Na shufflen: `[foto3, foto1, foto4, foto2]` (willekeurig)

**Regel 27-30: Recursie starten**
```typescript
const placements: Placement[] = [];
partition(shuffled, margin, margin, aw, ah, gap, placements);

return { placements, unplaced: [] };
```
We starten de recursieve partitionering:
- `margin, margin` zijn de x- en y-coördinaten van de linkerbovenkant
- `aw, ah` zijn de breedte en hoogte van de werkruimte
- `placements` wordt gevuld met alle positiegegevens

---

## Functie 2: `partition()` - De Kern van het Algoritme

### Doel
Dit is een **recursieve functie** die een rechthoek steeds in twee delen verdeelt totdat elke foto zijn eigen rechthoek heeft.

### Hoe werkt recursie hier?

1. **Basisgeval**: Als er maar 1 foto is, plaats die in de huidige rechthoek en stop.
2. **Recursief geval**: Als er meer dan 1 foto is, verdeel de rechthoek in twee delen en roep jezelf opnieuw aan voor elk deel.

### Parameters
```typescript
partition(
  photos: Photo[],          // De foto's die in deze rechthoek passen
  x: number, y: number,     // Positie van linkerbovenkant
  w: number, h: number,     // Breedte en hoogte
  gap: number,              // Gat tussen onderdelen
  placements: Placement[],  // Verzameling van alle eindresultaten
)
```

### Stap-voor-stap uitleg van de logica

**Regel 48-49: Einde-check**
```typescript
if (photos.length === 0) return;
```
Als deze rechthoek geen foto's meer bevat, doen we niets en returnen we.

**Regel 51-53: Basisgeval - Één foto**
```typescript
if (photos.length === 1) {
  placements.push({ photo: photos[0], x, y, width: Math.max(1, w), height: Math.max(1, h) });
  return;
}
```
Als er nog slechts één foto is, voegen we die toe aan de lijst en stoppen we met recurseren.

**Regel 58-59: De "telverhoudingsfactor"**
```typescript
const countRatio = clamp(0.5 + (Math.random() - 0.5) * 0.5, 0.2, 0.8);
const splitIdx   = clamp(Math.round(n * countRatio), 1, n - 1);
```

Dit bepaalt hoe de foto's in twee groepen worden verdeeld:
- `Math.random() - 0.5` geeft een getal tussen -0.5 en 0.5
- Dit wordt met 0.5 vermenigvuldigd voor ± 25% variatie
- Dat tellen we op bij 0.5, waardoor het resultaat tussen 0.25 en 0.75 ligt
- `clamp()` zorgt dat het eindresultaat tussen 0.2 en 0.8 blijft

Voorbeeld met 10 foto's:
- Als `countRatio = 0.3`, dan `splitIdx = floor(10 × 0.3) = 3`
- Groep 1 krijgt foto's 0-2 (3 foto's)
- Groep 2 krijgt foto's 3-9 (7 foto's)

**Regel 65-67: Ruimteverhouding**
```typescript
const spatialRatio = clamp(
  splitIdx / n + (Math.random() - 0.5) * 0.3,
  0.2,
  0.8,
);
```

Dit bepaalt hoe groot elke groep wordt in **pixels**:
- `splitIdx / n` zou exact passen bij gelijke verdeling
- `(Math.random() - 0.5) * 0.3` voegt wat willekeurigheid toe
- Dit zorgt ervoor dat foto's organischer verdeeld worden

Voorbeeld:
- Als `splitIdx = 3` en `n = 10`, dan `splitIdx / n = 0.3`
- Als de werkbreedte 1000 pixels is, krijgt groep 1 ongeveer `1000 × 0.3 = 300` pixels
- Groep 2 krijgt `1000 - 300 - gap = ~700` pixels

**Regel 69-70: Twee groepen maken**
```typescript
const group1 = photos.slice(0, splitIdx);
const group2 = photos.slice(splitIdx);
```

Met `slice()` verdelen we de array zonder het origineel aan te passen:
- `photos.slice(0, 3)` haalt elementen 0, 1, 2
- `photos.slice(3)` haalt alles vanaf 3 tot het einde

---

## De Aspectratio-Logica

### Waarom is aspectratio belangrijk?

Als je een heel smalle foto probeert in een vierkante ruimte te plaatsen (met `object-fit: cover`), zal de foto zeer vergreid of samengeperst uitzien. We willen voorkomen dat:
- Een foto breder is dan 3.5:1 (35 pixels breed per 10 pixels hoog)
- Een foto hoger is als 3.5:1 (10 pixels breed per 35 pixels hoog)

### Verticale snede testen (regel 74-78)
```typescript
const w1_v = Math.round((w - gap) * spatialRatio);
const w2_v = w - gap - w1_v;
const aspectOkVertical = w1_v >= 1 && w2_v >= 1 &&
  (w1_v / h <= MAX_ASPECT_RATIO && h / w1_v <= MAX_ASPECT_RATIO) &&
  (w2_v / h <= MAX_ASPECT_RATIO && h / w2_v <= MAX_ASPECT_RATIO);
```

Dit test of we de rechthoek verticaal (linkerkant|rechterkant) kunnen verdelen:
1. Bereken de breedte van beide onderdelen
2. Controleer dat beide minstens 1 pixel breed zijn
3. Controleer dat de aspectratio's acceptabel zijn

**Aspectratio-controle:**
- `w1_v / h`: breedte-hoogteverhouding van deel 1
- `h / w1_v`: hoogte-breedteverhouding van deel 1 (omgekeerd)

Als beide ≤ 3.5 zijn, is de aspectratio acceptabel.

### Horizontale snede testen (regel 80-85)
```typescript
const h1_h = Math.round((h - gap) * spatialRatio);
const h2_h = h - gap - h1_h;
const aspectOkHorizontal = h1_h >= 1 && h2_h >= 1 &&
  (w / h1_h <= MAX_ASPECT_RATIO && h1_h / w <= MAX_ASPECT_RATIO) &&
  (w / h2_h <= MAX_ASPECT_RATIO && h2_h / w <= MAX_ASPECT_RATIO);
```

Dit doet hetzelfde voor horizontale verdeling (boven|onder).

---

## De Beslissing: Welke Kant Snijden?

### Geval 1: Alleen verticaal is veilig
```typescript
if (aspectOkVertical && !aspectOkHorizontal) {
  cutVertical = true;
```
Alleen verticale sneden voldoen aan de aspectratio-eisen, dus kiezen we die.

### Geval 2: Alleen horizontaal is veilig
```typescript
} else if (aspectOkHorizontal && !aspectOkVertical) {
  cutVertical = false;
```

### Geval 3: Beide zijn veilig
```typescript
} else if (aspectOkVertical && aspectOkHorizontal) {
  cutVertical = w >= h
    ? Math.random() < 0.65   // breed gebied → vooral links|rechts sneden
    : Math.random() < 0.35;  // slank gebied → vooral boven|onder sneden
```

Dit is een heuristiek (hoofdregel) voor organische layouts:
- Als het gebied breder dan hoog is, snijden we meestal links/rechts
- Als het gebied hoger dan breed is, snijden we meestal boven/onder
- Het `Math.random()` voegt nog wat willekeurigheid toe

### Geval 4: Geen van beide is veilig
```typescript
} else {
  cutVertical = w > h;
}
```

In extreme situaties kiezen we het minst slechte:
- Breed gebied → verticale snede (maakt smalere onderdelen)
- Hoog gebied → horizontale snede (maakt lagere onderdelen)

---

## Uitvoering van de Snede

### Verticale snede (regel 105-115)
```typescript
if (cutVertical) {
  const w1 = Math.round((w - gap) * spatialRatio);
  const w2 = w - gap - w1;
  if (w1 < 1 || w2 < 1) {
    photos.forEach(p => placements.push({ photo: p, x, y, width: w, height: h }));
    return;
  }
  partition(group1, x,            y, w1, h, gap, placements);
  partition(group2, x + w1 + gap, y, w2, h, gap, placements);
}
```

Visueel:
```
Origineel:          Verticaal gesneden:
+-------+           +----+--+
|       |           | g1| 2|
| foto  |    →      |   |--|
| array |           |   |  |
+-------+           +---+--+
```

De twee recursieve aanroepen:
1. Groep 1 op `x, y` met breedte `w1`
2. Groep 2 op `x + w1 + gap, y` (verschoven naar rechts) met breedte `w2`

Het `gap` zorgt voor afstand ertussen.

### Horizontale snede (regel 116-123)
```typescript
} else {
  const h1 = Math.round((h - gap) * spatialRatio);
  const h2 = h - gap - h1;
  if (h1 < 1 || h2 < 1) {
    photos.forEach(p => placements.push({ photo: p, x, y, width: w, height: h }));
    return;
  }
  partition(group1, x, y,            w, h1, gap, placements);
  partition(group2, x, y + h1 + gap, w, h2, gap, placements);
}
```

Visueel:
```
Origineel:          Horizontaal gesneden:
+-------+           +-------+
|       |           | g1    |
| foto  |    →      +-------+
| array |           | g2    |
+-------+           +-------+
```

---

## Hulpfunctie: `clamp()`

```typescript
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
```

Dit zorgt dat een getal binnen grenzen blijft:
- Als `val < min`, geef `min` terug
- Als `val > max`, geef `max` terug
- Anders, geef `val` terug

Voorbeeld:
```javascript
clamp(0.5, 0.2, 0.8)  → 0.5  (binnen grenzen)
clamp(0.1, 0.2, 0.8)  → 0.2  (te laag)
clamp(0.9, 0.2, 0.8)  → 0.8  (te hoog)
```

---

## Volledig Voorbeeld: Hoe Het Werkt

Stel we hebben 4 foto's, een canvas van 400×300 pixels, marge van 20, gap van 5:

1. **Voorbereiding:**
   - Werkruimte: `aw = 360`, `ah = 260`
   - Shuffle: foto's krijgen willekeurige volgorde

2. **Eerste partitie** (alle 4 foto's):
   - `countRatio = 0.6` → `splitIdx = 2`
   - `group1 = [foto_A, foto_B]`, `group2 = [foto_C, foto_D]`
   - Verticaal snijden gekozen → twee rechthoeken van ~180×260

3. **Twee tweede partities:**

   **Voor group1** (2 foto's in 180×260):
   - `countRatio = 0.4` → `splitIdx = 1`
   - Horizontaal snijden
   - `photo_A` → rechthoek links boven
   - `photo_B` → rechthoek links onder

   **Voor group2** (2 foto's in 180×260):
   - `countRatio = 0.7` → `splitIdx = 1` (afgerond)
   - Verticaal snijden
   - `photo_C` → rechthoek rechts boven (links deel)
   - `photo_D` → rechthoek rechts boven (rechts deel)

4. **Resultaat:** 4 placements, elkaar niet overlappend

---

## Slotopmerking

Dit algoritme is elegant omdat het:
- **Simpel** is: geen complexe wiskundige berekeningen
- **Volledig** is: alle foto's krijgen ruimte, niets wordt gemist
- **Flexibel** is: werkt met willekeurig veel foto's
- **Organisch** werkt: marges en verhoudingen voorkomen vreemde layouts
