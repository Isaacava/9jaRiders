import trimesh, numpy as np, os, math
from trimesh.transformations import rotation_matrix, translation_matrix

OUT="public/assets/models"
os.makedirs(OUT, exist_ok=True)

def mat(color, metallic=0.0, rough=0.6):
    c=np.array([*color,255], dtype=np.uint8)
    return trimesh.visual.material.PBRMaterial(baseColorFactor=tuple(c), metallicFactor=metallic, roughnessFactor=rough)

def cyl_between(a,b,r,material,sections=16):
    a=np.array(a,float); b=np.array(b,float); d=b-a; L=np.linalg.norm(d)
    m=trimesh.creation.cylinder(r,L,sections=sections)
    z=np.array([0,0,1.0]); u=d/L; v=np.cross(z,u); s=np.linalg.norm(v); c=float(np.dot(z,u))
    if s<1e-8:
        R=np.eye(4)
        if c<0: R=rotation_matrix(math.pi,[1,0,0])
    else:
        vx=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]])
        R=np.eye(4); R[:3,:3]=np.eye(3)+vx+vx@vx*((1-c)/(s*s))
    m.apply_transform(translation_matrix((a+b)/2)@R); m.visual.material=material
    return m

def box(ext,loc,material):
    m=trimesh.creation.box(extents=ext); m.apply_translation(loc); m.visual.material=material; return m

def rgb(h):
    h=h.strip("#"); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))

def make_bike(name,body,accent,scale=(1,1,1),sport=False,heavy=False):
    bodyM=mat(rgb(body),.2,.42); accentM=mat(rgb(accent),.35,.35)
    black=mat((.04,.05,.055),0,.72); metal=mat((.32,.36,.38),.7,.28); silver=mat((.7,.74,.74),.8,.2)
    red=mat((.8,.035,.03),.05,.35); glass=mat((.06,.18,.21),.05,.18); parts=[]
    for r,w,z,yy in [(.56,.18,.78,.56),(.47,.16,-1.42,.47)]:
        wheel=trimesh.creation.cylinder(r,w,sections=32); wheel.apply_transform(rotation_matrix(math.pi/2,[0,0,1])); wheel.apply_translation((0,yy,z)); wheel.visual.material=black; parts.append(wheel)
    for r,w,z,yy in [(.34,.205,.78,.56),(.28,.18,-1.42,.47)]:
        hub=trimesh.creation.cylinder(r,w,sections=24); hub.apply_transform(rotation_matrix(math.pi/2,[0,0,1])); hub.apply_translation((0,yy,z)); hub.visual.material=metal; parts.append(hub)
    parts += [cyl_between((-.28,.88,.58),(0,.95,-.2),.06,metal),cyl_between((.28,.88,.58),(0,.95,-.2),.06,metal),
              cyl_between((-.28,.88,.58),(0,.61,.78),.055,silver),cyl_between((.28,.88,.58),(0,.61,.78),.055,silver)]
    parts += [box((.7,.46,.66),(0,.82,.2),metal),box((.46,.24,.48),(0,.72,.18),black)]
    parts += [box((1.05,.46,1.18 if sport else 1.05),(0,1.12,-.02),bodyM),box((.84,.34,.82),(0,1.00,.77),bodyM if heavy else accentM),box((.62,.16,1.04),(0,1.28,.45),black)]
    parts += [box((.92,.13,.56),(0,.83,1.05),bodyM),box((.64,.44,.72),(0,1.25,-.72),bodyM),box((.52,.22,.11),(0,1.52,-.94),glass)]
    parts += [box((.24,.11,.10),(0,1.38,-1.13),mat((1.0,.83,.39),.1,.22)),box((.34,.08,.07),(0,1.09,1.21),red)]
    parts += [cyl_between((-.21,.9,-1.18),(-.17,.49,-1.47),.045,silver),cyl_between((.21,.9,-1.18),(.17,.49,-1.47),.045,silver),cyl_between((-.17,1.48,-.98),(.17,1.48,-.98),.045,black)]
    parts += [cyl_between((.39,.79,.42),(.39,.78,1.22),.08,metal,20),box((.18,.17,.38),(.39,.78,1.3),black)]
    parts += [cyl_between((-.45,.72,.37),(-.55,.67,.55),.032,metal,10),cyl_between((.45,.72,.37),(.55,.67,.55),.032,metal,10)]
    out=trimesh.util.concatenate(parts); out.apply_scale(scale); out.metadata["name"]=name; return out

