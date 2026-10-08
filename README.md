# Explore Karachi

A small isometric 3D game for exploring and learning about Karachi, Pakistan's largest city. You can walk its streets, hop in a truck-art rickshaw, and collect a passport stamp for every landmark, bazaar, beach and neighbourhood you discover.

It is made for the diaspora and for students: the writing is warm and plain, and it doesn't shy away from history or politics.

## Running it

You need Node.js 20.19 or newer.

```bash
npm install
npm run dev        # http://localhost:3000, with hot reload
```

To run the production build:

```bash
npm run build
npm start          # serves dist/ and the API on http://localhost:3000
```

Set `PORT` to use a different port. If the game runs slowly on a weak machine, add `?quality=low` to the URL, which turns off shadows and antialiasing.

## Controls

| Keys | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Walk (hold `Shift` to run). In the rickshaw: accelerate, brake and steer. |
| `F` | Get in or out of the rickshaw |
| `R` | Call your rickshaw to you |
| `H` | Honk |
| `Space` | Read about the nearby place (or click its floating icon) |
| `Q` / `E`, mouse wheel | Rotate / zoom the camera |
| `M` | Map: click anywhere on land to fast-travel |
| `P` | Passport of collected stamps |
| `Esc` | Close panels |

Progress (stamps, position, sound setting) is saved in the browser's localStorage.

## What's in the city

There are 37 places across seven categories: Heritage, Faith, Neighbourhoods, Streets & Bazaars, Food, Sea & Shore, and Modern City. Some examples are Mazar-e-Quaid, Frere Hall, Empress Market, Merewether Tower, Mohatta Palace, Tooba Mosque, Abdullah Shah Ghazi's shrine, Teen Talwar, Burns Road, Port Grand, Do Darya, Sea View, Hawke's Bay, Manora, Lyari, Orangi Town and Korangi.

The map is compressed and simplified. Neighbourhoods, main roads (Shahrah-e-Faisal, M.A. Jinnah Road, I.I. Chundrigar Road and others), the Lyari and Malir rivers, and the coastline sit roughly where they really are relative to each other.

## Project layout

```
server/
  index.js              Express server: /api/places, plus Vite (dev) or dist/ (prod)
  content/places.js     All place content: text, facts, map positions, model keys
index.html
src/
  main.js               Game flow: loading → choose explorer → play loop, keys, saving
  core/                 Game (renderer, scene, loop), IsoCamera, Input
  entities/             Character (shalwar kameez), Rickshaw, Player
  world/
    layout.js           The city map: coastline, roads, rivers, districts, parks
    terrain.js          Rasterised land/road masks for fast lookups
    Ground.js           Land, animated sea, rivers, roads, roundabouts, hills
    Buildings.js        Procedural instanced buildings with rooftop water tanks
    Ambient.js          Trees, traffic (driving on the left), pedestrians, crows, kites, boats
    Collision.js        Spatial-hash collisions + coastline
    landmarks/          Hand-modelled low-poly landmarks, grouped by theme
    mapPainter.js       Paints the ground texture and the minimap/map image
  systems/              Places (markers & discovery), Save, Audio (synthesised)
  ui/                   Start screen, HUD + minimap, info card, map, passport, toasts
  styles/main.css
```

Everything is built from code. There are no 3D model, image or audio files: the buildings and landmarks are procedural low-poly geometry, the truck art is painted on canvases at runtime, and the sound is synthesised with the Web Audio API.

## Adding or editing a place

Edit `server/content/places.js`. Each entry has:

- `id`, `name`, `urdu`, `category`, `area`
- `pos`: map position as `[x, y]`, with x pointing east and y pointing north. Use `src/world/layout.js` to get your bearings: Saddar is near `[-60, 20]` and Clifton near `[-30, -95]`.
- `radius`: how close you must be for the icon to appear
- `model`: one of the builders in `src/world/landmarks/` (or `null`), and an optional `modelPos`
- `tagline`, `body` (paragraphs), `facts` (label/value pairs), `didYouKnow`

Restart `npm run dev` to pick up content changes.

## Ideas for v2

- Day/night cycle, so you can see Karachi's lights and Do Darya at night
- More ways to get around: a camel ride at Sea View, a ferry from Keamari to Manora, W-11 buses
- Themed trails, such as a Burns Road → Boat Basin → Port Grand food trail or a colonial Karachi walk
- Touch controls for mobile
