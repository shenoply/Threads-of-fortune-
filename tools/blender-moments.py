# Three small moments at the stall, modelled and rendered in Blender (bpy as a Python module):
#   tea    a brass teapot comes in, pours a thin stream into a tulip glass from a little height, and goes;
#          the glass of amber tea stays (the last frame is the glass alone)
#   coins  a few coins dropped on the counter at a sale, settling with a wobble
#   lamp   a small brass lantern hung from the stall, its flame moving (a loop)
#
#   <blender-venv>/bin/python tools/blender-moments.py <out-dir> [tea coins lamp]
#   python3 tools/moments-sheet.py <out-dir>      (painterly post-pass, steam, WebP sprite sheets)
#
# Each frame is a transparent PNG; the counter is a shadow catcher, so the shadow on it comes along in
# the alpha. The light is the stall painting's: warm, from high at the front left. Kept small (a few
# hundred pixels, 32 samples, denoised) so it renders in a few minutes on a CPU.
import bpy, bmesh, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
OUT = argv[0] if argv else 'art-src/moments/render'
ONLY = argv[1:] or ['tea', 'coins', 'lamp']
os.makedirs(OUT, exist_ok=True)
SAMPLES = 32
# MOMENT_FRAMES=3,13 renders only those frames (for trying a change)
FR = {int(x) for x in os.environ.get('MOMENT_FRAMES', '').split(',') if x.strip()}