bikes=[("bike-starter","#18b8aa","#f2c94c",(1,1,1),False,False),("bike-speed","#247ce0","#f49a49",(1.02,1,.96),True,False),("bike-heavy","#bc4b43","#dfddd2",(1.08,1.04,1.04),False,True),("bike-elite","#875dcc","#63dcff",(1,1.03,.94),True,False),("bike-legendary","#d0a12d","#fff0a6",(1.03,1.05,.98),True,False)]
s=trimesh.Scene()
for spec in bikes:
    m=make_bike(*spec); s.add_geometry(m,node_name=spec[0],geom_name=spec[0],parent_node_name=s.graph.base_frame)
s.export(os.path.join(OUT,"bikes.glb"))

def make_rider(name,jacket,accent,hair,skin,build=1.0,style="short"):
    J=mat(rgb(jacket),0,.68); A=mat(rgb(accent),0,.55); H=mat(rgb(hair),0,.92); S=mat(rgb(skin),0,.78); P=mat((.12,.15,.17),0,.85); B=mat((.035,.045,.05),0,.9); parts=[]
    torso=trimesh.creation.capsule(.34,.72,count=[12,18]); torso.apply_scale((1,.95,.62)); torso.apply_translation((0,1.58,.20)); torso.visual.material=J; parts.append(torso)
    parts += [box((.64,.28,.55),(0,1.14,.44),P)]
    head=trimesh.creation.uv_sphere(.24,count=[16,12]); head.apply_scale((.95,1,.92)); head.apply_translation((0,2.27,-.18)); head.visual.material=S; parts.append(head)
    hairm=trimesh.creation.uv_sphere(.28,count=[16,10]); hairm.apply_scale((1.05,.78,1)); hairm.apply_translation((0,2.39,-.20)); hairm.visual.material=H; parts.append(hairm)
    if style=="bun":
        bun=trimesh.creation.uv_sphere(.20,count=[12,8]); bun.apply_translation((0,2.55,.02)); bun.visual.material=H; parts.append(bun)
    elif style=="braids":
        for sx in (-1,1):
            for j in range(2):
                p=trimesh.creation.capsule(.055,.5,count=[8,10]); p.apply_transform(rotation_matrix((-.18 if sx<0 else .18),[1,0,0])); p.apply_translation((sx*(.22+.05*j),2.03,.02+.03*j)); p.visual.material=H; parts.append(p)
    elif style=="high":
        p=trimesh.creation.uv_sphere(.23,count=[14,9]); p.apply_scale((.8,1.45,.8)); p.apply_translation((0,2.52,.0)); p.visual.material=H; parts.append(p)
    parts += [cyl_between((-.27,1.78,-.02),(-.43,1.48,-.92),.09,J),cyl_between((.27,1.78,-.02),(.43,1.48,-.92),.09,J)]
    hand=trimesh.creation.uv_sphere(.10,count=[10,8]); hand.apply_translation((-.43,1.46,-.94)); hand.visual.material=S; parts.append(hand); hand2=hand.copy(); hand2.apply_translation((.86,0,0)); parts.append(hand2)
    parts += [cyl_between((-.24,1.12,.28),(-.34,.67,.56),.11,P),cyl_between((.24,1.12,.28),(.34,.67,.56),.11,P)]
    parts += [box((.18,.3,.34),(-.34,.48,.66),B),box((.18,.3,.34),(.34,.48,.66),B),box((.32,.28,.05),(0,1.72,.52),A)]
    out=trimesh.util.concatenate(parts); out.apply_scale((build,build,build)); out.metadata["name"]=name; return out

