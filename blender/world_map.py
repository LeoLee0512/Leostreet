"""Procedural fictional world map for 狮子街传说 (G3).

Run headless from the repo root:
  blender -b --factory-startup -P blender/world_map.py

Coordinates: atlas units (x right, y down, 2400 x 1500) map to Blender metres
via X = (x - 1200) / 100, Y = -(y - 750) / 100, so the board is 24 m x 15 m.
In three.js (glTF is Y-up) that becomes x = (ax - 1200) / 100, z = (ay - 750) / 100.

Outputs
  src/assets/world/world.glb         terrain (baked colour texture) + capital banks
  src/assets/world/world-poster.jpg  top-down still, the no-WebGL fallback
  src/assets/world/world-provinces.png  province id per texel (R = id, 255 = sea)
  src/lib/world/world.data.ts        countries, provinces, province-id pick grid
  blender/out/preview.png            labelled perspective render for review
"""

import base64
import json
import math
import os

import bpy
import numpy as np
from mathutils import Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "src", "assets", "world")
DATA_TS = os.path.join(ROOT, "src", "lib", "world", "world.data.ts")
PREVIEW = os.path.join(ROOT, "blender", "out")
for d in (ASSETS, os.path.dirname(DATA_TS), PREVIEW):
    os.makedirs(d, exist_ok=True)

W, H = 2400, 1500
STEP = 2  # atlas units per texel of the colour texture
MESH_EVERY = 4  # mesh vertex every 4 texels (8 atlas units)
PICK_EVERY = 6  # pick grid every 6 texels (12 atlas units)
NX, NY = W // STEP + 1, H // STEP + 1
SEED = 7
rng = np.random.default_rng(SEED)

# Country = blobs of land (atlas x, y, radius); the capital province takes the
# first name. Names extend the story atlas (src/lib/story/atlas.ts); all fictional.
COUNTRIES = [
    dict(id="lion", zh="狮子国", en="Lion Kingdom", tint="#c9b37e",
         blobs=[(760, 720, 380), (620, 450, 270), (980, 920, 220), (760, 330, 200)],
         names=[("灯湾", "Lampbay"), ("苍岭", "Cangling"), ("河湾", "Riverbend"), ("潮门", "Tidemarch"),
                ("磐北", "Panbei"), ("西垒", "Xilei"), ("苇泽", "Weize"), ("鹿原", "Deerfield"),
                ("金穗", "Goldear")]),
    dict(id="dawei", zh="大卫国", en="Dawei", tint="#8b98a8",
         blobs=[(1900, 380, 320), (2150, 580, 210), (1640, 290, 250)],
         names=[("白港", "Baigang"), ("铁岬", "Tiejie"), ("霜原", "Shuangyuan"), ("松林", "Pinewood"),
                ("银溪", "Silverbrook"), ("雾谷", "Mistvale"), ("石阶", "Stonestair"), ("北堡", "Northkeep")]),
    dict(id="ramona", zh="拉莫娜国", en="Ramona", tint="#c98f66",
         blobs=[(1460, 1230, 360), (1130, 1300, 240), (1800, 1290, 230)],
         names=[("暖帆", "Nuanfan"), ("橙滩", "Chengtan"), ("金阳", "Jinyang"), ("椰湾", "Palmcove"),
                ("红砂", "Redsand"), ("珊瑚", "Coralreach"), ("晴岸", "Clearshore"), ("蜜谷", "Honeyvale")]),
    dict(id="nordlan", zh="诺德岚", en="Nordlan", tint="#9fa9a3",
         blobs=[(1100, 240, 250), (880, 190, 210), (1360, 230, 180)],
         names=[("霜歌", "Frostsong"), ("冰原", "Icemoor"), ("鹰岭", "Eaglecrest"), ("极光", "Aurora"),
                ("寒港", "Coldharbour")]),
    dict(id="serein", zh="瑟林共和国", en="Serein Republic", tint="#9aa07a",
         blobs=[(330, 1230, 210), (170, 1050, 130), (520, 1380, 110)],
         names=[("瑟林港", "Serein Port"), ("绿屿", "Greenisle"), ("雨岛", "Rainisle"), ("苔原", "Mossmere")]),
    dict(id="velden", zh="维岚邦联", en="Velden League", tint="#a08d92",
         blobs=[(2120, 1080, 200), (2260, 930, 160), (1990, 1200, 150)],
         names=[("岚都", "Velden"), ("紫崖", "Violetcliff"), ("风谷", "Windvale"), ("星湾", "Starbay")]),
]
SEAS = [
    dict(zh="沉静海", en="The Quiet Sea", at=(1500, 800)),
    dict(zh="沉冰海峡", en="The Rime Strait", at=(1330, 560)),
    dict(zh="西风洋", en="Westwind Ocean", at=(180, 520)),
    dict(zh="南暖海", en="Southern Warm Sea", at=(760, 1420)),
]

