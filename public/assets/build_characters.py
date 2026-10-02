"""
Blender 3.6+ / 4.x  ->  Scripting tab -> Open -> Run Script
Builds two rigged, bike-ready characters (man + woman) from your concept art.

Pipeline inside this script:
  skeleton graph -> Skin modifier (single continuous body) -> Subdivision
  -> material zones -> armature + automatic weights -> hair / glasses / beard
  -> bike -> IK-style ride pose -> saves .blend + .glb to your home folder.
Characters face -Y (Blender front view). Units are metres.
"""
import bpy, math, os
from mathutils import Vector, Matrix

CHAR = "both"     # "man" | "woman" | "both"
POSE = "ride"     # "ride" | "apose"
BIKE = True

# ---------------------------------------------------------------- helpers
def lin(h):
    return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
def lin2(h):
    return tuple(c ** 2.2 for c in lin(h)) + (1.0,)

MATS = {}
def mat(name, hexcol, rough=0.6, metal=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin2(hexcol)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    MATS[name] = m
    return m

def activate(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True); bpy.context.view_layer.objects.active = o

def link(o):
    bpy.context.collection.objects.link(o)
    return o

def smooth(o, levels=0):
    activate(o); bpy.ops.object.shade_smooth()
    if levels:
        s = o.modifiers.new("Subsurf", "SUBSURF"); s.levels = levels; s.render_levels = levels

# ---------------------------------------------------------------- character profiles
MAN = dict(
    name="Man", s=1.0, sw=0.20, hw=0.09,
    skin=0x6B4226, hair=0x0A0A0A, hair_r=0.20, beard=True, hoops=False,
    r=dict(pelvis=(.17, .11), spine=(.15, .10), chest=(.18, .11), neck=(.05, .05), head=(.09, .10), top=(.03, .03),
           sh=(.06, .06), el=(.045, .045), wr=(.032, .03), hn=(.042, .016),
           hp=(.085, .085), kn=(.062, .062), an=(.045, .05), to=(.05, .04)))
WOMAN = dict(
    name="Woman", s=0.94, sw=0.17, hw=0.10,
    skin=0x8A5A33, hair=0x5A1F8C, hair_r=0.21, beard=False, hoops=True,
    r=dict(pelvis=(.175, .11), spine=(.12, .09), chest=(.145, .10), neck=(.042, .042), head=(.085, .095), top=(.03, .03),
           sh=(.05, .05), el=(.04, .04), wr=(.028, .026), hn=(.036, .014),
           hp=(.09, .09), kn=(.058, .058), an=(.04, .045), to=(.045, .036)))

def joints(P):
    s, sw, hw = P["s"], P["sw"], P["hw"]
    j = {"pelvis": (0, 0, .95), "spine": (0, 0, 1.18), "chest": (0, 0, 1.38),
         "neck": (0, 0, 1.53), "head": (0, 0, 1.66), "top": (0, 0, 1.79)}
    for k, sx in (("L", 1), ("R", -1)):
        sh = (sx * sw, 0, 1.45)
        el = (sh[0] + sx * .205, 0, sh[2] - .205)
        wr = (el[0] + sx * .19, 0, el[2] - .19)
        hn = (wr[0] + sx * .075, 0, wr[2] - .075)
        j.update({"sh" + k: sh, "el" + k: el, "wr" + k: wr, "hn" + k: hn,
                  "hp" + k: (sx * hw, 0, .92), "kn" + k: (sx * (hw + .01), -.01, .49),
                  "an" + k: (sx * (hw + .01), 0, .085), "to" + k: (sx * (hw + .01), -.16, .04)})
    return {k: Vector((v[0] * s, v[1] * s, v[2] * s)) for k, v in j.items()}

EDGES = [("pelvis", "spine"), ("spine", "chest"), ("chest", "neck"), ("neck", "head"), ("head", "top")]
for k in "LR":
    EDGES += [("chest", "sh" + k), ("sh" + k, "el" + k), ("el" + k, "wr" + k), ("wr" + k, "hn" + k),
              ("pelvis", "hp" + k), ("hp" + k, "kn" + k), ("kn" + k, "an" + k), ("an" + k, "to" + k)]

# ---------------------------------------------------------------- body mesh
def body_mesh(P, J):
    names = list(J.keys())
    me = bpy.data.meshes.new(P["name"] + "_body")
    me.from_pydata([J[n] for n in names], [(names.index(a), names.index(b)) for a, b in EDGES], [])
    ob = link(bpy.data.objects.new(P["name"] + "_Body", me))
    activate(ob)
    bpy.ops.object.modifier_add(type="SKIN")
    sk = ob.modifiers["Skin"]; sk.use_smooth_shade = True
    for i, n in enumerate(names):
        key = n[:-1] if n[-1] in "LR" else n
        rx, ry = P["r"][key]
        v = me.skin_vertices[0].data[i]
        v.radius = (rx * P["s"], ry * P["s"])
        if n == "pelvis": v.use_root = True
    sub = ob.modifiers.new("Subsurf", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    bpy.ops.object.modifier_apply(modifier="Skin")
    bpy.ops.object.modifier_apply(modifier="Subsurf")
    bpy.ops.object.shade_smooth()
    return ob

# material zones (coordinates normalised by character scale)
def zone_man(P, x, z, ny):
    hand, cuff = P["sw"] + .38, P["sw"] + .31
    if z < .20: return "boot"
    if z < .97: return "jeans"
    if z > 1.52 or x > hand: return "skin"
    if x > cuff: return "gold"
    if z < 1.02: return "gold"
    if abs(ny) > .4 and z < 1.5:
        if x < .06: return "tee"
        if x < .15: return "gold"
    return "jacket"

def zone_woman(P, x, z, ny):
    hand = P["sw"] + .38
    if z < .20: return "boot"
    if z < .70: return "skin"
    if z < .95: return "shorts"
    if z < 1.0: return "belt"
    if z < 1.14: return "skin"
    if z > 1.52 or x > hand: return "skin"
    return "jacket"

def assign_materials(ob, P, is_man):
    skin = mat("skin_" + P["name"], P["skin"], .55)
    table = {"skin": skin, "boot": mat("boot_" + P["name"], 0x8A5428 if is_man else 0x7A2A9A, .5),
             "gold": mat("gold", 0xD9A21B, .35, .6), "belt": mat("belt", 0x1A1A1A, .4),
             "jeans": mat("jeans", 0x27384A, .85), "tee": mat("tee", 0xF2F2F2, .9),
             "jacket": mat("jacket_" + P["name"], 0x1F3566 if is_man else 0xF2E03A, .55),
             "shorts": mat("shorts", 0xEAEAEA, .85)}
    keys = list(table.keys())
    for k in keys: ob.data.materials.append(table[k])
    fn = zone_man if is_man else zone_woman
    s = P["s"]
    for p in ob.data.polygons:
        c = p.center
        p.material_index = keys.index(fn(P, abs(c.x) / s, c.z / s, p.normal.y))

# ---------------------------------------------------------------- armature
BONES = [  # name, head joint, tail joint, parent, connected
    ("pelvis", "pelvis", "spine", None, False), ("spine", "spine", "chest", "pelvis", True),
    ("chest", "chest", "neck", "spine", True), ("neck", "neck", "head", "chest", True),
    ("head", "head", "top", "neck", True)]
for k in "LR":
    BONES += [("upper_arm." + k, "sh" + k, "el" + k, "chest", False), ("forearm." + k, "el" + k, "wr" + k, "upper_arm." + k, True),
              ("hand." + k, "wr" + k, "hn" + k, "forearm." + k, True),
              ("thigh." + k, "hp" + k, "kn" + k, "pelvis", False), ("shin." + k, "kn" + k, "an" + k, "thigh." + k, True),
              ("foot." + k, "an" + k, "to" + k, "shin." + k, True)]

def make_armature(P, J):
    bpy.ops.object.armature_add(); arm = bpy.context.object; arm.name = P["name"] + "_Rig"
    arm.show_in_front = True
    eb = arm.data.edit_bones
    bpy.ops.object.mode_set(mode="EDIT")
    for b in list(eb): eb.remove(b)
    for n, h, t, par, conn in BONES:
        b = eb.new(n); b.head = J[h]; b.tail = J[t]
        if par: b.parent = eb[par]; b.use_connect = conn
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm

def skin_to(arm, body):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

def attach(arm, ob, bone):
    b = arm.data.bones[bone]
    ob.parent = arm; ob.parent_type = "BONE"; ob.parent_bone = bone
    ob.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()

# ---------------------------------------------------------------- head accessories
def accessories(P, arm, is_man):
    s = P["s"]
    hair = mat("hair_" + P["name"], P["hair"], .95)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=P["hair_r"] * s, location=(0, .07 * s, 1.77 * s))
    af = bpy.context.object; af.name = P["name"] + "_Afro"; af.scale = (1, .86, 1)
    tex = bpy.data.textures.new("afro_noise", "CLOUDS"); tex.noise_scale = .12
    d = af.modifiers.new("Fluff", "DISPLACE"); d.texture = tex; d.strength = .035
    af.data.materials.append(hair); smooth(af, 1); attach(arm, af, "head")
    gold = mat("gold", 0xD9A21B, .35, .6); lens = mat("lens", 0x3A2A10 if is_man else 0x7A5A30, .1)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=.034 * s, minor_radius=.0045 * s, location=(sx * .046 * s, -.098 * s, 1.69 * s), rotation=(math.pi / 2, 0, 0))
        fr = bpy.context.object; fr.data.materials.append(gold); smooth(fr); attach(arm, fr, "head")
        bpy.ops.mesh.primitive_cylinder_add(radius=.033 * s, depth=.004, location=(sx * .046 * s, -.098 * s, 1.69 * s), rotation=(math.pi / 2, 0, 0))
        ln = bpy.context.object; ln.data.materials.append(lens); smooth(ln); attach(arm, ln, "head")
        if P["hoops"]:
            bpy.ops.mesh.primitive_torus_add(major_radius=.022 * s, minor_radius=.004 * s, location=(sx * .098 * s, 0, 1.64 * s), rotation=(0, math.pi / 2, 0))
            h = bpy.context.object; h.data.materials.append(gold); smooth(h); attach(arm, h, "head")
    if P["beard"]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=.088, location=(0, -.045, 1.615))
        b = bpy.context.object; b.scale = (.98, .85, 1.0); b.data.materials.append(hair); smooth(b, 1); attach(arm, b, "head")

