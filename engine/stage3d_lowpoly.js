'use strict';
// Low-poly 3D stage for templates with "renderer: lowpoly" (loaded by stage_asset.html after stage3d.js; shares W, H, ctx, CUR,
// TRACK, STRICT, BG_DONE and the h helpers). The PS1 look, as six rules:
//   1. low poly, flat shading: every model is a few hundred triangles, each face one tone (no smoothing, no outlines)
//   2. 64 px textures painted by code, sampled nearest (fabric speckle, planks, grass, grilles, fins ...)
//   3. the 3D frame is rendered at 270 x 480 and blown up 4x with nearest-neighbour (no smoothing), colours dithered to 15 bit
//   4. vertices snap to the 270 x 480 grid (the wobble)
//   5. a subject is sliced open (halves slide apart, cut faces dark with bright triangle edges) and one part is labelled
//   6. the host (a low-poly animal in a suit, built by the engine) strikes a new pose on every sentence
// M3 never writes three.js: it builds subjects from low-poly parts (k.box, k.cyl, k.pipe ...) and stages shots with h.d3.
// Units are metres: ground at y 0, x left (-) to right (+), the camera side is +z.
const LP = (() => {
  const T = window.THREE; if (!T) return null;
  const DEG = Math.PI / 180, LW = 270, LH = 480;
  const DEF = { sky: '#7f9be6', sky2: '#eaa6c2', ground: '#86b648', wood: '#a0683c', fur: '#8e8c96', fur2: '#ece6dc', mask: '#2a2430', jacket: '#e2a020', shirt: '#f4f0e6', tie: '#d83828', trousers: '#3a4068', shoes: '#24202c', ink: '#1a1424', cut: '#2a1838', edge: '#f08a28', accent: '#ffd23a', text: '#ffffff', metal: '#a8acb4', leaf: '#4a9a40' };
  let STYLE = { palette: DEF, backgrounds: [] }, CAST = {}, PROPS = {}, PROPFN = {};
  const pal = () => ({ ...DEF, ...((STYLE && STYLE.palette) || {}) });
  const hexOk = c => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim());
  function col(c, fallback = 'metal') { const P = pal(); if (c == null || c === '') c = fallback; if (typeof c === 'string' && P[c] != null) return P[c]; if (hexOk(c)) return c.trim(); if (STRICT) throw new Error(`unknown colour "${c}": use a palette name (${Object.keys(P).join(', ')}) or a hex colour like "#4a90c8"`); return P[fallback] || '#999999'; }
  const rgb = c => { const x = new T.Color(c); return x; }, srgb = c => { const x = new T.Color(c); x.convertLinearToSRGB(); return new T.Vector3(x.r, x.g, x.b); };

  // ---------- renderer: 270 x 480, no antialias, transparent clear (the sky is painted in 2D underneath) ----------
  const glc = document.createElement('canvas'); glc.width = LW; glc.height = LH;
  let R = null;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(40, LW / LH, 0.05, 120);
  const hemi = new T.HemisphereLight('#e4ecff', '#7a6a4a', 1.25); scene.add(hemi);
  const sun = new T.DirectionalLight('#fff2dc', 2.1); sun.position.set(-4, 7, 6); scene.add(sun);
  function renderer() {
    if (R) return R;
    R = new T.WebGLRenderer({ canvas: glc, antialias: false, alpha: true, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(LW, LH, false); R.outputColorSpace = T.SRGBColorSpace; R.localClippingEnabled = true; R.setClearColor(0x000000, 0);
    return R;
  }
  // the composite at 270 x 480: painted sky, then the 3D frame, then 15-bit colour with a 4 x 4 ordered dither
  const lo = document.createElement('canvas'); lo.width = LW; lo.height = LH; const lctx = lo.getContext('2d', { willReadFrequently: true });
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dither() {
    const im = lctx.getImageData(0, 0, LW, LH), d = im.data, q = 8;
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      const i = (y * LW + x) * 4, b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * q;
      d[i] = Math.min(255, Math.max(0, Math.round((d[i] + b) / q) * q)); d[i + 1] = Math.min(255, Math.max(0, Math.round((d[i + 1] + b) / q) * q)); d[i + 2] = Math.min(255, Math.max(0, Math.round((d[i + 2] + b) / q) * q));
    }
    lctx.putImageData(im, 0, 0);
  }

  // ---------- materials: flat shading, vertex snap, cut faces with triangle edges ----------
  const SNAP = { value: new T.Vector2(LW / 2, LH / 2) };
  let CUTV = srgb(DEF.cut), EDGEV = srgb(DEF.edge);
  const MATS = {};
  function lpMat(colour, tex, o = {}) {
    const key = `${colour}|${tex ? tex.uuid : ''}|${o.cut ? 1 : 0}|${o.basic ? 1 : 0}|${o.alpha ? 1 : 0}|${o.opacity || 1}`;
    if (MATS[key] && !o.planes) return MATS[key];
    const m = o.basic ? new T.MeshBasicMaterial({ color: colour, map: tex || null, transparent: !!o.opacity && o.opacity < 1, opacity: o.opacity || 1 })
      : new T.MeshLambertMaterial({ color: colour, map: tex || null, flatShading: true, side: o.cut ? T.DoubleSide : T.FrontSide, transparent: !!o.alpha, alphaTest: o.alpha ? 0.5 : 0 });
    if (o.alpha) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; m.depthWrite = false; }
    if (o.planes) m.clippingPlanes = o.planes;
    m.onBeforeCompile = sh => {
      sh.uniforms.uSnap = SNAP; sh.uniforms.uCut = { get value() { return CUTV; } }; sh.uniforms.uEdge = { get value() { return EDGEV; } };
      sh.vertexShader = 'uniform vec2 uSnap;\nattribute vec3 bary;\nvarying vec3 vBary;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tvBary = bary;\n\tgl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;');
      sh.fragmentShader = 'uniform vec3 uCut;\nuniform vec3 uEdge;\nvarying vec3 vBary;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + (o.cut ? '\tif (!gl_FrontFacing) { float e = min(vBary.x, min(vBary.y, vBary.z)); gl_FragColor = vec4(e < 0.05 ? uEdge : uCut, 1.0); return; }\n' : ''));
    };
    m.customProgramCacheKey = () => `lp${o.cut ? 'c' : ''}${o.basic ? 'b' : ''}`;
    if (!o.planes) MATS[key] = m;
    return m;
  }
  // every geometry: non-indexed (flat faces) with barycentric coordinates (the cut-face edges)
  function lpGeo(g) {
    const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose();
    const c = n.attributes.position.count, b = new Float32Array(c * 3);
    for (let i = 0; i < c; i++) b[i * 3 + (i % 3)] = 1;
    n.setAttribute('bary', new T.BufferAttribute(b, 3)); n.computeVertexNormals(); return n;
  }
  const tris = g => Math.round(g.attributes.position.count / 3);

  // ---------- 64 px textures painted by code ----------
  const TEX = {};
  function tex64(key, paint) {
    if (TEX[key]) return TEX[key];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    paint(g, 64, 64, rng(key.length * 131 + key.charCodeAt(0)));
    const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping;
    return (TEX[key] = t);
  }
  const shade = (c, k) => (k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k));
  const PATTERNS = {
    speckle: (g, b, c2, r) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 560; i++) { const v = r(); g.fillStyle = v < 0.45 ? shade(b, -0.13) : v < 0.9 ? shade(b, 0.09) : shade(b, -0.24); g.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 1 + (r() < 0.3), 1); } },
    plain: (g, b, c2, r) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? shade(b, -0.06) : shade(b, 0.05); g.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 1, 1); } },
    stripes: (g, b, c2) => { for (let y = 0; y < 64; y += 8) { g.fillStyle = (y / 8) % 2 ? c2 : b; g.fillRect(0, y, 64, 8); } },
    tie: (g, b, c2) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillStyle = c2; for (let k = -64; k < 64; k += 12) for (let y = 0; y < 64; y++) g.fillRect(k + y, y, 4, 1); },
    planks: (g, b, c2, r) => { for (let x = 0; x < 64; x += 16) { g.fillStyle = shade(b, [0, -0.06, 0.04, -0.03][x / 16]); g.fillRect(x, 0, 16, 64); g.fillStyle = shade(b, -0.35); g.fillRect(x, 0, 1, 64); for (let i = 0; i < 6; i++) { g.fillStyle = shade(b, -0.15); g.fillRect(x + 3 + Math.floor(r() * 10), Math.floor(r() * 60), 1, 3 + Math.floor(r() * 5)); } } },
    grass: (g, b, c2, r) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 220; i++) { const x = Math.floor(r() * 64), y = Math.floor(r() * 64); g.fillStyle = r() < 0.5 ? shade(b, -0.14) : shade(b, 0.12); g.fillRect(x, y, 2, 1); g.fillRect(x + (r() < 0.5 ? 0 : 1), y - 1, 1, 1); } },
    grille: (g, b, c2) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let y = 2; y < 64; y += 6) { g.fillStyle = shade(b, -0.42); g.fillRect(0, y, 64, 2); g.fillStyle = shade(b, 0.12); g.fillRect(0, y + 2, 64, 1); } },
    fins: (g, b, c2) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 3) { g.fillStyle = shade(b, -0.3); g.fillRect(x, 0, 1, 64); } g.fillStyle = c2; for (let y = 6; y < 64; y += 14) g.fillRect(0, y, 64, 3); },
    metal: (g, b, c2, r) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 2) { g.fillStyle = shade(b, (r() - 0.5) * 0.12); g.fillRect(0, y, 64, 1); } g.fillStyle = shade(b, -0.35); for (const [x, y] of [[4, 4], [58, 4], [4, 58], [58, 58]]) g.fillRect(x, y, 2, 2); },
    bricks: (g, b, c2) => { g.fillStyle = shade(b, -0.3); g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 64; x += 16) { g.fillStyle = shade(b, ((x + y) % 3 - 1) * 0.05); g.fillRect(x + 1, y + 1, 14, 6); } },
    tiles: (g, b) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillStyle = shade(b, -0.2); for (let k = 0; k < 64; k += 16) { g.fillRect(k, 0, 1, 64); g.fillRect(0, k, 64, 1); } },
    dots: (g, b, c2) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillStyle = c2; for (let y = 4; y < 64; y += 8) for (let x = (y % 16 ? 0 : 4); x < 64; x += 8) g.fillRect(x, y, 2, 2); },
    rock: (g, b, c2, r) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 40; i++) { g.fillStyle = shade(b, (r() - 0.5) * 0.3); g.fillRect(Math.floor(r() * 60), Math.floor(r() * 60), 3 + Math.floor(r() * 6), 2 + Math.floor(r() * 4)); } },
    leaves: (g, b, c2, r) => { g.fillStyle = b; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? shade(b, -0.18) : shade(b, 0.14); g.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 3, 2); } },
    glow: (g, b, c2) => { for (let y = 0; y < 64; y += 4) { g.fillStyle = mix(b, c2 || '#ffffff', 1 - Math.abs(y - 30) / 32); g.fillRect(0, y, 64, 4); } },
  };
  function patternTex(name, base, c2) { const p = PATTERNS[name]; if (!p) { if (STRICT) throw new Error(`texture "${name}" is unknown; textures: ${Object.keys(PATTERNS).join(', ')}, or a function (g, w, h) that paints the 64 x 64 texture`); return null; } return tex64(`p:${name}:${base}:${c2}`, (g, w, h, r) => p(g, base, c2 || shade(base, -0.3), r)); }
  let customN = 0;
  function texFor(base, o) {
    const t = o.tex;
    if (t === 'none') return null;
    if (typeof t === 'function') { const k = 'f:' + (t.__k || (t.__k = ++customN)); return tex64(k, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, 64, 64); t(g, 64, 64); }); }
    return patternTex(t || 'speckle', base, o.tex2 != null ? col(o.tex2) : null);
  }

  // ---------- the low-poly part kit (k in buildAsset) ----------
  function place(m, o = {}) { const a = o.at || [0, 0, 0]; m.position.set(+a[0] || 0, +a[1] || 0, +a[2] || 0); const r = o.rot || [0, 0, 0]; m.rotation.set((+r[0] || 0) * DEG, (+r[1] || 0) * DEG, (+r[2] || 0) * DEG); if (o.scale) { const s = [].concat(o.scale); m.scale.set(+s[0] || 1, +(s[1] ?? s[0]) || 1, +(s[2] ?? s[0]) || 1); } return m; }
  function part(geo, c, o = {}) {
    const base = col(c); let tex = texFor(base, o);
    if (o.repeat && tex) { const r = [].concat(o.repeat), key = `${tex.uuid}:${r.join('x')}`; tex = TEX[key] || (TEX[key] = (() => { const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(+r[0] || 1, +(r[1] ?? r[0]) || 1); return t2; })()); }
    const m = new T.Mesh(lpGeo(geo), lpMat(tex ? '#ffffff' : base, tex, {}));
    m.userData.part = o.name || null; m.userData.inner = !!o.inner; m.userData.colour = base;
    return place(m, o);
  }
  const seg = (o, d, lo = 3, hi = 12) => clamp(Math.round(o && o.seg != null ? +o.seg : d), lo, hi);
  const K = {
    box: (w, h, d, c, o = {}) => part(new T.BoxGeometry(w, h, d), c, o),
    ball: (r, c, o = {}) => part(new T.IcosahedronGeometry(r, clamp(Math.round(o.detail != null ? +o.detail : 1), 0, 1)), c, o),
    cyl: (r, h, c, o = {}) => part(new T.CylinderGeometry(o.r2 != null ? +o.r2 : r, r, h, seg(o, 8), 1, !!o.open), c, o),
    cone: (r, h, c, o = {}) => part(new T.ConeGeometry(r, h, seg(o, 8)), c, o),
    lathe: (pts, c, o = {}) => part(new T.LatheGeometry(pts.map(p => new T.Vector2(Math.max(0, +p[0]), +p[1])), seg(o, 8)), c, o),
    prism: (pts, depth, c, o = {}) => { const s = new T.Shape(pts.map(p => new T.Vector2(+p[0], +p[1]))); const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -depth / 2); return part(g, c, o); },
    pipe: (pts, r, c, o = {}) => { const v = pts.map(p => new T.Vector3(+p[0], +p[1], +p[2])); const curve = new T.CatmullRomCurve3(v, !!o.closed, 'catmullrom', 0.05); return part(new T.TubeGeometry(curve, clamp(Math.round(o.steps || (v.length - 1) * 2), 2, 40), r, seg(o, 5, 3, 8), !!o.closed), c, o); },
    screen: (w, h, c, o = {}) => { const m = new T.Mesh(lpGeo(new T.PlaneGeometry(w, h)), lpMat(col(c), null, { basic: true })); m.userData.part = o.name || null; m.userData.inner = !!o.inner; return place(m, o); },
    group: (...kids) => { const g = new T.Group(); kids.flat().forEach(k => k && g.add(k)); return g; },
    // name a whole group as one part (every mesh inside gets the name, and inner if o.inner)
    named: (name, o, ...kids) => { const g = K.group(...kids); g.traverse(m => { if (m.isMesh) { m.userData.part = name; if (o && o.inner) m.userData.inner = true; } }); return place(g, o || {}); },
  };

  // ---------- the host: a low-poly animal in a suit (look3d), about 300 triangles ----------
  // poses: hand targets in the host's own frame (it faces +z; hand 0 is its right hand, at -x), metres; aim poses reach toward a thing
  const POSES = {
    stand: { h: [[-0.27, 0.40, 0.05], [0.27, 0.40, 0.05]] },
    t_pose: { h: [[-0.68, 0.79, 0], [0.68, 0.79, 0]] },
    wave: { h: [[-0.27, 0.40, 0.05], [0.42, 1.16, 0.1]], wave: 1 },
    point: { aim: 'point' },
    present: { aim: 'present' },
    arms_up: { h: [[-0.42, 1.22, 0.05], [0.42, 1.22, 0.05]] },
    hands_hips: { h: [[-0.25, 0.50, 0.0], [0.25, 0.50, 0.0]], pole: 1 },
    shrug: { h: [[-0.42, 0.66, 0.2], [0.42, 0.66, 0.2]], head: [-8, 0, 10] },
    think: { h: [[-0.05, 0.82, 0.32], [0.12, 0.56, 0.24]], head: [10, 0, -8] },
    count: { h: [[-0.27, 0.40, 0.05], [0.34, 1.08, 0.14]] },
    arms_crossed: { h: [[0.13, 0.62, 0.24], [-0.13, 0.60, 0.26]] },
    facepalm: { h: [[-0.27, 0.40, 0.05], [0.03, 0.98, 0.34]], head: [14, 0, 0] },
    shiver: { h: [[0.2, 0.71, 0.2], [-0.2, 0.69, 0.22]], shake: 1 },
    fan: { h: [[-0.18, 0.98, 0.32], [0.25, 0.50, 0.0]], wave: -1, pole: 1 },
    thumbs_up: { h: [[-0.27, 0.40, 0.05], [0.3, 0.84, 0.26]] },
    hold: { h: [[-0.15, 0.62, 0.32], [0.15, 0.62, 0.32]] },
    bow: { h: [[-0.15, 0.40, 0.2], [0.15, 0.40, 0.2]], lean: 24 },
    jump: { h: [[-0.44, 1.22, 0.05], [0.44, 1.22, 0.05]], hop: 1 },
    lean_in: { aim: 'present', lean: 14 },
  };
  const EXPR = ['neutral', 'happy', 'surprised', 'smug', 'worried', 'thinking', 'cold', 'hot'];
  const EARS = ['pointy', 'round', 'long', 'none'], SNOUTS = ['short', 'long', 'beak', 'flat'], TAILS = ['none', 'bushy', 'thin', 'stub'];
  // the face: one 64 px texture on the front of the head, painted with whole pixels
  function faceTex(L, expr, blink, open, look) {
    const key = `face:${JSON.stringify([L.mask, L.eye, L.fur2, L.stripe, L.snout])}:${expr}:${blink ? 1 : 0}:${open ? 1 : 0}:${look}`;
    return tex64(key, (g) => {
      g.clearRect(0, 0, 64, 64);
      const ink = col('ink'), mask = L.mask ? col(L.mask) : null, iris = col(L.eye || '#e08a20'), px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      if (L.snout === 'beak' && L.fur2) { px(8, 14, 48, 38, col(L.fur2)); px(12, 10, 40, 4, col(L.fur2)); } // a beaked animal: a light face around the eyes
      if (L.stripe) px(29, 0, 6, 20, mask || shade(col(L.fur || 'fur'), -0.35));
      if (mask) { px(9, 22, 46, 13, mask); px(12, 35, 14, 3, mask); px(38, 35, 14, 3, mask); px(28, 22, 8, 4, shade(mask, 0.1)); }
      const lx = look === 'up' ? 1 : 0, ly = look === 'up' ? -1 : 0;
      for (const ex of [19, 45]) {
        const big = expr === 'surprised' ? 2 : 0, ey = 29;
        if (blink && expr !== 'happy') { px(ex - 5, ey, 10, 2, ink); continue; }
        if (expr === 'happy') { px(ex - 5, ey, 2, 2, ink); px(ex - 3, ey - 2, 6, 2, ink); px(ex + 3, ey, 2, 2, ink); continue; }
        px(ex - 6 - big, ey - 6 - big, 12 + 2 * big, 13 + 2 * big, '#f4f2ec');
        px(ex - 4 + lx, ey - 4 + ly, 8, 9, iris); px(ex - 2 + lx, ey - 2 + ly, 4, 5, ink); px(ex + 1 + lx, ey - 4 + ly, 2, 2, '#ffffff');
        if (expr === 'smug') px(ex - 6, ey - 6, 12, 5, mask || col(L.fur || 'fur'));
        if (expr === 'cold') px(ex - 5, ey + 4, 10, 2, '#9ad8f0');
      }
      // brows
      const by = expr === 'surprised' ? 18 : 20;
      if (expr === 'worried' || expr === 'cold') { px(13, by + 1, 5, 2, ink); px(18, by - 1, 4, 2, ink); px(42, by - 1, 4, 2, ink); px(46, by + 1, 5, 2, ink); }
      else if (expr === 'thinking') { px(13, by, 9, 2, ink); px(42, by - 2, 9, 2, ink); }
      else if (expr !== 'happy') { px(14, by, 9, 2, ink); px(41, by, 9, 2, ink); }
      // muzzle and mouth
      if (L.snout !== 'beak') px(22, 38, 20, 14, col(L.fur2 || 'fur2'));
      const mo = open || expr === 'surprised';
      if (expr === 'cold') { px(25, 46, 14, 4, '#f4f2ec'); px(25, 47, 14, 1, ink); }
      else if (mo) { px(26, 44, 12, 7, ink); px(28, 49, 8, 2, '#e05a6a'); }
      else if (expr === 'happy' || expr === 'smug') { px(25, 45, 2, 2, ink); px(27, 47, 10, 2, ink); px(37, 45, 2, 2, ink); }
      else if (expr === 'worried' || expr === 'hot') { px(27, 47, 10, 2, ink); px(26, 48, 2, 2, ink); }
      else px(27, 46, 10, 2, ink);
      if (expr === 'hot') { px(52, 12, 3, 5, '#8fd3f4'); px(53, 17, 2, 2, '#8fd3f4'); }
    });
  }
  const RIGS = {};
  function lookOf(id) { const c = CAST[id]; if (!c) { if (STRICT) throw new Error(`unknown actor "${id}"; the host is: ${Object.keys(CAST).join(', ')}`); return null; } return c.look3d || {}; }
  function buildHost(id) {
    const L = lookOf(id); if (!L) return null;
    const g = new T.Group(), body = new T.Group(); g.add(body); const owner = 'actor:' + id; let n = 0;
    const sc = clamp(+L.scale || 1, 0.8, 1.2); body.scale.setScalar(sc);
    const add = (m, parent = body) => { parent.add(m); n += tris(m.geometry); return m; };
    const fur = col(L.fur, 'fur'), fur2 = col(L.fur2, 'fur2'), jacket = col(L.jacket, 'jacket'), trousers = col(L.trousers, 'trousers'), shoes = col(L.shoes, 'shoes'), hands = col(L.hands, 'ink');
    // legs and shoes
    for (const s of [-1, 1]) { add(part(new T.BoxGeometry(0.13, 0.32, 0.14), trousers, { at: [s * 0.095, 0.24, 0] })); add(part(new T.BoxGeometry(0.16, 0.09, 0.24), shoes, { at: [s * 0.1, 0.045, 0.04], tex: 'plain' })); }
    // torso: a tapered four-sided jacket, shirt V and tie
    const torso = add(part(new T.CylinderGeometry(0.29, 0.34, 0.44, 4).rotateY(Math.PI / 4), jacket, { at: [0, 0.6, 0], scale: [1, 1, 0.6] }));
    add(part(new T.BufferGeometry().setFromPoints([new T.Vector3(-0.09, 0.81, 0.145), new T.Vector3(0, 0.6, 0.156), new T.Vector3(0.09, 0.81, 0.145)]), col(L.shirt, 'shirt'), { tex: 'plain' }));
    if (L.tie !== null) { const kite = new T.Shape([[-0.032, 0.80], [0.032, 0.80], [0.05, 0.63], [0, 0.57], [-0.05, 0.63]].map(p => new T.Vector2(...p))); add(part(new T.ExtrudeGeometry(kite, { depth: 0.02, bevelEnabled: false }), col(L.tie, 'tie'), { at: [0, 0, 0.142], tex: 'tie', tex2: L.tie2 ? col(L.tie2) : '#f4c040', repeat: [5, 5] })); }
    // tail
    let tail = null;
    if (L.tail && L.tail !== 'none') { tail = new T.Group(); tail.position.set(0, 0.45, -0.16); body.add(tail); const len = L.tail === 'stub' ? 0.14 : L.tail === 'thin' ? 0.42 : 0.4, r0 = L.tail === 'bushy' ? 0.085 : L.tail === 'thin' ? 0.03 : 0.06; add(part(new T.CylinderGeometry(L.tail === 'thin' ? 0.015 : r0 * 0.7, r0, len, 5), fur, { at: [0, len / 2, 0], tex: L.stripe ? 'stripes' : 'speckle', tex2: L.mask || shade(fur, -0.4) }), tail); tail.rotation.x = -0.9; }
    // head: an 8 x 6 faceted ball; the face texture on a patch over its front facets
    const headG = new T.Group(); headG.position.y = 0.99; body.add(headG);
    const HR = 0.27, hs = [1.08, 0.94, 0.96];
    add(part(new T.SphereGeometry(HR, 8, 6, 22.5 * DEG), fur, { scale: hs, tex: 'speckle' }), headG);
    const faceMat = lpMat('#ffffff', null, { alpha: true, planes: [] });
    // the patch covers the head's front facets exactly (phi 22.5 to 157.5, theta 30 to 150; three's sphere puts phi 90 at +z, u runs from -x to +x)
    const face = new T.Mesh(lpGeo(new T.SphereGeometry(HR * 1.006, 3, 4, 22.5 * DEG, 135 * DEG, 30 * DEG, 120 * DEG)), faceMat); face.scale.set(...hs); headG.add(face); n += tris(face.geometry);
    // snout, nose, ears
    if (L.snout === 'beak') add(part(new T.ConeGeometry(0.07, 0.16, 4), col(L.beak || '#f0a030'), { at: [0, -0.04, HR + 0.05], rot: [90, 45, 0], tex: 'plain' }), headG);
    else if (L.snout !== 'flat') { const ln = L.snout === 'long' ? 0.17 : 0.1; add(part(new T.CylinderGeometry(0.05, 0.1, ln, 4), fur2, { at: [0, -0.06, HR * 0.9 + ln / 2], rot: [90, 45, 0], tex: 'speckle' }), headG); add(part(new T.BoxGeometry(0.07, 0.05, 0.05), col('ink'), { at: [0, -0.04, HR * 0.9 + ln], tex: 'plain' }), headG); }
    const ears = L.ears || 'pointy';
    for (const s of [-1, 1]) {
      if (ears === 'pointy') add(part(new T.ConeGeometry(0.085, 0.17, 4), fur, { at: [s * 0.17, 0.25, -0.02], rot: [0, 45, -s * 18] }), headG);
      else if (ears === 'round') add(part(new T.CylinderGeometry(0.085, 0.085, 0.04, 6), fur, { at: [s * 0.2, 0.22, -0.02], rot: [90, 0, -s * 20] }), headG);
      else if (ears === 'long') add(part(new T.ConeGeometry(0.06, 0.34, 4), fur, { at: [s * 0.1, 0.36, -0.03], rot: [0, 45, -s * 8], scale: [1, 1, 0.5] }), headG);
    }
    // arms: upper arm, forearm (jacket), mitten
    const arms = [0, 1].map(() => ({ up: add(part(new T.BoxGeometry(0.1, 1, 0.1), jacket, {})), fo: add(part(new T.BoxGeometry(0.09, 1, 0.09), jacket, {})), hand: add(part(new T.BoxGeometry(0.11, 0.12, 0.08), hands, { tex: 'plain' })) }));
    const blob = new T.Mesh(new T.CircleGeometry(0.36, 8), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.006; g.add(blob);
    g.traverse(m => { m.userData.owner = owner; });
    return { id, g, body, headG, face, faceMat, arms, tail, torso, L, sc, tris: n, pose: null, from: null };
  }
  // two-bone arm from shoulder S to hand H; the elbow bends toward the pole (out, down and back unless the pose says out)
  const tmpA = new T.Vector3(), tmpB = new T.Vector3();
  function setBox(m, a, b) { const v = tmpA.subVectors(b, a), L = v.length(); m.position.copy(a).addScaledVector(v, 0.5); m.scale.set(1, Math.max(0.001, L), 1); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); }
  function armTo(arm, S, H, side, poleOut) {
    const L1 = 0.23, L2 = 0.22, d0 = new T.Vector3().subVectors(H, S), d = Math.min(d0.length(), L1 + L2 - 0.005), dir = d0.normalize();
    const pole = new T.Vector3(side * (poleOut ? 1 : 0.55), poleOut ? 0 : -0.6, poleOut ? -0.3 : -0.35).normalize();
    const perp = pole.sub(dir.clone().multiplyScalar(pole.dot(dir))); if (perp.lengthSq() < 1e-6) perp.set(side, 0, 0); perp.normalize();
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, hh), Hc = S.clone().addScaledVector(dir, d);
    setBox(arm.up, S, E); setBox(arm.fo, E, Hc); arm.hand.position.copy(Hc).addScaledVector(dir, 0.04); arm.hand.quaternion.copy(arm.fo.quaternion);
  }
  // a pose's hand targets, resolved against the thing it aims at (world point -> the host's own frame)
  function poseHands(rig, name, aimW) {
    const P = POSES[name] || POSES.stand; if (P.h) return P.h.map(v => new T.Vector3(...v));
    const sh = [new T.Vector3(-0.21, 0.79, 0), new T.Vector3(0.21, 0.79, 0)];
    let tgt = aimW ? rig.g.worldToLocal(aimW.clone()).divideScalar(rig.sc) : new T.Vector3(1.5, 0.8, 0.6);
    const side = tgt.x >= 0 ? 1 : 0, other = 1 - side, S = sh[side], dir = tgt.clone().sub(S); dir.y = clamp(dir.y, -0.4, 0.6); dir.normalize();
    const out = [null, null];
    if (P.aim === 'point') { out[side] = S.clone().addScaledVector(dir, 0.44); out[other] = new T.Vector3(...POSES.stand.h[other]); }
    else { out[side] = S.clone().addScaledVector(dir, 0.38).add(new T.Vector3(0, -0.12, 0.04)); out[other] = new T.Vector3((side ? 1 : -1) * 0.06, 0.6, 0.3).addScaledVector(dir, 0.12); }
    return out;
  }
  function currentPose(o, lt) {
    const p = o.pose || 'stand';
    if (typeof p === 'string') return { name: p, prev: null, k: 1 };
    if (!Array.isArray(p) || !p.length) { if (STRICT) throw new Error('pose must be a pose name or a schedule [[seconds, "pose"], ...]'); return { name: 'stand', prev: null, k: 1 }; }
    const s = p.filter(x => Array.isArray(x) && x.length >= 2).map(x => [+x[0] || 0, String(x[1])]).sort((a, b) => a[0] - b[0]);
    let i = 0; while (i < s.length - 1 && lt >= s[i + 1][0]) i++;
    return { name: s[i][1], prev: i ? s[i - 1][1] : null, k: i ? clamp((lt - s[i][0]) / 0.16) : 1 };
  }
  function talking(lt) { const sh = CUR && CUR.sh; if (!sh) return false; const ln = (sh.lines || []).find(l => l.who === 'narrator' && lt >= l.start && lt < l.end); if (!ln) return false; if (ln.words && ln.words.length) { const w = ln.words.find(w => lt >= w.start && lt < w.end); return !!w && ((lt - w.start) / Math.max(0.05, w.end - w.start)) < 0.72; } return Math.floor(lt * 8) % 2 === 0; }
  function poseHost(rig, o, lt, aimW) {
    const cp = currentPose(o, lt);
    for (const nm of [cp.name, cp.prev]) if (nm && !POSES[nm] && STRICT) throw new Error(`pose "${nm}" is unknown; poses: ${Object.keys(POSES).join(', ')}`);
    const expr = o.expr || 'neutral'; if (!EXPR.includes(expr) && STRICT) throw new Error(`expression "${expr}" is unknown; expressions: ${EXPR.join(', ')}`);
    const P = POSES[cp.name] || POSES.stand, Q = cp.prev ? (POSES[cp.prev] || POSES.stand) : null, k = easeBack(cp.k);
    const ph = 0.37, breath = Math.sin((lt + ph) * 2.2), blink = ((lt + ph) % 3.1) < 0.11, open = talking(lt);
    const look = expr === 'thinking' ? 'up' : '';
    const ft = faceTex(rig.L, expr, blink, open && expr !== 'cold', look); if (rig.faceMat.map !== ft) { rig.faceMat.map = ft; rig.faceMat.needsUpdate = true; }
    const lean = lerp(Q ? (Q.lean || 0) : (P.lean || 0), P.lean || 0, k), hop = P.hop ? Math.abs(Math.sin(lt * 7)) * 0.08 : 0, shake = P.shake ? Math.sin(lt * 60) * 0.012 : 0;
    rig.body.position.set(shake, hop + breath * 0.004, 0); rig.body.rotation.x = lean * DEG;
    const hd = P.head || [0, 0, 0], hq = (Q && Q.head) || [0, 0, 0];
    rig.headG.rotation.set((lerp(hq[0], hd[0], k) + (+o.nod || 0)) * DEG, (+o.turn || 0) * DEG, (lerp(hq[2], hd[2], k) + (+o.tilt || 0)) * DEG);
    rig.headG.position.y = 0.99 + breath * 0.005 + (cp.name === 'shrug' ? -0.03 * k : 0);
    const A = poseHands(rig, cp.name, aimW), B = Q ? poseHands(rig, cp.prev, aimW) : A;
    for (const s of [0, 1]) {
      const side = s ? 1 : -1, S = new T.Vector3(side * 0.21, 0.79 + (cp.name === 'shrug' ? 0.03 * k : 0), 0), H = B[s].clone().lerp(A[s], k);
      if (P.wave && ((P.wave > 0 && s === 1) || (P.wave < 0 && s === 0))) H.x += Math.sin(lt * 10) * 0.05;
      H.y += breath * 0.004; armTo(rig.arms[s], S, H, side, !!P.pole);
    }
    if (rig.tail) rig.tail.rotation.z = Math.sin(lt * 2.4) * 0.25;
    rig.pose = cp.name;
  }

  // ---------- sets: the background spec "set" ({kind: outdoor | studio | room, ...}) ----------
  const SET_PROPS = { outdoor: ['fence', 'pines', 'house', 'bushes', 'bins', 'hills'], room: ['window', 'door', 'plant', 'shelf', 'sofa', 'rug', 'lamp', 'frame', 'clock'], studio: [] };
  const SETS = {};
  const setSpec = name => { const b = (STYLE.backgrounds || []).find(b => b.name === name); if (!b) { if (STRICT) throw new Error(`set "${name}" is unknown; sets: ${(STYLE.backgrounds || []).map(b => b.name).join(', ')}`); return { kind: 'studio' }; } return b.set || { kind: 'studio' }; };
  function buildSet(name) {
    const s = setSpec(name), kind = s.kind || 'studio', g = new T.Group(), props = s.props || SET_PROPS[kind] || [];
    const P = (geo, c, o) => { const m = part(geo, c, o); g.add(m); return m; };
    if (kind === 'room') {
      const wall = col(s.wall, '#d8c8a8'), floor = col(s.floor, 'wood');
      P(new T.PlaneGeometry(12, 8), wall, { at: [0, 4, -3], tex: s.wallpaper || 'speckle', tex2: s.wall2 ? col(s.wall2) : null, repeat: [8, 6] });
      for (const k of [-1, 1]) P(new T.PlaneGeometry(14, 8), shade(wall, -0.08), { at: [k * 6, 4, 4], rot: [0, -k * 90, 0], tex: s.wallpaper || 'speckle', tex2: s.wall2 ? col(s.wall2) : null, repeat: [9, 6] });
      P(new T.PlaneGeometry(12, 14), floor, { at: [0, 0, 4], rot: [-90, 0, 0], tex: s.floor_tex || 'planks', repeat: [8, 9] });
      P(new T.BoxGeometry(12, 0.14, 0.06), shade(wall, -0.35), { at: [0, 0.07, -2.97], tex: 'plain' });
      for (const pr of props) {
        if (pr === 'window') { P(new T.BoxGeometry(1.5, 1.3, 0.08), col('shirt'), { at: [-2.4, 1.9, -2.96], tex: 'plain' }); const sky = new T.Mesh(lpGeo(new T.PlaneGeometry(1.3, 1.1)), lpMat('#ffffff', patternTex('glow', col(s.view || 'sky'), col('sky2')), { basic: true })); sky.position.set(-2.4, 1.9, -2.91); g.add(sky); P(new T.BoxGeometry(0.06, 1.1, 0.05), col('shirt'), { at: [-2.4, 1.9, -2.89], tex: 'plain' }); }
        else if (pr === 'door') P(new T.BoxGeometry(1.0, 2.1, 0.06), shade(col('wood'), -0.15), { at: [3.4, 1.05, -2.96], tex: 'planks' });
        else if (pr === 'plant') { P(new T.CylinderGeometry(0.2, 0.15, 0.36, 6), col('#c86a3a'), { at: [-3.6, 0.18, -2.4] }); P(new T.IcosahedronGeometry(0.42, 0), col('leaf'), { at: [-3.6, 0.72, -2.4], tex: 'leaves' }); }
        else if (pr === 'shelf') { P(new T.BoxGeometry(1.4, 0.08, 0.3), col('wood'), { at: [2.2, 1.6, -2.85], tex: 'planks' }); for (let i = 0; i < 5; i++) P(new T.BoxGeometry(0.14, 0.32, 0.22), ['#d84a3a', '#3a7ad8', '#e8c040', '#4aa060', '#a05ad0'][i], { at: [1.7 + i * 0.2, 1.8, -2.85], tex: 'plain' }); }
        else if (pr === 'sofa') { const c = col(s.sofa || '#5a7ac8'); P(new T.BoxGeometry(2.0, 0.42, 0.85), c, { at: [2.6, 0.21, -2.4] }); P(new T.BoxGeometry(2.0, 0.55, 0.22), c, { at: [2.6, 0.68, -2.75] }); }
        else if (pr === 'rug') P(new T.PlaneGeometry(3.2, 2.2), col(s.rug || '#c85a4a'), { at: [0, 0.008, 0.3], rot: [-90, 0, 0], tex: 'dots', tex2: '#f4e0b0' });
        else if (pr === 'lamp') { P(new T.CylinderGeometry(0.03, 0.03, 1.5, 4), col('ink'), { at: [-3.9, 0.75, -1.6], tex: 'plain' }); P(new T.ConeGeometry(0.28, 0.32, 6), col('#f0d080'), { at: [-3.9, 1.6, -1.6] }); }
        else if (pr === 'frame') { P(new T.BoxGeometry(0.8, 0.6, 0.05), col('wood'), { at: [0.6, 2.3, -2.96], tex: 'plain' }); P(new T.BoxGeometry(0.66, 0.46, 0.02), col('sky'), { at: [0.6, 2.3, -2.93], tex: 'glow', tex2: col('sky2') }); }
        else if (pr === 'clock') P(new T.CylinderGeometry(0.22, 0.22, 0.05, 8), col('shirt'), { at: [-0.9, 2.5, -2.96], rot: [90, 0, 0], tex: 'plain' });
        else if (STRICT) throw new Error(`room set prop "${pr}" is unknown; room props: ${SET_PROPS.room.join(', ')}`);
      }
      P(new T.PlaneGeometry(12, 14), shade(wall, 0.1), { at: [0, 7.9, 4], rot: [90, 0, 0], tex: 'plain' });
      g.userData.bounds = { x: 5.6, zMin: -2.8, zMax: 10, yMax: 7.5 };
    } else {
      const ground = col(s.ground, kind === 'outdoor' ? 'ground' : '#c87878');
      P(new T.PlaneGeometry(60, 60, 1, 1), ground, { at: [0, 0, -10], rot: [-90, 0, 0], tex: kind === 'outdoor' ? 'grass' : (s.floor_tex || 'tiles'), repeat: kind === 'outdoor' ? [36, 36] : [30, 30] });
      if (kind === 'outdoor') for (const pr of props) {
        if (pr === 'fence') { for (let x = -7; x <= 7; x += 0.3) P(new T.ExtrudeGeometry(new T.Shape([[-0.13, 0], [0.13, 0], [0.13, 1.0], [0, 1.14], [-0.13, 1.0]].map(p => new T.Vector2(...p))), { depth: 0.04, bevelEnabled: false }), col('wood'), { at: [x, 0, -2.6], tex: 'planks' }); P(new T.BoxGeometry(14.4, 0.1, 0.05), shade(col('wood'), -0.15), { at: [0, 0.75, -2.62], tex: 'planks' }); P(new T.BoxGeometry(14.4, 0.1, 0.05), shade(col('wood'), -0.15), { at: [0, 0.3, -2.62], tex: 'planks' }); }
        else if (pr === 'pines') for (const [x, z, s2] of [[-3.6, -4.2, 1.1], [-1.6, -5.5, 1.4], [1.2, -4.8, 1.2], [3.4, -4.0, 1.0], [5.2, -5.6, 1.5], [-5.4, -5.2, 1.3]]) { P(new T.CylinderGeometry(0.1, 0.13, 0.6 * s2, 5), col('#6a4a30'), { at: [x, 0.3 * s2, z] }); for (let i = 0; i < 3; i++) P(new T.ConeGeometry((0.85 - i * 0.22) * s2, 0.9 * s2, 6), col('leaf'), { at: [x, (0.85 + i * 0.55) * s2, z], tex: 'leaves' }); }
        else if (pr === 'house') { P(new T.BoxGeometry(3, 2.6, 2.4), col(s.house || '#d8c0a0'), { at: [-6.2, 1.3, -4.4], tex: 'bricks' }); P(new T.ExtrudeGeometry(new T.Shape([[-1.7, 0], [1.7, 0], [0, 1.4]].map(p => new T.Vector2(...p))), { depth: 2.6, bevelEnabled: false }), col(s.roof || '#b84a3a'), { at: [-6.2, 2.6, -5.7], tex: 'planks' }); }
        else if (pr === 'bushes') for (const [x, z] of [[-2.6, -2.2], [2.9, -2.25], [5.6, -2.1]]) P(new T.IcosahedronGeometry(0.42, 0), shade(col('leaf'), 0.08), { at: [x, 0.3, z], scale: [1.3, 0.8, 1], tex: 'leaves' });
        else if (pr === 'bins') for (const x of [-4.2, 4.4]) { P(new T.CylinderGeometry(0.3, 0.26, 0.8, 8), col('metal'), { at: [x, 0.4, -2.1], tex: 'metal' }); P(new T.CylinderGeometry(0.33, 0.33, 0.06, 8), shade(col('metal'), -0.1), { at: [x, 0.83, -2.1] }); }
        else if (pr === 'hills') for (const [x, z, r, h] of [[-12, -26, 8, 4], [0, -30, 10, 5], [13, -27, 9, 4.5]]) P(new T.ConeGeometry(r, h, 7), col(s.hills || mix(col('sky'), '#5a4a6a', 0.55)), { at: [x, h / 2 - 0.1, z], tex: 'plain' });
        else if (STRICT) throw new Error(`outdoor set prop "${pr}" is unknown; outdoor props: ${SET_PROPS.outdoor.join(', ')}`);
      }
      g.userData.bounds = { x: 20, zMin: -20, zMax: 20, yMax: 12 };
    }
    g.traverse(m => { m.userData.owner = 'set:' + name; m.userData.set = true; });
    g.userData.spec = s; g.userData.kind = kind;
    return g;
  }
  // the 2D backdrop at 270 x 480: a banded sky or studio wall with pixel clouds drifting
  function paintSky(spec, lt) {
    const kind = spec.kind || 'studio', a = col((spec.sky || [])[0] || (kind === 'studio' ? spec.wall : null), kind === 'studio' ? '#e89a9a' : 'sky'), b = col((spec.sky || [])[1] || (kind === 'studio' ? (spec.wall2 || null) : null), kind === 'studio' ? mix(a, '#ffffff', 0.25) : 'sky2');
    const N = 12; for (let i = 0; i < N; i++) { lctx.fillStyle = mix(a, b, i / (N - 1)); lctx.fillRect(0, Math.floor(i * LH / N * 0.62), LW, Math.ceil(LH / N * 0.62) + 1); }
    lctx.fillStyle = b; lctx.fillRect(0, Math.floor(LH * 0.6), LW, LH);
    if (kind === 'outdoor' && spec.clouds !== false) { const r = rng(7); for (let i = 0; i < 6; i++) { const w = 26 + Math.floor(r() * 30), x = Math.floor(((r() * (LW + 80) + lt * (3 + r() * 3)) % (LW + 80)) - 60), y = 14 + Math.floor(r() * 90); lctx.fillStyle = '#fdf6f2'; lctx.fillRect(x, y, w, 6); lctx.fillRect(x + 6, y - 4, w - 14, 4); lctx.fillStyle = mix('#fdf6f2', a, 0.35); lctx.fillRect(x + 2, y + 6, w - 4, 2); } }
  }

  // ---------- subjects: the plan's prop assets, built by M3 from the part kit ----------
  const compileProp = code => new Function('k', 'p', `"use strict";\n${code}\nreturn buildAsset(k, p);`);
  function buildModel(name, params = {}) {
    const fn = PROPFN[name]; if (!fn) { if (STRICT) throw new Error(`thing "${name}" is unknown; things: ${Object.keys(PROPS).join(', ')} (the plan's subject assets) and "pedestal"`); return null; }
    const m = fn(K, params || {}); if (!m || !m.isObject3D) return null;
    const bb = new T.Box3().setFromObject(m); m.position.y -= bb.min.y; m.position.x -= (bb.min.x + bb.max.x) / 2; m.position.z -= (bb.min.z + bb.max.z) / 2;
    return m;
  }
  const meshes = (o, f) => { const out = []; o.traverse(m => { if (m.isMesh && (!f || f(m))) out.push(m); }); return out; };
  function makeThing(name, params) {
    const wrap = new T.Group();
    if (name === 'pedestal') { const m = K.group(part(new T.BoxGeometry(1.2, 0.5, 1.2), col('#d8d0c4'), { at: [0, 0.25, 0], tex: 'speckle' })); wrap.add(m); return { wrap, model: m, name, shells: meshes(m), inners: [], size: new T.Vector3(1.2, 0.5, 1.2) }; }
    const m = buildModel(name, params); if (!m) return null; wrap.add(m); m.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(m), size = new T.Vector3(); bb.getSize(size);
    return { wrap, model: m, name, params, shells: meshes(m, x => !x.userData.inner), inners: meshes(m, x => x.userData.inner), size, centre: bb.getCenter(new T.Vector3()), halves: null };
  }
  // the slice: two more copies of the shell, each clipped to one side of a plane through the centre and slid apart; cut faces dark with edges
  function ensureHalves(P) {
    if (P.halves) return P.halves;
    P.halves = [-1, 1].map(sd => {
      const m = buildModel(P.name, P.params); const plane = new T.Plane();
      for (const x of meshes(m)) { if (x.userData.inner) { x.visible = false; continue; } const base = x.material; x.material = lpMat('#' + base.color.getHexString(), base.map, { cut: !base.isMeshBasicMaterial, basic: !!base.isMeshBasicMaterial, planes: [plane] }); }
      P.wrap.add(m); return { m, plane, sd };
    });
    return P.halves;
  }
  function applySlice(P, s, axis) {
    const on = s > 0.001; P.shells.forEach(x => { x.visible = !on; });
    if (!on) { if (P.halves) P.halves.forEach(h => { h.m.visible = false; }); return; }
    const H = ensureHalves(P), ax = axis === 'z' ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0), ext = axis === 'z' ? P.size.z : P.size.x, d = easeOut(clamp(s)) * (0.1 + 0.2 * ext);
    for (const h of H) { h.m.visible = true; h.m.position.copy(P.model.position).addScaledVector(ax, h.sd * d); h.m.rotation.copy(P.model.rotation); }
    P.wrap.updateMatrixWorld(true);
    const c = axis === 'z' ? P.centre.z - P.model.position.z : P.centre.x - P.model.position.x; // centre in the model's own frame
    for (const h of H) { const n = ax.clone().multiplyScalar(h.sd); h.plane.set(n, -h.sd * c); h.plane.applyMatrix4(h.m.matrixWorld); } // keep sd * (x - c) >= 0
  }

  // ---------- per-frame state ----------
  let FRAME = null; const POOL = {};
  function frameState() { if (FRAME && FRAME.cur === CUR) return FRAME; for (const k in POOL) POOL[k].obj.visible = false; FRAME = { cur: CUR, set: null, actors: [], things: [], cam: null, labels: [], errs: [] }; return FRAME; }
  const err = (F, k, m) => { if (!F.errs.some(e => e[0] === k)) F.errs.push([k, m]); };
  const num = (v, name, lo, hi) => { const n = +v; if (!Number.isFinite(n)) { if (STRICT) throw new Error(`${name} must be a number in metres (got ${JSON.stringify(v)})`); return 0; } return clamp(n, lo, hi); };
  function partBox(P, partName) {
    if (!partName) return visBox(P.wrap);
    const vis = meshes(P.wrap, x => x.userData.part === partName && isVisible(x)), all = meshes(P.model, x => x.userData.part === partName);
    const use = vis.length ? vis : all; if (!use.length) return null; const b = new T.Box3(); P.wrap.updateMatrixWorld(true); for (const x of use) { if (!x.geometry.boundingBox) x.geometry.computeBoundingBox(); b.union(x.geometry.boundingBox.clone().applyMatrix4(x.matrixWorld)); } return b;
  }
  const isVisible = o => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const partNames = P => [...new Set(meshes(P.model).map(x => x.userData.part).filter(Boolean))];

  const THING_OPTS = ['x', 'z', 'y', 'rot', 'scale', 'slice', 'axis', 'glow', 'params', 'id'], ACTOR_OPTS = ['x', 'z', 'y', 'face', 'at', 'pose', 'expr', 'turn', 'nod', 'tilt'];
  const onlyOpts = (what, o, ok) => { if (!STRICT || !o || typeof o !== 'object') return; const bad = Object.keys(o).filter(k => !ok.includes(k)); if (bad.length) throw new Error(`${what} has no option${bad.length > 1 ? 's' : ''} ${bad.map(b => `"${b}"`).join(', ')}; its options are: ${ok.join(', ')}`); };
  // a thing id, or (forgiving) a part name: the placed thing that has that part
  const findThing = (F, id) => F.things.find(t => t.id === id || t.name === id) || (id ? F.things.find(t => partNames(t.P).includes(id)) : null);
  const API = {
    set(name) { const F = frameState(), k = 'set:' + name; if (!POOL[k]) { const g = buildSet(name); scene.add(g); POOL[k] = { obj: g }; } POOL[k].obj.visible = true; F.set = name; F.setObj = POOL[k].obj; return name; },
    room(name) { return API.set(name); },
    thing(name, o = {}) {
      onlyOpts(`h.d3.thing("${name}")`, o, THING_OPTS);
      const F = frameState(); const n = F.things.filter(t => t.name === name).length + 1, k = `thing:${name}:${n}:${JSON.stringify(o.params || {})}`;
      if (!POOL[k]) { const t = makeThing(name, o.params); if (!t) return null; t.wrap.traverse(m => { m.userData.owner = 'thing:' + name; }); scene.add(t.wrap); POOL[k] = { obj: t.wrap, P: t }; }
      const P = POOL[k].P, x = num(o.x ?? 0, `${name} x`, -8, 8), z = num(o.z ?? 0, `${name} z`, -6, 8), y = num(o.y ?? 0, `${name} y`, 0, 3.5), sc = clamp(+o.scale || 1, 0.2, 4);
      P.wrap.position.set(x, y, z); P.wrap.rotation.set(0, (+o.rot || 0) * DEG, 0); P.wrap.scale.setScalar(sc); P.wrap.visible = true; P.wrap.updateMatrixWorld(true);
      if (o.glow != null && (typeof o.glow !== 'object' || Array.isArray(o.glow)) && STRICT) throw new Error(`h.d3.thing("${name}") glow must be an object naming inside parts, e.g. glow: { '${(PROPS[name] && PROPS[name].parts || ['part'])[0]}': lt > 2 } (got ${JSON.stringify(o.glow)})`);
      applySlice(P, +o.slice || 0, o.axis === 'z' ? 'z' : 'x');
      for (const [pn, on] of Object.entries(o.glow || {})) for (const x of meshes(P.model, m => m.userData.part === pn)) { if (!x.userData.baseMat) x.userData.baseMat = x.material; x.material = on ? lpMat(mix(x.userData.colour || '#ffffff', '#ffffff', 0.25), null, { basic: true }) : x.userData.baseMat; }
      const rec = { name, id: o.id || name, P, x, z, y, scale: sc, slice: +o.slice || 0 }; F.things.push(rec); return rec;
    },
    actor(id, o = {}) {
      onlyOpts(`h.d3.actor("${id}")`, o, ACTOR_OPTS);
      const F = frameState(), k = 'actor:' + id;
      if (!POOL[k]) { const rig = buildHost(id); if (!rig) return null; scene.add(rig.g); POOL[k] = { obj: rig.g, rig }; }
      const rig = POOL[k].rig, x = num(o.x ?? 0, `${id} x`, -8, 8), z = num(o.z ?? 0, `${id} z`, -6, 8), y = num(o.y ?? 0, `${id} y`, 0, 3);
      rig.g.position.set(x, y, z); rig.g.visible = true; rig.g.rotation.y = 0;
      F.actors = F.actors.filter(a => a.id !== id); F.actors.push({ id, rig, o, x, z });
      return id;
    },
    cam(type = 'wide', o = {}) { const F = frameState(); F.cam = { type, o }; return type; },
    render() {
      const F = frameState(); if (!F.set && STRICT) throw new Error(`no set in this frame: call h.d3.set('<name>') first, every frame (sets: ${(STYLE.backgrounds || []).map(b => b.name).join(', ')})`);
      resolveFacing(F); placeCamera(F); faceCamera(F); hideCutHost(F); check(F);
      lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalAlpha = 1; lctx.clearRect(0, 0, LW, LH);
      paintSky(F.setObj ? F.setObj.userData.spec : { kind: 'studio' }, CUR.lt);
      renderer().render(scene, cam); lctx.drawImage(glc, 0, 0); dither();
      ctx.save(); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false; ctx.drawImage(lo, 0, 0, W, H); ctx.restore();
      BG_DONE = true; reportTrack(F); return true;
    },
    screen(p) { const v = new T.Vector3(+p[0] || 0, +p[1] || 0, +p[2] || 0).project(cam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; },
    // where a named part of a placed thing is on the frame (its centre), [x, y] in px; the visible copy when it is sliced
    part(thingId, partName) { const F = frameState(), t = findThing(F, thingId); if (!t) { if (STRICT) throw new Error(`h.d3.part: thing "${thingId}" is not placed in this frame`); return null; } const b = partBox(t.P, partName); if (!b) { if (STRICT) throw new Error(`thing "${t.name}" has no part "${partName}"; its parts: ${partNames(t.P).join(', ')}`); return null; } return API.screen(b.getCenter(new T.Vector3()).toArray()); },
    head(id) { const F = frameState(), a = F.actors.find(a => a.id === id); if (!a) return null; const p = new T.Vector3(); a.rig.headG.getWorldPosition(p); return API.screen([p.x, p.y + 0.42 * a.rig.sc, p.z]); },
    // the one label: a leader line from the part to its name, yellow with a dark outline (2D, after render)
    label(thingId, partName, text, o = {}) {
      const at = API.part(thingId, partName); if (!at) return null;
      const k = o.k == null || !Number.isFinite(+o.k) ? 10 : +o.k; if (k < 0) return at;
      const F0 = frameState(), t0 = findThing(F0, thingId), inner = t0 && meshes(t0.P.model, x => x.userData.part === partName && x.userData.inner).length > 0;
      if (inner && (t0.slice || 0) < 0.3) err(F0, 'closed:' + partName, `the label "${text}" points at "${partName}", which is inside "${t0.name}", while it is closed (slice ${(+t0.slice || 0).toFixed(2)}): open it first (h.d3.thing(..., { slice: ... }) rising to 1 before the label appears), or label it later`);
      if (TRACK) TRACK.lpLabels = (TRACK.lpLabels || 0) + 1;
      const e = easeBack(clamp(k / 0.22)), size = clamp(+o.size || 72, 48, 90), P = pal();
      ctx.save(); ctx.font = kitFont(size); const tw = ctx.measureText(String(text)).width;
      const side = o.side === 'left' ? -1 : o.side === 'right' ? 1 : (at[0] < W / 2 ? 1 : -1);
      if (at[0] < 60 || at[0] > W - 60 || at[1] < 260 || at[1] > 1460) err(F0, 'offlabel:' + partName, `the labelled part "${partName}" is off the picture (at x ${Math.round(at[0])}, y ${Math.round(at[1])}): frame it first (camera "part" on it, or "wide" with the subject open) so the label points at something the viewer sees`);
      const hostB = F0.actors.map(a => projBox(a.rig.body)).filter(Boolean);
      const place2 = sd => { const x = clamp(at[0] + sd * (120 + tw / 2), 70 + tw / 2, W - 70 - tw / 2); let y = clamp(o.y != null ? +o.y : at[1] - 170, 450, 1400); const hits = yy => hostB.some(b => x + tw / 2 > b.x0 - 20 && x - tw / 2 < b.x1 + 20 && yy + size * 0.6 > b.y0 - 20 && yy - size * 0.6 < b.y1 + 20); if (hits(y)) { const up = clamp(Math.min(...hostB.map(b => b.y0)) - size, 450, 1400); if (!hits(up)) y = up; } return { x, y, bad: hits(y) }; };
      let pl = place2(side); if (pl.bad && o.side == null) { const p2 = place2(-side); if (!p2.bad) pl = p2; }
      let lx = pl.x, ly = pl.y;
      const ax = at[0], ay = at[1], ex = clamp(ax, lx - tw / 2, lx + tw / 2), ey = ly + (ay > ly ? size * 0.55 : -size * 0.55);
      ctx.globalAlpha = clamp(k / 0.12); ctx.strokeStyle = P.ink; ctx.lineWidth = 12; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, ex, e), lerp(ay, ey, e)); ctx.stroke();
      ctx.strokeStyle = P.edge; ctx.lineWidth = 6; ctx.stroke(); ctx.fillStyle = P.ink; ctx.fillRect(ax - 12, ay - 12, 24, 24); ctx.fillStyle = P.edge; ctx.fillRect(ax - 8, ay - 8, 16, 16);
      ctx.translate(lx, ly); ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.22; ctx.strokeStyle = P.ink; ctx.strokeText(String(text), 0, 0); ctx.fillStyle = o.color ? col(o.color) : P.accent; ctx.fillText(String(text), 0, 0);
      ctx.restore(); frameState().labels.push(text); return at;
    },
    // the narrator's sentences in this shot with their times (seconds into the shot), for a pose schedule
    sentences() { return sentencesOf(CUR.sh); },
    parts(thingId) { const t = Object.values(POOL).find(p => p.P && p.P.name === thingId); return t ? partNames(t.P) : (PROPS[thingId] && PROPS[thingId].parts) || []; },
    kit: () => defaultKit(),
  };
  function resolveFacing(F) {
    for (const a of F.actors) {
      const f = a.o.face; let yaw = 0;
      if (typeof f === 'number' || (typeof f === 'string' && f.trim() !== '' && Number.isFinite(+f))) yaw = +f * DEG;
      else if (f && f !== 'camera') { const t = F.things.find(t => t.id === f || t.name === f) || F.actors.find(b => b.id === f); if (t) yaw = Math.atan2(t.x - a.x, t.z - a.z); else if (STRICT) throw new Error(`actor "${a.id}" faces "${f}", which is not in this frame (face: a thing id, "camera" or degrees, 0 = toward the camera)`); }
      a.rig.g.rotation.y = yaw; a.rig.g.updateMatrixWorld(true);
      // aim poses reach toward a thing (o.at: a thing id or "thing.part"), else the nearest placed thing
      let aimW = null; const at = a.o.at || (F.things[0] && F.things[0].id);
      if (at) { const [tid, pn] = String(at).split('.'), t = F.things.find(t => t.id === tid || t.name === tid); if (t) { t.P.wrap.updateMatrixWorld(true); const b = partBox(t.P, pn || null) || new T.Box3().setFromObject(t.P.wrap); aimW = b.getCenter(new T.Vector3()); } else if (STRICT && a.o.at) throw new Error(`actor "${a.id}" aims at "${at}", which is not placed in this frame`); }
      poseHost(a.rig, a.o, CUR.lt, aimW);
    }
  }
  // the host turns at most 50 degrees away from the camera (a presenter: never its back or a flat profile), re-posed if turned
  function hideCutHost(F) {
    if (!F.cam || !['part', 'subject'].includes(F.cam.type)) return;
    for (const a of F.actors) { const b = projBox(a.rig.body); if (!b) continue; const vis = Math.max(0, Math.min(b.x1, W) - Math.max(b.x0, 0)) / Math.max(1, b.x1 - b.x0); if (vis < 0.8) a.rig.g.visible = false; }
  }
  function faceCamera(F) {
    for (const a of F.actors) {
      const cy = Math.atan2(cam.position.x - a.x, cam.position.z - a.z); let d = a.rig.g.rotation.y - cy; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > 50 * DEG) { a.rig.g.rotation.y = cy + Math.sign(d) * 50 * DEG; a.rig.g.updateMatrixWorld(true); let aimW = null; const at = a.o.at || (F.things[0] && F.things[0].id); if (at) { const [tid, pn] = String(at).split('.'), t = findThing(F, tid); if (t) { const b = partBox(t.P, pn || null); if (b && !b.isEmpty()) aimW = b.getCenter(new T.Vector3()); } } poseHost(a.rig, a.o, CUR.lt, aimW); }
    }
  }
  // ---------- cameras: framed from targets into the picture band (y 380 to 1460, x 60 to 1020) ----------
  function targetBox(F, type, o) {
    const b = new T.Box3();
    const actorB = a => visBox(a.rig.body), thingB = t => { const b = visBox(t.P.wrap); return b.isEmpty() ? new T.Box3().setFromObject(t.P.wrap) : b; };
    const findT = id => findThing(F, id), findA = id => F.actors.find(a => a.id === id);
    if (type === 'host' || type === 'face') { const a = findA(o.on) || F.actors[0]; if (!a) { if (STRICT) throw new Error(`camera "${type}" needs the host placed in this frame (h.d3.actor first)`); return null; } if (type === 'face') { const p = new T.Vector3(); a.rig.headG.getWorldPosition(p); return new T.Box3().setFromCenterAndSize(p, new T.Vector3(0.7, 0.62, 0.6).multiplyScalar(a.rig.sc)); } return actorB(a); }
    if (type === 'subject' || type === 'part') { const t = findT(o.on) || F.things[0]; if (!t) { if (STRICT) throw new Error(`camera "${type}" needs on: a thing placed in this frame`); return null; } if (type === 'part') { const pb = partBox(t.P, o.part); if (!pb) { if (STRICT) throw new Error(`camera "part": thing "${t.name}" has no part "${o.part}"; its parts: ${partNames(t.P).join(', ')}`); return thingB(t); } return pb.expandByScalar(0.15); } return thingB(t); }
    const on = o.on ? [].concat(o.on) : null;
    for (const a of F.actors) if (!on || on.includes(a.id)) b.union(actorB(a));
    for (const t of F.things) if (!on || on.includes(t.id) || on.includes(t.name)) b.union(thingB(t));
    return b.isEmpty() ? new T.Box3(new T.Vector3(-1, 0, -1), new T.Vector3(1, 1.5, 1)) : b;
  }
  function placeCamera(F) {
    const c = F.cam || { type: 'wide', o: {} }, o = c.o || {}, type = c.type;
    if (!['wide', 'host', 'face', 'subject', 'part', 'free'].includes(type) && STRICT) throw new Error(`camera type "${type}" is unknown; types: wide, host, face, subject, part, free`);
    cam.fov = clamp(+o.fov || 40, 20, 70); cam.aspect = LW / LH;
    if (type === 'free') { const p = o.pos || [0, 1.4, 5], l = o.look || [0, 0.8, 0]; cam.position.set(+p[0], +p[1], +p[2]); cam.lookAt(+l[0], +l[1], +l[2]); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); F.camInfo = { type }; return; }
    const b = targetBox(F, type, o) || new T.Box3(new T.Vector3(-1, 0, -1), new T.Vector3(1, 1.5, 1)), ctr = b.getCenter(new T.Vector3()), sz = b.getSize(new T.Vector3());
    const fill = clamp(+o.fill || ({ wide: 0.92, host: 0.8, face: 0.85, subject: 0.88, part: 0.8 })[type] || 0.85, 0.2, 1.2);
    const vt = Math.tan(cam.fov * DEG / 2), ht = vt * LW / LH;
    const d0 = Math.max(sz.y / (2 * fill * 0.5625 * vt), sz.x / (2 * fill * 0.889 * ht), 0.6) + sz.z / 2;
    const d = d0 * (1 - 0.14 * clamp(+o.push || 0)), ang = (+o.angle || 0) * DEG, tilt = clamp(o.tilt != null ? +o.tilt : 8, -10, 60) * DEG;
    const dir = new T.Vector3(Math.sin(ang) * Math.cos(tilt), Math.sin(tilt), Math.cos(ang) * Math.cos(tilt));
    const look = ctr.clone();
    const pos = ctr.clone().addScaledVector(dir, d);
    const bd = F.setObj ? F.setObj.userData.bounds : null;
    if (bd) { pos.x = clamp(pos.x, -bd.x, bd.x); pos.z = clamp(pos.z, bd.zMin + 0.3, bd.zMax); pos.y = clamp(pos.y, 0.25, bd.yMax - 0.2); }
    else pos.y = Math.max(0.25, pos.y);
    cam.position.copy(pos); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    F.camInfo = { type, pos: pos.toArray().map(v => +v.toFixed(2)) };
  }
  // ---------- checks: what a viewer would see as wrong ----------
  // the world box of what is really drawn (Box3.setFromObject also counts hidden children, such as the slice halves)
  function visBox(o) { const b = new T.Box3(); o.updateMatrixWorld(true); o.traverse(m => { if (m.isMesh && isVisible(m)) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } }); return b; }
  function projBox(o) {
    const b = visBox(o); if (b.isEmpty()) return null; const pts = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const v = new T.Vector3(x, y, z).project(cam); if (v.z < 1) pts.push([(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]); }
    if (!pts.length) return null; return { x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) };
  }
  function check(F) {
    for (const a of F.actors) for (const t of F.things) {
      const tb = t.P.centre ? new T.Box3().setFromCenterAndSize(t.P.centre, t.P.size).applyMatrix4(t.P.wrap.matrixWorld) : visBox(t.P.wrap); // the closed subject
      const r = 0.2 * a.rig.sc, ab = new T.Box3(new T.Vector3(a.x - r, 0, a.z - r * 0.8), new T.Vector3(a.x + r, 1.3 * a.rig.sc, a.z + r * 0.8));
      const ov = Math.max(0, Math.min(tb.max.x, ab.max.x) - Math.max(tb.min.x, ab.min.x)) * Math.max(0, Math.min(tb.max.z, ab.max.z) - Math.max(tb.min.z, ab.min.z));
      if (ov > 0.01 && ab.min.y < tb.max.y && ab.max.y > tb.min.y) err(F, `in:${a.id}:${t.name}`, `the host at x ${a.x}, z ${a.z} stands inside "${t.name}" (x ${tb.min.x.toFixed(2)} to ${tb.max.x.toFixed(2)}, z ${tb.min.z.toFixed(2)} to ${tb.max.z.toFixed(2)}): move the host beside it (x at least ${(tb.min.x - 0.4).toFixed(2)} or ${(tb.max.x + 0.4).toFixed(2)}) or in front of it (z above ${(tb.max.z + 0.35).toFixed(2)})`);
    }
    if (F.cam && F.cam.type === 'wide') {
      for (const t of F.things) { const pb = projBox(t.P.wrap); if (pb && (pb.x0 < -40 || pb.x1 > W + 40 || pb.y0 < 180 || pb.y1 > 1700)) err(F, 'cut:' + t.name, `"${t.name}" runs off the frame in the wide camera (x ${Math.round(pb.x0)} to ${Math.round(pb.x1)}, y ${Math.round(pb.y0)} to ${Math.round(pb.y1)}): use a smaller fill, or a "subject" camera on it`); }
    }
    if (F.cam && (F.cam.type === 'wide' || F.cam.type === 'subject') && F.things.length) {
      const big = Math.max(...F.things.map(t => { const pb = projBox(t.P.wrap); return pb ? Math.max((Math.min(pb.x1, W) - Math.max(pb.x0, 0)) / W, (Math.min(pb.y1, H) - Math.max(pb.y0, 0)) / H / 0.56) : 0; }));
      if (big < 0.4) err(F, 'small', `the subject fills only ${Math.round(big * 100)}% of the picture in the "${F.cam.type}" camera: it should fill 55 to 90% of the frame width (or of the picture band's height). Put the host close in front of it (beside its front corner, not far to the side), raise fill, or use a "subject" camera`);
    }
  }
  function reportTrack(F) {
    if (!TRACK) return;
    (TRACK.d3errs = TRACK.d3errs || []).push(...F.errs.map(e => e[1]));
    const push = (id, o, act) => { const pb = projBox(o); if (!pb) return; const x0 = clamp(pb.x0, 0, W), x1 = clamp(pb.x1, 0, W), y0 = clamp(pb.y0, 0, H), y1 = clamp(pb.y1, 0, H); if (x1 - x0 < 20 || y1 - y0 < 20) return; TRACK.assets.push({ id, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, alpha: 1, act }); };
    for (const a of F.actors) push(a.id, a.rig.body, JSON.stringify({ pose: a.rig.pose, expr: a.o.expr || 'neutral' }));
    for (const t of F.things) push(t.name, t.P.wrap, JSON.stringify({ slice: +(t.slice || 0).toFixed(1) }));
    TRACK.lpSlice = Math.max(TRACK.lpSlice || 0, ...F.things.map(t => +t.slice || 0), 0);
    TRACK.cam = F.camInfo; TRACK.lpPose = Object.fromEntries(F.actors.map(a => [a.id, a.rig.pose]));
  }
  // sentences of the narrator's lines with times: word timings when the voice gave them, else each word's share of the letters
  function sentencesOf(sh) {
    const out = [];
    for (const ln of (sh && sh.lines) || []) {
      if (ln.who !== 'narrator') continue;
      const ws = ln.words && ln.words.length ? ln.words.map(w => ({ w: w.w, s: w.start, e: w.end })) : (() => { const t = String(ln.text).split(/\s+/).filter(Boolean), tot = t.reduce((a, w) => a + w.length + 1, 0); let acc = 0; return t.map(w => { const s = ln.start + (ln.end - ln.start) * acc / tot; acc += w.length + 1; return { w, s, e: ln.start + (ln.end - ln.start) * acc / tot }; }); })();
      let cur = [];
      ws.forEach((w, i) => { cur.push(w); if (/[.!?]["')]?$/.test(w.w) || i === ws.length - 1) { out.push({ text: cur.map(x => x.w).join(' '), start: +cur[0].s.toFixed(2), end: +cur[cur.length - 1].e.toFixed(2) }); cur = []; } });
    }
    return out;
  }
  // rule 6: a new pose on every sentence (the host's pose at the middle of each sentence differs from the one before)
  function poseCheck(sh, renderAt) {
    const ss = sentencesOf(sh), E = [], seen = [];
    for (const s of ss) { TRACK = { texts: [], assets: [] }; try { renderAt((s.start + s.end) / 2); } catch { } const p = TRACK && TRACK.lpPose ? Object.values(TRACK.lpPose)[0] : null; TRACK = null; seen.push(p); }
    for (let i = 1; i < ss.length; i++) if (seen[i] && seen[i] === seen[i - 1]) E.push(`the host keeps the pose "${seen[i]}" from the sentence "${ss[i - 1].text.slice(0, 50)}" into "${ss[i].text.slice(0, 50)}" (lt ${ss[i].start}s): a NEW pose on every sentence. Give actor a schedule, one pose per sentence: pose: h.d3.sentences().map((s, i) => [s.start, ['wave', 'point', 'shrug'][i]]) with a different pose for each`);
    if (ss.length && seen.some(p => p == null)) E.push('the host is not on screen during every sentence: place h.d3.actor(...) in every frame (it may be small in a subject camera, but it is placed)');
    return E;
  }

  // ---------- the default kit: palette, rounded heavy font, outlined text, a wooden board panel, the step header ----------
  const kitFont = (s, w = 900) => `${w} ${s}px ${(STYLE && STYLE.font) ? `"${STYLE.font}", ` : ''}"Arial Rounded MT Bold", "Segoe UI Black", "Segoe UI", Arial`;
  function outlined(c, text, x, y, size, fill, align = 'center') { c.save(); c.font = kitFont(size); c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = Math.max(8, size * 0.2); c.strokeStyle = pal().ink; c.strokeText(text, x, y); c.fillStyle = fill; c.fillText(text, x, y); c.restore(); }
  function defaultKit() {
    const P = pal();
    return {
      palette: P, font: kitFont,
      bg: (c) => { c.fillStyle = P.sky; c.fillRect(0, 0, W, H); },
      // a wooden sign board: planks on a dark frame, pixel-crisp
      panel: (c, x, y, w, hgt, o = {}) => {
        c.save(); c.globalAlpha *= o.alpha != null ? +o.alpha : 1; const wd = col(o.accent || 'wood');
        c.fillStyle = P.ink; c.fillRect(x - 12, y - 12, w + 24, hgt + 24); c.fillStyle = mix(wd, '#000000', 0.3); c.fillRect(x - 6, y - 6, w + 12, hgt + 12);
        for (let py = y, i = 0; py < y + hgt; py += 48, i++) { c.fillStyle = mix(wd, i % 2 ? '#000000' : '#ffffff', 0.06); c.fillRect(x, py, w, Math.min(44, y + hgt - py)); }
        c.restore();
      },
      title: (c, text, x, y, o = {}) => { const k = o.k == null ? 10 : +o.k; if (k < 0) return; const e = clamp(k / 0.16); c.save(); c.globalAlpha *= clamp(k / 0.08); c.translate(x, y); c.scale(0.8 + 0.2 * easeBack(e), 0.8 + 0.2 * easeBack(e)); outlined(c, String(text), 0, 0, o.size || 72, o.color ? col(o.color) : P.text, o.align || 'center'); c.restore(); },
      // the step header, top left: "n/N" in the accent colour, then the step in white, wrapped to two lines
      header: (c, n, total, text, o = {}) => {
        if (TRACK) TRACK.lpHeader = { n: n == null || n === '' || n === 0 ? null : n, total: +total || 0, text: String(text) };
        const k = o.k == null ? 10 : +o.k; if (k < 0) return; const size = clamp(+o.size || 64, 48, 80), x0 = 64, y0 = o.y || 300, tag = n == null || n === '' || n === 0 ? '' : total ? `${n}/${total}` : String(n);
        c.save(); c.globalAlpha *= clamp(k / 0.1); c.font = kitFont(size); const tw = tag ? c.measureText(tag + ' ').width : 0, maxw = W - 64 - x0 - tw;
        const words = String(text).split(/\s+/), lines = ['']; for (const w of words) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (c.measureText(t).width <= maxw || !lines[lines.length - 1]) lines[lines.length - 1] = t; else lines.push(w); }
        if (tag) outlined(c, tag, x0, y0, size, o.color ? col(o.color) : P.accent, 'left');
        lines.slice(0, 2).forEach((l, i) => outlined(c, l, x0 + tw, y0 + i * size * 1.05, size, P.text, 'left'));
        c.restore();
      },
      post: null,
    };
  }

  // ---------- setup, prop validation, cast sheet ----------
  function clearPool() { for (const k in POOL) { scene.remove(POOL[k].obj); delete POOL[k]; } FRAME = null; }
  function setup(d3) {
    STYLE = d3.style || STYLE; CAST = d3.cast || {}; PROPS = d3.props || {}; PROPFN = {};
    for (const k in MATS) delete MATS[k]; for (const k in TEX) delete TEX[k];
    const P = pal(); CUTV = srgb(P.cut); EDGEV = srgb(P.edge);
    for (const [id, p] of Object.entries(PROPS)) if (p.code) try { PROPFN[id] = compileProp(p.code); } catch { }
    clearPool();
  }
  function shot(draw) { // one standalone render of the scene into a 270 x 480 canvas (previews and sheets)
    lctx.clearRect(0, 0, LW, LH); paintSky({ kind: 'studio', wall: '#8c96a8', wall2: '#b8bec8' }, 0); renderer().render(scene, cam); lctx.drawImage(glc, 0, 0); dither();
    const c = document.createElement('canvas'); c.width = LW; c.height = LH; c.getContext('2d').drawImage(lo, 0, 0); return c;
  }
  function frameOn(obj, ang, fill = 0.8) { const b = visBox(obj), ctr = b.getCenter(new T.Vector3()), sz = b.getSize(new T.Vector3()), vt = Math.tan(20 * DEG), ht = vt * LW / LH; const d = Math.max(sz.y / (2 * fill * vt), sz.x / (2 * fill * ht), sz.z / (2 * fill * ht)) + Math.max(sz.x, sz.z) / 2; cam.fov = 40; cam.aspect = LW / LH; cam.position.set(ctr.x + Math.sin(ang * DEG) * d, ctr.y + d * 0.22, ctr.z + Math.cos(ang * DEG) * d); cam.lookAt(ctr); cam.updateProjectionMatrix(); }
  function validateProp(code, spec) {
    const errors = []; let fn;
    try { fn = compileProp(code); } catch (e) { return { ok: false, errors: [`SyntaxError: ${e.message}${dupHint(code, e.message)}`] }; }
    let m; try { STRICT = true; m = fn(K, {}); } catch (e) { STRICT = false; return { ok: false, errors: [`runtime error: ${e.message}${at(e, code)}`] }; } STRICT = false;
    if (!m || !m.isObject3D) return { ok: false, errors: ['buildAsset must return k.group(...) (or one part)'] };
    let n = 0, parts = 0; m.traverse(x => { if (x.isMesh) { parts++; n += tris(x.geometry); } });
    const bb = new T.Box3().setFromObject(m), s = new T.Vector3(); bb.getSize(s);
    if (![s.x, s.y, s.z].every(Number.isFinite)) errors.push('a size or position is NaN: check every number');
    if (parts < 4) errors.push(`only ${parts} part(s): build it from at least 4 parts (shell, inside parts, details)`);
    if (n > 700) errors.push(`${n} triangles: low poly means at most 700 with the inside (aim for 300 to 500; the host is 300). Use fewer segments (seg 4 to 8 on cylinders and cones, seg 4 or 5 on pipes, detail 0 on balls) and merge small details`);
    const mx = Math.max(s.x, s.y, s.z); if (mx > 4) errors.push(`it is ${mx.toFixed(2)} m across: sizes are in metres (keep it under 3 m; the host is 1.25 m tall)`); if (mx < 0.1) errors.push(`it is only ${mx.toFixed(3)} m across: sizes are in metres`);
    if (spec.size && spec.size.length === 3) { const want = Math.max(...spec.size.map(Number)); if (want > 0 && (mx < want * 0.6 || mx > want * 1.5)) errors.push(`it is ${mx.toFixed(2)} m at its largest but the plan says about ${want} m (size_m ${JSON.stringify(spec.size)}): build it at that size`); }
    const names = [...new Set(meshes(m).map(x => x.userData.part).filter(Boolean))], inner = [...new Set(meshes(m).filter(x => x.userData.inner).map(x => x.userData.part).filter(Boolean))], shell = meshes(m).filter(x => !x.userData.inner);
    const want = (spec.parts || []).map(String);
    const miss = want.filter(p => !names.includes(p)); if (miss.length) errors.push(`these parts are not named in the model: ${miss.join(', ')}. Give each its name with o.name (k.box(..., { name: '${miss[0]}', inner: true })) or wrap several pieces in k.named('${miss[0]}', { inner: true }, ...)`);
    const outer = want.filter(p => names.includes(p) && !inner.includes(p)); if (outer.length) errors.push(`${outer.join(', ')} must be INSIDE parts (inner: true on every piece of them), so they stay whole when the casing is sliced and can be labelled`);
    if (inner.length < 2) errors.push(`only ${inner.length} named inner part(s): the shots slice it open and label what is inside, so build at least 2 named inside parts with inner: true (they stay whole when the shell is cut)`);
    if (!shell.length) errors.push('no shell: the outer casing (inner: false, the default) is what the slice cuts open; build the casing around the inside parts');
    let preview = null;
    if (!errors.length) {
      clearPool(); PROPFN.__preview = fn; const t = makeThing('__preview', {}); delete PROPFN.__preview;
      if (t) {
        scene.add(t.wrap); t.wrap.updateMatrixWorld(true); const imgs = [];
        for (const [ang, sl] of [[25, 0], [-35, 0], [20, 1]]) { t.name = '__preview'; PROPFN.__preview = fn; applySlice(t, sl, 'x'); frameOn(t.wrap, ang); imgs.push(shot()); delete PROPFN.__preview; }
        scene.remove(t.wrap); preview = sheet(imgs, LW, LH);
      }
    }
    return { ok: !errors.length, errors, preview, size: [s.x, s.y, s.z].map(v => +v.toFixed(3)), triangles: n, parts: names, inner };
  }
  // the cast sheet: the host in several poses and expressions, each subject whole and sliced
  function castSheet() {
    clearPool(); const tiles = [], save = FRAME, F0 = CUR;
    const tile = (label, fn) => { CUR = { sh: { lines: [] }, lt: 0.4 + tiles.length * 0.01 }; for (const k in POOL) POOL[k].obj.visible = false; FRAME = { cur: CUR, set: null, actors: [], things: [], cam: null, labels: [], errs: [] }; fn(); const c = shot(); const g = c.getContext('2d'); g.fillStyle = '#111'; g.font = 'bold 16px Arial'; _fillText.call(g, label, 6, 18); tiles.push(c); };
    for (const id of Object.keys(CAST)) for (const [pose, expr] of [['stand', 'neutral'], ['wave', 'happy'], ['point', 'surprised'], ['shrug', 'worried'], ['think', 'thinking'], ['arms_up', 'happy'], ['shiver', 'cold'], ['fan', 'hot']]) tile(`${id}: ${pose}, ${expr}`, () => { API.actor(id, { x: 0, z: 0, pose, expr, at: null }); FRAME.things = []; resolveFacing(FRAME); const a = FRAME.actors[0]; frameOn(a.rig.body, 15, 0.75); });
    for (const id of Object.keys(PROPS)) for (const sl of [0, 1]) tile(`${id}${sl ? ' sliced' : ''}`, () => { const t = API.thing(id, { x: 0, z: 0, slice: sl }); if (t) frameOn(t.P.wrap, 22, 0.8); });
    FRAME = save; CUR = F0; clearPool();
    const out = [], cols = 4; for (let k = 0; k < tiles.length; k += 12) { const part2 = tiles.slice(k, k + 12), c = document.createElement('canvas'); c.width = LW * cols; c.height = LH * Math.ceil(part2.length / cols); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#7f7f7f'; g.fillRect(0, 0, c.width, c.height); part2.forEach((t, i) => g.drawImage(t, (i % cols) * LW, Math.floor(i / cols) * LH)); out.push(c.toDataURL('image/jpeg', 0.88)); }
    return out;
  }
  const hostTris = id => { const r = buildHost(id); return r ? r.tris : 0; };
  return { API, setup, validateProp, castSheet, poseCheck, sentencesOf, POSES, EXPR, EARS, SNOUTS, TAILS, SET_PROPS, PATTERNS, hostTris, ok: () => { try { return !!renderer().getContext(); } catch { return false; } } };
})();
// wire into the stage: h.d3 is the low-poly API while a "renderer: lowpoly" timeline is set up, else the toon 3D API
if (LP && typeof D3 !== 'undefined' && D3) {
  let on = false; const api3 = HK.d3, setup3 = D3.setup;
  Object.defineProperty(HK, 'd3', { configurable: true, enumerable: true, get: () => (on ? LP.API : api3) });
  D3.setup = d3 => { on = !!(d3 && d3.mode === 'lowpoly'); return on ? LP.setup(d3) : setup3(d3); };
  const vp = window.validateProp3d, cs = window.castSheet3d;
  window.validateProp3d = (code, spec, d3) => { if (d3 && d3.mode === 'lowpoly') { on = true; LP.setup(d3); return LP.validateProp(code, spec); } on = false; return vp(code, spec, d3); };
  window.castSheet3d = d3 => { if (d3 && d3.mode === 'lowpoly') { on = true; LP.setup(d3); return LP.castSheet(); } on = false; return cs(d3); };
  window.LP_ON = () => on;
}
