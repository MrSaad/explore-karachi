// The shape of our miniature Karachi.
//
// Everything here is authored "north-up" as [x, y] (x = east, y = north), which
// is how you'd read a normal map. `N()` flips it into world/map coordinates
// [x, z] where +z points south toward the Arabian Sea.
//
// The city is compressed and simplified, but neighbourhoods, roads and
// landmarks sit roughly where they really are relative to each other.

import { splinePolyline } from '../utils/math.js';

export const N = (pts) => pts.map(([x, y]) => [x, -y]);
export const n = ([x, y]) => [x, -y];

export const WORLD = { minX: -440, maxX: 440, minZ: -320, maxZ: 260 };

// Land polygon (everything outside is sea). Traced west → south coast → east.
const COAST_RAW = N([
  [-440, 320],
  [-440, 20],
  [-400, -30],
  [-370, -75],
  [-340, -110],
  // Sandspit running down to Manora
  [-305, -150],
  [-285, -175],
  [-262, -192],
  [-240, -186],
  [-230, -170],
  [-245, -152],
  [-270, -140],
  [-292, -122],
  [-312, -98],
  // Backwaters, then the Keamari peninsula and the harbour
  [-310, -75],
  [-292, -80],
  [-280, -100],
  [-262, -112],
  [-242, -100],
  [-226, -80],
  [-212, -68],
  [-190, -66],
  [-170, -74],
  [-150, -88],
  [-128, -96],
  // Clifton, Sea View, DHA and on to Korangi Creek
  [-105, -108],
  [-80, -120],
  [-58, -128],
  [-30, -136],
  [0, -143],
  [40, -152],
  [80, -160],
  [120, -168],
  [160, -175],
  [195, -180],
  [225, -182],
  [255, -178],
  [285, -165],
  [312, -150],
  [335, -138],
  [360, -130],
  [400, -122],
  [440, -116],
  [440, 320],
]);

// Gently curved coastline used everywhere (rendering, collision, minimap).
export const COAST = splinePolyline(COAST_RAW, 5, true);

export const RIVERS = [
  {
    id: 'lyari',
    name: 'Lyari River',
    width: 9,
    points: N([
      [-90, 330],
      [-115, 260],
      [-145, 200],
      [-172, 140],
      [-195, 90],
      [-212, 40],
      [-222, -5],
      [-220, -40],
      [-210, -72],
    ]),
  },
  {
    id: 'malir',
    name: 'Malir River',
    width: 11,
    points: N([
      [300, 330],
      [285, 240],
      [270, 160],
      [262, 80],
      [270, 0],
      [295, -80],
      [322, -146],
    ]),
  },
];

// kind: highway | main | street. Width in world units.
export const ROAD_STYLE = {
  highway: { width: 13, color: 0x3a3c42, markings: 'double' },
  main: { width: 10, color: 0x404248, markings: 'dashed' },
  street: { width: 7, color: 0x4a4b50, markings: null },
};

