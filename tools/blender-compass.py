# Renders the map compass in three layers with the same centre: base (paper disc + 16-point rose),
# needle (alone, pointing up), rim (brass ring alone). 1024x1024, transparent background.
import bpy, bmesh, math, sys, os
OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.render.resolution_x = sc.render.resolution_y = 1024
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.1
    cam.location = (0, 0, 10); sc.collection.objects.link(cam); sc.camera = cam
    # warm key light from the north-west, like the map, plus soft fill
    key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN'))
    key.data.energy = 3.2; key.data.angle = math.radians(8); key.data.color = (1, 0.95, 0.85)
    key.rotation_euler = (math.radians(40), 0, math.radians(135)); sc.collection.objects.link(key)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.5, 0.45, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    return sc

def mat(name, col, metal=0.0, rough=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    return m

def obj_from_bm(name, bm, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m); return o

def star_point(angle, length, width, z0, h, m_light, m_dark, name):
    # one point of the rose as two facets (light and dark half), raised along the ridge
    c = math.cos(angle); s = math.sin(angle)
    tip = (c * length, s * length, z0)
    ridge0 = (0, 0, z0 + h)
    for side, mm in ((1, m_light), (-1, m_dark)):
        a2 = angle + side * math.pi / 2
        base = (math.cos(a2) * width, math.sin(a2) * width, z0)
        bm = bmesh.new()
        v = [bm.verts.new(p) for p in (ridge0, tip, base)]
        bm.faces.new(v if side == 1 else (v[0], v[2], v[1]))
        obj_from_bm(f'{name}{side}', bm, mm)

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

BRASS = (0.66, 0.46, 0.19); INK = (0.09, 0.07, 0.06); PAPER = (0.86, 0.78, 0.6); RED = (0.38, 0.07, 0.05); STEEL = (0.07, 0.09, 0.14)

# ---- base: paper disc + rose ----
reset()
paper = mat('paper', PAPER, 0, 0.9)
nt = paper.node_tree; nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 7; nz.inputs['Detail'].default_value = 12
ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (0.62, 0.5, 0.33, 1); ramp.color_ramp.elements[1].color = (0.84, 0.74, 0.55, 1)
nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, radius=0.9, segments=128)
obj_from_bm('disc', bm, paper)
inkm = mat('ink', INK, 0, 0.7)
# fine ink rings
for r, t in ((0.862, 0.005), (0.80, 0.003), (0.555, 0.003), (0.545, 0.0015)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=t, major_segments=200, minor_segments=6)
    o = bpy.context.active_object; o.scale = (1, 1, 0.2); o.data.materials.append(inkm)
# ticks on the outer band (32)
for i in range(64):
    a = i * math.tau / 64; long = 0.05 if i % 4 == 0 else 0.025
    bm = bmesh.new()
    w = 0.004
    r0, r1 = 0.86 - long, 0.86
    c, s = math.cos(a), math.sin(a); px, py = -s * w, c * w
    v = [bm.verts.new((c * r0 + px, s * r0 + py, 0.002)), bm.verts.new((c * r1 + px, s * r1 + py, 0.002)),
         bm.verts.new((c * r1 - px, s * r1 - py, 0.002)), bm.verts.new((c * r0 - px, s * r0 - py, 0.002))]
    bm.faces.new(v); obj_from_bm('tick', bm, inkm)
light = mat('rose_light', (0.8, 0.7, 0.5), 0, 0.7)
dark = mat('rose_dark', (0.2, 0.15, 0.1), 0, 0.7)
brasslight = mat('rose_brass', BRASS, 0.9, 0.35)
brassdark = mat('rose_brassd', (0.42, 0.28, 0.1), 0.9, 0.4)
# 16 points: 4 cardinal (long, brass), 4 intercardinal, 8 minor
for i in range(16):
    a = math.pi / 2 - i * math.tau / 16
    if i % 4 == 0:   star_point(a, 0.78, 0.11, 0.004, 0.05, brasslight, brassdark, f'c{i}')
    elif i % 2 == 0: star_point(a, 0.58, 0.085, 0.003, 0.035, light, dark, f'i{i}')
    else:            star_point(a, 0.42, 0.06, 0.002, 0.02, light, dark, f'm{i}')
render(os.path.join(OUT, 'K-compass-base.png'))

# ---- needle alone ----
reset()
red = mat('red', RED, 0.3, 0.35); steel = mat('steel', STEEL, 0.85, 0.25); brass = mat('brass', BRASS, 1, 0.3)
def needle_half(sign, m):
    for side, shade in ((1, 1.0), (-1, 0.6)):
        bm = bmesh.new()
        tip = (0, sign * 0.74, 0.06); ridge = (0, 0, 0.09); wing = (side * 0.055, 0, 0.06)
        v = [bm.verts.new(p) for p in (ridge, tip, wing)]
        bm.faces.new(v if side * sign > 0 else (v[0], v[2], v[1]))
        mm = m.copy(); bsdf = mm.node_tree.nodes['Principled BSDF']
        col = bsdf.inputs['Base Color'].default_value; bsdf.inputs['Base Color'].default_value = (col[0] * shade, col[1] * shade, col[2] * shade, 1)
        obj_from_bm('n', bm, mm)
needle_half(1, red); needle_half(-1, steel)
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.05, radius2=0.035, depth=0.03)
o = obj_from_bm('pivot', bm, brass); o.location = (0, 0, 0.1)
render(os.path.join(OUT, 'K-compass-needle.png'))

# ---- rim alone ----
reset()
brass = mat('brass', BRASS, 1, 0.28)
bpy.ops.mesh.primitive_torus_add(major_radius=0.94, minor_radius=0.055, major_segments=192, minor_segments=32)
r = bpy.context.active_object; r.data.materials.append(brass); r.scale = (1, 1, 0.6)
bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_torus_add(major_radius=0.875, minor_radius=0.012, major_segments=192, minor_segments=16)
r2 = bpy.context.active_object; r2.data.materials.append(brass); bpy.ops.object.shade_smooth()
# north lug
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.06, location=(0, 0.99, 0))
bpy.context.active_object.data.materials.append(brass)
render(os.path.join(OUT, 'K-compass-rim.png'))
print('done')
