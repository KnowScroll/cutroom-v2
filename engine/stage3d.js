'use strict';
// 3D stage for templates with "renderer: three" (loaded by stage_asset.html after its main script, so it shares W, H, ctx,
// TRACK, CUR, TL, KIT, STRICT, BG_DONE and the h helpers). three.js draws the world; everything after h.d3.render() in a
// shot is the usual 2D canvas (inserts, date cards, captions), so the 2D validators keep working.
// M3 never writes three.js: the engine owns the characters (ball-head rig with poses and expressions), the rooms (built
// from the plan's room spec), the furniture (always standing on the floor), the cameras (framed from targets) and the 3D
// checks (actors inside furniture or each other, a camera inside an object or blocked from its target).
// Units are metres: floor at y 0, back wall at z -3, the camera side is +z, x runs left (-) to right (+).
const D3 = (() => {
  const T = window.THREE; if (!T) return null;
  const DEG = Math.PI / 180, ROOM = { halfW: 3.5, back: -3, ceil: 3.1, front: 12 };
  const DEF = { bg: '#3a2218', ink: '#2a1a14', cream: '#f6f0d6', skin: '#f4efe0', warm: '#e0301c', cool: '#3fb3a0', wood: '#9a6230', amber: '#d89a3a', accent: '#f3e64a', accent2: '#2f9a5a' };
  let STYLE = { palette: DEF, backgrounds: [] }, CAST = {}, PROPS = {}, PROPFN = {};
  const pal = () => ({ ...DEF, ...((STYLE && STYLE.palette) || {}) });
  const hexOk = c => typeof c === 'string' && /^#[0-9a-f]{3,8}$|^rgb/i.test(c.trim());
  function col(c, fallback = 'cream') { const P = pal(); if (c == null || c === '') c = fallback; if (typeof c === 'string' && P[c] != null) return P[c]; if (hexOk(c)) return c.trim(); if (STRICT) throw new Error(`unknown colour "${c}": use a palette name (${Object.keys(P).join(', ')}) or a hex colour`); return P[fallback] || '#cccccc'; }

  // ---------- renderer, scene, shared lights ----------
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  let R = null;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(38, W / H, 0.05, 60);
  const hemi = new T.HemisphereLight('#fff4e0', '#5a3020', 0.85); scene.add(hemi);
  const key = new T.DirectionalLight('#fff2dc', 1.5); key.position.set(-2.5, 5.5, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -3, near: 0.5, far: 20 }); key.shadow.radius = 4; key.shadow.bias = -0.0005; scene.add(key); scene.add(key.target);
  function renderer() {
    if (R) return R;
    R = new T.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(W, H, false); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.outputColorSpace = T.SRGBColorSpace;
    return R;
  }

  // ---------- materials and outlined primitives ----------
  const MATS = {}, inkMat = () => MATS.__ink || (MATS.__ink = new T.MeshBasicMaterial({ color: col('ink'), side: T.BackSide }));
  const lam = c => { const k = 'l' + c; return MATS[k] || (MATS[k] = new T.MeshLambertMaterial({ color: c })); };
  const basic = c => { const k = 'b' + c; return MATS[k] || (MATS[k] = new T.MeshBasicMaterial({ color: c })); };
  function tag(o, owner) { o.traverse(m => { m.userData.owner = owner; }); return o; }
  // the ink outline: a slightly larger copy of the shape, drawn from its back faces in the ink colour (inverted hull)
  function outlined(geo, material, t = 0.014) {
    const m = new T.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true;
    geo.computeBoundingBox(); const s = new T.Vector3(); geo.boundingBox.getSize(s);
    const o = new T.Mesh(geo, inkMat()); o.userData.hull = true;
    o.scale.set(s.x > 1e-4 ? (s.x + 2 * t) / s.x : 1, s.y > 1e-4 ? (s.y + 2 * t) / s.y : 1, s.z > 1e-4 ? (s.z + 2 * t) / s.z : 1);
    m.add(o); return m;
  }
  function place(m, o = {}) { const a = o.at || [o.x || 0, o.y || 0, o.z || 0]; m.position.set(+a[0] || 0, +a[1] || 0, +a[2] || 0); const r = o.rot || [0, 0, 0]; m.rotation.set((+r[0] || 0) * DEG, (+r[1] || 0) * DEG, (+r[2] || 0) * DEG); return m; }
  // the primitive kit a prop asset is built from (k in buildAsset); sizes in metres, colours are palette names or hex
  const K = {
    box: (w, h, d, c, o) => place(outlined(new T.BoxGeometry(w, h, d), lam(col(c)), o && o.line != null ? o.line : 0.012), o),
    ball: (r, c, o) => place(outlined(new T.SphereGeometry(r, 32, 20), lam(col(c)), o && o.line != null ? o.line : Math.min(0.014, r * 0.12)), o),
    cyl: (r, h, c, o = {}) => place(outlined(new T.CylinderGeometry(o.r2 != null ? o.r2 : r, r, h, 32), lam(col(c)), o.line != null ? o.line : 0.012), o),
    cone: (r, h, c, o = {}) => place(outlined(new T.ConeGeometry(r, h, 32), lam(col(c)), o.line != null ? o.line : 0.012), o),
    screen: (w, h, c, o = {}) => place(new T.Mesh(new T.PlaneGeometry(w, h), basic(col(c))), o),
    group: (...kids) => { const g = new T.Group(); kids.flat().forEach(k => k && g.add(k)); return g; },
  };

  // ---------- canvas textures ----------
  function canvasTex(w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }
  const fillText = (g, s, x, y) => _fillText.call(g, s, x, y); // texture text bypasses the shot's text tracking

  // ---------- rooms (the plan's background "room" spec) ----------
  const ROOMS = {}; let OBST = []; // floor footprints of things against the walls, for the collision checks
  const WALL_PROPS = { door: 1.0, window: 1.3, clock: 0.55, shelf: 1.4, calendar: 0.5, frame: 0.7, poster: 0.8, cabinet: 1.0, shelf_unit: 1.1, lockers: 2.2, plant: 0.6, board: 1.5, tv: 1.1, counter_back: 2.4, fridge: 0.8, sink: 1.0 };
  function wallTexture(spec) {
    const P = pal(), up = col(spec.upper, 'cool'), lo = col(spec.lower, 'warm'), rail = col(spec.rail, 'cream'), ink = col('ink');
    return canvasTex(2048, 1024, (g, w, h) => {
      const dado = h * (spec.dado != null ? clamp(+spec.dado, 0.3, 0.9) : 0.62);
      g.fillStyle = up; g.fillRect(0, 0, w, dado);
      if (spec.stripes !== false) { g.fillStyle = 'rgba(255,255,255,0.09)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 32, dado); }
      g.fillStyle = lo; g.fillRect(0, dado, w, h - dado);
      if (spec.panels !== false) { g.strokeStyle = mix(lo, ink, 0.45); g.lineWidth = 8; for (let x = 30; x < w; x += 260) g.strokeRect(x, dado + 60, 210, (h - dado) * 0.62); }
      g.fillStyle = rail; g.fillRect(0, 0, w, 30); g.fillRect(0, dado - 13, w, 26);
      g.strokeStyle = ink; g.lineWidth = 6; [30, dado - 13, dado + 13].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
      g.fillStyle = mix(lo, ink, 0.6); g.fillRect(0, h - 26, w, 26);
    });
  }
  function floorTexture(spec) {
    const kind = spec.floor || 'wood', base = col(spec.floor_colour, kind === 'tile' ? 'cream' : kind === 'carpet' ? 'cool' : 'wood'), ink = col('ink');
    const t = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      if (kind === 'wood') { for (let x = 0; x < w; x += 64) { g.fillStyle = mix(base, ink, [0.08, 0, 0.04][(x / 64) % 3]); g.fillRect(x, 0, 64, h); g.fillStyle = mix(base, ink, 0.55); g.fillRect(x, 0, 4, h); } for (let i = 0; i < 40; i++) { const x = (i * 197) % w, y = (i * 331) % h; g.fillStyle = mix(base, ink, 0.5); g.beginPath(); g.ellipse(x + 20, y, 6, 10, 0, 0, 7); g.fill(); } }
      else if (kind === 'tile') { g.strokeStyle = mix(base, ink, 0.35); g.lineWidth = 6; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
      else { const r = rng(5); for (let i = 0; i < 3000; i++) { g.fillStyle = mix(base, ink, 0.05 + r() * 0.1); g.fillRect(r() * w, r() * h, 3, 3); } }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 6); return t;
  }
  function wallProp(name, x, owner, spec) {
    const z = ROOM.back + 0.02, w = WALL_PROPS[name] || 0.8, books = ['warm', 'accent', 'cool', '#8a5ad0', 'warm', 'amber', 'cool'];
    const g = new T.Group(); g.position.set(x, 0, 0);
    const add = m => { g.add(m); return m; };
    switch (name) {
      case 'door': add(K.box(1.0, 2.1, 0.08, mix(col('wood'), col('ink'), 0.2), { at: [0, 1.05, z + 0.04] })); add(K.ball(0.05, 'amber', { at: [0.36, 1.0, z + 0.11] })); break;
      case 'window': add(K.box(1.3, 1.1, 0.06, 'cream', { at: [0, 1.85, z + 0.03] })); add(K.screen(1.1, 0.9, mix(col('accent'), '#9fd4ff', 0.75), { at: [0, 1.85, z + 0.065] })); add(K.box(0.04, 0.9, 0.03, 'cream', { at: [0, 1.85, z + 0.08] })); add(K.box(1.1, 0.04, 0.03, 'cream', { at: [0, 1.85, z + 0.08] })); break;
      case 'clock': { const c = K.cyl(0.26, 0.05, 'cream', { at: [0, 2.35, z + 0.03], rot: [90, 0, 0] }); add(c); add(K.box(0.02, 0.16, 0.01, 'ink', { at: [0, 2.41, z + 0.06], line: 0 })); add(K.box(0.12, 0.02, 0.01, 'ink', { at: [0.05, 2.35, z + 0.06], line: 0 })); break; }
      case 'shelf': add(K.box(1.4, 0.06, 0.28, 'wood', { at: [0, 1.95, z + 0.14] })); for (let i = 0; i < 7; i++) add(K.box(0.13, 0.34 + (i % 3) * 0.05, 0.22, books[i], { at: [-0.55 + i * 0.16, 2.15 + (i % 3) * 0.025, z + 0.14], line: 0.008 })); break;
      case 'calendar': add(K.box(0.42, 0.5, 0.02, 'cream', { at: [0, 2.2, z + 0.01] })); add(K.box(0.42, 0.13, 0.025, 'warm', { at: [0, 2.39, z + 0.015], line: 0.006 })); break;
      case 'frame': add(K.box(0.7, 0.55, 0.04, 'wood', { at: [0, 1.95, z + 0.02] })); add(K.screen(0.56, 0.42, mix(col('cool'), col('cream'), 0.4), { at: [0, 1.95, z + 0.045] })); add(K.screen(0.3, 0.2, col('accent'), { at: [-0.08, 1.9, z + 0.047] })); break;
      case 'poster': add(K.box(0.8, 1.0, 0.02, 'cream', { at: [0, 1.85, z + 0.01] })); add(K.screen(0.6, 0.35, col('warm'), { at: [0, 2.0, z + 0.025] })); add(K.screen(0.6, 0.08, col('ink'), { at: [0, 1.65, z + 0.025] })); break;
      case 'board': add(K.box(1.5, 0.95, 0.05, 'wood', { at: [0, 1.75, z + 0.025] })); add(K.screen(1.36, 0.82, mix(col('accent2'), col('ink'), 0.3), { at: [0, 1.75, z + 0.055] })); break;
      case 'tv': add(K.box(1.1, 0.65, 0.06, 'ink', { at: [0, 1.85, z + 0.03] })); add(K.screen(1.0, 0.56, mix(col('cool'), '#000000', 0.5), { at: [0, 1.85, z + 0.065] })); break;
      case 'cabinet': add(K.box(1.0, 1.1, 0.45, 'wood', { at: [0, 0.55, z + 0.225] })); add(K.box(0.02, 0.9, 0.01, 'ink', { at: [0, 0.6, z + 0.455], line: 0 })); OBST.push({ owner, x0: x - 0.5, x1: x + 0.5, z0: ROOM.back, z1: ROOM.back + 0.47 }); break;
      case 'shelf_unit': add(K.box(1.1, 1.9, 0.36, 'wood', { at: [0, 0.95, z + 0.18] })); for (let s = 0; s < 3; s++) for (let i = 0; i < 6; i++) add(K.box(0.12, 0.3, 0.24, books[(i + s) % 7], { at: [-0.4 + i * 0.16, 0.45 + s * 0.55, z + 0.2], line: 0.006 })); OBST.push({ owner, x0: x - 0.55, x1: x + 0.55, z0: ROOM.back, z1: ROOM.back + 0.38 }); break;
      case 'lockers': for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { add(K.box(0.34, 0.34, 0.06, 'amber', { at: [-0.9 + c * 0.36, 1.05 + r * 0.36, z + 0.03], line: 0.008 })); add(K.ball(0.025, 'ink', { at: [-0.8 + c * 0.36, 1.0 + r * 0.36, z + 0.07], line: 0 })); } break;
      case 'plant': add(K.cyl(0.18, 0.36, 'warm', { at: [0, 0.18, z + 0.3], r2: 0.22 })); for (let i = 0; i < 5; i++) add(K.ball(0.18, mix(col('accent2'), col('cool'), (i % 2) * 0.4), { at: [Math.sin(i * 1.3) * 0.15, 0.55 + (i % 3) * 0.15, z + 0.3 + Math.cos(i * 1.3) * 0.1] })); OBST.push({ owner, x0: x - 0.3, x1: x + 0.3, z0: ROOM.back, z1: ROOM.back + 0.6 }); break;
      case 'counter_back': add(K.box(2.4, 0.9, 0.5, 'wood', { at: [0, 0.45, z + 0.25] })); add(K.box(2.5, 0.06, 0.56, 'cream', { at: [0, 0.93, z + 0.28] })); OBST.push({ owner, x0: x - 1.25, x1: x + 1.25, z0: ROOM.back, z1: ROOM.back + 0.56 }); break;
      case 'fridge': add(K.box(0.8, 1.8, 0.7, 'cream', { at: [0, 0.9, z + 0.35] })); add(K.box(0.04, 0.5, 0.04, 'ink', { at: [0.3, 1.2, z + 0.72], line: 0 })); OBST.push({ owner, x0: x - 0.4, x1: x + 0.4, z0: ROOM.back, z1: ROOM.back + 0.72 }); break;
      case 'sink': add(K.box(1.0, 0.9, 0.55, 'cream', { at: [0, 0.45, z + 0.27] })); add(K.cyl(0.03, 0.3, 'ink', { at: [0, 1.05, z + 0.12] })); OBST.push({ owner, x0: x - 0.5, x1: x + 0.5, z0: ROOM.back, z1: ROOM.back + 0.56 }); break;
      default: if (STRICT) throw new Error(`room prop "${name}" is unknown; room props are: ${Object.keys(WALL_PROPS).join(', ')}`);
    }
    return g;
  }
  function buildRoom(name) {
    const spec = ((STYLE.backgrounds || []).find(b => b.name === name) || {}).room;
    if (!spec) { if (STRICT) throw new Error(`room "${name}" has no "room" spec in the plan; rooms: ${(STYLE.backgrounds || []).map(b => b.name).join(', ')}`); }
    const s = spec || {}, g = new T.Group(), owner = 'room:' + name; OBST = [];
    const wallM = new T.MeshLambertMaterial({ map: wallTexture(s) });
    const back = new T.Mesh(new T.PlaneGeometry(2 * ROOM.halfW, ROOM.ceil), wallM); back.position.set(0, ROOM.ceil / 2, ROOM.back); back.receiveShadow = true; g.add(back);
    const sideM = new T.MeshLambertMaterial({ map: wallTexture(s), color: '#d8d0c8' });
    [-1, 1].forEach(k => { const side = new T.Mesh(new T.PlaneGeometry(ROOM.front - ROOM.back, ROOM.ceil), sideM); side.position.set(k * ROOM.halfW, ROOM.ceil / 2, (ROOM.front + ROOM.back) / 2); side.rotation.y = -k * Math.PI / 2; side.receiveShadow = true; g.add(side); });
    const floor = new T.Mesh(new T.PlaneGeometry(2 * ROOM.halfW, ROOM.front - ROOM.back), new T.MeshLambertMaterial({ map: floorTexture(s) })); floor.rotation.x = -Math.PI / 2; floor.position.z = (ROOM.front + ROOM.back) / 2; floor.receiveShadow = true; g.add(floor);
    const ceil = new T.Mesh(new T.PlaneGeometry(2 * ROOM.halfW, ROOM.front - ROOM.back), lam(s.ceiling ? col(s.ceiling) : mix(col('cream'), col('wood'), 0.35))); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, ROOM.ceil, (ROOM.front + ROOM.back) / 2); g.add(ceil);
    if (s.rug) { const rug = new T.Mesh(new T.PlaneGeometry(3.2, 2.4), lam(col(s.rug))); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, 0.9); rug.receiveShadow = true; g.add(rug); const edge = new T.Mesh(new T.RingGeometry(1, 1.04, 4, 1), lam(col('accent'))); edge.rotation.set(-Math.PI / 2, 0, Math.PI / 4); edge.scale.set(2.2, 1.65, 1); edge.position.set(0, 0.006, 0.9); g.add(edge); }
    // wall props spread evenly along the back wall, left to right in the order given
    const props = (s.props || []).filter(p => WALL_PROPS[p] || STRICT).slice(0, 8), widths = props.map(p => WALL_PROPS[p] || 0.8), total = widths.reduce((a, b) => a + b, 0);
    const gap = Math.max(0.1, (2 * ROOM.halfW - 0.4 - total) / (props.length + 1)); let x = -ROOM.halfW + 0.2 + gap;
    props.forEach((p, i) => { g.add(wallProp(p, x + widths[i] / 2, owner, s)); x += widths[i] + gap; });
    // the lamp: cord, cone shade, glowing bulb, warm point light
    const lamp = new T.Group(); lamp.position.set(s.lamp_x != null ? clamp(+s.lamp_x, -2, 2) : 0, ROOM.ceil, -0.8);
    const cord = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.5, 8), lam(col('ink'))); cord.position.y = -0.25; lamp.add(cord);
    const shade = outlined(new T.CylinderGeometry(0.08, 0.42, 0.36, 40, 1, true), new T.MeshLambertMaterial({ color: col(s.lamp, 'warm'), side: T.DoubleSide }), 0.012); shade.position.y = -0.62; lamp.add(shade);
    const bulb = new T.Mesh(new T.SphereGeometry(0.1, 20, 12), basic('#fff6c8')); bulb.position.y = -0.77; lamp.add(bulb);
    const pl = new T.PointLight('#ffd9a0', 7, 9, 1.8); pl.position.y = -0.85; lamp.add(pl);
    g.add(lamp); g.userData.lamp = lamp; g.userData.obst = OBST; tag(g, owner);
    return g;
  }

  // ---------- characters: the ball-head rig ----------
  const POSES = { // hand positions in the character's own frame (it faces +z), feet at y 0; every hand stays outside the head (centre y 1.16, radius 0.42)
    stand: [[-0.3, 0.42, 0.08], [0.3, 0.42, 0.08]], wave: [[-0.3, 0.42, 0.08], [0.56, 1.12, 0.1]], point_up: [[-0.3, 0.42, 0.08], [0.48, 0.98, 0.26]],
    point: [[-0.3, 0.42, 0.08], [0.34, 0.82, 0.46]], arms_crossed: [[-0.1, 0.64, 0.27], [0.1, 0.6, 0.27]], hands_hips: [[-0.27, 0.5, -0.02], [0.27, 0.5, -0.02]],
    think: [[-0.3, 0.42, 0.08], [0.1, 0.84, 0.38]], shrug: [[-0.44, 0.74, 0.12], [0.44, 0.74, 0.12]], hold: [[-0.17, 0.62, 0.36], [0.17, 0.62, 0.36]],
    type: [[-0.16, 0.55, 0.42], [0.16, 0.55, 0.42]], hands_up: [[-0.58, 1.3, 0.05], [0.58, 1.3, 0.05]], facepalm: [[-0.3, 0.42, 0.08], [0.06, 1.04, 0.52]],
    sit: [[-0.2, 0.52, 0.32], [0.2, 0.52, 0.32]], sit_type: [[-0.16, 0.6, 0.44], [0.16, 0.6, 0.44]], sit_hold: [[-0.17, 0.66, 0.38], [0.17, 0.66, 0.38]],
  };
  const EXPR = ['neutral', 'happy', 'surprised', 'smug', 'worried', 'angry', 'sad', 'thinking'];
  const faceCss = (g, lw, c) => { g.lineWidth = lw; g.strokeStyle = c; g.fillStyle = c; g.lineCap = 'round'; g.lineJoin = 'round'; };
  // the face is a texture on a patch of the head's front (100 x 108 degrees, 1024 px square): about 10 px per degree, crisp in close-ups
  function faceTexture(look, expr, blink) {
    return canvasTex(1024, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h); const ink = col('ink'), P = (ax, ay) => [512 + ax * 10.24, 512 + ay * 9.48];
      if (look.stubble !== false) { g.fillStyle = rgba(mix(col(look.skin, 'skin'), '#6a4a2a', 0.7), 0.55); const r = rng(11); for (let i = 0; i < 60; i++) { const a = Math.PI * (0.08 + 0.84 * r()), rr2 = 27 + 9 * r(); const [x, y] = P(Math.cos(a) * rr2, 15 + Math.sin(a) * rr2 * 0.62); g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } }
      if (look.beard) { g.fillStyle = col(look.hair_colour, 'ink'); g.beginPath(); const [x0, y0] = P(-34, 10); g.moveTo(x0, y0); g.quadraticCurveTo(512, 512 + 75 * 9.48, 512 + 34 * 10.24, y0); g.quadraticCurveTo(512, 512 + 38 * 9.48, x0, y0); g.fill(); }
      faceCss(g, 30, ink);
      const look2 = expr === 'thinking' ? [5, -3] : [0, 0];
      for (const s of [-1, 1]) {
        const [ex, ey] = P(s * 19 + look2[0], 3 + look2[1]);
        if (blink && expr !== 'happy') { g.beginPath(); g.moveTo(ex - 34, ey); g.lineTo(ex + 34, ey); g.stroke(); }
        else if (expr === 'surprised') { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex, ey, 74, 0, 7); g.fill(); g.lineWidth = 16; g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(ex, ey, 22, 0, 7); g.fill(); }
        else if (expr === 'happy') { g.lineWidth = 26; g.beginPath(); g.arc(ex, ey + 22, 42, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        else if (expr === 'smug') { g.beginPath(); g.ellipse(ex, ey + 8, 26, 22, 0, 0, Math.PI); g.fill(); g.lineWidth = 22; g.beginPath(); g.moveTo(ex - 38, ey + 2); g.lineTo(ex + 38, ey + 2); g.stroke(); }
        else { g.beginPath(); g.ellipse(ex, ey, 26, 38, 0, 0, 7); g.fill(); }
        // brows: thick bars that carry the emotion
        const [bx, by0] = P(s * 19, expr === 'surprised' ? -18 : -11), by = by0; g.lineWidth = 32; g.beginPath();
        if (expr === 'angry') { g.moveTo(bx - s * 58, by - 22); g.lineTo(bx + s * 58, by + 18); }
        else if (expr === 'worried' || expr === 'sad') { g.moveTo(bx - s * 58, by + 16); g.lineTo(bx + s * 58, by - 18); }
        else if (expr === 'smug' && s > 0) { g.moveTo(bx - 58, by - 10); g.quadraticCurveTo(bx, by - 40, bx + 58, by - 14); }
        else if (expr === 'thinking' && s > 0) { g.moveTo(bx - 58, by - 18); g.lineTo(bx + 58, by - 30); }
        else { g.moveTo(bx - 58, by); g.quadraticCurveTo(bx, by - (expr === 'surprised' || expr === 'happy' ? 30 : 10), bx + 58, by); }
        g.stroke();
      }
      faceCss(g, 22, ink); const [mx, my] = P(look2[0] * 0.5, 27);
      if (look.moustache) { g.lineWidth = 40; g.beginPath(); g.moveTo(mx - 85, my - 18); g.quadraticCurveTo(mx, my - 62, mx + 85, my - 18); g.stroke(); }
      g.lineWidth = 22; g.beginPath();
      if (expr === 'surprised') { g.ellipse(mx, my + 6, 30, 44, 0, 0, 7); g.fill(); }
      else if (expr === 'happy') { g.arc(mx, my - 40, 70, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
      else if (expr === 'smug') { g.moveTo(mx - 40, my + 4); g.quadraticCurveTo(mx + 20, my + 20, mx + 55, my - 16); g.stroke(); }
      else if (expr === 'angry' || expr === 'sad') { g.arc(mx, my + 46, 50, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
      else if (expr === 'worried') { g.moveTo(mx - 50, my + 4); g.bezierCurveTo(mx - 20, my - 18, mx + 20, my + 24, mx + 50, my); g.stroke(); }
      else if (expr === 'thinking') { g.moveTo(mx - 10, my + 4); g.lineTo(mx + 40, my - 2); g.stroke(); }
      else { g.moveTo(mx - 38, my); g.lineTo(mx + 38, my); g.stroke(); }
    });
  }
  const RIGS = {};
  // an id that is a role of a cast member resolves to that member in that role
  function castRef(id) { if (CAST[id]) return { id, role: null }; for (const [cid, c] of Object.entries(CAST)) if (c.look3d && c.look3d.roles && c.look3d.roles[id]) return { id: cid, role: id }; return null; }
  function lookOf(id, role) {
    const c = CAST[id]; if (!c) { if (STRICT) throw new Error(`unknown actor "${id}"; actors are the character assets: ${Object.keys(CAST).join(', ')}`); return null; }
    const base = c.look3d || {}, r = role && base.roles && base.roles[role];
    if (role && base.roles && !r && STRICT) throw new Error(`actor "${id}" has no role "${role}"; its roles: ${Object.keys(base.roles).join(', ')}`);
    return { ...base, ...(r || {}), roles: undefined };
  }
  function buildRig(id, role) {
    const look = lookOf(id, role); if (!look) return null;
    const g = new T.Group(), R0 = 0.42, HY = 1.16, sc = clamp(+look.scale || 1, 0.8, 1.2), owner = 'actor:' + id;
    const body = new T.Group(); g.add(body); body.scale.setScalar(sc);
    const headG = new T.Group(); headG.position.y = HY; body.add(headG);
    const skin = col(look.skin, 'skin');
    headG.add(outlined(new T.SphereGeometry(R0, 64, 40), lam(skin), 0.018));
    const faceMat = new T.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const face = new T.Mesh(new T.SphereGeometry(R0 * 1.003, 48, 48, Math.PI / 2 - 50 * DEG, 100 * DEG, 36 * DEG, 108 * DEG), faceMat); face.userData.decal = true; headG.add(face);
    if (look.cap) {
      const capc = col(look.cap); const cap = outlined(new T.SphereGeometry(R0 * 1.035, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.36), lam(capc), 0.016); cap.rotation.x = -0.32; headG.add(cap);
      const brim = outlined(new T.CylinderGeometry(R0 * 0.62, R0 * 0.62, 0.035, 40, 1, false, -Math.PI / 2, Math.PI), lam(capc), 0.012); brim.position.set(0, R0 * 0.42, R0 * 0.62); brim.rotation.x = 0.18; headG.add(brim);
    }
    const hair = look.hair || (look.cap ? 'none' : 'short'), hc = col(look.hair_colour, 'ink');
    if (hair === 'puffs') [-1, 1].forEach(k => { const p = outlined(new T.SphereGeometry(0.13, 24, 16), lam(hc), 0.012); p.position.set(k * R0 * 0.98, -0.02, -0.05); headG.add(p); });
    if (hair === 'short') { const hs = outlined(new T.SphereGeometry(R0 * 1.03, 48, 20, 0, Math.PI * 2, 0, Math.PI * 0.3), lam(hc), 0.014); hs.rotation.x = -0.45; headG.add(hs); }
    if (hair === 'long') { const hs = outlined(new T.SphereGeometry(R0 * 1.04, 48, 24, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.62), lam(hc), 0.014); headG.add(hs); }
    if (hair === 'bun') { const hs = outlined(new T.SphereGeometry(R0 * 1.03, 48, 20, 0, Math.PI * 2, 0, Math.PI * 0.3), lam(hc), 0.014); hs.rotation.x = -0.45; headG.add(hs); const b = outlined(new T.SphereGeometry(0.14, 24, 16), lam(hc), 0.012); b.position.set(0, R0 * 0.95, -R0 * 0.35); headG.add(b); }
    if (look.glasses) { const gm = lam(col('ink')); for (const s of [-1, 1]) { const el = -3 * DEG, az = s * 19 * DEG, p = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(R0 * 1.06); const ring = new T.Mesh(new T.TorusGeometry(0.075, 0.011, 10, 32), gm); ring.position.copy(p); ring.lookAt(p.clone().multiplyScalar(2)); headG.add(ring); } const br = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.11, 8), gm); br.rotation.z = Math.PI / 2; br.position.set(0, -0.02, R0 * 1.02); headG.add(br); }
    const shirt = col(look.jacket || look.shirt, 'warm');
    const torso = outlined(new T.CylinderGeometry(0.2, 0.22, 0.46, 32), lam(shirt), 0.016); torso.position.y = 0.6; body.add(torso);
    if (look.tie) { const tie = outlined(new T.ConeGeometry(0.05, 0.24, 4), lam(col(look.tie)), 0.008); tie.rotation.x = Math.PI; tie.position.set(0, 0.68, 0.21); body.add(tie); }
    if (look.jacket && look.shirt) { const v = outlined(new T.ConeGeometry(0.09, 0.2, 3), lam(col(look.shirt)), 0.006); v.rotation.x = Math.PI; v.position.set(0, 0.74, 0.19); body.add(v); }
    const limbM = lam(col('ink')), limb = r => { const m = new T.Mesh(new T.CylinderGeometry(r, r, 1, 10), limbM); m.castShadow = true; body.add(m); return m; };
    const arms = [limb(0.024), limb(0.024)], thighs = [limb(0.03), limb(0.03)], shins = [limb(0.03), limb(0.03)];
    const hands = [0, 1].map(() => { const m = outlined(new T.SphereGeometry(0.075, 24, 16), lam(skin), 0.012); body.add(m); return m; });
    const shoes = [0, 1].map(() => { const m = outlined(new T.SphereGeometry(0.1, 24, 12), lam(col(look.shoes, 'ink')), 0.01); m.scale.set(1, 0.55, 1.5); body.add(m); return m; });
    const finger = outlined(new T.CapsuleGeometry(0.018, 0.08, 4, 8), lam(skin), 0.006); body.add(finger);
    const drops = [0, 1, 2].map(() => { const d = new T.Group(); d.add(outlined(new T.SphereGeometry(0.045, 16, 12), lam('#8fd3f4'), 0.006)); const tip = new T.Mesh(new T.ConeGeometry(0.032, 0.06, 12), lam('#8fd3f4')); tip.position.y = 0.045; d.add(tip); headG.add(d); return d; });
    const held = new T.Group(); body.add(held);
    tag(g, owner);
    const rig = { id, role, g, body, headG, faceMat, faces: {}, arms, thighs, shins, hands, shoes, finger, drops, held, heldName: null, look, sc };
    return rig;
  }
  function setLimb(m, a, b) { const v = new T.Vector3().subVectors(b, a), L = v.length(); m.position.copy(a).addScaledVector(v, 0.5); m.scale.set(1, Math.max(0.001, L), 1); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); }
  function poseRig(rig, o, lt) {
    const pose = o.pose || 'stand'; if (!POSES[pose]) { if (STRICT) throw new Error(`pose "${pose}" is unknown; poses: ${Object.keys(POSES).join(', ')}`); }
    const expr = o.expr || 'neutral'; if (!EXPR.includes(expr) && STRICT) throw new Error(`expression "${expr}" is unknown; expressions: ${EXPR.join(', ')}`);
    const hp = POSES[pose] || POSES.stand, sit = /^sit/.test(pose), ph = (rig.id.length * 0.77) % 3;
    const blink = o.eyes != null ? +o.eyes < 0.2 : ((lt + ph) % 3.2) < 0.12;
    const fk = expr + (blink ? '_b' : ''); if (!rig.faces[fk]) rig.faces[fk] = faceTexture(rig.look, expr, blink);
    if (rig.faceMat.map !== rig.faces[fk]) { rig.faceMat.map = rig.faces[fk]; rig.faceMat.needsUpdate = true; }
    const breath = Math.sin((lt + ph) * 2.1);
    rig.headG.position.y = 1.16 + breath * 0.006 + (o.jolt ? Math.sin(clamp(o.jolt) * Math.PI) * 0.08 : 0);
    rig.headG.rotation.set((o.nod || 0) * DEG, (o.turn || 0) * DEG, (o.tilt || 0) * DEG);
    for (const k of [0, 1]) {
      const sd = k ? 1 : -1, sh = new T.Vector3(sd * 0.19, 0.78, 0), h0 = hp[k], wave = pose === 'wave' && k ? Math.sin(lt * 9) * 0.06 : 0;
      const hv = new T.Vector3(h0[0] + wave, h0[1] + breath * 0.004, h0[2]); setLimb(rig.arms[k], sh, hv); rig.hands[k].position.copy(hv);
      const hip = new T.Vector3(sd * 0.08, 0.4, 0), knee = sit ? new T.Vector3(sd * 0.1, 0.42, 0.34) : new T.Vector3(sd * 0.09, 0.22, 0.02), foot = sit ? new T.Vector3(sd * 0.1, 0.06, 0.38) : new T.Vector3(sd * 0.1, 0.06, 0.02);
      setLimb(rig.thighs[k], hip, knee); setLimb(rig.shins[k], knee, foot); rig.shoes[k].position.set(foot.x + sd * 0.02, 0.05, foot.z + 0.04);
    }
    rig.finger.visible = pose === 'point_up' || pose === 'point'; if (rig.finger.visible) { const h1 = rig.hands[1].position; rig.finger.position.set(h1.x, h1.y + (pose === 'point_up' ? 0.1 : 0.02), h1.z + (pose === 'point' ? 0.1 : 0)); rig.finger.rotation.set(pose === 'point' ? Math.PI / 2 : 0, 0, 0); }
    const sw = clamp(+o.sweat || 0), nd = Math.round(sw * 3);
    rig.drops.forEach((d, i) => { d.visible = i < nd; d.position.set((i - 1) * 0.22 + 0.3, 0.32 + Math.sin(lt * 3 + i) * 0.03, 0.25 - i * 0.05); });
    // held thing: between the hands for hold poses, else in the right hand
    if (rig.heldName !== (o.holds || null)) { rig.held.clear(); rig.heldName = o.holds || null; if (o.holds) { const m = buildThing(resolveThing(o.holds) || o.holds, { held: true }); if (m) { rig.held.add(m.g); tag(rig.held, 'actor:' + rig.id); } } }
    if (o.holds) { const a = rig.hands[0].position, b = rig.hands[1].position, two = /hold/.test(pose); rig.held.position.copy(two ? a.clone().add(b).multiplyScalar(0.5).add(new T.Vector3(0, 0.08, 0.06)) : b.clone().add(new T.Vector3(0, 0.08, 0.04))); }
    rig.body.scale.set(rig.sc, rig.sc * (1 + breath * 0.008), rig.sc);
  }

  // ---------- things: furniture and small props (always on the floor, or on top of another thing) ----------
  const THINGS = { // w (x), d (z), h (top surface height), build
    counter: { w: 2.4, d: 0.6, h: 0.72, b: (o, g) => { g.add(K.box(o.w, o.h - 0.06, o.d, o.colour || 'wood', { at: [0, (o.h - 0.06) / 2, 0] })); g.add(K.box(o.w + 0.12, 0.08, o.d + 0.12, o.top || 'cream', { at: [0, o.h - 0.04, 0] })); for (let i = 0; i < Math.max(1, Math.round(o.w / 0.8)); i++) g.add(K.box(o.w / Math.max(1, Math.round(o.w / 0.8)) - 0.14, o.h - 0.3, 0.02, mix(col(o.colour || 'wood'), col('ink'), 0.15), { at: [-o.w / 2 + (i + 0.5) * o.w / Math.max(1, Math.round(o.w / 0.8)), (o.h - 0.06) / 2, o.d / 2 + 0.01], line: 0.008 })); } },
    desk: { w: 1.4, d: 0.7, h: 0.66, b: (o, g) => { g.add(K.box(o.w, 0.06, o.d, o.top || 'cream', { at: [0, o.h - 0.03, 0] })); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.cyl(0.025, o.h - 0.06, '#c8c8c8', { at: [sx * (o.w / 2 - 0.08), (o.h - 0.06) / 2, sz * (o.d / 2 - 0.08)] })); g.add(K.box(o.w - 0.1, 0.05, 0.02, o.colour || 'warm', { at: [0, o.h - 0.075, o.d / 2 - 0.02], line: 0.006 })); } },
    table: { w: 1.2, d: 0.8, h: 0.66, b: (o, g) => { g.add(K.box(o.w, 0.07, o.d, o.top || o.colour || 'wood', { at: [0, o.h - 0.035, 0] })); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.box(0.07, o.h - 0.07, 0.07, o.colour || 'wood', { at: [sx * (o.w / 2 - 0.07), (o.h - 0.07) / 2, sz * (o.d / 2 - 0.07)] })); } },
    chair: { w: 0.5, d: 0.5, h: 0.46, b: (o, g) => { g.add(K.box(0.5, 0.06, 0.5, o.colour || 'wood', { at: [0, 0.43, 0] })); g.add(K.box(0.5, 0.5, 0.05, o.colour || 'wood', { at: [0, 0.7, -0.23] })); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.cyl(0.02, 0.4, 'ink', { at: [sx * 0.21, 0.2, sz * 0.21], line: 0 })); } },
    stool: { w: 0.4, d: 0.4, h: 0.62, b: (o, g) => { g.add(K.cyl(0.2, 0.06, o.colour || 'warm', { at: [0, 0.6, 0] })); g.add(K.cyl(0.03, 0.58, 'ink', { at: [0, 0.29, 0], line: 0 })); g.add(K.cyl(0.16, 0.03, 'ink', { at: [0, 0.015, 0], line: 0 })); } },
    sofa: { w: 1.9, d: 0.85, h: 0.45, b: (o, g) => { const c = o.colour || 'cool'; g.add(K.box(o.w, 0.4, o.d, c, { at: [0, 0.25, 0] })); g.add(K.box(o.w, 0.55, 0.2, c, { at: [0, 0.6, -o.d / 2 + 0.1] })); for (const sx of [-1, 1]) g.add(K.box(0.2, 0.55, o.d, c, { at: [sx * (o.w / 2 - 0.1), 0.35, 0] })); } },
    crate: { w: 0.6, d: 0.6, h: 0.6, b: (o, g) => { g.add(K.box(o.w, o.h, o.d, o.colour || 'amber', { at: [0, o.h / 2, 0] })); } },
    plant: { w: 0.5, d: 0.5, h: 1.0, b: (o, g) => { g.add(K.cyl(0.18, 0.36, o.colour || 'warm', { at: [0, 0.18, 0], r2: 0.22 })); for (let i = 0; i < 5; i++) g.add(K.ball(0.18, mix(col('accent2'), col('cool'), (i % 2) * 0.4), { at: [Math.sin(i * 1.3) * 0.15, 0.55 + (i % 3) * 0.15, Math.cos(i * 1.3) * 0.1] })); } },
    sign: { w: 0.7, d: 0.3, h: 1.4, b: (o, g) => { g.add(K.cyl(0.03, 1.0, 'ink', { at: [0, 0.5, 0], line: 0 })); g.add(K.box(0.7, 0.5, 0.04, o.colour || 'cream', { at: [0, 1.15, 0] })); } },
    computer: { w: 0.55, d: 0.4, h: 0.45, small: true, b: (o, g) => { g.add(K.box(0.55, 0.38, 0.05, 'ink', { at: [0, 0.3, -0.08] })); g.add(K.screen(0.49, 0.32, o.screen || mix(col('cool'), '#ffffff', 0.35), { at: [0, 0.3, -0.05] })); g.add(K.box(0.06, 0.1, 0.06, 'ink', { at: [0, 0.06, -0.08] })); g.add(K.box(0.4, 0.02, 0.14, '#d8d8d8', { at: [0, 0.01, 0.12], line: 0.006 })); } },
    laptop: { w: 0.36, d: 0.26, h: 0.24, small: true, b: (o, g) => { g.add(K.box(0.36, 0.02, 0.25, '#c8c8c8', { at: [0, 0.01, 0.02], line: 0.006 })); const s = K.box(0.36, 0.24, 0.015, '#c8c8c8', { at: [0, 0.12, -0.11], rot: [-15, 0, 0], line: 0.006 }); g.add(s); g.add(K.screen(0.32, 0.2, o.screen || mix(col('cool'), '#ffffff', 0.35), { at: [0, 0.125, -0.095], rot: [-15, 0, 0] })); } },
    phone: { w: 0.08, d: 0.02, h: 0.15, small: true, b: (o, g) => { g.add(K.box(0.08, 0.15, 0.015, 'ink', { at: [0, 0.075, 0], line: 0.004 })); g.add(K.screen(0.068, 0.13, o.screen || mix(col('cool'), '#ffffff', 0.3), { at: [0, 0.075, 0.009] })); } },
    paper: { w: 0.24, d: 0.32, h: 0.01, small: true, b: (o, g) => { g.add(K.box(0.24, 0.006, 0.32, o.colour || 'cream', { at: [0, 0.003, 0], line: 0.004 })); for (let i = 0; i < 4; i++) g.add(K.box(0.16, 0.002, 0.012, 'ink', { at: [0, 0.007, -0.1 + i * 0.05], line: 0 })); } },
    papers: { w: 0.26, d: 0.34, h: 0.06, small: true, b: (o, g) => { for (let i = 0; i < 6; i++) g.add(K.box(0.24, 0.008, 0.32, i % 2 ? 'cream' : mix(col('cream'), col('ink'), 0.08), { at: [(i % 3) * 0.006, 0.005 + i * 0.009, (i % 2) * 0.006], rot: [0, i * 3, 0], line: 0.003 })); } },
    mug: { w: 0.1, d: 0.1, h: 0.12, small: true, b: (o, g) => { g.add(K.cyl(0.045, 0.11, o.colour || 'accent', { at: [0, 0.055, 0] })); } },
    pizza_box: { w: 0.42, d: 0.42, h: 0.06, small: true, b: (o, g) => { g.add(K.box(0.42, 0.055, 0.42, o.colour || '#e8d8b0', { at: [0, 0.0275, 0], line: 0.006 })); g.add(K.cyl(0.1, 0.004, o.mark || 'warm', { at: [0, 0.057, 0], line: 0 })); } },
    pizza: { w: 0.36, d: 0.36, h: 0.03, small: true, b: (o, g) => { g.add(K.cyl(0.18, 0.025, 'amber', { at: [0, 0.0125, 0], line: 0.006 })); g.add(K.cyl(0.16, 0.01, '#f2d36b', { at: [0, 0.028, 0], line: 0 })); for (let i = 0; i < 6; i++) g.add(K.cyl(0.022, 0.008, 'warm', { at: [Math.cos(i) * 0.09, 0.034, Math.sin(i) * 0.09], line: 0 })); } },
    coins: { w: 0.12, d: 0.12, h: 0.08, small: true, b: (o, g) => { for (let i = 0; i < 6; i++) g.add(K.cyl(0.05, 0.012, o.colour || 'accent', { at: [(i % 2) * 0.004, 0.006 + i * 0.013, 0], line: 0.004 })); } },
    cash: { w: 0.2, d: 0.1, h: 0.08, small: true, b: (o, g) => { for (let i = 0; i < 5; i++) g.add(K.box(0.2, 0.014, 0.09, o.colour || mix(col('accent2'), col('cream'), 0.3), { at: [0, 0.007 + i * 0.015, 0], line: 0.004 })); } },
    box: { w: 0.4, d: 0.3, h: 0.25, small: true, b: (o, g) => { g.add(K.box(o.w, o.h, o.d, o.colour || '#c8c0b0', { at: [0, o.h / 2, 0] })); } },
    bag: { w: 0.4, d: 0.2, h: 0.45, small: true, b: (o, g) => { g.add(K.box(0.4, 0.38, 0.2, o.colour || 'amber', { at: [0, 0.19, 0] })); g.add(K.cyl(0.012, 0.2, 'ink', { at: [0, 0.42, 0], rot: [0, 0, 90], line: 0 })); } },
    tv: { w: 1.0, d: 0.35, h: 1.2, b: (o, g) => { g.add(K.box(0.9, 0.5, 0.35, o.colour || 'wood', { at: [0, 0.25, 0] })); g.add(K.box(1.0, 0.6, 0.06, 'ink', { at: [0, 0.85, 0] })); g.add(K.screen(0.9, 0.5, o.screen || mix(col('cool'), '#000000', 0.45), { at: [0, 0.85, 0.035] })); } },
    cabinet: { w: 1.0, d: 0.45, h: 1.1, b: (o, g) => { g.add(K.box(o.w, o.h, o.d, o.colour || 'wood', { at: [0, o.h / 2, 0] })); g.add(K.box(0.02, o.h * 0.8, 0.01, 'ink', { at: [0, o.h / 2, o.d / 2 + 0.005], line: 0 })); } },
    shelf_unit: { w: 1.1, d: 0.36, h: 1.9, b: (o, g) => { const bk = ['warm', 'accent', 'cool', 'amber', 'warm', 'cool']; g.add(K.box(o.w, o.h, o.d, o.colour || 'wood', { at: [0, o.h / 2, 0] })); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) g.add(K.box(0.12, 0.3, 0.24, bk[(i + r) % 6], { at: [-0.4 + i * 0.16, 0.45 + r * 0.55, 0.03], line: 0.006 })); } },
    bin: { w: 0.35, d: 0.35, h: 0.45, b: (o, g) => { g.add(K.cyl(0.17, 0.45, o.colour || '#8a8a8a', { at: [0, 0.225, 0], r2: 0.2 })); } },
  };
  const SYN = { monitor: 'computer', pc: 'computer', screen: 'computer', cellphone: 'phone', smartphone: 'phone', mobile: 'phone', letter: 'paper', note: 'paper', document: 'paper', cheque: 'paper', check: 'paper', receipt: 'paper', envelope: 'paper', sheet: 'paper', post: 'paper', ticket: 'paper', slip: 'paper', form: 'paper', card: 'paper', menu: 'paper', order: 'paper', flyer: 'paper', invoice: 'paper', contract: 'paper', shelf: 'shelf_unit', bookshelf: 'shelf_unit', cupboard: 'cabinet', drawer: 'cabinet', cup: 'mug', coffee: 'mug', money: 'cash', bills: 'cash', notes: 'cash', coin: 'coins', pizzas: 'pizza_box', pizza_boxes: 'pizza_box', parcel: 'box', package: 'box', crates: 'crate', bench: 'sofa', couch: 'sofa', seat: 'chair', armchair: 'chair', bar_stool: 'stool', bag_of: 'bag', trash: 'bin', basket: 'bin' };
  // a thing name: built-in, the story's prop, a known synonym, or the longest built-in name it contains ("closed_pizza_box" -> pizza_box)
  function resolveThing(name) {
    const n = String(name || '').toLowerCase().trim();
    if (THINGS[n] || PROPS[name]) return PROPS[name] ? name : n;
    if (SYN[n]) return SYN[n];
    const parts = n.split(/[^a-z0-9]+/).filter(Boolean), cands = [...Object.keys(THINGS), ...Object.keys(SYN)].filter(k => n.includes(k) && k.split('_').every(w => parts.includes(w))).sort((a, b) => b.length - a.length);
    return cands.length ? (SYN[cands[0]] || cands[0]) : null;
  }
  function buildThing(name0, o = {}) {
    const name = resolveThing(name0) || name0;
    let def = THINGS[name], g = new T.Group();
    if (!def && PROPS[name]) { // a prop asset from the plan, built by its own code
      const fn = PROPFN[name]; if (!fn) return null;
      const m = fn(K, o.params || {}); if (!m) return null; g.add(m);
      const bb = new T.Box3().setFromObject(m), s = new T.Vector3(); bb.getSize(s); m.position.y -= bb.min.y; m.position.x -= (bb.min.x + bb.max.x) / 2; m.position.z -= (bb.min.z + bb.max.z) / 2;
      def = { w: s.x, d: s.z, h: s.y, small: (PROPS[name].small != null ? PROPS[name].small : s.y < 0.6), asset: true };
      return { g, def, dims: { w: s.x, d: s.z, h: s.y } };
    }
    if (!def) { if (STRICT) throw new Error(`thing "${name}" is unknown; things: ${Object.keys(THINGS).join(', ')}${Object.keys(PROPS).length ? `, and the prop asset(s) ${Object.keys(PROPS).join(', ')}` : ''}`); return null; }
    const dims = { w: o.w ? clamp(+o.w, 0.05, 5) : def.w, d: o.d ? clamp(+o.d, 0.05, 3) : def.d, h: o.h ? clamp(+o.h, 0.01, 3) : def.h };
    def.b({ ...o, ...dims }, g); return { g, def, dims };
  }

  // ---------- per-frame scene state ----------
  let FRAME = null; const POOL = {}; // POOL: cached objects by key; FRAME: what this frame uses
  function frameState() {
    if (FRAME && FRAME.cur === CUR) return FRAME;
    for (const k in POOL) POOL[k].obj.visible = false;
    FRAME = { cur: CUR, room: null, actors: [], things: [], used: {}, cam: null, errs: [] };
    return FRAME;
  }
  const err = (F, k, m) => { if (!F.errs.some(e => e[0] === k)) F.errs.push([k, m]); };
  const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  function footprint(x, z, w, d, rotDeg) { const r = ((Math.round((rotDeg || 0) / 90) % 2) + 2) % 2, hw = (r ? d : w) / 2, hd = (r ? w : d) / 2; return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }; }
  const overlapArea = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0));
  const num = (v, name, lo, hi) => { const n = +v; if (!Number.isFinite(n)) { if (STRICT) throw new Error(`${name} must be a number in metres (got ${JSON.stringify(v)})`); return 0; } return clamp(n, lo, hi); };

  const API = {
    room(name) {
      const F = frameState(), k = 'room:' + name;
      if (!POOL[k]) { const g = buildRoom(name); scene.add(g); POOL[k] = { obj: g }; }
      POOL[k].obj.visible = true; F.room = name; F.obst = POOL[k].obj.userData.obst || [];
      const lamp = POOL[k].obj.userData.lamp; if (lamp) lamp.rotation.z = Math.sin(CUR.lt * 1.3) * 0.03;
      return name;
    },
    thing(name, o = {}) {
      const F = frameState(), asked = name; name = resolveThing(name) || name; const n = F.used[name] = (F.used[name] || 0) + 1, k = `thing:${name}:${n}:${JSON.stringify([o.w, o.d, o.h, o.colour, o.top, o.screen])}`;
      if (!POOL[k]) { const t = buildThing(name, o); if (!t) return null; tag(t.g, 'thing:' + name); scene.add(t.g); POOL[k] = { obj: t.g, def: t.def, dims: t.dims }; }
      const P = POOL[k], x = num(o.x ?? 0, `${name} x`, -3.4, 3.4), z = num(o.z ?? 0, `${name} z`, -2.95, 6), rot = +o.rot || 0;
      let y = 0, on = null;
      if (o.on) { const onName = resolveThing(o.on) || o.on; on = F.things.find(t => t.id === o.on) || F.things.find(t => t.name === onName); if (!on) { if (STRICT) throw new Error(`thing "${name}" is put on "${o.on}", which is not placed in this frame yet: place "${o.on}" first with h.d3.thing`); } else y = on.top; }
      P.obj.position.set(x, y, z); P.obj.rotation.set(0, rot * DEG, 0); P.obj.visible = true;
      const fp = footprint(x, z, P.dims.w, P.dims.d, rot), rec = { name, id: o.id || asked, x, z, y, top: y + P.dims.h, fp, small: !!P.def.small, on: on ? on.id : null, obj: P.obj, asset: !!P.def.asset };
      if (o.on && on) { // keep it on the top: slide it inward when it hangs over an edge
        const hw = (fp.x1 - fp.x0) / 2, hd = (fp.z1 - fp.z0) / 2, nx = (on.fp.x1 - on.fp.x0) > 2 * hw ? clamp(x, on.fp.x0 + hw, on.fp.x1 - hw) : (on.fp.x0 + on.fp.x1) / 2, nz = (on.fp.z1 - on.fp.z0) > 2 * hd ? clamp(z, on.fp.z0 + hd, on.fp.z1 - hd) : (on.fp.z0 + on.fp.z1) / 2;
        if (nx !== x || nz !== z) { P.obj.position.set(nx, y, nz); rec.x = nx; rec.z = nz; rec.fp = footprint(nx, nz, P.dims.w, P.dims.d, rot); }
      }
      if (!o.on && P.def.small) err(F, 'floor:' + name, `"${name}" is a small prop standing on the floor at x ${x}, z ${z}: put it on a counter, desk or table with on: "<thing>", or give it to an actor with holds: "${name}"`);
      F.things.push(rec); return rec;
    },
    actor(id, o = {}) {
      const cr = castRef(id); if (cr && cr.id !== id) { o = { ...o, role: o.role || cr.role }; id = cr.id; }
      const F = frameState(), role = o.role || null, n = F.used['a:' + id] = (F.used['a:' + id] || 0) + 1;
      if (n > 1) { const old = F.actors.findIndex(a => a.id === id); if (old >= 0) F.actors.splice(old, 1); } // placed twice: the last call wins
      const k = `actor:${id}:${role || ''}`;
      if (!POOL[k]) { const rig = buildRig(id, role); if (!rig) return null; scene.add(rig.g); POOL[k] = { obj: rig.g, rig }; }
      const rig = POOL[k].rig, x = num(o.x ?? 0, `${id} x`, -3.3, 3.3), z = num(o.z ?? 0, `${id} z`, -2.8, 6);
      let y = 0, seat = null;
      if (/^sit/.test(o.pose || '')) { seat = F.things.find(t => t.name === (o.on || 'chair') || t.id === o.on); if (seat) y = seat.top - 0.42; else if (STRICT) throw new Error(`actor "${id}" sits but no chair or stool is placed: place h.d3.thing('chair', {...}) first at the same x, z (or on: "<its id>")`); }
      rig.g.position.set(x, Math.max(0, y), z); rig.g.visible = true;
      poseRig(rig, o, CUR.lt);
      F.actors.push({ id, role, x, z, rig, o, seat });
      return id;
    },
    // turn actors toward what they face (resolved once everything is placed), then frame the camera
    cam(type = 'wide', o = {}) { const F = frameState(); F.cam = { type, o }; return type; },
    render() {
      const F = frameState(); resolveFacing(F); placeCamera(F); check(F);
      renderer().render(scene, cam);
      ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(glc, 0, 0, W, H);
      const spec = ((STYLE.backgrounds || []).find(b => b.name === F.room) || {}).room || {}, vg = clamp(spec.vignette != null ? +spec.vignette : 0.6, 0, 0.85);
      if (vg > 0) { const g = ctx.createRadialGradient(W / 2, H * 0.47, 330, W / 2, H / 2, 1180); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(col('bg'), vg)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      BG_DONE = true; reportTrack(F);
      return true;
    },
    // where a world point lands on the frame, for 2D labels or arrows: [x, y] in px (null if behind the camera)
    screen(p) { const v = new T.Vector3(+p[0] || 0, +p[1] || 0, +p[2] || 0).project(cam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; },
    head(id) { const F = frameState(), a = F.actors.find(a => a.id === id); if (!a) return null; const p = new T.Vector3(); a.rig.headG.getWorldPosition(p); return API.screen([p.x, p.y + 0.5 * a.rig.sc, p.z]); },
    kit: () => defaultKit(),
  };
  function resolveFacing(F) {
    for (const a of F.actors) {
      const f = a.o.face; let yaw = 0;
      if (typeof f === 'number' || (typeof f === 'string' && f.trim() !== '' && Number.isFinite(+f))) yaw = +f * DEG;
      else if (f && f !== 'camera') { const fr = castRef(f), t = F.actors.find(b => b.id === f || (fr && b.id === fr.id && (!fr.role || b.role === fr.role))) || F.things.find(b => b.name === f || b.id === f); if (t) yaw = yawTo([a.x, a.z], [t.x, t.z]); else if (STRICT) throw new Error(`actor "${a.id}" faces "${f}", which is not in this frame (face: an actor id, a thing, "camera" or degrees, 0 = toward the camera)`); }
      a.rig.g.rotation.y = yaw; a.yaw = yaw;
      if (a.seat && a.seat.obj) a.seat.obj.rotation.y = yaw; // the chair's back behind the sitter
    }
  }
  // ---------- cameras ----------
  const tmpV = new T.Vector3(), ray = new T.Raycaster();
  function headPos(a) { const p = new T.Vector3(); a.rig.headG.getWorldPosition(p); return p; }
  function blockers(F, from, to, ignoreOwners) {
    ray.set(from, tmpV.copy(to).sub(from).normalize()); ray.far = from.distanceTo(to) - 0.05; ray.near = 0.05;
    const objs = []; for (const k in POOL) if (POOL[k].obj.visible && !String(k).startsWith('room:')) objs.push(POOL[k].obj);
    const hits = ray.intersectObjects(objs, true).filter(h => h.object.visible && !h.object.userData.hull && !h.object.userData.decal && !ignoreOwners.includes(h.object.userData.owner));
    return hits.length ? hits[0].object.userData.owner : null;
  }
  function insideSomething(F, p) {
    if (p.x < -ROOM.halfW + 0.1 || p.x > ROOM.halfW - 0.1 || p.z < ROOM.back + 0.15 || p.y < 0.1 || p.y > ROOM.ceil - 0.1) return 'outside the room';
    for (const k in POOL) { const o = POOL[k].obj; if (!o.visible || String(k).startsWith('room:')) continue; const bb = new T.Box3().setFromObject(o).expandByScalar(0.04); if (bb.containsPoint(p)) return o.userData.owner || k; }
    return null;
  }
  function fitDistance(radius, fill) { const hf = 2 * Math.atan(Math.tan(cam.fov * DEG / 2) * (W / H)); return radius / (fill * Math.tan(hf / 2)); }
  function placeCamera(F) {
    const c = F.cam || { type: 'wide', o: {} }, o = c.o || {}, type = c.type, push = clamp(+o.push || 0) * 0.06;
    const act = id => { const cr = castRef(id), a = F.actors.find(a => a.id === id) || (cr ? F.actors.find(a => a.id === cr.id) : null); if (!a && STRICT) throw new Error(`camera "${type}" is aimed at "${id}", which is not placed in this frame`); return a; };
    const thingRec = id => F.things.find(t => t.name === id || t.id === id);
    cam.fov = clamp(+o.fov || (type === 'close' ? 30 : type === 'wide' ? 36 : type === 'ots' ? 44 : 36), 20, 70);
    const tries = []; // candidate camera positions, first unblocked wins
    const facingDir = a => new T.Vector3(Math.sin(a.yaw || 0), 0, Math.cos(a.yaw || 0));
    const angles = o.angle != null ? [+o.angle, -o.angle, 0, 30, -30, 55, -55, 75, -75, 90, -90] : [15, -15, 0, 35, -35, 60, -60, 75, -75, 90, -90];
    const rot = (v, deg) => v.clone().applyAxisAngle(new T.Vector3(0, 1, 0), deg * DEG);
    let target = new T.Vector3(0, 1, 0), mustSee = [];
    if (type === 'wide' || type === 'two') {
      const on = (o.on ? [].concat(o.on) : F.actors.map(a => a.id)).map(act).filter(Boolean);
      const pts = on.length ? on : [{ x: 0, z: 0, rig: { sc: 1 } }];
      const xs = pts.map(a => a.x), zs = pts.map(a => a.z), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      const half = Math.max(0.55, (Math.max(...xs) - Math.min(...xs)) / 2 + 0.5), depth = Math.max(...zs) - Math.min(...zs);
      target.set(cx, type === 'two' ? 1.08 : 0.85, cz + depth * 0.15);
      const d = Math.max(fitDistance(half, type === 'two' ? 0.85 : clamp(+o.fill || 0.85, 0.2, 0.95)) + depth * 0.5, type === 'two' ? 2.0 : 2.4) * (1 - push);
      for (const ang of (o.angle != null ? [+o.angle, 0, -o.angle] : [0, 12, -12, 25, -25])) tries.push(target.clone().add(rot(new T.Vector3(0, 0, 1), ang).multiplyScalar(d)).add(new T.Vector3(0, type === 'two' ? 0.15 : 0.4, 0)));
      mustSee = on.filter(a => a.rig);
    } else if (type === 'medium' || type === 'close') {
      const a = act(o.on || F.actors[0]?.id); if (a) {
        const hp = headPos(a); target = type === 'close' ? hp.clone().add(new T.Vector3(0, -0.12, 0)) : hp.clone().add(new T.Vector3(0, -0.38, 0));
        const d = fitDistance(type === 'close' ? 0.42 * a.rig.sc : 0.62 * a.rig.sc, type === 'close' ? clamp(+o.fill || 0.85, 0.5, 1) : clamp(+o.fill || 0.75, 0.4, 1)) * (1 - push);
        for (const ang of angles) tries.push(target.clone().add(rot(facingDir(a), ang).multiplyScalar(d)).add(new T.Vector3(0, 0.06, 0)));
        mustSee = [a];
      }
    } else if (type === 'ots') {
      const a = act(o.from || F.actors[0]?.id), b = o.to ? (act(o.to) || null) : F.actors.find(x => x.id !== (a && a.id));
      const bt = !b && o.to ? thingRec(o.to) : null;
      if (a && (b || bt)) {
        const ha = headPos(a), hb = b ? headPos(b) : new T.Vector3(bt.x, bt.top, bt.z); target = hb.clone().add(new T.Vector3(0, b ? -0.2 : 0, 0));
        const back = ha.clone().sub(hb).setY(0).normalize(), side = new T.Vector3(back.z, 0, -back.x);
        // the line of sight grazes past the shoulder head: from the target through a point just beside that head, then on behind it,
        // so the head sits at the frame edge, cut by it, and the target is in clear view (a portrait frame sees little sideways)
        for (const s of [1, -1]) for (const dist of [1.4, 1.9]) { const P = ha.clone().addScaledVector(side, s * 0.56 * a.rig.sc).add(new T.Vector3(0, 0.12, 0)), dir = P.clone().sub(hb).normalize(); tries.push(P.addScaledVector(dir, dist * (1 - push))); }
        mustSee = b ? [b] : [];
      }
    } else if (type === 'insert') {
      const t = thingRec(o.on); if (!t) { if (STRICT) throw new Error(`camera "insert" needs on: a thing placed in this frame (got ${JSON.stringify(o.on)})`); }
      else { target.set(t.x, t.top, t.z); for (const ang of [0, 20, -20, 40, -40]) tries.push(target.clone().add(rot(new T.Vector3(0, 0, 1), ang).multiplyScalar(1.1 * (1 - push))).add(new T.Vector3(0, 0.9, 0))); }
    } else if (type === 'free') {
      const p = o.pos || [0, 1.4, 4], l = o.look || [0, 1, 0]; tries.push(new T.Vector3(+p[0], +p[1], +p[2])); target.set(+l[0], +l[1], +l[2]);
    } else if (STRICT) throw new Error(`camera type "${type}" is unknown; types: wide, medium, close, ots, two, insert, free`);
    let chosen = null, why = '';
    for (const p of tries) {
      const inside = insideSomething(F, p); if (inside) { why = inside === 'outside the room' ? 'the camera would be outside the room' : `the camera would be inside ${inside.replace(/^(actor|thing|room):/, '')}`; continue; }
      const ign = a => ['actor:' + a.id, ...(type === 'ots' ? ['actor:' + (o.from || '')] : [])];
      const bl = mustSee.map(a => { const hp = headPos(a), dy = 0.2 * a.rig.sc; return [a.id, blockers(F, p, hp.clone().add(new T.Vector3(0, 0.02, 0)), ign(a)) || blockers(F, p, hp.clone().add(new T.Vector3(0, -dy, 0)), ign(a))]; }).find(b => b[1]);
      if (bl) { why = `${bl[1].replace(/^(actor|thing):/, '')} stands between the camera and ${bl[0]}`; continue; }
      chosen = p; break;
    }
    if (!chosen) { chosen = tries.find(p => !insideSomething(F, p)) || new T.Vector3(clamp(target.x, -1.5, 1.5), 1.45, Math.max(target.z + 3.2, 2)); err(F, 'cam:' + type, `camera "${type}"${o.on ? ` on "${[].concat(o.on).join(', ')}"` : ''}: no clear view (${why || 'no target'}). Re-stage: turn the actor toward open space or the camera side (+z), move things that stand between, or use another camera type`); }
    cam.position.copy(chosen); cam.lookAt(target); cam.aspect = W / H; cam.updateProjectionMatrix();
    F.camInfo = { type, pos: chosen.toArray().map(v => +v.toFixed(2)) };
  }
  // ---------- staging checks: what a viewer would see as wrong ----------
  function check(F) {
    const R2 = 0.27; // an actor's footprint radius
    for (const a of F.actors) {
      if (a.seat) continue;
      for (const t of F.things) { if (t.small || t.on) continue; const f = t.fp, nx = clamp(a.x, f.x0, f.x1), nz = clamp(a.z, f.z0, f.z1); if (Math.hypot(a.x - nx, a.z - nz) < R2) err(F, `in:${a.id}:${t.name}`, `actor "${a.id}" at x ${a.x}, z ${a.z} stands inside "${t.name}" (its floor area is x ${f.x0.toFixed(2)} to ${f.x1.toFixed(2)}, z ${f.z0.toFixed(2)} to ${f.z1.toFixed(2)}). To stand behind it use z below ${(f.z0 - 0.3).toFixed(2)}; in front of it, z above ${(f.z1 + 0.3).toFixed(2)}`); }
      for (const f of F.obst || []) { const nx = clamp(a.x, f.x0, f.x1), nz = clamp(a.z, f.z0, f.z1); if (Math.hypot(a.x - nx, a.z - nz) < R2) err(F, `wall:${a.id}`, `actor "${a.id}" at x ${a.x}, z ${a.z} stands inside a piece of furniture against the back wall (x ${f.x0.toFixed(2)} to ${f.x1.toFixed(2)}, z up to ${f.z1.toFixed(2)}): use z above ${(f.z1 + 0.3).toFixed(2)}`); }
      for (const b of F.actors) if (b !== a && a.id < b.id && Math.hypot(a.x - b.x, a.z - b.z) < 0.62) err(F, `aa:${a.id}:${b.id}`, `actors "${a.id}" and "${b.id}" are only ${Math.hypot(a.x - b.x, a.z - b.z).toFixed(2)} m apart, so their heads overlap: keep them at least 0.7 m apart`);
    }
    const big = F.things.filter(t => !t.small && !t.on);
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) { const A = big[i].fp, B = big[j].fp, ov = overlapArea(A, B); if (ov > 0.02 && !(big[i].name === 'chair' || big[j].name === 'chair' || big[i].name === 'stool' || big[j].name === 'stool')) err(F, `tt:${big[i].name}:${big[j].name}`, `"${big[i].name}" and "${big[j].name}" stand inside each other on the floor: move them apart`); }
    for (const t of big) for (const f of F.obst || []) if (overlapArea(t.fp, f) > 0.02) err(F, `tw:${t.name}`, `"${t.name}" at z ${t.z} stands inside furniture against the back wall: use z above ${(f.z1 + (t.fp.z1 - t.fp.z0) / 2 + 0.05).toFixed(2)}`);
  }
  function reportTrack(F) {
    if (!TRACK) return;
    (TRACK.d3errs = TRACK.d3errs || []).push(...F.errs.map(e => e[1]));
    // each actor's projected box, so the 2D checks (hero size, acting, biggest subject) work unchanged
    for (const a of F.actors) {
      const bb = new T.Box3().setFromObject(a.rig.body), pts = [];
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const v = new T.Vector3(x, y, z).project(cam); if (v.z < 1) pts.push([(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]); }
      if (!pts.length) continue;
      const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
      const cx0 = clamp(x0, 0, W), cx1 = clamp(x1, 0, W), cy0 = clamp(y0, 0, H), cy1 = clamp(y1, 0, H), vis = cx1 - cx0 > 20 && cy1 - cy0 > 20;
      const fg = F.cam && F.cam.type === 'ots' && (F.cam.o || {}).from === a.id; // the shoulder in front of the lens
      TRACK.assets.push({ id: a.id, w: cx1 - cx0, h: cy1 - cy0, cx: (cx0 + cx1) / 2, cy: (cy0 + cy1) / 2, alpha: !vis ? 0 : fg ? 0.4 : 1, act: JSON.stringify({ pose: a.o.pose || 'stand', expr: a.o.expr || 'neutral', holds: a.o.holds || '' }) });
    }
    TRACK.cam = F.camInfo;
  }

  // ---------- the default kit for 3D reels: palette, font, paper or screen panels, plain text ----------
  function defaultKit() {
    const P = pal(), font = (s, w = 800) => `${w} ${s}px "${(STYLE && STYLE.font) || 'Segoe UI'}", "Segoe UI", Arial`;
    return {
      palette: P, font,
      bg: (c, lt, name) => { c.fillStyle = P.bg; c.fillRect(0, 0, W, H); },
      panel: (c, x, y, w, hgt, o = {}) => {
        c.save(); c.globalAlpha *= o.alpha != null ? +o.alpha : 1; c.lineJoin = 'round';
        if (o.accent) { c.fillStyle = P.bg; c.strokeStyle = P.ink; c.lineWidth = 6; rr(x - 24, y - 24, w + 48, hgt + 48, 18); c.fill(); c.stroke(); const g = c.createLinearGradient(0, y, 0, y + hgt); g.addColorStop(0, mix(o.accent, '#ffffff', 0.12)); g.addColorStop(0.25, mix(o.accent, P.ink, 0.45)); g.addColorStop(1, mix(o.accent, P.ink, 0.55)); c.fillStyle = g; rr(x, y, w, hgt, 8); c.fill(); }
        else { c.fillStyle = mix(P.cream, P.ink, 0.25); rr(x + 10, y + 10, w, hgt, 8); c.fill(); c.fillStyle = P.cream; c.strokeStyle = P.ink; c.lineWidth = 5; rr(x, y, w, hgt, 8); c.fill(); c.stroke(); }
        c.restore();
      },
      title: (c, text, x, y, o = {}) => { c.save(); const k = o.k == null ? 10 : +o.k; if (k < 0) { c.restore(); return; } const e = clamp(k / 0.2); c.globalAlpha *= e; c.font = font(o.size || 72, o.weight || 900); c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.fillStyle = o.color || P.ink; c.translate(x, y); const s = 0.85 + 0.15 * easeBack(e); c.scale(s, s); c.fillText(String(text), 0, 0); c.restore(); },
      post: null,
    };
  }

  // ---------- setup and prop checks ----------
  function clearPool() { for (const k in POOL) { scene.remove(POOL[k].obj); delete POOL[k]; } FRAME = null; }
  function setup(d3) {
    STYLE = d3.style || STYLE; CAST = d3.cast || {}; PROPS = d3.props || {}; PROPFN = {};
    for (const k in MATS) delete MATS[k];
    for (const [id, p] of Object.entries(PROPS)) if (p.code) try { PROPFN[id] = compileProp(p.code); } catch { }
    clearPool();
  }
  const compileProp = code => new Function('k', 'p', `"use strict";\n${code}\nreturn buildAsset(k, p);`);
  function validateProp(code, spec) {
    const errors = []; let fn;
    try { fn = compileProp(code); } catch (e) { return { ok: false, errors: [`SyntaxError: ${e.message}${dupHint(code, e.message)}`] }; }
    let m; try { STRICT = true; m = fn(K, {}); } catch (e) { STRICT = false; return { ok: false, errors: [`runtime error: ${e.message}${at(e, code)}`] }; } STRICT = false;
    if (!m || !m.isObject3D) return { ok: false, errors: ['buildAsset must return k.group(...) (or one part)'] };
    let parts = 0; m.traverse(x => { if (x.isMesh && !x.userData.hull) parts++; });
    const bb = new T.Box3().setFromObject(m), s = new T.Vector3(); bb.getSize(s);
    if (![s.x, s.y, s.z].every(Number.isFinite)) errors.push('a size or position is NaN: check every number');
    if (parts < 3) errors.push(`only ${parts} part(s): build the object from at least 3 parts (body, details, base)`);
    const mx = Math.max(s.x, s.y, s.z); if (mx > 3.5) errors.push(`it is ${mx.toFixed(2)} m across: sizes are in metres (a desk is 1.4 m wide, a phone 0.15 m tall)`); if (mx < 0.04) errors.push(`it is only ${mx.toFixed(3)} m across: sizes are in metres`);
    // preview: the prop alone in a plain room, from three sides
    let preview = null;
    if (!errors.length) {
      clearPool(); STYLE = STYLE || {}; const g = new T.Group(); g.add(m); m.position.y -= bb.min.y; m.position.x -= (bb.min.x + bb.max.x) / 2; m.position.z -= (bb.min.z + bb.max.z) / 2; scene.add(g);
      const imgs = [];
      for (const ang of [25, -25, 90]) { const d = Math.max(0.6, mx * 2.4); cam.fov = 36; cam.position.set(Math.sin(ang * DEG) * d, s.y * 0.5 + d * 0.35, Math.cos(ang * DEG) * d); cam.lookAt(0, s.y * 0.45, 0); cam.aspect = W / H; cam.updateProjectionMatrix(); scene.background = new T.Color('#8c8c8c'); renderer().render(scene, cam); const c = document.createElement('canvas'); c.width = 300; c.height = 533; c.getContext('2d').drawImage(glc, 0, 0, 300, 533); imgs.push(c); }
      scene.background = null; scene.remove(g); preview = sheet(imgs, 300, 533);
    }
    return { ok: !errors.length, errors, preview, size: [s.x, s.y, s.z].map(v => +v.toFixed(3)) };
  }
  // the cast sheet: every character (and role) standing in neutral and surprised, and every prop, for the director
  function castSheet() {
    clearPool(); const tiles = [], save = FRAME;
    const one = (draw) => { if (ctx.reset) ctx.reset(); const F0 = CUR; CUR = { sh: { lines: [] }, lt: 0.5 + tiles.length * 0.01 }; scene.background = new T.Color('#8c8c8c'); draw(); scene.background = null; CUR = F0; const c = document.createElement('canvas'); c.width = 270; c.height = 480; c.getContext('2d').drawImage(glc, 0, 0, 270, 480); const g = c.getContext('2d'); g.fillStyle = '#111'; g.font = 'bold 22px Arial'; _fillText.call(g, tiles.label, 10, 26); tiles.push(c); };
    for (const [id, c] of Object.entries(CAST)) for (const role of [null, ...Object.keys((c.look3d && c.look3d.roles) || {})]) for (const expr of ['neutral', 'surprised']) {
      tiles.label = `${id}${role ? ' (' + role + ')' : ''}: ${expr}`;
      one(() => { for (const k in POOL) POOL[k].obj.visible = false; FRAME = { cur: CUR, room: null, actors: [], things: [], used: {}, cam: null, errs: [] }; API.actor(id, { x: 0, z: 0, role, expr, pose: expr === 'surprised' ? 'hands_up' : 'stand' }); resolveFacing(FRAME); cam.fov = 34; cam.position.set(0.6, 1.1, 3.6); cam.lookAt(0, 0.85, 0); cam.aspect = W / H; cam.updateProjectionMatrix(); renderer().render(scene, cam); });
    }
    for (const id of Object.keys(PROPS)) { tiles.label = id; one(() => { for (const k in POOL) POOL[k].obj.visible = false; FRAME = { cur: CUR, room: null, actors: [], things: [], used: {}, cam: null, errs: [] }; const t = API.thing(id, { x: 0, z: 0 }); const d = t ? Math.max(1.0, (t.top || 0.5) * 2.6) : 2; cam.fov = 34; cam.position.set(d * 0.5, (t ? t.top : 0.5) * 0.6 + d * 0.3, d); cam.lookAt(0, (t ? t.top : 0.5) * 0.45, 0); cam.aspect = W / H; cam.updateProjectionMatrix(); renderer().render(scene, cam); }); }
    FRAME = save; clearPool();
    const out = [], cols = 4; for (let k = 0; k < tiles.length; k += 16) { const part = tiles.slice(k, k + 16), c = document.createElement('canvas'); c.width = 270 * cols; c.height = 480 * Math.ceil(part.length / cols); const g = c.getContext('2d'); g.fillStyle = '#7f7f7f'; g.fillRect(0, 0, c.width, c.height); part.forEach((t, i) => g.drawImage(t, (i % cols) * 270, Math.floor(i / cols) * 480)); out.push(c.toDataURL('image/jpeg', 0.85)); }
    return out;
  }
  return { API, setup, validateProp, castSheet, POSES, EXPR, THINGS, WALL_PROPS, ok: () => { try { return !!renderer().getContext(); } catch { return false; } } };
})();
if (D3) { HK.d3 = D3.API; window.validateProp3d = (code, spec, d3) => { if (d3) D3.setup(d3); return D3.validateProp(code, spec); }; window.castSheet3d = d3 => { if (d3) D3.setup(d3); return D3.castSheet(); }; window.D3_OK = () => D3.ok(); }
