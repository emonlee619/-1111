from __future__ import annotations

import json
import math
import re
import struct
from collections import Counter
from pathlib import Path
from typing import Iterable


Vec3 = tuple[float, float, float]


def parse_refs(line: str) -> list[int]:
    return [int(value) for value in re.findall(r"\$(-?\d+)", line)]


def token_ref(line: str, index: int) -> int:
    tokens = line.split("#", 1)[0].split()[1:]
    if index >= len(tokens):
        return -1
    token = tokens[index]
    if not token.startswith("$"):
        return -1
    return int(token[1:])


def parse_numbers_after_refs(line: str) -> list[float]:
    body = line.split("#", 1)[0]
    body = re.sub(r"\$-?\d+", " ", body)
    tokens = body.split()[1:]
    numbers: list[float] = []
    for token in tokens:
        try:
            numbers.append(float(token))
        except ValueError:
            pass
    return numbers


def sub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross(a: Vec3, b: Vec3) -> Vec3:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def normalize(v: Vec3) -> Vec3:
    length = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if length <= 1e-12:
        return (0.0, 0.0, 1.0)
    return (v[0] / length, v[1] / length, v[2] / length)


def transform_point(point: Vec3, matrix: list[float] | None) -> Vec3:
    if not matrix:
        return point
    x, y, z = point
    return (
        matrix[0] * x + matrix[3] * y + matrix[6] * z + matrix[9],
        matrix[1] * x + matrix[4] * y + matrix[7] * z + matrix[10],
        matrix[2] * x + matrix[5] * y + matrix[8] * z + matrix[11],
    )


def transform_vector(vector: Vec3, matrix: list[float] | None) -> Vec3:
    if not matrix:
        return vector
    x, y, z = vector
    return normalize(
        (
            matrix[0] * x + matrix[3] * y + matrix[6] * z,
            matrix[1] * x + matrix[4] * y + matrix[7] * z,
            matrix[2] * x + matrix[5] * y + matrix[8] * z,
        )
    )


def to_scene(point: Vec3, center: Vec3, scale: float) -> Vec3:
    return (
        (point[0] - center[0]) * scale,
        (point[2] - center[2]) * scale,
        -(point[1] - center[1]) * scale,
    )


def bounds(points: Iterable[Vec3]) -> tuple[Vec3, Vec3]:
    pts = list(points)
    return (
        (min(p[0] for p in pts), min(p[1] for p in pts), min(p[2] for p in pts)),
        (max(p[0] for p in pts), max(p[1] for p in pts), max(p[2] for p in pts)),
    )