# ---------------------------------------------------------------- bike
def tube(a, b, r, m, ox):
    a, b = Vector(a) + Vector((ox, 0, 0)), Vector(b) + Vector((ox, 0, 0)); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = d.to_track_quat("Z", "Y")
    o.data.materials.append(m); smooth(o)

GRIP_Y, GRIP_Z, SEAT = -.34, 1.0, (0, .22, .90)
def make_bike(ox):
    fm, bk, sv = mat("frame", 0x2B6CB0, .35, .4), mat("rubber", 0x151515, .8), mat("steel", 0xBBBBBB, .3, .9)
    for y in (.55, -.55):
        bpy.ops.mesh.primitive_torus_add(major_radius=.34, minor_radius=.026, location=(ox, y, .34), rotation=(0, math.pi / 2, 0))
        w = bpy.context.object; w.data.materials.append(bk); smooth(w)
    bb, st, ht = (0, .04, .30), SEAT, (0, -.40, .86)
    for a, b, r, m in [(bb, st, .02, fm), (bb, ht, .022, fm), (st, ht, .02, fm), (st, (0, .55, .34), .012, fm),
                       (bb, (0, .55, .34), .012, fm), (ht, (0, -.55, .34), .014, sv), (ht, (0, GRIP_Y, GRIP_Z), .014, sv),
                       ((-.28, GRIP_Y, GRIP_Z), (.28, GRIP_Y, GRIP_Z), .012, bk)]:
        tube(a, b, r, m, ox)
    bpy.ops.mesh.primitive_cube_add(location=(ox, .24, .93), scale=(.07, .15, .025))
    sd = bpy.context.object; sd.data.materials.append(bk)
    for sx in (-1, 1):
        py = .04 + (-.17 if sx > 0 else .17)
        tube((sx * .05, .04, .30), (sx * .14, py, .30), .01, sv, ox)
        bpy.ops.mesh.primitive_cube_add(location=(ox + sx * .15, py, .30), scale=(.05, .04, .01)); bpy.context.object.data.materials.append(bk)