export const ROADS = [
  {
    id: 'shahrah-e-faisal',
    name: 'Shahrah-e-Faisal',
    kind: 'highway',
    points: N([
      [-14, -18],
      [40, 0],
      [100, 30],
      [160, 65],
      [220, 100],
      [280, 140],
      [330, 172],
      [352, 185],
    ]),
  },
  {
    id: 'ma-jinnah',
    name: 'M.A. Jinnah Road',
    kind: 'main',
    points: N([
      [-152, 4],
      [-125, 18],
      [-85, 35],
      [-45, 50],
      [-7, 60],
    ]),
  },
  {
    id: 'chundrigar',
    name: 'I.I. Chundrigar Road',
    kind: 'main',
    points: N([
      [-152, -4],
      [-125, -18],
      [-90, -30],
      [-55, -32],
      [-26, -22],
    ]),
  },
  {
    id: 'burns',
    name: 'Burns Road',
    kind: 'street',
    points: N([
      [-124, 0],
      [-100, 4],
      [-78, 9],
    ]),
  },
  {
    id: 'abdullah-haroon',
    name: 'Abdullah Haroon Road',
    kind: 'street',
    points: N([
      [-22, -12],
      [-30, 12],
      [-36, 30],
      [-44, 49],
    ]),
  },
  {
    id: 'preedy',
    name: 'Preedy Street',
    kind: 'street',
    points: N([
      [-78, 9],
      [-55, 8],
      [-31, 9],
    ]),
  },
  {
    id: 'clifton',
    name: 'Clifton Road',
    kind: 'main',
    points: N([
      [-22, -28],
      [-30, -45],
      [-35, -62],
    ]),
  },
  {
    id: 'clifton-2',
    name: 'Clifton Road',
    kind: 'main',
    points: N([
      [-41, -78],
      [-46, -92],
      [-52, -110],
    ]),
  },
  {
    id: 'sea-view',
    name: 'Sea View Road',
    kind: 'main',
    points: N([
      [-52, -110],
      [-30, -119],
      [0, -122],
      [40, -128],
      [80, -136],
      [120, -144],
      [160, -152],
      [195, -158],
      [222, -160],
    ]),
  },
  {
    id: 'ittehad',
    name: 'Khayaban-e-Ittehad',
    kind: 'main',
    points: N([
      [-30, -72],
      [5, -78],
      [60, -90],
      [130, -104],
      [190, -122],
      [215, -145],
      [222, -160],
    ]),
  },
  {
    id: 'zamzama',
    name: 'Zamzama Boulevard',
    kind: 'street',
    points: N([
      [58, -111],
      [82, -116],
      [108, -121],
    ]),
  },
  {
    id: 'dha-cross',
    name: 'Khayaban-e-Shamsheer',
    kind: 'street',
    points: N([
      [140, -36],
      [146, -70],
      [152, -112],
      [158, -150],
    ]),
  },
  {
    id: 'korangi',
    name: 'Korangi Road',
    kind: 'main',
    points: N([
      [40, 0],
      [100, -28],
      [170, -36],
      [250, -38],
      [330, -40],
      [420, -46],
    ]),
  },
  {
    id: 'university',
    name: 'University Road',
    kind: 'main',
    points: N([
      [7, 64],
      [55, 95],
      [100, 135],
      [150, 168],
      [200, 205],
      [232, 240],
    ]),
  },
  {
    id: 'sharea-pakistan',
    name: 'Sharea Pakistan',
    kind: 'main',
    points: N([
      [-3, 70],
      [-10, 110],
      [-30, 165],
      [-45, 220],
      [-55, 300],
    ]),
  },
  {
    id: 'orangi',
    name: 'Orangi Road',
    kind: 'street',
    points: N([
      [-30, 165],
      [-90, 182],
      [-150, 198],
      [-210, 214],
      [-270, 228],
    ]),
  },
  {
    id: 'tariq',
    name: 'Tariq Road',
    kind: 'street',
    points: N([
      [48, 46],
      [85, 61],
      [122, 78],
    ]),
  },
  {
    id: 'stadium',
    name: 'Stadium Road',
    kind: 'street',
    points: N([
      [160, 65],
      [168, 100],
    ]),
  },
  {
    id: 'keamari',
    name: 'Keamari Road',
    kind: 'main',
    points: N([
      [-167, -6],
      [-190, -35],
      [-215, -56],
      [-245, -76],
      [-266, -90],
    ]),
  },
  {
    id: 'mauripur',
    name: 'Mauripur Road',
    kind: 'main',
    points: N([
      [-168, 4],
      [-200, 18],
      [-250, 10],
      [-300, -10],
      [-338, -38],
      [-358, -50],
    ]),
  },
  {
    id: 'sandspit',
    name: 'Sandspit Road',
    kind: 'street',
    points: N([
      [-338, -38],
      [-338, -70],
      [-322, -110],
      [-300, -140],
      [-280, -160],
      [-262, -170],
    ]),
  },
  {
    id: 'lyari-street',
    name: 'Lyari main street',
    kind: 'street',
    points: N([
      [-125, 18],
      [-150, 58],
      [-160, 115],
    ]),
  },
  {
    id: 'national-highway',
    name: 'National Highway',
    kind: 'highway',
    points: N([
      [280, 140],
      [340, 100],
      [400, 70],
      [440, 55],
    ]),
  },
  {
    id: 'gulshan-street',
    name: 'Rashid Minhas Road',
    kind: 'street',
    points: N([
      [100, 30],
      [120, 100],
      [150, 168],
      [170, 240],
    ]),
  },
];