class SatModel:
    def __init__(self, sat_path: Path) -> None:
        raw_lines = sat_path.read_text(errors="ignore").splitlines()
        self.lines = [line for line in raw_lines[3:] if line.strip()]
        self.types = [line.split()[0] for line in self.lines]
        self.refs = [parse_refs(line) for line in self.lines]
        self.loop_to_coedges: dict[int, list[int]] = {}
        for entity_id, entity_type in enumerate(self.types):
            if entity_type == "coedge":
                loop_id = token_ref(self.lines[entity_id], 8)
                if loop_id >= 0:
                    self.loop_to_coedges.setdefault(loop_id, []).append(entity_id)

    def point(self, point_id: int, matrix: list[float] | None) -> Vec3:
        nums = parse_numbers_after_refs(self.lines[point_id])
        return transform_point((nums[-3], nums[-2], nums[-1]), matrix)

    def transform(self, transform_id: int) -> list[float] | None:
        if transform_id < 0:
            return None
        nums = parse_numbers_after_refs(self.lines[transform_id])
        if len(nums) < 13:
            return None
        return nums[-13:-1]

    def face_ids_for_body(self, body_id: int) -> list[int]:
        lump_id = token_ref(self.lines[body_id], 3)
        shell_id = token_ref(self.lines[lump_id], 4)
        face_id = token_ref(self.lines[shell_id], 5)
        face_ids: list[int] = []
        seen: set[int] = set()
        while face_id >= 0 and face_id not in seen and self.types[face_id] == "face":
            seen.add(face_id)
            face_ids.append(face_id)
            face_id = token_ref(self.lines[face_id], 3)
        return face_ids

    def plane_normal(self, surface_id: int, matrix: list[float] | None) -> Vec3 | None:
        if surface_id < 0 or self.types[surface_id] != "plane-surface":
            return None
        nums = parse_numbers_after_refs(self.lines[surface_id])
        if len(nums) < 9:
            return None
        geom = nums[-9:]
        return transform_vector((geom[3], geom[4], geom[5]), matrix)

    def sorted_polygon(self, points: list[Vec3], normal: Vec3 | None) -> list[Vec3]:
        unique: dict[tuple[int, int, int], Vec3] = {}
        for point in points:
            unique[(round(point[0] * 1e7), round(point[1] * 1e7), round(point[2] * 1e7))] = point
        vertices = list(unique.values())
        if len(vertices) < 3:
            return vertices
        centroid = (
            sum(p[0] for p in vertices) / len(vertices),
            sum(p[1] for p in vertices) / len(vertices),
            sum(p[2] for p in vertices) / len(vertices),
        )
        n = normal
        if n is None:
            n = (0.0, 0.0, 0.0)
            for i in range(len(vertices)):
                a = sub(vertices[i], centroid)
                b = sub(vertices[(i + 1) % len(vertices)], centroid)
                c = cross(a, b)
                n = (n[0] + c[0], n[1] + c[1], n[2] + c[2])
            n = normalize(n)
        axis = (1.0, 0.0, 0.0) if abs(n[0]) < 0.8 else (0.0, 1.0, 0.0)
        u = normalize(cross(n, axis))
        v = normalize(cross(n, u))
        return sorted(vertices, key=lambda p: math.atan2(sum((p[i] - centroid[i]) * v[i] for i in range(3)), sum((p[i] - centroid[i]) * u[i] for i in range(3))))

    def loop_vertices(self, loop_id: int, matrix: list[float] | None, surface_id: int) -> list[Vec3]:
        points: list[Vec3] = []
        for coedge_id in self.loop_to_coedges.get(loop_id, []):
            edge_id = token_ref(self.lines[coedge_id], 6)
            v_start_id = token_ref(self.lines[edge_id], 3)
            v_end_id = token_ref(self.lines[edge_id], 5)
            for vertex_id in (v_start_id, v_end_id):
                if vertex_id >= 0 and self.types[vertex_id] == "vertex":
                    point_id = self.refs[vertex_id][-1]
                    points.append(self.point(point_id, matrix))
        return self.sorted_polygon(points, self.plane_normal(surface_id, matrix))

    def body_mesh(self, body_id: int) -> tuple[list[Vec3], list[int], Counter[str]]:
        matrix = self.transform(token_ref(self.lines[body_id], 5))
        vertices: list[Vec3] = []
        indices: list[int] = []
        surface_counts: Counter[str] = Counter()
        for face_id in self.face_ids_for_body(body_id):
            loop_id = token_ref(self.lines[face_id], 4)
            surface_id = token_ref(self.lines[face_id], 7)
            surface_type = self.types[surface_id] if surface_id >= 0 else "unknown"
            surface_counts[surface_type] += 1
            poly = self.loop_vertices(loop_id, matrix, surface_id)
            if len(poly) < 3:
                continue
            start = len(vertices)
            vertices.extend(poly)
            if " reversed " in f" {self.lines[face_id]} ":
                for i in range(1, len(poly) - 1):
                    indices.extend([start, start + i + 1, start + i])
            else:
                for i in range(1, len(poly) - 1):
                    indices.extend([start, start + i, start + i + 1])
        return vertices, indices, surface_counts

    def cylinder_mesh_from_ellipses(self, body_id: int, segments: int = 32) -> tuple[list[Vec3], list[int]]:
        matrix = self.transform(token_ref(self.lines[body_id], 5))
        curves: list[tuple[Vec3, Vec3]] = []
        for entity_id, entity_type in enumerate(self.types):
            if entity_type != "ellipse-curve":
                continue
            nums = parse_numbers_after_refs(self.lines[entity_id])
            if len(nums) < 10:
                continue
            geom = nums[-10:-1]
            center = transform_point((geom[0], geom[1], geom[2]), matrix)
            radius_vector = transform_vector((geom[6], geom[7], geom[8]), matrix)
            radius_length = math.sqrt(geom[6] * geom[6] + geom[7] * geom[7] + geom[8] * geom[8])
            curves.append((center, (radius_vector[0] * radius_length, radius_vector[1] * radius_length, radius_vector[2] * radius_length)))
        if len(curves) < 2:
            return [], []
        c1, rv1 = curves[0]
        c2, _ = curves[1]
        axis = normalize(sub(c2, c1))
        u = rv1
        radius = math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2])
        u = normalize(u)
        v = normalize(cross(axis, u))
        v = (v[0] * radius, v[1] * radius, v[2] * radius)
        u = (u[0] * radius, u[1] * radius, u[2] * radius)
        vertices: list[Vec3] = []
        for center in (c1, c2):
            for i in range(segments):
                angle = (math.tau * i) / segments
                vertices.append(
                    (
                        center[0] + math.cos(angle) * u[0] + math.sin(angle) * v[0],
                        center[1] + math.cos(angle) * u[1] + math.sin(angle) * v[1],
                        center[2] + math.cos(angle) * u[2] + math.sin(angle) * v[2],
                    )
                )
        center1_index = len(vertices)
        vertices.append(c1)
        center2_index = len(vertices)
        vertices.append(c2)
        indices: list[int] = []
        for i in range(segments):
            j = (i + 1) % segments
            indices.extend([i, j, segments + j, i, segments + j, segments + i])
            indices.extend([center1_index, j, i])
            indices.extend([center2_index, segments + i, segments + j])
        return vertices, indices