# ---------------------------------------------------------------- posing
def aim(pb, tgt):
    d = tgt - pb.head
    up = "X" if abs(d.normalized().z) > .98 else "Z"
    m = d.to_track_quat("Y", up).to_matrix().to_4x4(); m.translation = pb.head
    pb.matrix = m; bpy.context.view_layer.update()

def ik2(a, b, tgt, pole):
    o = a.head.copy(); l1, l2 = a.length, b.length
    d = tgt - o; L = min(d.length, (l1 + l2) * .999); n = d.normalized()
    x = (l1 * l1 - l2 * l2 + L * L) / (2 * L); h = math.sqrt(max(l1 * l1 - x * x, 0))
    pp = (pole - pole.dot(n) * n).normalized()
    aim(a, o + n * x + pp * h); aim(b, tgt)

def ride_pose(arm, P, ox):
    s = P["s"]; arm.location = (ox, SEAT[1] + .02, 1.0 - .95 * s)
    off = arm.location; pb = arm.pose.bones
    chain = [("spine", (0, -.35, 1)), ("chest", (0, -.50, 1)), ("neck", (0, -.30, 1)), ("head", (0, -.10, 1))]
    bpy.context.view_layer.update()
    for n, dv in chain:
        aim(pb[n], pb[n].head + Vector(dv).normalized() * pb[n].length)
    for k, sx in (("L", 1), ("R", -1)):
        py = .04 + (-.17 if sx > 0 else .17)
        ankle = Vector((sx * .14 + ox, py + .01, .30 + .10 * s + .02)) - off
        ik2(pb["thigh." + k], pb["shin." + k], ankle, Vector((sx * .1, -1, .15)))
        aim(pb["foot." + k], pb["foot." + k].head + Vector((0, -.14, -.04)))
        grip = Vector((ox + sx * .28, GRIP_Y, GRIP_Z - .02)) - off
        ik2(pb["upper_arm." + k], pb["forearm." + k], grip, Vector((sx * .6, .4, -.6)))
        aim(pb["hand." + k], pb["hand." + k].head + Vector((0, -.09, .0)))

# ---------------------------------------------------------------- build
def build(P, is_man, ox):
    J = {k: v.copy() for k, v in joints(P).items()}
    body = body_mesh(P, J); assign_materials(body, P, is_man)
    arm = make_armature(P, J); skin_to(arm, body); accessories(P, arm, is_man)
    arm.location.x = ox
    if BIKE: make_bike(ox)
    if POSE == "ride":
        bpy.ops.object.mode_set(mode="OBJECT"); ride_pose(arm, P, ox)

bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete()
bpy.ops.object.light_add(type="SUN", location=(3, -4, 6)); bpy.context.object.data.energy = 3
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); bpy.context.object.data.materials.append(mat("floor", 0xBBBBBB, 1))

if CHAR in ("man", "both"):   build(MAN, True, -0.9 if CHAR == "both" else 0)
if CHAR in ("woman", "both"): build(WOMAN, False, 0.9 if CHAR == "both" else 0)

out = os.path.join(os.path.expanduser("~"), "characters_bike")
bpy.ops.wm.save_as_mainfile(filepath=out + ".blend")
bpy.ops.export_scene.gltf(filepath=out + ".glb", export_format="GLB")
print("Saved:", out + ".blend / .glb")