def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)])

def fbm(x, y, scale, octaves=5, off=0.0):
    return noise.fractal(Vector((x / scale + off, y / scale + off * 1.7, SEED)), 0.8, 2.0, octaves)

def dilate(m):
    d = m.copy()
    d[1:, :] |= m[:-1, :]
    d[:-1, :] |= m[1:, :]
    d[:, 1:] |= m[:, :-1]
    d[:, :-1] |= m[:, 1:]
    return d

def differs(a):
    d = np.zeros(a.shape, dtype=bool)
    d[:, 1:] |= a[:, 1:] != a[:, :-1]
    d[1:, :] |= a[1:, :] != a[:-1, :]
    return d

# ---------- grid fields ----------
GX, GY = np.meshgrid(np.linspace(0, W, NX), np.linspace(0, H, NY))  # [NY, NX]
vec = np.vectorize
warp_x = vec(lambda x, y: fbm(x, y, 420, 4, 3.1))(GX, GY) * 90
warp_y = vec(lambda x, y: fbm(x, y, 420, 4, 9.7))(GX, GY) * 90
coast_n = vec(lambda x, y: fbm(x, y, 260, 6, 1.3))(GX, GY)
WX, WY = GX + warp_x, GY + warp_y

influence = np.zeros((len(COUNTRIES), NY, NX))
for ci, c in enumerate(COUNTRIES):
    for bx, by, r in c["blobs"]:
        d2 = ((WX - bx) ** 2 + (WY - by) ** 2) / (r * r)
        influence[ci] = np.maximum(influence[ci], np.exp(-d2 * 1.6))

field = influence.max(0) + coast_n * 0.32
field *= np.clip(np.minimum.reduce([GX, W - GX, GY, H - GY]) / 140, 0, 1)  # ocean margin
land = field > 0.42
country = np.where(land, influence.argmax(0), -1)

# ---------- provinces: warped Voronoi inside each country ----------
prov_id = np.full((NY, NX), -1, dtype=np.int32)
provinces = []
for ci, c in enumerate(COUNTRIES):
    cells = np.argwhere(country == ci)
    n = len(c["names"])
    pick = cells[rng.choice(len(cells), size=n * 60, replace=False)]
    seeds = [pick[0]]  # farthest-point sampling keeps seeds evenly spread
    for _ in range(n - 1):
        d = np.min([((pick - s) ** 2).sum(1) for s in seeds], axis=0)
        seeds.append(pick[d.argmax()])
    seeds = np.array(seeds, dtype=float)
    wy = cells[:, 0] + warp_y[cells[:, 0], cells[:, 1]] / STEP * 0.6
    wx = cells[:, 1] + warp_x[cells[:, 0], cells[:, 1]] / STEP * 0.6
    nearest = ((wy[:, None] - seeds[None, :, 0]) ** 2 + (wx[:, None] - seeds[None, :, 1]) ** 2).argmin(1)
    mine_all = []
    for k in range(n):
        mine = cells[nearest == k]
        my, mx = mine.mean(0)
        mine_all.append((mine, [round(mx * STEP), round(my * STEP)]))
    # capital = the province nearest the country's first blob, and takes names[0]
    bx, by, _ = c["blobs"][0]
    order = sorted(range(n), key=lambda k: (mine_all[k][1][0] - bx) ** 2 + (mine_all[k][1][1] - by) ** 2)
    order = [order[0]] + [k for k in range(n) if k != order[0]]
    for rank, k in enumerate(order):
        mine, center = mine_all[k]
        pid = len(provinces)
        prov_id[mine[:, 0], mine[:, 1]] = pid
        zh, en = c["names"][rank]
        provinces.append(dict(id=pid, country=c["id"], zh=zh + "省", en=en, capital=rank == 0,
                              center=center, area=int(len(mine))))
        if rank == 0:
            c["capital"] = pid

