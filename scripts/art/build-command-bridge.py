"""Author the STAM bridge kit in Blender; export the editable, real geometry.

Run from the repository root:
  blender -b --python scripts/art/build-command-bridge.py
Optional: STAM_BRIDGE_BLEND=/absolute/path/command-bridge.blend saves the source.
Coordinates in this file use the app's Y-up metre system. No third-party models.
"""
import bpy
import math
import os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'apps/control-room/src/assets/bridge/command-bridge.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
mesh_cache = {}
groups = {}

def xyz(p):
    return (p[0], -p[2], p[1])

def color(hex):
    values = [int(hex[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values)

def material(name, hex, metal=0, rough=.4, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color(hex), 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emission:
        p.inputs['Emission Color'].default_value = (*color(hex), 1)
        p.inputs['Emission Strength'].default_value = emission
    return mat

M = {
    'hull': material('STAM / ceramic graphite', '#25333d', .62, .32),
    'panel': material('STAM / satin titanium', '#40515e', .72, .31),
    'edge': material('STAM / machined edges', '#8b969c', .88, .23),
    'black': material('STAM / recess', '#080f16', .12, .7),
    'bronze': material('STAM / champagne alloy', '#a08c6c', .78, .3),
    'rubber': material('STAM / upholstery', '#18232c', .03, .84),
    'floor': material('STAM / honed deck', '#29373f', .6, .35),
    'white': material('STAM / ceramic marking', '#929f9f', .1, .6),
    'cyan': material('STAM / cool light', '#8ad6e5', .1, .3, 2.2),
    'warm': material('STAM / warm light', '#ecd1aa', .05, .4, 2),
    'screen': material('STAM / auxiliary display', '#143b4b', .1, .35, .7),
}

def group(name, station=None):
    g = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(g)
    if station:
        g['station'] = station
    groups[name] = g
    return g

room = group('Architecture')
table = group('Navigation pedestal', 'map')

def finish(obj, name, mat, parent, bevel=0):
    obj.name = name
    obj.data.materials.append(M[mat])
    if bevel:
        mod = obj.modifiers.new('Machined edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 3 if bevel >= .02 else 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:
        p.use_smooth = True
    mod = obj.modifiers.new('Face weighted normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.parent = parent
    return obj

def instance(mesh, name, loc, parent, yaw=0):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(loc)
    obj.rotation_euler.z = yaw
    obj.parent = parent
    return obj

def box(name, size, loc, mat='hull', parent=room, bevel=.025, yaw=0):
    key = ('box', tuple(size), mat, bevel)
    if key not in mesh_cache:
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj = bpy.context.object
        obj.scale = (size[0], size[2], size[1])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, name, mat, parent, min(bevel, min(size) * .24))
        mesh_cache[key] = obj.data
        obj.location = xyz(loc)
        obj.rotation_euler.z = yaw
        return obj
    return instance(mesh_cache[key], name, loc, parent, yaw)

def cyl(name, radius, height, loc, mat='hull', parent=room, vertices=64, bevel=.015):
    key = ('cyl', radius, height, mat, vertices, bevel)
    if key not in mesh_cache:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=height)
        obj = finish(bpy.context.object, name, mat, parent, bevel)
        mesh_cache[key] = obj.data
        obj.location = xyz(loc)
        return obj
    return instance(mesh_cache[key], name, loc, parent)

def mesh(name, verts, faces, mat, parent=room, bevel=.015):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(v) for v in verts], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    return finish(obj, name, mat, parent, bevel)

def sector(name, inner, outer, bottom, top, a, b, mat, parent=table, steps=24):
    verts, faces = [], []
    for i in range(steps + 1):
        t = a + (b - a) * i / steps
        for r, y in [(inner, bottom), (outer, bottom), (outer, top), (inner, top)]:
            verts.append((math.sin(t) * r, y, math.cos(t) * r))
        if i:
            for j in range(4):
                k = (i-1)*4+j; n = (i-1)*4+(j+1)%4
                faces.append((k, n, n+4, k+4))
    faces.extend([(3, 2, 1, 0), (steps*4, steps*4+1, steps*4+2, steps*4+3)])
    return mesh(name, verts, [tuple(reversed(face)) for face in faces], mat, parent, .006)

def beam(name, a, b, width, depth, mat='panel'):
    start, end = Vector(xyz(a)), Vector(xyz(b))
    obj = box(name, (width, (end-start).length, depth), (0, 0, 0), mat)
    obj.location = (start+end)/2
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (end-start).to_track_quat('Z', 'Y')
    return obj

def label(text, loc, size=.12, parent=room, yaw=0, flat=False, mat='white'):
    curve = bpy.data.curves.new(text, 'FONT')
    curve.body, curve.size, curve.extrude = text, size, .0007
    curve.align_x = 'CENTER'
    curve.space_character = 1.15
    obj = bpy.data.objects.new(text, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(loc)
    obj.rotation_euler = (0 if flat else math.pi/2, 0, yaw)
    obj.parent = parent
    curve.materials.append(M[mat])
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj

# Deck: real panel edges and recessed expansion joints, not a drawn grid.
box('Subfloor', (25.4, .18, 24.8), (0, -.14, 1.2), 'black')
for x in range(-12, 13, 2):
    for z in range(-10, 14, 2):
        box('Deck plate', (1.972, .06, 1.972), (x, -.04, z), 'floor', bevel=.009)
for side in [-1, 1]:
    box('Service channel', (.34, .025, 23), (side*9.3, .003, 1.0), 'black', bevel=.005)
    for z in range(-9, 13, 2):
        box('Deck channel inset', (.19, .012, 1.45), (side*9.3, .016, z), 'panel', bevel=.004)
        box('Wayfinding light', (.035, .016, .35), (side*9.3, .025, z-.58), 'cyan', bevel=.004)
        for x in [-.08, .08]:
            cyl('Deck fastener', .018, .009, (side*9.3+x, .025, z+.53), 'edge', vertices=8, bevel=.002)
for i in range(36):
    a = i*math.tau/36
    if math.sin(a) < -.7: continue
    sector('Pedestal apron', 3.72, 4.05, -.003, .025, a+.015, a+math.tau/36-.015, 'panel', room, 3)
    sector('Inset navigation guide', 4.08, 4.10, .005, .015, a+.03, a+.13, 'warm', room, 3)
label('STAM  /  COMMAND BRIDGE', (0, .008, 7), .23, flat=True)
label('NAVIGATION  /  02', (0, .009, 4.7), .11, flat=True)

# Layered drum and replaceable radial modules. Stay within the approved radius.
cyl('Lower floating plinth', 2.88, .18, (0, .15, 0), 'black', table, 128, .04)
cyl('Pedestal load structure', 3.13, .62, (0, .5, 0), 'hull', table, 128, .035)
for i in range(24):
    a, b = i*math.tau/24, (i+1)*math.tau/24
    sector('Machined access panel', 3.12, 3.25, .29, .78, a+.018, b-.018, 'panel', steps=4)
    sector('Inset service recess', 3.247, 3.259, .4, .65, a+.045, b-.045, 'black', steps=4)
    sector('Panel top edging', 3.254, 3.273, .7, .72, a+.035, b-.035, 'bronze', steps=4)
    sector('Undercut lip', 3.1, 3.31, .21, .27, a+.01, b-.01, 'edge', steps=4)
    sector('Underside light diffuser', 2.96, 3.08, .19, .2, a+.025, b-.025, 'warm', steps=4)
    for da in [.04, .22]:
        t = a+da
        bolt = cyl('Access panel lock', .025, .016, (math.sin(t)*3.265, .56, math.cos(t)*3.265), 'edge', table, 8, .003)
        bolt.rotation_euler = (math.pi/2, 0, -t)
    for j in range(5):
        t = a+.07+j*.028
        fin = box('Vent cooling fin', (.011, .16, .02), (math.sin(t)*3.269, .52, math.cos(t)*3.269), 'panel', table, .002, t)
sector('Broad tabletop chamfer', 2.97, 3.38, .83, 1.035, 0, math.tau, 'edge', steps=128)
sector('Upper graphite rim', 2.97, 3.33, 1.025, 1.07, 0, math.tau, 'hull', steps=128)
sector('Navigation perimeter lamp', 2.96, 2.98, 1.076, 1.082, 0, math.tau, 'cyan', steps=128)
cyl('Hologram projection glass backing', 2.955, .06, (0, 1.02, 0), 'black', table, 128, .015)
for i in range(72):
    a = i*math.tau/72
    sector('Precision index graduation', 3.09, 3.19 if i%6 == 0 else 3.145, 1.071, 1.075, a-.0015, a+.0015, 'white', steps=1)
for i in range(8):
    a = i*math.tau/8
    cyl('Projector well', .072, .02, (math.sin(a)*2.8, 1.065, math.cos(a)*2.8), 'edge', table, 24, .004)
    cyl('Projector optical lens', .051, .022, (math.sin(a)*2.8, 1.071, math.cos(a)*2.8), 'cyan', table, 24, .004)

# Structural ribs: dark recesses, inset bright edges and bolted footings.
for side in [-1, 1]:
    box('Outer wall', (.32, 8.5, 24.5), (side*12.45, 4.15, 1.1), 'black')
    for z in [-9, -5, -1, 3, 7, 11]:
        box('Lower wall cassette', (.16, 3.35, 3.82), (side*12.19, 1.88, z), 'hull', bevel=.06)
        box('Acoustic wall insert', (.035, 2.65, 2.9), (side*12.085, 2.05, z), 'black', bevel=.015)
        for j in range(8):
            box('Wall ribbed insert', (.045, 2.4, .018), (side*12.055, 2.05, z-1.25+j*.35), 'panel', bevel=.003)
        box('Upper wall cassette', (.18, 2.75, 3.82), (side*12.18, 6.8, z), 'panel', bevel=.055)
    box('Upper service balcony', (2.4, .3, 23), (side*11.3, 4.25, 1), 'hull')
    box('Balcony underside inset', (2.3, .12, 22.9), (side*11.25, 4.03, 1), 'black')
    box('Balcony inner fascia', (.18, .34, 23), (side*10.03, 4.18, 1), 'panel')
    box('Balcony lower diffuser', (.06, .02, 22.5), (side*10.02, 3.98, 1), 'warm', bevel=.004)
    for z in [-8.8, -3, 2.8, 8.6]:
        beam('Structural upright', (side*11.72, .12, z), (side*11.45, 4.75, z), .54, .75)
        beam('Roof haunch', (side*11.45, 4.75, z), (side*8.8, 8.05, z), .57, .75)
        beam('Upright shadow inset', (side*11.4, .55, z+.395), (side*11.16, 4.35, z+.395), .12, .025, 'black')
        beam('Upright inset light', (side*11.36, .65, z+.415), (side*11.13, 4.25, z+.415), .028, .016, 'warm')
        box('Rib foot bracket', (.85, .19, 1.15), (side*11.72, .1, z), 'hull')
        for dz in [-.4, .4]:
            cyl('Rib floor anchor', .055, .018, (side*11.72, .205, z+dz), 'edge', vertices=8, bevel=.005)
    # Slim safety rail, no heavy line cutting across the panorama.
    for z in range(-9, 13, 3):
        box('Balcony rail post', (.04, .92, .04), (side*10.05, 4.82, z), 'edge', bevel=.004)
    box('Balcony handrail', (.07, .045, 22.1), (side*10.05, 5.3, 1), 'edge', bevel=.008)
    for z in [-7, 1, 9]:
        box('Service cabinet', (.32, 1.4, 1.75), (side*11.92, 1.75, z), 'panel')
        box('Cabinet recess', (.035, 1.1, 1.43), (side*11.73, 1.75, z), 'black', bevel=.01)
        for j in range(4):
            box('Cabinet slot', (.045, .045, 1.1), (side*11.7, 1.44+j*.18, z), 'screen', bevel=.004)

# Ceiling coffer and suspended halo; mechanical housings instead of floating torus.
box('Ceiling shell', (25.2, .3, 24.7), (0, 8.36, 1.15), 'black')
for x in range(-8, 9, 4):
    for z in range(-8, 13, 4):
        box('Ceiling cassette', (3.86, .14, 3.86), (x, 8.15, z), 'hull')
        box('Ceiling recessed inset', (3.35, .045, 3.3), (x, 8.055, z), 'black', bevel=.012)
for z in [-8.8, -3, 2.8, 8.6]:
    box('Ceiling crossmember', (18, .25, .67), (0, 7.94, z), 'panel')
    for side in [-1, 1]:
        box('Ceiling light housing', (4.9, .12, .25), (side*5.7, 7.76, z+.18), 'black')
        box('Ceiling diffused luminaire', (4.7, .012, .105), (side*5.7, 7.69, z+.18), 'warm', bevel=.008)
for i in range(16):
    a, b = i*math.tau/16, (i+1)*math.tau/16
    sector('Suspended halo cassette', 3.62, 4.26, 7.04, 7.32, a+.009, b-.009, 'hull', room, 8)
    sector('Halo outer machined edge', 4.25, 4.29, 7.08, 7.22, a+.012, b-.012, 'edge', room, 8)
    sector('Halo warm downlight', 3.8, 3.95, 7.025, 7.04, a+.03, b-.03, 'warm', room, 8)
    sector('Halo inner reveal', 3.62, 3.65, 7.08, 7.27, a+.02, b-.02, 'bronze', room, 8)
for a in [math.pi/4, math.pi*.75, math.pi*1.25, math.pi*1.75]:
    box('Halo suspension', (.13, .83, .13), (math.sin(a)*4.0, 7.72, math.cos(a)*4.0), 'panel')

# Wide unobstructed observation window. Central pane is intentionally largest.
for x in [-12, -8.8, -4.6, 4.6, 8.8, 12]:
    box('Window pressure frame', (.17, 8.0, .58), (x, 4.1, -10.55), 'black')
    box('Window machined edge', (.025, 7.7, .045), (x-.065, 4.1, -10.23), 'edge', bevel=.004)
    for y in [.8, 2.8, 6.5]:
        box('Frame coupling', (.23, .21, .65), (x, y, -10.55), 'hull')
for y in [.3, 7.95]:
    box('Window horizontal pressure beam', (25.1, .36, .65), (0, y, -10.55), 'hull')
box('Observation sill', (25.1, .56, 1.0), (0, .32, -10.05), 'hull')
box('Sill satin cap', (24.8, .045, .85), (0, .625, -10.0), 'panel', bevel=.012)
box('Sill inset cyan light', (24.3, .018, .025), (0, .65, -9.62), 'cyan', bevel=.004)

# Back wall remains finished when the map camera travels around to its console.
box('Rear bulkhead', (25, 8.4, .4), (0, 4.1, 13.6), 'black')
for side in [-1, 1]:
    for x in [4.4, 7.8, 11.2]:
        box('Rear wall cassette', (3.18, 6.9, .2), (side*x, 3.65, 13.3), 'hull', bevel=.045)
        box('Rear wall reveal', (2.85, 5.8, .04), (side*x, 3.65, 13.17), 'black', bevel=.02)
    box('Door surround', (.32, 5.4, .45), (side*2.55, 2.7, 13.1), 'panel')
    box('Door light reveal', (.025, 4.85, .035), (side*2.34, 2.52, 12.85), 'warm', bevel=.003)
    box('Door leaf', (2.25, 4.95, .18), (side*1.135, 2.52, 13.22), 'panel')
    box('Door leaf inset', (1.65, 3.9, .04), (side*1.14, 2.6, 13.1), 'hull')
box('Door header', (5.4, .35, .45), (0, 5.4, 13.1), 'panel')
label('STAM  /  FLIGHT OPERATIONS', (0, 5.8, 13.03), .24, yaw=math.pi)

# Console shells have a true bezel opening; native screens fit these dimensions.
for station, sx, sz, yaw, width, height, screen_y in [
    ('mission', -7, .4, .65, 3.45, 1.98, 1.75),
    ('operations', 7, .4, -.65, 3.45, 1.98, 1.75),
    ('map', 0, -4.05, math.pi, 2.6, 1.05, 1.45),
]:
    g = group(station.title()+' console', station)
    g.location, g.rotation_euler.z = xyz((sx, 0, sz)), yaw
    box('Monitor rear chassis', (width, height, .17), (0, screen_y, -.035), 'hull', g, .065)
    box('Display recessed bed', (width-.16, height-.13, .025), (0, screen_y, .065), 'black', g, .025)
    for side in [-1, 1]:
        box('Bezel side edge', (.035, height-.04, .025), (side*(width/2-.035), screen_y, .065), 'edge', g, .006)
        box('Monitor rear stiffener', (.16, height-.2, .14), (side*(width/2-.3), screen_y, -.15), 'panel', g)
        box('Screen corner lock', (.055, .055, .025), (side*(width/2-.075), screen_y+height/2-.08, .08), 'bronze', g, .006)
    box('Bezel top edge', (width-.1, .025, .028), (0, screen_y+height/2-.03, .07), 'edge', g, .004)
    box('Monitor status strip', (.36, .014, .02), (width/2-.35, screen_y-height/2+.04, .082), 'cyan', g, .003)
    for j in range(12):
        box('Rear chassis exhaust', (.055, .22, .018), (-width/2+.4+j*(width-.8)/12, screen_y+.18, -.13), 'black', g, .003)
    desk_w = width+.12
    box('Console work surface', (desk_w, .16, 1.03), (0, .94, .43), 'hull', g, .06)
    box('Console front trim', (desk_w-.12, .035, .035), (0, .94, .95), 'bronze', g, .006)
    if station != 'map':
        for side in [-1, 1]:
            box('Console load bearing foot', (.22, .79, .67), (side*(width/2-.4), .43, .18), 'panel', g, .04)
            box('Console lower footing', (.5, .09, .92), (side*(width/2-.4), .065, .3), 'black', g, .03)
        box('Console service housing', (1.85, .52, .45), (0, .58, -.09), 'hull', g)
    else:
        for side in [-1, 1]:
            box('Pedestal cantilever bracket', (.18, .3, 1.25), (side*.8, .72, -.5), 'panel', g)
    box('Touch deck recess', (1.58, .025, .49), (0, 1.032, .57), 'black', g, .025)
    box('Auxiliary touch glass', (.64, .012, .32), (.39, 1.05, .57), 'screen', g, .012)
    for row in range(3):
        for col in range(7):
            box('Tactile key', (.062, .016, .065), (-.65+col*.085, 1.055, .44+row*.08), 'panel', g, .007)
    for side in [-1, 1]:
        cyl('Encoder socket', .07, .014, (side*(width/2-.24), 1.035, .55), 'black', g, 24, .003)
        cyl('Rotary encoder', .048, .048, (side*(width/2-.24), 1.057, .55), 'edge', g, 24, .005)
    # Ergonomic occupied chair; human appearance is a separate upcoming asset.
    cyl('Seat floor mount', .3, .055, (0, .03, 1.8), 'black', g)
    cyl('Seat piston', .105, .46, (0, .28, 1.8), 'edge', g)
    box('Seat pan shell', (.74, .14, .73), (0, .56, 1.8), 'panel', g, .06)
    box('Seat cushion', (.63, .12, .58), (0, .665, 1.76), 'rubber', g, .05)
    box('Seat back shell', (.69, .78, .18), (0, 1.05, 2.12), 'panel', g, .065)
    box('Seat back cushion', (.56, .62, .075), (0, 1.08, 2.0), 'rubber', g, .035)
    box('Seat head restraint', (.43, .23, .16), (0, 1.53, 2.11), 'rubber', g, .055)
    for side in [-1, 1]:
        box('Armrest support', (.065, .3, .25), (side*.4, .72, 1.87), 'panel', g)
        box('Padded armrest', (.12, .075, .55), (side*.4, .92, 1.8), 'rubber', g)
        for y in [.9, 1.04, 1.18]:
            box('Seat rear vent', (.38, .018, .016), (0, y, 2.22), 'black', g, .003)

# Meshes are already bevelled; join by semantic group/material for a small draw budget.
bpy.ops.object.select_all(action='DESELECT')
for parent in list(groups.values()):
    for mat in M.values():
        objects = [o for o in list(parent.children) if o.type == 'MESH' and o.active_material == mat]
        if len(objects) < 2: continue
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        # Join writes into the active mesh. Keep cached geometry shared with
        # another console from acquiring this group's complete geometry.
        objects[0].data = objects[0].data.copy()
        bpy.ops.object.join()
        bpy.context.object.name = parent.name+' / '+mat.name
        bpy.ops.object.select_all(action='DESELECT')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB', export_extras=True, export_yup=True, export_animations=False)
if os.environ.get('STAM_BRIDGE_BLEND'):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ['STAM_BRIDGE_BLEND'])
triangles = sum(len(o.data.loop_triangles) for o in bpy.data.objects if o.type == 'MESH')
print('STAM_BRIDGE_EXPORT', OUTPUT, OUTPUT.stat().st_size, 'bytes', triangles, 'triangles')