def lin(c):
    """colours are written as sRGB, as picked from the painting"""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def reset(w, h, ortho, elev, target, sun=3.0, world=0.5, world_col=(0.62, 0.52, 0.42)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.transmission_bounces = 6
    sc.cycles.transparent_max_bounces = 8
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    e = math.radians(elev)
    d = Vector((0, math.cos(e), -math.sin(e)))
    cam.location = Vector(target) - d * 3
    cam.rotation_euler = (math.radians(90 - elev), 0, 0)
    sc.collection.objects.link(cam); sc.camera = cam
    if sun:
        key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN'))
        key.data.energy = sun; key.data.angle = math.radians(24); key.data.color = (1, 0.9, 0.76)
        # from high at the front left: the light travels right, back and down
        key.rotation_mode = 'QUATERNION'
        key.rotation_quaternion = Vector((0.55, 0.55, -0.75)).normalized().to_track_quat('-Z', 'Y')
        sc.collection.objects.link(key)
    wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes['Background']
    bg.inputs[0].default_value = (*world_col, 1); bg.inputs[1].default_value = world
    return sc


def counter():
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    p = bpy.context.active_object; p.name = 'counter'; p.is_shadow_catcher = True
    return p


MATS = {}


def mat(name, col, metal=0.0, rough=0.6, var=0.08, scale=60.0, alpha=False, transmission=0.0, ior=1.45, emit=0.0, emit_col=None, spec=None):
    """matte-leaning, with a gentle variation of tone; alpha: a Mix with Transparent whose factor fades it"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if spec is not None:
        b.inputs['Specular IOR Level'].default_value = spec
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
        b.inputs['IOR'].default_value = ior
    col = tuple(lin(c) for c in col)
    if var:
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 3
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (*(c * (1 - var) for c in col), 1)
        ramp.color_ramp.elements[1].color = (*(min(1, c * (1 + var)) for c in col), 1)
        ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[1].position = 0.7
        nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*col, 1)
    if emit:
        ec = tuple(lin(c) for c in (emit_col or col))
        b.inputs['Emission Color'].default_value = (*ec, 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha:
        out = nt.nodes['Material Output']
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader'); mix.name = 'fade'
        mix.inputs['Fac'].default_value = 1.0
        nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(b.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs['Surface'])
    MATS[name] = m
    return m


def clear_glass(see=0.975):
    """thin glass that lets what is inside show in its own colour: mostly a clear pass-through, with a
    glossy sheen and a faint rim (a transmission shader would make the tea itself see-through)"""
    m = bpy.data.materials.new('clearglass'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.9, 0.9, 0.86, 1); b.inputs['Roughness'].default_value = 0.08
    fr = nt.nodes.new('ShaderNodeLayerWeight'); fr.inputs['Blend'].default_value = 0.35
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    mp = nt.nodes.new('ShaderNodeMath'); mp.operation = 'MULTIPLY_ADD'
    # the share that is sheen, not clear: a little face on, more at the edges
    mp.inputs[1].default_value = 0.22; mp.inputs[2].default_value = 1 - see
    nt.links.new(fr.outputs['Facing'], mp.inputs[0]); nt.links.new(mp.outputs[0], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(b.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return m


def fade(mats, a):
    for m in mats:
        m.node_tree.nodes['fade'].inputs['Fac'].default_value = max(0.0, min(1.0, a))


def obj(name, bm, m, smooth=True, parent=None):
    if smooth:
        for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m)
    o.parent = parent
    return o


def lathe(name, prof, m, seg=40, parent=None):
    """a turned piece from a profile of (radius, height) points, spun round the Z axis"""
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=seg, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, m, parent=parent)


def tube(name, pts, radii, m, parent=None, res=8):
    """a bevelled curve through points, its thickness following radii (a spout, a handle, a stream)"""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = 1.0; cu.bevel_resolution = 4; cu.resolution_u = res; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p, r in zip(sp.bezier_points, pts, radii):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'; bp.radius = r
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m); o.parent = parent
    return o


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- tea
# a tulip glass (istikan): narrow waist, flared rim, thick foot
GLASS_OUT = [(0.0, 0.0), (0.0185, 0.0), (0.0195, 0.003), (0.0198, 0.012), (0.0172, 0.030), (0.0162, 0.040), (0.0185, 0.058), (0.0232, 0.076), (0.0245, 0.0815)]
GLASS_T = 0.0011
RIM = 0.0815


def r_in(z):
    """the glass's inner radius at a height"""
    pts = GLASS_OUT[1:]
    for (r0, z0), (r1, z1) in zip(pts, pts[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0) - GLASS_T
    return pts[-1][0] - GLASS_T


def glass(m):
    prof = list(GLASS_OUT) + [(GLASS_OUT[-1][0] - GLASS_T, RIM - 0.0004)]
    zs = [z for _, z in GLASS_OUT[::-1] if 0.007 < z < RIM]
    prof += [(r_in(z), z) for z in zs] + [(r_in(0.0065), 0.0065), (0.0, 0.0065)]
    return lathe('glass', prof, m, seg=48)


def liquid(h, m):
    if h <= 0.0068:
        return None
    zs = [0.0066] + [z for _, z in GLASS_OUT if 0.0066 < z < h] + [h]
    prof = [(0.0, 0.0066)] + [(r_in(z) - 0.0002, z) for z in zs] + [(0.0, h)]
    return lathe('tea', prof, m, seg=40)


def teapot(mats):
    """a brass berrad, its spout's tip at the parent empty's origin, pointing +X"""
    brass, dark = mats
    piv = bpy.data.objects.new('pivot', None); bpy.context.scene.collection.objects.link(piv)
    body = bpy.data.objects.new('pot', None); bpy.context.scene.collection.objects.link(body); body.parent = piv
    tip = Vector((0.115, 0, 0.118))
    body.location = -tip
    lathe('potbody', [(0.0, 0.0), (0.030, 0.0), (0.033, 0.003), (0.030, 0.007), (0.040, 0.014), (0.052, 0.032), (0.055, 0.050), (0.050, 0.070), (0.038, 0.086), (0.029, 0.096), (0.027, 0.104), (0.031, 0.107), (0.0, 0.107)], brass, parent=body)
    lathe('potlid', [(0.0, 0.106), (0.030, 0.106), (0.029, 0.110), (0.020, 0.122), (0.011, 0.136), (0.007, 0.146), (0.010, 0.150), (0.009, 0.156), (0.004, 0.160), (0.0075, 0.164), (0.0, 0.172)], brass, parent=body)
    lathe('potband', [(0.0, 0.040), (0.0558, 0.040), (0.0562, 0.046), (0.0, 0.046)], dark, parent=body)
    tube('spout', [(0.040, 0, 0.030), (0.068, 0, 0.050), (0.090, 0, 0.090), tip + Vector((-0.004, 0, -0.002))], [0.009, 0.0065, 0.0045, 0.0032], brass, parent=body)
    tube('handle', [(-0.034, 0, 0.090), (-0.070, 0, 0.098), (-0.078, 0, 0.060), (-0.048, 0, 0.026)], [0.0042, 0.0042, 0.0042, 0.0042], dark, parent=body)
    return piv


def stream(tip, end, m, upto=1.0, frm=0.0):
    """the tea from the spout to the glass: falls in a gentle arc, thinning"""
    tip, end = Vector(tip), Vector(end)
    pts = []
    for k in range(6):
        t = frm + (upto - frm) * k / 5
        x = tip.x + (end.x - tip.x) * t + 0.006 * math.sin(math.pi * t) * (1 - t)
        z = tip.z + (end.z - tip.z) * (t ** 1.6)
        pts.append((x, 0, z))
    return tube('stream', pts, [0.0019 - 0.0006 * (frm + (upto - frm) * k / 5) for k in range(6)], m, res=6)


def render_tea():
    W, H, OR = 208, 256, 0.40
    # glass at the origin, 66% across the frame; the frame's foot a little under the counter
    frames = 28
    amber = (0.62, 0.27, 0.04)
    for i in range(frames):
        if FR and i not in FR:
            continue
        reset(W, H, OR, 14, (-0.052, 0, 0.17))
        counter()
        gm = clear_glass()
        tm = mat('tea', (0.60, 0.30, 0.02), rough=0.3, var=0.05, scale=200, emit=0.1, emit_col=(0.85, 0.46, 0.04), spec=0.12)
        brass = mat('brass', (0.74, 0.55, 0.30), metal=1.0, rough=0.52, var=0.14, scale=90, alpha=True)
        dark = mat('brassd', (0.45, 0.31, 0.14), metal=1.0, rough=0.55, var=0.1, scale=90, alpha=True)
        sm = mat('stream', (0.80, 0.44, 0.06), rough=0.2, var=0, spec=0.2)
        glass(gm)
        # the timeline (12 frames a second)
        level = 0.0066 + (0.068 - 0.0066) * smooth(9, 18, i)
        liquid(level, tm)
        piv = teapot((brass, dark))
        # the spout's tip over the glass, raised while pouring, a touch left of centre
        come = smooth(0, 6, i); go = smooth(20, 26, i)
        lift = 0.055 * smooth(10, 14, i) * (1 - smooth(15, 18, i))
        tipz = 0.128 + lift
        off = Vector((-0.06, 0, 0.07)) * (1 - come) + Vector((-0.07, 0, 0.09)) * go
        tipv = Vector((-0.004, 0, tipz)) + off
        piv.location = tipv
        piv.scale = (0.85, 0.85, 0.85)
        tilt = 10 * come + 28 * smooth(5, 9, i) - 30 * smooth(17, 21, i)
        piv.rotation_euler = (0, math.radians(tilt), 0)
        fade((brass, dark), min(come * 1.3, 1 - go))
        surf = Vector((0.001, 0, level))
        if 8 <= i <= 18:
            upto = 0.5 if i == 8 else 1.0
            frm = 0.55 if i == 18 else 0.0
            stream(tipv, surf, sm, upto=upto, frm=frm)
        render(os.path.join(OUT, f'tea-{i:02d}.png'))


# ---------------------------------------------------------------- coins
def coin(name, m, holed=False, r=0.0105, t=0.0017):
    if holed:
        prof = [(0.0032, -t / 2), (r, -t / 2), (r + 0.0002, 0), (r, t / 2), (0.0032, t / 2), (0.0030, 0), (0.0032, -t / 2)]
    else:
        prof = [(0.0, -t / 2), (r, -t / 2), (r + 0.0002, 0), (r, t / 2), (0.0, t / 2)]
    o = lathe(name, prof, m, seg=36)
    o.rotation_mode = 'XYZ'
    return o


# each coin: where it lies, when it lands (frame), its own spin and rest angle, what it is
COINS = [
    dict(x=-0.006, y=0.004, land=3, spin=0.9, yaw=20, kind='silver'),
    dict(x=0.012, y=-0.006, land=7, spin=1.4, yaw=-35, kind='silver'),
    dict(x=-0.001, y=-0.012, land=11, spin=2.2, yaw=60, kind='bronze'),
    dict(x=0.000, y=0.002, land=14, spin=1.0, yaw=5, kind='gold', on=0),
]
COIN_LANDS = [c['land'] for c in COINS]


def render_coins():
    W, H, OR = 160, 128, 0.10
    frames = 22  # 24 a second
    for i in range(frames):
        if FR and i not in FR:
            continue
        reset(W, H, OR, 35, (0.003, 0, 0.031))
        counter()
        silver = mat('silver', (0.93, 0.91, 0.86), metal=1.0, rough=0.24, var=0.08, scale=400)
        bronze = mat('bronze', (0.80, 0.50, 0.26), metal=1.0, rough=0.3, var=0.1, scale=400)
        gold = mat('gold', (0.95, 0.74, 0.36), metal=1.0, rough=0.22, var=0.06, scale=400)
        for k, c in enumerate(COINS):
            df = i - c['land']
            o = coin(f'coin{k}', {'bronze': bronze, 'gold': gold}.get(c['kind'], silver), holed=c['kind'] == 'bronze')
            base = 0.00085 + (0.0017 if 'on' in c else 0)
            if df < -3:
                o.hide_render = True
                continue
            if df < 0:
                # falling, a little tumbled
                fall = (-df / 3) ** 2
                o.location = (c['x'] + 0.003 * fall, c['y'], base + 0.045 * fall)
                o.rotation_euler = (math.radians(35 * fall + 12), math.radians(20 * fall), math.radians(c['yaw']))
                continue
            # landed: a small hop, then a wobble that dies away as it settles flat
            hop = 0.004 * math.exp(-df * 1.3) * abs(math.sin(df * 1.6)) if df < 4 else 0.0
            amp = math.radians(16) * math.exp(-df * 0.28) * c['spin'] / 1.4
            ph = df * 1.25 * c['spin']
            tilt = amp * (1 if df < 14 else max(0, 1 - (df - 14) / 4))
            o.location = (c['x'], c['y'], base + hop + math.sin(abs(tilt)) * 0.0105)
            o.rotation_euler = (tilt * math.cos(ph), tilt * math.sin(ph), math.radians(c['yaw']) + ph * 0.15)
        render(os.path.join(OUT, f'coins-{i:02d}.png'))


# ---------------------------------------------------------------- lamp
def render_lamp():
    W, H, OR = 96, 256, 0.55
    frames = 8
    flick = [(1.0, 1.0, 0.0), (1.08, 1.05, 0.06), (0.94, 0.92, -0.04), (1.12, 1.1, 0.02), (1.02, 0.98, -0.07), (0.9, 0.9, 0.03), (1.06, 1.04, -0.02), (0.97, 0.95, 0.05)]
    for i in range(frames):
        if FR and i not in FR:
            continue
        sz, en, sk = flick[i]
        # dusk: only a little cool light from outside; the flame lights the brass
        reset(W, H, OR, 4, (0, 0, 0.275 - 0.012), sun=0.35, world=0.18, world_col=(0.42, 0.42, 0.55))
        brass = mat('brass', (0.80, 0.58, 0.28), metal=1.0, rough=0.4, var=0.12, scale=90)
        dark = mat('brassd', (0.40, 0.27, 0.11), metal=1.0, rough=0.5, var=0.1, scale=90)
        chim = mat('chimney', (0.98, 0.9, 0.78), rough=0.12, var=0, transmission=0.85, ior=1.45, emit=0.22, emit_col=(1.0, 0.62, 0.28))
        fl = mat('flame', (1.0, 0.72, 0.3), var=0, emit=18, emit_col=(1.0, 0.66, 0.26))
        core = mat('core', (1.0, 0.92, 0.7), var=0, emit=40, emit_col=(1.0, 0.9, 0.65))
        oil = mat('oil', (0.5, 0.25, 0.06), rough=0.2, var=0, transmission=0.5)
        # base, font of oil, burner
        lathe('base', [(0.0, 0.0), (0.030, 0.0), (0.040, 0.006), (0.042, 0.014), (0.036, 0.020), (0.034, 0.024), (0.0, 0.024)], brass)
        lathe('burner', [(0.0, 0.024), (0.016, 0.024), (0.018, 0.030), (0.012, 0.036), (0.0, 0.036)], dark)
        lathe('oilglass', [(0.0, 0.006), (0.028, 0.006), (0.0, 0.006)], oil)
        # glass chimney, bulged
        prof = [(0.020, 0.034), (0.030, 0.050), (0.035, 0.080), (0.031, 0.110), (0.022, 0.128), (0.020, 0.140)]
        inner = [(r - 0.0012, z) for r, z in prof[::-1]]
        lathe('chimney', prof + inner + [prof[0]], chim, seg=40)
        # cage: four brass wires, a cap and a ring
        for a in range(4):
            ang = a * math.tau / 4 + math.radians(20)
            pts = [(math.cos(ang) * r * 1.12, math.sin(ang) * r * 1.12, z) for r, z in prof]
            tube(f'wire{a}', pts, [0.0012] * len(pts), dark)
        lathe('cap', [(0.0, 0.138), (0.034, 0.138), (0.036, 0.142), (0.026, 0.154), (0.012, 0.166), (0.010, 0.172), (0.0, 0.172)], brass)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.010, minor_radius=0.0018, location=(0, 0, 0.183), rotation=(math.radians(90), 0, 0))
        bpy.context.active_object.data.materials.append(brass)
        # the chain up out of the frame
        z = 0.196; k = 0
        while z < 0.62:
            bpy.ops.mesh.primitive_torus_add(major_radius=0.0058, minor_radius=0.0013, location=(0, 0, z), rotation=(math.radians(90), 0, math.radians(90 * (k % 2))))
            o = bpy.context.active_object
            o.scale = (0.75, 1, 1.5) if k % 2 == 0 else (1, 0.75, 1.5)
            o.data.materials.append(dark)
            z += 0.0135; k += 1
        # the flame: a soft teardrop with a hot core
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=1)
        for v in bm.verts:
            t = (v.co.z + 1) / 2
            w = 0.0085 * (1 - t ** 1.8) ** 0.8 + 0.0005
            v.co.x *= w; v.co.y *= w; v.co.z = 0.036 + 0.002 + t * 0.034 * sz
            v.co.x += sk * (t ** 2) * 0.006
        obj('flame', bm, fl)
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1)
        for v in bm.verts:
            t = (v.co.z + 1) / 2
            w = 0.0038 * (1 - t ** 2) ** 0.8 + 0.0002
            v.co.x *= w; v.co.y *= w; v.co.z = 0.038 + t * 0.015 * sz
        obj('core', bm, core)
        pl = bpy.data.objects.new('glow', bpy.data.lights.new('glow', 'POINT'))
        pl.data.energy = 5.0 * en; pl.data.color = (1, 0.68, 0.32); pl.data.shadow_soft_size = 0.004
        pl.location = (0, -0.002, 0.050); bpy.context.scene.collection.objects.link(pl)
        render(os.path.join(OUT, f'lamp-{i:02d}.png'))


for what in ONLY:
    {'tea': render_tea, 'coins': render_coins, 'lamp': render_lamp}[what]()
print('done')
