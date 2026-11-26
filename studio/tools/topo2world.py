"""Convert world-atlas TopoJSON (Natural Earth, public domain) into engine/world.js for the fastreel stage.
Output: window.WORLD = {land110, land50, borders110, borders50}: arrays of flat [lon, lat, lon, lat, ...] rings / lines, and
countries110, countries50: {country name (Natural Earth's short name, accents dropped): [rings]} for filling one country."""
import json, sys, math, unicodedata

SRC, OUT = sys.argv[1], sys.argv[2]  # python -I studio/tools/topo2world.py <folder with world-atlas@2 land-110m, land-50m, countries-110m, countries-50m .json> engine/world.js


def load(name):
    t = json.load(open(f'{SRC}/{name}.json', encoding='utf-8'))
    sx, sy = t['transform']['scale']; tx, ty = t['transform']['translate']
    arcs = []
    for a in t['arcs']:
        x = y = 0; pts = []
        for dx, dy in a:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return t, arcs


def arc_pts(arcs, i):
    return arcs[i] if i >= 0 else arcs[~i][::-1]


def ring_pts(arcs, ring):
    out = []
    for i in ring:
        p = arc_pts(arcs, i)
        out.extend(p if not out else p[1:])
    return out


def polys(geom):
    if geom['type'] == 'Polygon': return [geom['arcs']]
    if geom['type'] == 'MultiPolygon': return geom['arcs']
    if geom['type'] == 'GeometryCollection': return [p for g in geom['geometries'] for p in polys(g)]
    return []


def simplify(pts, tol):
    out = [pts[0]]
    for p in pts[1:]:
        if abs(p[0] - out[-1][0]) >= tol or abs(p[1] - out[-1][1]) >= tol: out.append(p)
    return out


def flat(pts, dec):
    r = []
    for x, y in pts: r += [round(x, dec), round(y, dec)]
    return r


def land(name, tol, dec, min_pts=4):
    t, arcs = load(name)
    rings = []
    for poly in polys(t['objects']['land']):
        for ring in poly:
            p = simplify(ring_pts(arcs, ring), tol)
            if len(p) >= min_pts: rings.append(flat(p, dec))
    return rings


def borders(name, tol, dec):
    t, arcs = load(name)
    use = {}
    for g in t['objects']['countries']['geometries']:
        for poly in polys(g):
            for ring in poly:
                for i in ring: use[i if i >= 0 else ~i] = use.get(i if i >= 0 else ~i, 0) + 1
    lines = []
    for i, n in use.items():
        if n >= 2:
            p = simplify(arcs[i], tol)
            if len(p) >= 2: lines.append(flat(p, dec))
    return lines


def countries(name, tol, dec, min_pts=4):
    # each shared arc is simplified ONCE (keeping both ends), so two neighbours' rings meet exactly along their border
    t, arcs = load(name)
    sarcs = [a if len(a) < 3 else simplify(a[:-1], tol) + [a[-1]] for a in arcs] if tol else arcs
    out = {}
    for g in t['objects']['countries']['geometries']:
        nm = unicodedata.normalize('NFKD', g.get('properties', {}).get('name', '')).encode('ascii', 'ignore').decode().strip()
        if not nm: continue
        for poly in polys(g):
            for ring in poly:
                p = ring_pts(sarcs, ring)
                if len(p) >= min_pts: out.setdefault(nm, []).append(flat(p, dec))
    return out


W = {'land110': land('land-110m', 0.0, 2), 'land50': land('land-50m', 0.04, 2), 'borders110': borders('countries-110m', 0.0, 2), 'borders50': borders('countries-50m', 0.04, 2),
     'countries110': countries('countries-110m', 0.0, 2), 'countries50': countries('countries-50m', 0.04, 2)}
for k, v in W.items(): rs = [r for x in v.values() for r in x] if isinstance(v, dict) else v; print(k, len(v), 'items', len(rs), 'parts', sum(len(r) // 2 for r in rs), 'points')
js = ('// Natural Earth (public domain, naturalearthdata.com) via world-atlas@2.0.2: land and country borders at 1:110m and 1:50m,\n'
      '// as flat [lon, lat, lon, lat, ...] rings (land) and lines (borders shared by two countries). Made by studio tools, see README.\n'
      'window.WORLD = ' + json.dumps(W, separators=(',', ':')) + ';\n')
open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
print(OUT, len(js), 'bytes')