riders=[("rider-main","#138f87","#f0c64c","#231816","#9a694d",1,"short"),("rider-ada","#7f54bf","#f2d0a9","#24121e","#8f5f48",1,"braids"),("rider-kobby","#bc4a45","#eee4d8","#151312","#7f513a",1.05,"locs"),("rider-tobi","#dc7228","#11181b","#2a170f","#9b6245",.98,"high"),("rider-cpu-01","#236aa7","#f3c94a","#2c1d16","#81523c",.97,"short"),("rider-cpu-02","#2f8e59","#f5e5cb","#171717","#764a36",1.02,"short"),("rider-cpu-03","#b94b8b","#65d9ff","#2a1724","#8c5b43",.96,"bun"),("rider-cpu-04","#6b5cc7","#e9c46a","#1c1511","#79503a",1,"high"),("rider-cpu-05","#a44b34","#f3f0e8","#111111","#754734",1.06,"locs"),("rider-cpu-06","#d25b2f","#9de8db","#1a120e","#935e43",.99,"short"),("rider-cpu-07","#b28a26","#fff0ac","#24170f","#80513a",1.03,"short")]
s=trimesh.Scene()
for spec in riders:
    m=make_rider(*spec); s.add_geometry(m,node_name=spec[0],geom_name=spec[0],parent_node_name=s.graph.base_frame)
s.export(os.path.join(OUT,"riders.glb"))

def make_vehicle(name,color,kind):
    B=mat(rgb(color),0.08,.6); G=mat((.08,.18,.21),.08,.18); K=mat((.04,.05,.055),0,.84); R=mat((.78,.035,.025),.05,.32); S=mat((.72,.69,.62),0,.66); parts=[]
    dims=(2.25,1.55,3.65) if kind=="keke" else ((2.55,1.52,4.35) if kind=="sedan" else (2.72,1.7,4.55))
    parts += [box(dims,(0,.96,0),B)]
    cab_h=1.38 if kind!="keke" else 1.62
    parts += [box((dims[0]*.84,.68,dims[2]*.44),(0,cab_h,.22),G),box((dims[0]*.76,.58,.08),(0,cab_h+.02,dims[2]/2+.015),G),box((dims[0]*.76,.38,.08),(0,.68,dims[2]/2+.08),K)]
    parts += [box((.43,.13,.09),(-dims[0]*.31,.79,dims[2]/2+.12),R),box((.43,.13,.09),(dims[0]*.31,.79,dims[2]/2+.12),R),box((dims[0]*.8,.18,.16),(0,.55,dims[2]/2+.16),K)]
    for x in (-dims[0]*.43,dims[0]*.43):
        for z in (-dims[2]*.32,dims[2]*.32):
            w=trimesh.creation.cylinder(.38 if kind!="keke" else .30,.18,sections=20); w.apply_transform(rotation_matrix(math.pi/2,[0,0,1])); w.apply_translation((x,.43,z)); w.visual.material=K; parts.append(w)
    if kind=="danfo": parts += [box((dims[0]*.9,.2,dims[2]*.9),(0,1.87,-.05),S),box((1.12,.2,.46),(0,2.08,.25),mat((.94,.82,.44),0,.56))]
    if kind=="keke": parts += [box((2.15,.16,3.30),(0,1.98,0),K)]
    if kind=="suv": parts += [box((2.82,.18,4.15),(0,1.92,0),S)]
    return trimesh.util.concatenate(parts)

traffic=[("traffic-danfo","#efc329","danfo"),("traffic-keke","#309b69","keke"),("traffic-minibus","#ddb12b","minibus"),("traffic-sedan","#667e89","sedan"),("traffic-suv","#3d6888","suv"),("traffic-van","#d9d5cc","van")]
s=trimesh.Scene()
for spec in traffic:
    m=make_vehicle(*spec); s.add_geometry(m,node_name=spec[0],geom_name=spec[0],parent_node_name=s.graph.base_frame)
s.export(os.path.join(OUT,"traffic.glb"))
print("built", os.path.getsize(os.path.join(OUT,"bikes.glb")), os.path.getsize(os.path.join(OUT,"riders.glb")), os.path.getsize(os.path.join(OUT,"traffic.glb")))