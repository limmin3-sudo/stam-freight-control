"""Bake local contact occlusion into bridge vertices, then export glTF COLOR_0.

blender -b /path/to/command-bridge.blend --python scripts/art/bake-command-bridge.py
The native Blender file stays editable. No runtime AO pass or paid service.
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.render.bake.target = 'VERTEX_COLORS'
scene.render.bake.use_clear = True
scene.render.bake.use_selected_to_active = False
objects = [o for o in scene.objects if o.type == 'MESH' and o.active_material and o.active_material.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value == 0]
materials = {o.active_material for o in objects}
restore = []
for material in materials:
    tree = material.node_tree
    output = tree.nodes.get('Material Output')
    previous = output.inputs['Surface'].links[0].from_socket
    ao = tree.nodes.new('ShaderNodeAmbientOcclusion')
    ao.samples = 16
    ao.inputs['Distance'].default_value = .6
    emit = tree.nodes.new('ShaderNodeEmission')
    tree.links.new(ao.outputs['Color'], emit.inputs['Color'])
    tree.links.new(emit.outputs[0], output.inputs['Surface'])
    restore.append((tree, previous, output, ao, emit))
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    if obj.data.users > 1: obj.data = obj.data.copy()
    colors = obj.data.color_attributes.get('BridgeOcclusion') or obj.data.color_attributes.new(name='BridgeOcclusion', type='BYTE_COLOR', domain='CORNER')
    obj.data.color_attributes.active_color = colors
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.bake(type='EMIT')
for tree, previous, output, ao, emit in restore:
    tree.links.new(previous, output.inputs['Surface'])
    tree.nodes.remove(ao)
    tree.nodes.remove(emit)
output = ROOT / 'apps/control-room/src/assets/bridge/command-bridge.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_extras=True, export_yup=True, export_animations=False, export_vertex_color='ACTIVE')
if bpy.data.filepath: bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('STAM_BRIDGE_OCCLUSION', len(objects), 'meshes', output.stat().st_size, 'bytes')