// Small asphalt circles where big roads meet (chowrangis).
export const ROUNDABOUTS = [
  { at: n([-160, 0]), r: 10, island: 5, name: 'Merewether Tower' },
  { at: n([-38, -70]), r: 10, island: 6, name: 'Teen Talwar' },
  { at: n([0, 62]), r: 9, island: 4, name: 'Numaish' },
  { at: n([-20, -20]), r: 9, island: 3.5, name: 'Metropole' },
];

// Neighbourhoods. `style` drives the procedural buildings.
export const DISTRICTS = [
  {
    id: 'old-city',
    name: 'Kharadar & Mithadar',
    urdu: 'کھارادر',
    center: n([-188, -8]),
    r: 24,
    style: 'heritage',
    grid: 0.3,
  },
  { id: 'lyari', name: 'Lyari', urdu: 'لیاری', center: n([-165, 65]), r: 46, style: 'dense', grid: 0.15 },
  { id: 'keamari', name: 'Keamari', urdu: 'کیماڑی', center: n([-262, -74]), r: 36, style: 'port', grid: 0.6 },
  { id: 'saddar', name: 'Saddar', urdu: 'صدر', center: n([-62, 22]), r: 42, style: 'colonial', grid: 0.35 },
  {
    id: 'business',
    name: 'I.I. Chundrigar (Business District)',
    urdu: 'آئی آئی چندریگر',
    center: n([-108, -14]),
    r: 24,
    style: 'towers',
    grid: 0.4,
  },
  {
    id: 'civil-lines',
    name: 'Civil Lines',
    urdu: 'سول لائنز',
    center: n([-62, -50]),
    r: 22,
    style: 'bungalow',
    grid: 0.1,
  },
  { id: 'clifton', name: 'Clifton', urdu: 'کلفٹن', center: n([-30, -95]), r: 46, style: 'apartments', grid: 0.2 },
  { id: 'dha', name: 'DHA (Defence)', urdu: 'ڈیفنس', center: n([130, -105]), r: 85, style: 'villas', grid: 0.22 },
  {
    id: 'pechs',
    name: 'PECHS & Tariq Road',
    urdu: 'پی ای سی ایچ ایس',
    center: n([85, 58]),
    r: 38,
    style: 'midrise',
    grid: 0.38,
  },
  {
    id: 'federal-b',
    name: 'Federal B. Area',
    urdu: 'فیڈرل بی ایریا',
    center: n([45, 178]),
    r: 42,
    style: 'midrise',
    grid: 0.6,
  },
  {
    id: 'gulshan',
    name: 'Gulshan-e-Iqbal',
    urdu: 'گلشنِ اقبال',
    center: n([168, 190]),
    r: 56,
    style: 'apartments',
    grid: 0.65,
  },
  {
    id: 'ku',
    name: 'University of Karachi',
    urdu: 'جامعہ کراچی',
    center: n([242, 262]),
    r: 36,
    style: 'campus',
    grid: 0.65,
  },
  { id: 'nazimabad', name: 'Nazimabad', urdu: 'ناظم آباد', center: n([-62, 188]), r: 46, style: 'dense', grid: 0.28 },
  {
    id: 'north-nazimabad',
    name: 'North Nazimabad',
    urdu: 'نارتھ ناظم آباد',
    center: n([-50, 268]),
    r: 46,
    style: 'midrise',
    grid: 0.25,
  },
  {
    id: 'site',
    name: 'S.I.T.E. Industrial Area',
    urdu: 'سائٹ',
    center: n([-112, 132]),
    r: 34,
    style: 'industrial',
    grid: 0.4,
  },
  {
    id: 'orangi',
    name: 'Orangi Town',
    urdu: 'اورنگی ٹاؤن',
    center: n([-255, 238]),
    r: 80,
    style: 'informal',
    grid: 0.05,
  },
  {
    id: 'baldia',
    name: 'Baldia Town',
    urdu: 'بلدیہ ٹاؤن',
    center: n([-288, 88]),
    r: 50,
    style: 'informal',
    grid: 0.12,
  },
  { id: 'malir', name: 'Malir', urdu: 'ملیر', center: n([335, 62]), r: 50, style: 'dense', grid: 0.1 },
  { id: 'korangi', name: 'Korangi', urdu: 'کورنگی', center: n([345, -48]), r: 62, style: 'industrial', grid: 0.0 },
  { id: 'hawkes-bay', name: "Hawke's Bay", urdu: 'ہاکس بے', center: n([-372, -40]), r: 30, style: 'huts', grid: 0.4 },
  { id: 'manora', name: 'Manora', urdu: 'منوڑا', center: n([-258, -168]), r: 24, style: 'huts', grid: 0.2 },
  {
    id: 'airport',
    name: 'Jinnah International Airport',
    urdu: 'جناح انٹرنیشنل ایئرپورٹ',
    center: n([385, 235]),
    r: 70,
    style: 'none',
    grid: 0,
  },
];

