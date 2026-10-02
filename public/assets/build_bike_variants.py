"""
Aboki Riders — bike variant builder
Blender 3.6+ / 4.x

Usage:
  blender --background --python public/assets/build_bike_variants.py -- \
    --source public/assets/dirt-bike.glb --output-dir public/assets/generated-bikes

The source bike remains untouched. The script imports it, creates a handful
of original Aboki Riders livery variants, and writes one GLB per variant.

The fitting markers are named AR_Mount_* and mirror the runtime rider-bicycle
mount solver. They are convenience metadata only; the game still has geometry
fallbacks so new bikes do not require manual marker authoring.
"""

import argparse
import os
import re
import bpy
from mathutils import Vector


PALETTES = [
    ("lagos_green_gold", (0.035, 0.43, 0.28, 1), (0.92, 0.67, 0.11, 1)),
    ("lagos_red_black", (0.55, 0.08, 0.07, 1), (0.06, 0.07, 0.08, 1)),
    ("sunset_orange", (0.91, 0.29, 0.06, 1), (0.98, 0.74, 0.17, 1)),
    ("ocean_blue", (0.04, 0.28, 0.58, 1), (0.78, 0.86, 0.94, 1)),
    ("royal_purple", (0.37, 0.16, 0.63, 1), (0.95, 0.69, 0.26, 1)),
    ("carbon_teal", (0.04, 0.20, 0.22, 1), (0.16, 0.76, 0.69, 1)),
    ("sand_black", (0.63, 0.47, 0.26, 1), (0.04, 0.05, 0.06, 1)),
    ("white_gold", (0.88, 0.88, 0.84, 1), (0.82, 0.57, 0.10, 1)),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_glb(path: str):
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type in {"MESH", "ARMATURE", "EMPTY"}]
    root = bpy.data.objects.new("AbokiBikeRoot", None)
    bpy.context.scene.collection.objects.link(root)
    for obj in meshes:
        obj.parent = root
    return root


def clone_materials(root):
    for obj in root.children_recursive:
        if obj.type != "MESH" or not obj.data:
            continue
        for index, material in enumerate(list(obj.data.materials)):
            if material:
                obj.data.materials[index] = material.copy()


def material_role(name: str):
    text = name.lower()
    if re.search(r"tire|tyre|rubber|glass|windshield|screen|chrome|metal|disc|caliper|chain|brake", text):
        return "technical"
    if re.search(r"seat|saddle|leather", text):
        return "seat"
    return "body"


def tint_livery(root, primary, accent):
    for obj in root.children_recursive:
        if obj.type != "MESH":
            continue
        for material in obj.data.materials:
            if not material or not material.use_nodes:
                continue
            nodes = material.node_tree.nodes
            bsdf = nodes.get("Principled BSDF")
            if not bsdf:
                continue
            role = material_role(material.name + " " + obj.name)
            if role == "technical":
                continue
            if role == "seat":
                color = tuple(primary[i] * 0.65 for i in range(4))
            else:
                color = accent if "trim" in material.name.lower() or "accent" in material.name.lower() else primary
            if "Base Color" in bsdf.inputs:
                bsdf.inputs["Base Color"].default_value = color


def object_bounds(root):
    min_v = Vector((1e9, 1e9, 1e9))
    max_v = Vector((-1e9, -1e9, -1e9))
    for obj in root.children_recursive:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, world.x)
            min_v.y = min(min_v.y, world.y)
            min_v.z = min(min_v.z, world.z)
            max_v.x = max(max_v.x, world.x)
            max_v.y = max(max_v.y, world.y)
            max_v.z = max(max_v.z, world.z)
    return min_v, max_v


def wheel_centers(root):
    wheels = []
    for obj in root.children_recursive:
        if obj.type != "MESH" or not re.search(r"wheel|tire|tyre", obj.name, re.I):
            continue
        min_v, max_v = object_bounds_for_object(obj)
        center = (min_v + max_v) * 0.5
        radius = max(max_v.y - min_v.y, max_v.z - min_v.z) * 0.5
        if 0.05 < radius < 1.0:
            wheels.append((center, radius))
    wheels.sort(key=lambda item: item[0].z)
    return wheels


def object_bounds_for_object(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_v = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    max_v = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    return min_v, max_v


def add_marker(root, name, location):
    marker = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(marker)
    marker.empty_display_type = "PLAIN_AXES"
    marker.empty_display_size = 0.06
    marker.location = location
    marker.parent = root
    return marker


def add_fit_markers(root):
    min_v, max_v = object_bounds(root)
    size = max_v - min_v
    wheels = wheel_centers(root)

    if len(wheels) >= 2:
        rear = wheels[0]
        front = wheels[-1]
        wheel_base = max(0.55, front[0].z - rear[0].z)
        wheel_radius = (rear[1] + front[1]) * 0.5
    else:
        wheel_base = max(1.1, size.z * 0.72)
        wheel_radius = max(0.22, min(size.y * 0.22, 0.42))

    seat = Vector((
        0.0,
        min_v.y + max(0.56, min(size.y * 0.61, 0.96)),
        min_v.z + wheel_base * 0.55,
    ))
    handle = Vector((
        0.0,
        min_v.y + max(0.68, min(size.y * 0.70, 1.12)),
        max_v.z - wheel_base * 0.10,
    ))
    peg = Vector((
        max(0.14, min(size.x * 0.23, 0.29)),
        min_v.y + max(0.28, min(size.y * 0.33, 0.56)),
        seat.z - wheel_base * 0.11,
    ))

    add_marker(root, "AR_Mount_Seat", seat)
    add_marker(root, "AR_Mount_Handle_L", Vector((abs(handle.x) + max(0.18, size.x * 0.23), handle.y, handle.z)))
    add_marker(root, "AR_Mount_Handle_R", Vector((-abs(handle.x) - max(0.18, size.x * 0.23), handle.y, handle.z)))
    add_marker(root, "AR_Mount_Peg_L", peg)
    add_marker(root, "AR_Mount_Peg_R", Vector((-peg.x, peg.y, peg.z)))

    root["aboki.mount_version"] = 1
    root["aboki.units"] = "metres"
    root["aboki.forward_axis"] = "+Z"
    root["aboki.wheel_base"] = float(wheel_base)
    root["aboki.wheel_radius"] = float(wheel_radius)


def export_variant(root, path):
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if not os.path.isfile(args.source):
        raise FileNotFoundError(args.source)

    os.makedirs(args.output_dir, exist_ok=True)

    for name, primary, accent in PALETTES:
        clear_scene()
        root = import_glb(os.path.abspath(args.source))
        clone_materials(root)
        tint_livery(root, primary, accent)
        add_fit_markers(root)

        out = os.path.join(args.output_dir, f"{name}.glb")
        export_variant(root, out)
        print("Wrote", out)


if __name__ == "__main__":
    main()