# ---------- elevation ----------
ridge = vec(lambda x, y: noise.ridged_multi_fractal(
    Vector((x / 380, y / 380, SEED + 4)), 0.9, 2.1, 5, 1.0, 2.0))(WX, WY)
mmask = np.clip(vec(lambda x, y: fbm(x, y, 700, 3, 5.5))(GX, GY) * 2.2 + 0.35, 0, 1)
inland = np.clip((field - 0.42) / 0.35, 0, 1)
shore = np.clip((field - 0.36) / 0.12, 0, 1)
shore = shore * shore * (3 - 2 * shore)
height = shore * 0.045 + np.where(land, inland * 0.10 + (ridge / 2.2) ** 2.2 * mmask * inland * 0.75, 0.0)

# rivers: steepest descent from high ground to the sea
river = np.zeros_like(land)
starts = np.argwhere(height > 0.42)
for s in starts[rng.choice(len(starts), size=min(14, len(starts)), replace=False)]:
    y, x = s
    for _ in range(1500):
        river[y, x] = True
        if not land[y, x]:
            break
        nb = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)
              if (dy or dx) and 0 <= y + dy < NY and 0 <= x + dx < NX]
        ny_, nx_ = min(nb, key=lambda p: height[p] + rng.random() * 0.002)
        if height[ny_, nx_] > height[y, x]:
            height[y, x] = height[ny_, nx_]  # fill the pit and keep flowing
        y, x = ny_, nx_
river = dilate(river) & land
height = np.where(river, height * 0.85, height)

# ---------- colour texture ----------
INK, SAND, ROCK = hex_rgb("#3d3428"), hex_rgb("#dccca0"), hex_rgb("#9a8f7c")
SNOW, DEEP, SHALLOW, RIVER = hex_rgb("#f2eee2"), hex_rgb("#6f8f8c"), hex_rgb("#a9c2b6"), hex_rgb("#7c9a98")

depth = np.clip((0.42 - field) / 0.42, 0, 1)[..., None]
col = SHALLOW * (1 - depth) + DEEP * depth
for ci, c in enumerate(COUNTRIES):
    col[country == ci] = hex_rgb(c["tint"])
rock = np.clip((height - 0.22) / 0.25, 0, 1)[..., None] * 0.7
col = np.where(land[..., None], col * (1 - rock) + ROCK * rock, col)
snow = np.clip((height - 0.48) / 0.12, 0, 1)[..., None]
col = col * (1 - snow) + SNOW * snow
beach = land & (field < 0.47)
col[beach] = col[beach] * 0.5 + SAND * 0.5
col[river] = RIVER
# terrain shading baked in so the map still reads under flat lighting
gy, gx = np.gradient(height)
shade = np.clip(1 + (gx - gy) * 9, 0.75, 1.2)[..., None]
col = np.clip(col * shade, 0, 1)
prov_border = differs(prov_id) & land
col[prov_border] *= 0.72
thick = dilate(differs(country)) & land
col[thick] = col[thick] * 0.35 + INK * 0.65
coast = differs(land.astype(np.int8))
col[coast] = col[coast] * 0.4 + INK * 0.6