// Smaller named spots used only for the "You are in…" label (checked before districts).
export const AREAS = [
  { name: 'Jamshed Quarters', urdu: 'جمشید کوارٹرز', center: n([18, 112]), r: 34 },
  { name: 'Karsaz', urdu: 'کارساز', center: n([175, 118]), r: 34 },
  { name: 'Chaukhandi', urdu: 'چوکھنڈی', center: n([395, 30]), r: 30 },
  { name: 'Sea View', urdu: 'سی ویو', center: n([50, -146]), r: 34 },
  { name: 'Do Darya', urdu: 'دو دریا', center: n([226, -176]), r: 22 },
  { name: 'Native Jetty', urdu: 'نیٹیو جیٹی', center: n([-195, -62]), r: 16 },
  { name: 'Mauripur', urdu: 'ماڑی پور', center: n([-300, 0]), r: 40 },
  { name: 'Sandspit', urdu: 'سینڈز پٹ', center: n([-318, -112]), r: 28 },
  { name: 'Saddar', urdu: 'صدر', center: n([-15, 10]), r: 26 },
];

export const BUILDING_STYLES = {
  heritage: {
    spacing: 7,
    density: 0.85,
    h: [5, 11],
    size: [5, 7],
    palette: [0xd9b77e, 0xcfa86c, 0xe3c995, 0xc79b63, 0xb98e5e],
    tanks: 0.5,
  },
  dense: {
    spacing: 6.5,
    density: 0.85,
    h: [4, 10],
    size: [4.5, 6],
    palette: [0xe7d3b0, 0xd7b98e, 0xc7d2c9, 0xe2b7a0, 0xb8c9d9, 0xe8e0c8, 0xd4a373],
    tanks: 0.8,
  },
  colonial: {
    spacing: 7.5,
    density: 0.8,
    h: [6, 14],
    size: [5, 7],
    palette: [0xdcc08e, 0xe6d2a8, 0xc9a978, 0xd8c7a6, 0xbfa07a],
    tanks: 0.5,
  },
  towers: {
    spacing: 10,
    density: 0.75,
    h: [18, 42],
    size: [7, 9],
    palette: [0x9fb4c7, 0xb9c2c9, 0x8aa1b4, 0xd2cbbf, 0x7f95a8],
    tanks: 0.1,
  },
  bungalow: { spacing: 11, density: 0.5, h: [4, 7], size: [6, 8], palette: [0xf0e6d2, 0xe8dcc4, 0xd8cdb5], tanks: 0.3 },
  apartments: {
    spacing: 9,
    density: 0.7,
    h: [12, 26],
    size: [6, 8.5],
    palette: [0xece4d4, 0xd9d0c1, 0xc7c1b5, 0xe6d9c0, 0xb7c4cc, 0xe1cfb4],
    tanks: 0.6,
  },
  villas: {
    spacing: 10,
    density: 0.6,
    h: [5, 9],
    size: [6, 8.5],
    palette: [0xf4efe6, 0xeee6d8, 0xe4dccd, 0xf2ede2, 0xd9d2c4],
    tanks: 0.5,
  },
  midrise: {
    spacing: 8,
    density: 0.75,
    h: [8, 18],
    size: [5.5, 7.5],
    palette: [0xe4d6bb, 0xd7c7aa, 0xcfc4b1, 0xe6c9a8, 0xbccbd3, 0xd8b896],
    tanks: 0.7,
  },
  campus: {
    spacing: 13,
    density: 0.45,
    h: [6, 12],
    size: [8, 12],
    palette: [0xd8c3a0, 0xcbb48e, 0xe0d2b8],
    tanks: 0.1,
  },
  industrial: {
    spacing: 12,
    density: 0.65,
    h: [6, 12],
    size: [9, 12],
    palette: [0xa9a49a, 0x9a978f, 0xb7b0a2, 0x8f9aa3, 0xc2b8a3],
    tanks: 0.15,
    chimneys: 0.25,
  },
  informal: {
    spacing: 5.5,
    density: 0.9,
    h: [3, 7],
    size: [3.5, 5],
    palette: [0xd9c7a7, 0xc8b08b, 0xb9a284, 0xe2d2b5, 0xa9b6a3, 0xcfa8a0, 0x9fb3c0],
    tanks: 0.6,
  },
  port: {
    spacing: 12,
    density: 0.6,
    h: [5, 10],
    size: [9, 12],
    palette: [0xb0a99b, 0x9fa7ad, 0xc4b59a, 0x8a96a0],
    tanks: 0.05,
  },
  huts: {
    spacing: 12,
    density: 0.35,
    h: [3, 4.5],
    size: [4, 6],
    palette: [0xf2e9d8, 0xe9dcc2, 0x9fc6d6, 0xf0c9a5],
    tanks: 0.1,
  },
  suburb: {
    spacing: 9,
    density: 0.5,
    h: [4, 10],
    size: [4.5, 6.5],
    palette: [0xe4d6bb, 0xd7c7aa, 0xcfc4b1, 0xe0c4a2, 0xc2c9c1],
    tanks: 0.6,
  },
  none: null,
};