def pack_glb(meshes: list[dict], out_path: Path) -> None:
    buffer = bytearray()
    buffer_views: list[dict] = []
    accessors: list[dict] = []
    nodes: list[dict] = []
    gltf_meshes: list[dict] = []

    def align4() -> None:
        while len(buffer) % 4:
            buffer.append(0)

    def add_bytes(data: bytes, target: int) -> int:
        align4()
        offset = len(buffer)
        buffer.extend(data)
        align4()
        buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data), "target": target})
        return len(buffer_views) - 1

    def add_accessor(view: int, component_type: int, count: int, type_name: str, min_value=None, max_value=None) -> int:
        accessor = {"bufferView": view, "byteOffset": 0, "componentType": component_type, "count": count, "type": type_name}
        if min_value is not None:
            accessor["min"] = [round(float(value), 6) for value in min_value]
        if max_value is not None:
            accessor["max"] = [round(float(value), 6) for value in max_value]
        accessors.append(accessor)
        return len(accessors) - 1

    materials = [
        {"name": "real_dwg_geometry", "pbrMetallicRoughness": {"baseColorFactor": [0.2, 0.72, 0.98, 0.58], "metallicFactor": 0.18, "roughnessFactor": 0.36}, "alphaMode": "BLEND", "doubleSided": True},
        {"name": "risk_geometry", "pbrMetallicRoughness": {"baseColorFactor": [0.98, 0.38, 0.18, 0.72], "metallicFactor": 0.08, "roughnessFactor": 0.34}, "alphaMode": "BLEND", "doubleSided": True},
    ]

    for mesh in meshes:
        positions = mesh["scene_vertices"]
        indices = mesh["indices"]
        normals: list[Vec3] = [(0.0, 0.0, 0.0) for _ in positions]
        for a, b, c in zip(indices[0::3], indices[1::3], indices[2::3]):
            normal = normalize(cross(sub(positions[b], positions[a]), sub(positions[c], positions[a])))
            for idx in (a, b, c):
                old = normals[idx]
                normals[idx] = (old[0] + normal[0], old[1] + normal[1], old[2] + normal[2])
        normals = [normalize(normal) for normal in normals]
        flat_pos = [coord for point in positions for coord in point]
        flat_normals = [coord for point in normals for coord in point]
        index_component = 5123 if len(positions) <= 65535 else 5125
        index_format = "H" if index_component == 5123 else "I"
        pos_view = add_bytes(struct.pack("<" + "f" * len(flat_pos), *flat_pos), 34962)
        normal_view = add_bytes(struct.pack("<" + "f" * len(flat_normals), *flat_normals), 34962)
        index_view = add_bytes(struct.pack("<" + index_format * len(indices), *indices), 34963)
        min_pos, max_pos = bounds(positions)
        pos_accessor = add_accessor(pos_view, 5126, len(positions), "VEC3", min_pos, max_pos)
        normal_accessor = add_accessor(normal_view, 5126, len(normals), "VEC3")
        index_accessor = add_accessor(index_view, index_component, len(indices), "SCALAR")
        material = 1 if mesh["handle"] in {"26A6", "2AA3", "2A76"} else 0
        gltf_meshes.append(
            {
                "name": f"solid_{mesh['handle']}",
                "primitives": [{"attributes": {"POSITION": pos_accessor, "NORMAL": normal_accessor}, "indices": index_accessor, "material": material}],
                "extras": mesh["extras"],
            }
        )
        nodes.append({"name": f"solid_{mesh['handle']}", "mesh": len(gltf_meshes) - 1, "extras": mesh["extras"]})

    gltf = {
        "asset": {"version": "2.0", "generator": "Codex SAT topology to GLB parser"},
        "scene": 0,
        "scenes": [{"name": "3Dmodel real SAT triangulation", "nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "buffers": [{"byteLength": len(buffer)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "extras": {"source": "3Dmodel.dwg -> AutoCAD SAT -> SAT topology triangulation"},
    }
    json_bytes = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    while len(buffer) % 4:
        buffer.append(0)
    total_length = 12 + 8 + len(json_bytes) + 8 + len(buffer)
    out = bytearray()
    out.extend(b"glTF")
    out.extend(struct.pack("<II", 2, total_length))
    out.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    out.extend(json_bytes)
    out.extend(struct.pack("<I4s", len(buffer), b"BIN\0"))
    out.extend(buffer)
    out_path.write_bytes(out)


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    sat_dir = root / "work" / "real-geometry-export" / "per-handle"
    metadata_path = root / "frontend" / "public" / "models" / "twin" / "3dmodel-metadata.json"
    out_glb = root / "frontend" / "public" / "models" / "twin" / "3dmodel.glb"
    report_path = root / "frontend" / "public" / "models" / "twin" / "3dmodel-metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
    solids = metadata["solids"]
    all_mins = [min(s["min"][i] for s in solids) for i in range(3)]
    all_maxs = [max(s["max"][i] for s in solids) for i in range(3)]
    center = tuple((all_mins[i] + all_maxs[i]) / 2 for i in range(3))
    scale = 0.01
    meshes = []
    diagnostics = []
    for body_id, solid in enumerate(solids):
        sat_path = sat_dir / f"{solid['handle']}.sat.SAT"
        sat = SatModel(sat_path)
        vertices, indices, surface_counts = sat.body_mesh(0)
        triangulation = "SAT topology planar fan triangulation"
        if not vertices or not indices:
            vertices, indices = sat.cylinder_mesh_from_ellipses(0)
            if vertices and indices:
                surface_counts = Counter({"cone-surface": 1, "ellipse-curve": 2})
                triangulation = "SAT cone/ellipse analytic cylinder triangulation"
        if not vertices or not indices:
            diagnostics.append(
                {
                    "handle": solid["handle"],
                    "bodyId": body_id,
                    "vertices": 0,
                    "triangles": 0,
                    "surfaceCounts": dict(surface_counts),
                    "error": "No triangulatable faces produced from single-handle SAT.",
                }
            )
            continue
        world_min, world_max = bounds(vertices)
        scene_vertices = [to_scene(point, center, scale) for point in vertices]
        diag = {
            "handle": solid["handle"],
            "bodyId": body_id,
            "vertices": len(vertices),
            "triangles": len(indices) // 3,
            "surfaceCounts": dict(surface_counts),
            "satBounds": {"min": world_min, "max": world_max},
            "cadBounds": {"min": solid["min"], "max": solid["max"]},
        }
        diagnostics.append(diag)
        meshes.append(
            {
                "handle": solid["handle"],
                "indices": indices,
                "scene_vertices": scene_vertices,
                "extras": {
                    "cadHandle": solid["handle"],
                    "bodyId": body_id,
                    "sourceObject": solid["objectName"],
                    "volume": solid.get("volume"),
                    "surfaceCounts": dict(surface_counts),
                    "triangulation": triangulation,
                },
            }
        )
    pack_glb(meshes, out_glb)
    metadata["generatedAt"] = "2026-07-04T15:30:00"
    metadata["conversion"] = "AutoCAD SAT export parsed into real face topology GLB; mesh nodes preserve CAD handle as solid_<handle>."
    metadata["counts"]["glbNodes"] = len(meshes)
    metadata["counts"]["triangles"] = sum(len(mesh["indices"]) // 3 for mesh in meshes)
    metadata["triangulationDiagnostics"] = diagnostics
    report_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"glb": str(out_glb), "nodes": len(meshes), "triangles": sum(len(m["indices"]) // 3 for m in meshes)}, indent=2))


if __name__ == "__main__":
    main()