# ---------- scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def to_world(x, y, z=0.0):
    return ((x - W / 2) / 100, -(y - H / 2) / 100, z)

img = bpy.data.images.new("WorldColour", NX, NY, alpha=False)
rgba = np.concatenate([col[::-1], np.ones((NY, NX, 1))], 2).astype(np.float32)  # Blender rows run bottom-up
img.pixels.foreach_set(rgba.ravel())
img.file_format = "JPEG"
img.filepath_raw = os.path.join(PREVIEW, "world-colour.jpg")
scene.render.image_settings.quality = 88
img.save()

ys_i = np.arange(0, NY, MESH_EVERY)
xs_i = np.arange(0, NX, MESH_EVERY)
MX, MY = len(xs_i), len(ys_i)
verts, uvs = [], []
for j in ys_i:
    for i in xs_i:
        verts.append(to_world(GX[j, i], GY[j, i], float(height[j, i])))
faces = [(j * MX + i, j * MX + i + 1, (j + 1) * MX + i + 1, (j + 1) * MX + i)
         for j in range(MY - 1) for i in range(MX - 1)]
mesh = bpy.data.meshes.new("WorldTerrain")
mesh.from_pydata(verts, [], faces)
uv_layer = mesh.uv_layers.new(name="UVMap")
for poly in mesh.polygons:
    poly.use_smooth = True
    for li in poly.loop_indices:
        x, y, _ = verts[mesh.loops[li].vertex_index]
        uv_layer.data[li].uv = (x * 100 / W + 0.5, y * 100 / H + 0.5)
terrain = bpy.data.objects.new("WorldTerrain", mesh)
scene.collection.objects.link(terrain)

def material(name, rgb, metallic=0.0, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    return m, b

mat, bsdf = material("Terrain", (1, 1, 1))
tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
tex.image = img
mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
mesh.materials.append(mat)

stone, _ = material("Stone", (0.93, 0.89, 0.8))
gold, _ = material("Gold", (0.78, 0.56, 0.2), metallic=1.0, rough=0.35)

def bank(name, x, y):
    """A small central-bank temple: plinth, six columns, hall, pediment, gilt dome."""
    z0 = float(height[int(round(y / STEP)), int(round(x / STEP))])
    wx, wy, _ = to_world(x, y)
    parts, s = [], 0.09
    def add(m):
        bpy.context.object.data.materials.append(m)
        parts.append(bpy.context.object)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(wx, wy, z0 + s * 0.25))
    bpy.context.object.scale = (s * 4.2, s * 2.6, s * 0.5); add(stone)
    for k in range(6):
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=s * 0.16, depth=s * 1.5,
                                            location=(wx + (k - 2.5) * s * 0.62, wy - s * 0.9, z0 + s * 1.25))
        add(stone)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(wx, wy + s * 0.25, z0 + s * 1.25))
    bpy.context.object.scale = (s * 3.6, s * 1.6, s * 1.5); add(stone)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=s * 2.6, depth=s * 0.7,
                                    location=(wx, wy - s * 0.1, z0 + s * 2.35))
    bpy.context.object.rotation_euler[2] = math.pi / 4
    bpy.context.object.scale = (1.05, 0.55, 1); add(stone)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=s * 0.45,
                                         location=(wx, wy + s * 0.3, z0 + s * 2.6))
    add(gold)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    bpy.context.object.name = name
    return bpy.context.object

landmarks = [bank(f"Capital_{c['id']}", *provinces[c["capital"]]["center"]) for c in COUNTRIES]

# ---------- export ----------
bpy.ops.object.select_all(action="DESELECT")
for o in [terrain, *landmarks]:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ASSETS, "world.glb"), export_format="GLB",
                          use_selection=True, export_apply=True, export_image_format="JPEG",
                          export_jpeg_quality=88)