// Green spaces painted on the ground (no buildings inside).
export const PARKS = [
  { at: n([18, 112]), r: 24, name: 'Mazar-e-Quaid gardens' },
  { at: n([-62, -50]), r: 13, name: 'Bagh-e-Jinnah (Frere Hall gardens)' },
  { at: n([195, 160]), r: 12, name: 'Safari Park' },
  { at: n([-52, -96]), r: 7, name: 'Bagh Ibn-e-Qasim' },
  { at: n([-160, 85]), r: 8, name: 'Kakri Ground' },
];

// Zones with no generic buildings (airport, beaches, etc.)
export const NO_BUILD = [
  {
    poly: N([
      [318, 165],
      [440, 165],
      [440, 320],
      [300, 320],
    ]),
  }, // airport
  { at: n([180, 125]), r: 22 }, // national stadium
  { at: n([395, 30]), r: 20 }, // Chaukhandi
];

// Low hills on the city's north-west edge (Orangi, Baldia, Manghopir).
export const HILLS = [
  { at: n([-345, 285]), r: 42, h: 16 },
  { at: n([-395, 215]), r: 34, h: 12 },
  { at: n([-300, 300]), r: 26, h: 10 },
  { at: n([-405, 130]), r: 30, h: 11 },
  { at: n([-190, 300]), r: 22, h: 8 },
];

// Where the player first appears (near Empress Market, Saddar).
export const SPAWN = n([-38, 20]);

// Curve rivers and roads once, up front. Splines pass through every authored
// vertex so roads that meet at a vertex still meet after smoothing.
for (const r of RIVERS) r.path = splinePolyline(r.points, 4);
for (const r of ROADS) {
  r.width = ROAD_STYLE[r.kind].width;
  r.path = r.points.length > 2 ? splinePolyline(r.points, 3) : r.points.slice();
}
