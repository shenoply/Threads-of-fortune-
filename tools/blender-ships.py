# The travel map's ships, modelled and rendered in Blender from 16 headings, so a ship coming about turns
# in the round instead of a flat picture being rotated.
#
#   <blender-venv>/bin/python tools/blender-ships.py <out-dir> [type ...]
#   python3 tools/ships-sheet.py <out-dir>        (post-pass and sprite sheets, needs Pillow)
#
# For each type it writes, per heading i = 0..15, <type>-<ii>.png (the ship, 320 x 320, transparent) and
# <type>-<ii>-sh.png (its shadow on the water alone), plus <type>.json with the funnel top and the way the
# smoke drifts, in frame pixels, for the post-pass.
#
# Headings: frame i shows the ship sailing i x 22.5 degrees clockwise from east as seen on the map
# (0 = east/right, 4 = south/down, 8 = west, 12 = north/up), the same sense as the map's pose angle.
# The camera looks north from the south, 55 degrees above the horizon (the map painting's angle); the sun
# stands in the north-west and stays fixed while the ship turns, so the shading is consistent.
# One world scale for every type: the steamer is the biggest, the felucca the smallest.
import bpy, bmesh, math, sys, os, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
OUT = argv[0] if argv else 'art-src/ships/render'
ONLY = argv[1:]
os.makedirs(OUT, exist_ok=True)

RES = 320           # rendered frame (halved to 160 by the post-pass)
ORTHO = 11.5        # world units across a frame
ELEV = 48           # camera height above the horizon, degrees
SHIFT_Y = 0.10      # the waterline centre sits 8% below the middle of the frame, leaving room for masts
SAMPLES = 40
HEADINGS = 16

def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

# ---------------- scene ----------------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.render.resolution_x = sc.render.resolution_y = RES
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = ORTHO; cam.data.shift_y = SHIFT_Y
    tilt = math.radians(90 - ELEV)
    cam.rotation_euler = (tilt, 0, 0)
    cam.location = (0, -30 * math.sin(tilt), 30 * math.cos(tilt))
    sc.collection.objects.link(cam); sc.camera = cam
    # warm sun from the north-west, fairly high; a cool sky fill so the shade side is not black
    key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN'))
    key.data.energy = 3.4; key.data.angle = math.radians(12); key.data.color = (1, 0.93, 0.8)
    # pointing from the NW (light travels to the SE): tilt 40 degrees off the zenith, azimuth from NW
    key.rotation_euler = (math.radians(32), 0, math.radians(135))
    sc.collection.objects.link(key)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.62, 0.66, 0.7, 1); bg.inputs[1].default_value = 0.9
    # the water, only to catch the ship's shadow (shown in the shadow pass)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    sea = bpy.context.active_object; sea.name = 'sea'; sea.is_shadow_catcher = True
    return sc, cam

