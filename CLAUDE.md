# Pähkinä-jahti – kehittäjän muistilista

## Projektin rakenne

```
orava-peli/
├── index.html          # HTML-runko, SVG-injektio, DOM-rakenne
├── style.css           # Kaikki tyyli + oravan väri-muuttujat
├── game.js             # Pelilogiikka, silmukka, törmäykset, kuvien lataus
├── assets/
│   ├── squirrel.svg    # Orava (128×128) – turkki käyttää var(--orava-fur)
│   ├── acorn.svg       # Tavallinen pähkinä (64×64) – 1 piste
│   ├── nut_golden.svg  # Kultapähkinä (64×64) – 3 pistettä
│   ├── bg_forest.svg   # Taustagrafiikka (960×600)
│   ├── ui_life.svg     # Elämäikoni HUD:ssa (32×32)
│   ├── ui_title.svg    # Pelin otsikko (560×170)
│   └── ui_gameover.svg # Visuaalinen referenssi game over -ruudulle
└── CLAUDE.md           # Tämä tiedosto
```

`ui_gameover.svg` on pelkkä suunnittelureferenssi – varsinainen game over -ruutu on
HTML-overlay (`#overlay`), jotta pistemäärä voidaan näyttää dynaamisesti.

## Tiedostojen vastuut

| Tiedosto | Vastuu |
|---|---|
| `index.html` | DOM-runko; injektoi `squirrel.svg` `fetch`-kutsulla; lataa `game.js` |
| `style.css` | Kaikki visuaalinen tyyli; `--orava-fur`-muuttujat; game over -overlay |
| `game.js` | `requestAnimationFrame`-silmukka; kuvien esikuormitus; pähkinöiden fysiikka; törmäystarkistus; pisteet ja elämät |
| `assets/*.svg` | Kaikki grafiikka vektorimuodossa – ei rasteroituja bittikarttoja |

## Oravan väri-konventio (`--orava-fur`)

Oravan väri on määritelty **yhdessä paikassa**: `style.css`:n `:root`-lohkossa.

```css
:root {
  --orava-fur: #C06A35;        /* pääväri: turkki, häntä, tassut */
  --orava-fur-light: #F8E4C1;  /* vatsa, häntänsisus */
  --orava-fur-dark: #9E5328;   /* nenä, tummat aksentit */
}
```

`squirrel.svg` käyttää näitä muuttujia suoraan (`fill="var(--orava-fur)"`).
SVG injektoidaan `innerHTML`-kutsulla (ei `<img>`-tagina), jotta dokumentin
CSS-muuttujat periytyvät SVG:n sisälle.

**Oravan värin vaihto:** muuta `:root`-lohkon arvot → kaikki osat päivittyvät.

## Uuden kerättävän esineen lisääminen

1. Lisää SVG-asset `assets/`-kansioon (esim. `berry.svg`).
2. Lataa se `game.js`:n `loadImages()`-funktiossa:
   ```js
   berryImg = await loadImage('assets/berry.svg');
   ```
3. Lisää esineelle taulukko ja spawn-logiikka `update()`-funktiossa
   (katso `nuts`-taulukon rakenne malliksi).
4. Piirrä se `render()`-funktiossa `ctx.drawImage(berryImg, ...)`.
5. Lisää törmäystarkistus kopioimalla `collides()`-logiikka tai
   tee yleinen `collidesWithSquirrel(item, radius)`.
6. Päivitä pisteet/efekti collision handlessa.

## Pelin ajaminen paikallisesti

Peli vaatii HTTP-palvelimen (SVG:t ladataan `fetch`:llä – `file://` estää tämän).

```bash
# Node.js (npx, ei asennusta tarvita)
npx serve .

# Python 3
python -m http.server 8080

# VS Code: Live Server -laajennus → "Open with Live Server"
```

Avaa selaimessa: `http://localhost:8080`

## Deployaus Azure Static Web Appiin

Konfiguraatio: `app_location: "/"`, ei build-vaihetta.
Kaikki tiedostot (`index.html`, `style.css`, `game.js`, `assets/`) ovat staattisia.
`staticwebapp.config.json`-tiedostoa ei tarvita.