# full-resolution province ids for the highlight shader (255 = sea), top row = y 0
ids = np.where(prov_id < 0, 255, prov_id).astype(np.float32) / 255
idimg = bpy.data.images.new("WorldProvinces", NX, NY, alpha=False)
idimg.colorspace_settings.name = "Non-Color"
idimg.pixels.foreach_set(np.concatenate([np.repeat(ids[::-1, :, None], 3, 2), np.ones((NY, NX, 1))], 2)
                         .astype(np.float32).ravel())
idimg.file_format = "PNG"
idimg.filepath_raw = os.path.join(ASSETS, "world-provinces.png")
idimg.save()

pick = prov_id[::PICK_EVERY, ::PICK_EVERY]
pick = np.where(pick < 0, 255, pick).astype(np.uint8)
data = dict(
    sheet=dict(w=W, h=H),
    countries=[dict(id=c["id"], zh=c["zh"], en=c["en"], tint=c["tint"], capital=c["capital"],
                    center=[round(np.mean([p["center"][0] for p in provinces if p["country"] == c["id"]])),
                            round(np.mean([p["center"][1] for p in provinces if p["country"] == c["id"]]))])
               for c in COUNTRIES],
    provinces=[{**p, "height": round(float(height[p["center"][1] // STEP, p["center"][0] // STEP]), 3)}
               for p in provinces],
    seas=[dict(zh=s["zh"], en=s["en"], at=list(s["at"])) for s in SEAS],
    pick=dict(step=STEP * PICK_EVERY, w=int(pick.shape[1]), h=int(pick.shape[0]),
              u8=base64.b64encode(pick.tobytes()).decode()),
)
with open(DATA_TS, "w", encoding="utf-8", newline="\n") as f:
    f.write("// Generated by blender/world_map.py; do not edit by hand. Re-run the script instead.\n")
    f.write("export const WORLD_DATA = ")
    f.write(json.dumps(data, ensure_ascii=False, indent=1))
    f.write(" as const;\n")

# ---------- renders: top-down poster (fallback) + labelled preview ----------
world = bpy.data.worlds.new("Paper")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.86, 0.85, 0.8, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45
scene.world = world
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), math.radians(10), math.radians(-35)))
bpy.context.object.data.energy = 2.4
bpy.context.object.data.angle = math.radians(8)
try:
    scene.render.engine = "BLENDER_EEVEE"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.view_settings.view_transform = "Standard"

bpy.ops.object.camera_add(location=(0, 0, 30), rotation=(0, 0, 0))
top = bpy.context.object
top.data.type = "ORTHO"
top.data.ortho_scale = 24
scene.camera = top
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 82
scene.render.filepath = os.path.join(ASSETS, "world-poster.jpg")
bpy.ops.render.render(write_still=True)

font = next((bpy.data.fonts.load(fp) for fp in (r"C:\Windows\Fonts\simhei.ttf", r"C:\Windows\Fonts\msyh.ttc")
             if os.path.exists(fp)), None)
ink, _ = material("Ink", (0.12, 0.1, 0.07))
sea_ink, _ = material("SeaInk", (0.2, 0.32, 0.32))

def label(text, x, y, size, m):
    bpy.ops.object.text_add(location=to_world(x, y, 0.7))
    t = bpy.context.object
    t.data.body, t.data.size, t.data.align_x, t.data.extrude = text, size, "CENTER", 0.01
    if font:
        t.data.font = font
    t.data.materials.append(m)

for c in data["countries"]:
    label(" ".join(c["zh"]), *c["center"], 0.42, ink)
for s in SEAS:
    label(" ".join(s["zh"]), *s["at"], 0.3, sea_ink)
bpy.ops.object.camera_add(location=(0, -16.5, 17.0), rotation=(math.radians(43), 0, 0))
scene.camera = bpy.context.object
scene.camera.data.lens = 32
scene.render.resolution_x, scene.render.resolution_y = 1800, 1100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(PREVIEW, "preview.png")
bpy.ops.render.render(write_still=True)
print("WORLD OK", len(provinces), "provinces")