MATS = {}
def lin(c):
    """colours below are written as sRGB, as picked from the painting"""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def mat(name, col, var=0.10, scale=6.0, rough=0.95, glow=0.0):
    """matte, with a gentle painterly variation of tone"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = 0.12; break
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 3
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    col = tuple(lin(c) for c in col)
    lo = tuple(c * (1 - var) for c in col); hi = tuple(min(1, c * (1 + var)) for c in col)
    ramp.color_ramp.elements[0].color = (*lo, 1); ramp.color_ramp.elements[1].color = (*hi, 1)
    ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[1].position = 0.7
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    if glow:
        nt.links.new(ramp.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = glow
    MATS[name] = m
    return m

def link(o, parent):
    bpy.context.scene.collection.objects.link(o) if o.name not in bpy.context.scene.collection.objects else None
    o.parent = parent
    return o

def mesh_obj(name, bm, mats, parent):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    for m in mats: o.data.materials.append(m)
    o.parent = parent
    return o

def box(parent, m, x0, x1, w, z0, z1, y=0.0, name='box'):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co.x = (x0 + x1) / 2 + v.co.x * (x1 - x0)
        v.co.y = y + v.co.y * w
        v.co.z = (z0 + z1) / 2 + v.co.z * (z1 - z0)
    return mesh_obj(name, bm, [m], parent)

def rod(parent, m, a, b, r, name='rod'):
    a, b = Vector(a), Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=r, radius2=r * 0.8, depth=d.length)
    o = mesh_obj(name, bm, [m], parent)
    o.location = (a + b) / 2
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return o

def cyl(parent, m, x, y, z0, h, r, sx=1.0, rake=0.0, name='cyl'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r, radius2=r, depth=h)
    for v in bm.verts:
        v.co.x *= sx
        v.co.z += h / 2
        v.co.x -= math.tan(math.radians(rake)) * v.co.z
    o = mesh_obj(name, bm, [m], parent)
    o.location = (x, y, z0)
    return o

def hull(parent, L, B, D, m_side, m_boot, m_deck, *, boot=0.14, bow_rake=0.4, stern_w=0.35, sheer_f=0.25,
         sheer_a=0.1, entry=0.3, transom=False, flare=0.2, run=0.55):
    """A hull from stations, bow to +x. Sides above `boot` take m_side, the waterline band m_boot."""
    N = 28
    bm = bmesh.new()
    rings = []
    for i in range(N + 1):
        u = -1 + 2 * i / N
        # half-width along the length: a fine entry at the bow, a rounded (or square) run aft
        if u > entry:
            f = max(0.02, ((1 - u) / (1 - entry)) ** 0.75)
        elif u < -run:
            k = (-u - run) / (1 - run)
            f = max(stern_w, math.sqrt(max(0.0, 1 - k * k))) if not transom else 1 - (1 - stern_w) * k ** 1.6
        else:
            f = 1.0
        w = B / 2 * f
        x = u * L / 2
        top = D + sheer_f * smooth(0.2, 1, u) ** 1.5 + sheer_a * smooth(0.2, 1, -u) ** 1.5
        rake = bow_rake * smooth(0.55, 1, u) - (0.25 * stern_w if transom else 0.1) * smooth(0.7, 1, -u)
        xb, xt = x, x + rake
        wb = w * (1 - flare) * (0.6 if u > 0.85 else 1)
        wt = w
        zb = boot
        wbt = wb + (wt - wb) * (zb / top)
        xbt = xb + (xt - xb) * (zb / top)
        pts = [(xb, -wb, 0), (xbt, -wbt, zb), (xt, -wt, top), (xt, wt, top), (xbt, wbt, zb), (xb, wb, 0)]
        rings.append([bm.verts.new(p) for p in pts])
    mi = [1, 0, 2, 0, 1, 0]   # material per side of the section: boot, side, deck, side, boot, bottom
    for i in range(N):
        A, Bv = rings[i], rings[i + 1]
        for k in range(6):
            k2 = (k + 1) % 6
            f = bm.faces.new((A[k], Bv[k], Bv[k2], A[k2]))
            f.material_index = mi[k]
    for r, rev in ((rings[0], True), (rings[-1], False)):
        f = bm.faces.new(list(reversed(r)) if rev else r)
        f.material_index = 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_obj('hull', bm, [m_side, m_boot, m_deck], parent)
    return o

def deck_z(L, D, u, sheer_f, sheer_a):
    return D + sheer_f * smooth(0.2, 1, u) ** 1.5 + sheer_a * smooth(0.2, 1, -u) ** 1.5

def sail(parent, m, tack, peak, clew, belly=0.18, side=1, name='sail'):
    """A lateen sail: the triangle tack-peak-clew, filled out to `side` (+y port) by a belly."""
    T, P, C = Vector(tack), Vector(peak), Vector(clew)
    n = (P - T).cross(C - T).normalized()
    if n.y * side < 0: n = -n
    R = 10
    bm = bmesh.new()
    grid = []
    for i in range(R + 1):
        row = []
        for j in range(R + 1 - i):
            a = i / R; b = j / R; c = 1 - a - b
            p = T * c + P * a + C * b
            bul = 27 * a * b * c   # 0 on the edges, 1 in the middle
            row.append(bm.verts.new(p + n * belly * bul * (T - C).length * 0.25))
        grid.append(row)
    for i in range(R):
        for j in range(R - i):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j]))
            if j < R - i - 1:
                bm.faces.new((grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    return mesh_obj(name, bm, [m], parent)

# ---------------- the ships ----------------
INK = (0.10, 0.09, 0.09)
CREAM = (0.92, 0.88, 0.78)
SAILC = (0.90, 0.84, 0.70)
DECK = (0.56, 0.42, 0.27)
WOOD = (0.25, 0.14, 0.07)
SPAR = (0.38, 0.26, 0.15)

def lateen(root, mast_x, mast_h, deck, tack, peak, clew, rake=-6, side=1, belly=0.2):
    """mast, yard and sail; the mast raked forward by `rake` degrees (negative leans to the bow)"""
    spar = mat('spar', SPAR)
    top = (mast_x - math.tan(math.radians(rake)) * mast_h, 0, deck + mast_h)
    rod(root, spar, (mast_x, 0, deck), top, 0.05, 'mast')
    T, P, C = Vector(tack), Vector(peak), Vector(clew)
    ext = (P - T).normalized()
    rod(root, spar, T - ext * 0.25, P + ext * 0.1, 0.035, 'yard')
    sail(root, mat('sail', SAILC, 0.08, 4, glow=0.22), tack, peak, clew, belly, side)

def steamer(root, L=10.0, B=1.45, D=1.0, cargo=False, small=False):
    funnel_top = None
    if cargo:
        side, boot, deckm = mat('rusthull', (0.22, 0.15, 0.12), 0.2), mat('rustboot', (0.52, 0.22, 0.13), 0.2), mat('deck2', (0.46, 0.38, 0.29), 0.15)
        house = mat('house2', (0.78, 0.70, 0.55), 0.1)
    else:
        side, boot, deckm = mat('blackhull', (0.11, 0.11, 0.13), 0.15), mat('redboot', (0.64, 0.17, 0.10), 0.1), mat('deck', (0.56, 0.44, 0.30), 0.12)
        house = mat('house', CREAM, 0.06)
    hull(root, L, B, D, side, boot, deckm, boot=0.13, bow_rake=0.45, stern_w=0.3, sheer_f=0.28, sheer_a=0.12, entry=0.35, run=0.6)
    ink = mat('ink', INK, 0.05); win = mat('win', (0.24, 0.21, 0.19), 0.05)
    hatch = mat('hatch', (0.42, 0.29, 0.18), 0.15)
    rail = mat('rail', CREAM if not cargo else (0.7, 0.62, 0.5), 0.05)
    # a pale sheer strake along the hull top, as the painted liners have
    if not cargo:
        for s in (-1, 1):
            box(root, rail, -L * 0.42, L * 0.40, 0.03, D - 0.02, D + 0.06, y=s * (B / 2 - 0.01), name='strake')
    if cargo or small:
        hx0, hx1 = (-0.9, 0.9) if not small else (-1.3, 0.9)
        tiers = [(hx0, hx1, B * 0.72, 0.5), (hx0 + 0.3, hx1 - 0.1, B * 0.58, 0.4)]
        fx, fr, fh = -0.25, 0.28 if not small else 0.27, 1.5 if not small else 1.3
        masts = [(L * 0.32, 2.8), (-L * 0.30, 2.6)]
    else:
        tiers = [(-1.9, 2.0, B * 0.78, 0.5), (-1.4, 1.6, B * 0.64, 0.42), (0.95, 1.6, B * 0.74, 0.36)]
        fx, fr, fh = 0.0, 0.33, 1.7
        masts = [(L * 0.33, 3.3), (-L * 0.31, 3.0)]
    z = D + 0.02
    zs = []
    for k, (x0, x1, w, h) in enumerate(tiers):
        zb = z if k < 2 else zs[1][1]
        box(root, house, x0, x1, w, zb, zb + h, name=f'tier{k}')
        # a row of dark windows along each side
        box(root, win, x0 + 0.08, x1 - 0.08, w + 0.012, zb + h * 0.42, zb + h * 0.62, name='win')
        if k < 2:
            zs.append((zb, zb + h)); z = zb + h
    top = zs[-1][1]
    # funnel: ochre with a black top (cargo: black with a dull red band)
    fun = mat('funnel', (0.88, 0.54, 0.17), 0.08) if not cargo else mat('funnelc', (0.13, 0.11, 0.10), 0.1)
    if small: fun = mat('funnels', (0.72, 0.60, 0.40), 0.08)
    cyl(root, fun, fx, 0, top - 0.05, fh, fr, sx=1.25, rake=9, name='funnel')
    cyl(root, ink, fx - math.tan(math.radians(9)) * (fh - 0.28), 0, top - 0.05 + fh - 0.28, 0.3, fr * 1.03, sx=1.25, rake=9, name='funnel-top')
    if cargo:
        cyl(root, mat('band', (0.60, 0.22, 0.13), 0.1), fx - math.tan(math.radians(9)) * fh * 0.55, 0, top - 0.05 + fh * 0.55, 0.16, fr * 1.03, sx=1.25, rake=9)
    funnel_top = (fx - math.tan(math.radians(9)) * fh, 0, top - 0.05 + fh)
    # masts with a crosstree; derricks on the cargo boats
    spar = mat('mastc', (0.52, 0.42, 0.30), 0.1)
    for (mx, mh) in masts:
        dz = deck_z(L, D, mx / (L / 2), 0.28, 0.12)
        rod(root, spar, (mx, 0, dz), (mx - 0.12, 0, dz + mh), 0.045, 'mast')
        rod(root, spar, (mx - 0.08, -0.35, dz + mh * 0.68), (mx - 0.08, 0.35, dz + mh * 0.68), 0.025, 'xtree')
        if cargo:
            for s in (-1, 1):
                rod(root, spar, (mx, 0, dz + 0.3), (mx + (0.9 if mx < 0 else -0.9), s * 0.25, dz + 1.3), 0.025, 'derrick')
    # hatches fore and aft
    for hx in ((L * 0.22, L * 0.13, -L * 0.15, -L * 0.24) if cargo or small else (L * 0.24, -L * 0.22)):
        dz = deck_z(L, D, hx / (L / 2), 0.28, 0.12)
        box(root, hatch, hx - 0.32, hx + 0.32, B * 0.42, dz - 0.05, dz + 0.1, name='hatch')
    # lifeboats along the upper deck
    if not cargo:
        boat = mat('boat', (0.92, 0.88, 0.78), 0.04)
        for bx in ((-1.0, 0.0, 1.0) if not small else (-0.6, 0.5)):
            for s in (-1, 1):
                box(root, boat, bx - 0.28, bx + 0.28, 0.16, top, top + 0.12, y=s * (tiers[1][2] / 2 - 0.05), name='lifeboat')
    # small after deckhouse and a forecastle head
    box(root, house, -L * 0.40, -L * 0.33, B * 0.5, deck_z(L, D, -0.73, 0.28, 0.12) - 0.02, deck_z(L, D, -0.73, 0.28, 0.12) + 0.25, name='aft-house')
    return funnel_top

def dhow(root, L=6.0, B=1.5, D=0.62, schooner=False):
    hullc = (0.36, 0.22, 0.12) if not schooner else (0.32, 0.25, 0.18)
    side = mat('dhowhull' + ('s' if schooner else ''), hullc, 0.18, 5)
    band = mat('dhowband' + ('s' if schooner else ''), (0.25, 0.15, 0.08) if not schooner else (0.74, 0.68, 0.56), 0.15)
    deckm = mat('dhowdeck', DECK, 0.15)
    sf, sa = (0.32, 0.45) if not schooner else (0.25, 0.25)
    hull(root, L, B, D, side, band, deckm, boot=0.12, bow_rake=0.9 if not schooner else 0.5, stern_w=0.62, sheer_f=sf, sheer_a=sa,
         entry=0.15, transom=True, flare=0.28, run=0.45)
    rail = mat('dhowrail', (0.62, 0.45, 0.24), 0.15)
    # a carved poop / quarter-deck rail and cargo on deck
    box(root, rail, -L * 0.5, -L * 0.30, B * 0.62, deck_z(L, D, -0.8, sf, sa) - 0.02, deck_z(L, D, -0.8, sf, sa) + 0.18, name='poop')
    bales = mat('bales', (0.62, 0.52, 0.36), 0.18, 9)
    for (bx, by) in ((0.2, -0.25), (0.45, 0.2), (-0.35, 0.15), (-0.6, -0.2)):
        dz = deck_z(L, D, bx / (L / 2), sf, sa)
        box(root, bales, bx - 0.22, bx + 0.22, 0.34, dz - 0.03, dz + 0.24, y=by, name='bale')
    spar = mat('spar', SPAR)
    # a bowsprit
    rod(root, spar, (L * 0.42, 0, deck_z(L, D, 0.85, sf, sa)), (L * 0.62, 0, deck_z(L, D, 0.85, sf, sa) + 0.35), 0.04, 'bowsprit')
    if not schooner:
        mx = L * 0.08; dz = deck_z(L, D, mx / (L / 2), sf, sa)
        lateen(root, mx, 3.6, dz, (L * 0.50, 0.12, dz + 0.55), (-L * 0.30, 0.95, dz + 4.9), (-L * 0.22, 0.75, dz + 0.55), side=1)
        mz = -L * 0.30; dz2 = deck_z(L, D, mz / (L / 2), sf, sa)
        lateen(root, mz, 2.2, dz2, (-L * 0.10, 0.1, dz2 + 0.5), (-L * 0.52, 0.6, dz2 + 2.8), (-L * 0.46, 0.5, dz2 + 0.5), side=1, belly=0.16)
    else:
        for (mx, h, k) in ((L * 0.20, 3.4, 1.0), (-L * 0.16, 3.0, 0.88)):
            dz = deck_z(L, D, mx / (L / 2), sf, sa)
            lateen(root, mx, h, dz, (mx + L * 0.28 * k, 0.1, dz + 0.5), (mx - L * 0.30 * k, 0.8, dz + 4.3 * k), (mx - L * 0.24 * k, 0.6, dz + 0.5), side=1)
        # a jib to the bowsprit
        dz = deck_z(L, D, 0.6, sf, sa)
        sail(root, mat('sail', SAILC, 0.08, 4, glow=0.22), (L * 0.60, 0, dz + 0.4), (L * 0.22, 0.05, dz + 3.2), (L * 0.30, 0.35, dz + 0.45), 0.15, 1, 'jib')
    return None

def felucca(root, L=5.6, B=1.05, D=0.55):
    side = mat('felhull', (0.30, 0.20, 0.13), 0.18, 5)
    band = mat('felband', (0.22, 0.42, 0.44), 0.12)   # the Nile boats' painted strake
    hull(root, L, B, D, side, band, mat('dhowdeck', DECK, 0.15), boot=0.10, bow_rake=0.55, stern_w=0.45, sheer_f=0.3, sheer_a=0.18,
         entry=0.2, transom=True, flare=0.25, run=0.5)
    mx = L * 0.18; dz = deck_z(L, D, mx / (L / 2), 0.3, 0.18)
    lateen(root, mx, 2.6, dz, (L * 0.55, 0.08, dz + 0.35), (-L * 0.42, 0.9, dz + 6.0), (-L * 0.40, 0.6, dz + 0.45), rake=-10, side=1, belly=0.16)
    return None

TYPES = {
    'steamer':  lambda r: steamer(r),
    'cargo':    lambda r: steamer(r, L=9.2, B=1.4, D=0.95, cargo=True),
    'caspian':  lambda r: steamer(r, L=7.4, B=1.5, D=0.9, cargo=False, small=True),
    'schooner': lambda r: dhow(r, L=7.4, B=1.6, D=0.75, schooner=True),
    'dhow':     lambda r: dhow(r, L=7.0, B=1.7, D=0.8),
    'felucca':  lambda r: felucca(r),
}

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

for name, build in TYPES.items():
    if ONLY and name not in ONLY: continue
    sc, cam = reset()
    MATS.clear()
    root = bpy.data.objects.new(name, None); sc.collection.objects.link(root)
    ftop = build(root)
    sea = bpy.data.objects['sea']
    parts = [o for o in sc.objects if o.parent == root]
    meta = {'res': RES, 'frames': [{} for _ in range(HEADINGS)]}
    for i in [int(k) for k in os.environ['FRAMES'].split(',')] if os.environ.get('FRAMES') else range(HEADINGS):
        # clockwise on the map = clockwise seen from above = negative turn about z
        root.rotation_euler = (0, 0, -math.radians(i * 360 / HEADINGS))
        bpy.context.view_layer.update()
        fr = {}
        if ftop:
            M = root.matrix_world
            def px(p):
                v = world_to_camera_view(sc, cam, M @ Vector(p))
                return [round(v.x * RES, 1), round((1 - v.y) * RES, 1)]
            fr['funnel'] = px(ftop)
            fr['aft'] = px((ftop[0] - 2.6, 0, ftop[2] + 0.9))
        meta['frames'][i] = fr
        # the ship alone
        sea.hide_render = True
        for o in parts: o.visible_camera = True
        render(os.path.join(OUT, f'{name}-{i:02d}.png'))
        # its shadow on the water alone (cheaper: fewer samples)
        sea.hide_render = False
        for o in parts: o.visible_camera = False
        sc.cycles.samples = 12
        render(os.path.join(OUT, f'{name}-{i:02d}-sh.png'))
        sc.cycles.samples = SAMPLES
    with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
        json.dump(meta, f)
    print('done', name, flush=True)
