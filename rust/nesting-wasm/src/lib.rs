use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

const EPSILON: f64 = 1e-9;
const DEDUPE_SCALE: f64 = 100_000.0;
const MAX_PAIRWISE_SHAPE_POINTS: usize = 24;
const MAX_CANDIDATES_PER_ROTATION: usize = 800;
const PRIORITY_CANDIDATES_PER_ROTATION: usize = 400;

#[derive(Clone, Copy, Deserialize, Serialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
struct Bounds {
    #[serde(rename = "minX")]
    min_x: f64,
    #[serde(rename = "minY")]
    min_y: f64,
    #[serde(rename = "maxX")]
    max_x: f64,
    #[serde(rename = "maxY")]
    max_y: f64,
    width: f64,
    height: f64,
}

#[derive(Clone, Deserialize)]
struct PolygonShape {
    contours: Vec<Vec<Point>>,
    bounds: Bounds,
}

#[derive(Clone, Deserialize)]
struct NestPart {
    id: String,
    shape: PolygonShape,
}

#[derive(Clone, Deserialize)]
struct NestOptions {
    gap: f64,
    rotations: Vec<f64>,
}

#[derive(Clone, Deserialize)]
struct NestInput {
    target: PolygonShape,
    parts: Vec<NestPart>,
    options: NestOptions,
}

#[derive(Serialize)]
struct NestPlacement {
    id: String,
    x: f64,
    y: f64,
    rotation: f64,
}

#[derive(Serialize)]
struct NestOutput {
    placements: Vec<NestPlacement>,
    #[serde(rename = "notPlacedIds")]
    not_placed_ids: Vec<String>,
}

#[derive(Clone)]
struct Shape {
    contours: Vec<Vec<Point>>,
    bounds: Bounds,
    area: f64,
}

#[derive(Clone)]
struct PlacedPart {
    id: String,
    x: f64,
    y: f64,
    rotation: f64,
    shape: Shape,
}

#[derive(Clone)]
struct Candidate {
    x: f64,
    y: f64,
    shape: Shape,
    score: CandidateScore,
}

#[derive(Clone, Copy)]
struct CandidateScore {
    area: f64,
    width: f64,
    height: f64,
    y: f64,
    x: f64,
}

fn bounds_from_points(points: impl Iterator<Item = Point>) -> Bounds {
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    let mut has_point = false;

    for point in points {
        has_point = true;
        min_x = min_x.min(point.x);
        min_y = min_y.min(point.y);
        max_x = max_x.max(point.x);
        max_y = max_y.max(point.y);
    }

    if !has_point {
        return Bounds {
            min_x: 0.0,
            min_y: 0.0,
            max_x: 0.0,
            max_y: 0.0,
            width: 0.0,
            height: 0.0,
        };
    }

    Bounds {
        min_x,
        min_y,
        max_x,
        max_y,
        width: max_x - min_x,
        height: max_y - min_y,
    }
}

fn contour_area(contour: &[Point]) -> f64 {
    if contour.len() < 3 {
        return 0.0;
    }

    let mut area = 0.0;
    for index in 0..contour.len() {
        let current = contour[index];
        let next = contour[(index + 1) % contour.len()];
        area += current.x * next.y - next.x * current.y;
    }

    area / 2.0
}

fn create_shape(contours: Vec<Vec<Point>>) -> Shape {
    let bounds = bounds_from_points(contours.iter().flatten().copied());
    let area = contours.iter().map(|contour| contour_area(contour)).sum::<f64>().abs();

    Shape {
        contours,
        bounds,
        area,
    }
}

fn normalize_source_shape(shape: &PolygonShape) -> Shape {
    create_shape(
        shape
            .contours
            .iter()
            .map(|contour| {
                contour
                    .iter()
                    .map(|point| Point {
                        x: point.x - shape.bounds.min_x,
                        y: point.y - shape.bounds.min_y,
                    })
                    .collect()
            })
            .collect(),
    )
}

fn target_shape(shape: &PolygonShape) -> Shape {
    create_shape(shape.contours.clone())
}

fn rotate_shape(shape: &Shape, rotation: f64) -> Shape {
    if rotation.abs() <= EPSILON {
        return shape.clone();
    }

    let radians = rotation.to_radians();
    let cos = radians.cos();
    let sin = radians.sin();

    create_shape(
        shape
            .contours
            .iter()
            .map(|contour| {
                contour
                    .iter()
                    .map(|point| Point {
                        x: point.x * cos - point.y * sin,
                        y: point.x * sin + point.y * cos,
                    })
                    .collect()
            })
            .collect(),
    )
}

fn translate_shape(shape: &Shape, dx: f64, dy: f64) -> Shape {
    create_shape(
        shape
            .contours
            .iter()
            .map(|contour| {
                contour
                    .iter()
                    .map(|point| Point {
                        x: point.x + dx,
                        y: point.y + dy,
                    })
                    .collect()
            })
            .collect(),
    )
}

fn normalize_shape_for_rotation(shape: &Shape, rotation: f64) -> Shape {
    let rotated = rotate_shape(shape, rotation);
    translate_shape(&rotated, -rotated.bounds.min_x, -rotated.bounds.min_y)
}

fn signed_cross(a: Point, b: Point, c: Point) -> f64 {
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

fn is_point_on_segment(point: Point, a: Point, b: Point) -> bool {
    if signed_cross(a, b, point).abs() > EPSILON {
        return false;
    }

    (point.x - a.x) * (point.x - b.x) + (point.y - a.y) * (point.y - b.y) <= EPSILON
}

fn segments_cross_strict(a1: Point, a2: Point, b1: Point, b2: Point) -> bool {
    let d1 = signed_cross(a1, a2, b1);
    let d2 = signed_cross(a1, a2, b2);
    let d3 = signed_cross(b1, b2, a1);
    let d4 = signed_cross(b1, b2, a2);

    ((d1 > EPSILON && d2 < -EPSILON) || (d1 < -EPSILON && d2 > EPSILON))
        && ((d3 > EPSILON && d4 < -EPSILON) || (d3 < -EPSILON && d4 > EPSILON))
}

fn segments_intersect(a1: Point, a2: Point, b1: Point, b2: Point) -> bool {
    segments_cross_strict(a1, a2, b1, b2)
        || is_point_on_segment(b1, a1, a2)
        || is_point_on_segment(b2, a1, a2)
        || is_point_on_segment(a1, b1, b2)
        || is_point_on_segment(a2, b1, b2)
}

fn point_to_segment_distance(point: Point, a: Point, b: Point) -> f64 {
    let ab_x = b.x - a.x;
    let ab_y = b.y - a.y;
    let ab_len_sq = ab_x * ab_x + ab_y * ab_y;

    if ab_len_sq <= EPSILON {
        return ((point.x - a.x).powi(2) + (point.y - a.y).powi(2)).sqrt();
    }

    let projection = ((point.x - a.x) * ab_x + (point.y - a.y) * ab_y) / ab_len_sq;
    let t = projection.clamp(0.0, 1.0);
    let closest = Point {
        x: a.x + ab_x * t,
        y: a.y + ab_y * t,
    };

    ((point.x - closest.x).powi(2) + (point.y - closest.y).powi(2)).sqrt()
}

fn segment_distance(a1: Point, a2: Point, b1: Point, b2: Point) -> f64 {
    if segments_intersect(a1, a2, b1, b2) {
        return 0.0;
    }

    point_to_segment_distance(a1, b1, b2)
        .min(point_to_segment_distance(a2, b1, b2))
        .min(point_to_segment_distance(b1, a1, a2))
        .min(point_to_segment_distance(b2, a1, a2))
}

fn contour_segments(contour: &[Point]) -> Vec<(Point, Point)> {
    if contour.len() < 2 {
        return Vec::new();
    }

    (0..contour.len())
        .map(|index| (contour[index], contour[(index + 1) % contour.len()]))
        .collect()
}

fn point_in_contour(point: Point, contour: &[Point]) -> bool {
    if contour.len() < 3 {
        return false;
    }

    let mut inside = false;
    let mut previous = contour[contour.len() - 1];

    for current in contour {
        if is_point_on_segment(point, previous, *current) {
            return true;
        }

        if (current.y > point.y) != (previous.y > point.y)
            && point.x
                < ((previous.x - current.x) * (point.y - current.y))
                    / (previous.y - current.y)
                    + current.x
        {
            inside = !inside;
        }

        previous = *current;
    }

    inside
}

fn point_in_polygon(point: Point, shape: &Shape) -> bool {
    let mut winding = 0;

    for contour in &shape.contours {
        if !point_in_contour(point, contour) {
            continue;
        }

        let area = contour_area(contour);
        if area.abs() <= EPSILON {
            continue;
        }

        winding += if area > 0.0 { 1 } else { -1 };
    }

    winding > 0
}

fn point_on_shape_boundary(point: Point, shape: &Shape) -> bool {
    shape
        .contours
        .iter()
        .flat_map(|contour| contour_segments(contour))
        .any(|(start, end)| is_point_on_segment(point, start, end))
}

fn point_strictly_inside_polygon(point: Point, shape: &Shape) -> bool {
    point_in_polygon(point, shape) && !point_on_shape_boundary(point, shape)
}

fn bounds_overlap(a: Bounds, b: Bounds, padding: f64) -> bool {
    !(a.max_x + padding < b.min_x
        || b.max_x + padding < a.min_x
        || a.max_y + padding < b.min_y
        || b.max_y + padding < a.min_y)
}

fn material_probe_points(contour: &[Point]) -> Vec<Point> {
    let mut points = Vec::with_capacity(contour.len() * 2 + 1);

    if contour.is_empty() {
        return points;
    }

    let centroid = contour.iter().fold(Point { x: 0.0, y: 0.0 }, |acc, point| Point {
        x: acc.x + point.x,
        y: acc.y + point.y,
    });
    points.push(Point {
        x: centroid.x / contour.len() as f64,
        y: centroid.y / contour.len() as f64,
    });
    points.extend(contour.iter().copied());

    for (start, end) in contour_segments(contour) {
        points.push(Point {
            x: (start.x + end.x) / 2.0,
            y: (start.y + end.y) / 2.0,
        });
    }

    points
}

fn has_strict_containment(source: &Shape, target: &Shape) -> bool {
    source.contours.iter().any(|contour| {
        material_probe_points(contour).into_iter().any(|point| {
            point_in_polygon(point, source) && point_strictly_inside_polygon(point, target)
        })
    })
}

fn polygons_overlap(a: &Shape, b: &Shape, gap: f64) -> bool {
    if !bounds_overlap(a.bounds, b.bounds, gap) {
        return false;
    }

    for contour_a in &a.contours {
        let segments_a = contour_segments(contour_a);

        for contour_b in &b.contours {
            let segments_b = contour_segments(contour_b);

            for (a_start, a_end) in &segments_a {
                for (b_start, b_end) in &segments_b {
                    if segments_cross_strict(*a_start, *a_end, *b_start, *b_end) {
                        return true;
                    }

                    if gap > EPSILON
                        && segment_distance(*a_start, *a_end, *b_start, *b_end) < gap - EPSILON
                    {
                        return true;
                    }
                }
            }
        }
    }

    has_strict_containment(a, b) || has_strict_containment(b, a)
}

fn simple_region_from_contour(contour: &[Point]) -> Shape {
    let mut normalized = contour.to_vec();

    if contour_area(&normalized) < 0.0 {
        normalized.reverse();
    }

    create_shape(vec![normalized])
}

fn boundary_distance(point: Point, shape: &Shape) -> f64 {
    shape
        .contours
        .iter()
        .flat_map(|contour| contour_segments(contour))
        .map(|(start, end)| point_to_segment_distance(point, start, end))
        .fold(f64::INFINITY, f64::min)
}

fn shape_inside_bin(shape: &Shape, bin: &Shape, gap: f64) -> bool {
    if shape.contours.is_empty() || bin.contours.is_empty() {
        return false;
    }

    if shape.bounds.min_x < bin.bounds.min_x - EPSILON
        || shape.bounds.max_x > bin.bounds.max_x + EPSILON
        || shape.bounds.min_y < bin.bounds.min_y - EPSILON
        || shape.bounds.max_y > bin.bounds.max_y + EPSILON
    {
        return false;
    }

    for contour in &shape.contours {
        for point in contour {
            if !point_in_polygon(*point, bin) {
                return false;
            }

            if gap > EPSILON && boundary_distance(*point, bin) < gap - EPSILON {
                return false;
            }
        }
    }

    for contour in &shape.contours {
        for (shape_start, shape_end) in contour_segments(contour) {
            for bin_contour in &bin.contours {
                for (bin_start, bin_end) in contour_segments(bin_contour) {
                    if segments_cross_strict(shape_start, shape_end, bin_start, bin_end) {
                        return false;
                    }

                    if gap > EPSILON
                        && segment_distance(shape_start, shape_end, bin_start, bin_end)
                            < gap - EPSILON
                    {
                        return false;
                    }
                }
            }
        }
    }

    for hole in bin.contours.iter().skip(1) {
        let hole_region = simple_region_from_contour(hole);
        if polygons_overlap(shape, &hole_region, gap) {
            return false;
        }
    }

    true
}

fn collect_vertices(shape: &Shape) -> Vec<Point> {
    shape.contours.iter().flatten().copied().collect()
}

fn sample_points(points: &[Point], max_points: usize) -> Vec<Point> {
    if points.len() <= max_points {
        return points.to_vec();
    }

    let step = points.len().div_ceil(max_points);
    points.iter().step_by(step).copied().collect()
}

fn push_candidate(points: &mut Vec<Point>, seen: &mut HashSet<(i64, i64)>, x: f64, y: f64) {
    if !x.is_finite() || !y.is_finite() {
        return;
    }

    let key = ((x * DEDUPE_SCALE).round() as i64, (y * DEDUPE_SCALE).round() as i64);
    if seen.insert(key) {
        points.push(Point { x, y });
    }
}

fn add_vertex_alignment_candidates(
    points: &mut Vec<Point>,
    seen: &mut HashSet<(i64, i64)>,
    stationary: &Shape,
    moving: &Shape,
) {
    let stationary_vertices = sample_points(&collect_vertices(stationary), MAX_PAIRWISE_SHAPE_POINTS);
    let moving_vertices = sample_points(&collect_vertices(moving), MAX_PAIRWISE_SHAPE_POINTS);

    for stationary_vertex in &stationary_vertices {
        for moving_vertex in &moving_vertices {
            push_candidate(points, seen, stationary_vertex.x - moving_vertex.x, stationary_vertex.y - moving_vertex.y);
        }
    }
}

fn add_hole_interior_anchors(
    points: &mut Vec<Point>,
    seen: &mut HashSet<(i64, i64)>,
    hole_shape: &Shape,
    moving: &Shape,
    gap: f64,
) {
    let min_x = hole_shape.bounds.min_x - moving.bounds.min_x + gap;
    let max_x = hole_shape.bounds.max_x - moving.bounds.max_x - gap;
    let min_y = hole_shape.bounds.min_y - moving.bounds.min_y + gap;
    let max_y = hole_shape.bounds.max_y - moving.bounds.max_y - gap;

    if max_x < min_x - EPSILON || max_y < min_y - EPSILON {
        return;
    }

    let center_x = (min_x + max_x) / 2.0;
    let center_y = (min_y + max_y) / 2.0;
    push_candidate(points, seen, center_x, center_y);

    if max_x - min_x > EPSILON {
        push_candidate(points, seen, (min_x * 3.0 + max_x) / 4.0, center_y);
        push_candidate(points, seen, (min_x + max_x * 3.0) / 4.0, center_y);
    }

    if max_y - min_y > EPSILON {
        push_candidate(points, seen, center_x, (min_y * 3.0 + max_y) / 4.0);
        push_candidate(points, seen, center_x, (min_y + max_y * 3.0) / 4.0);
    }
}

fn add_hole_candidates(
    points: &mut Vec<Point>,
    seen: &mut HashSet<(i64, i64)>,
    placed_shape: &Shape,
    moving: &Shape,
    gap: f64,
) {
    let moving_vertices = sample_points(&collect_vertices(moving), MAX_PAIRWISE_SHAPE_POINTS);

    for hole in placed_shape.contours.iter().skip(1) {
        if hole.len() < 3 {
            continue;
        }

        let hole_shape = simple_region_from_contour(hole);
        add_hole_interior_anchors(points, seen, &hole_shape, moving, gap);

        push_candidate(
            points,
            seen,
            hole_shape.bounds.min_x - moving.bounds.min_x,
            hole_shape.bounds.min_y - moving.bounds.min_y,
        );
        push_candidate(
            points,
            seen,
            hole_shape.bounds.max_x - moving.bounds.max_x,
            hole_shape.bounds.min_y - moving.bounds.min_y,
        );
        push_candidate(
            points,
            seen,
            hole_shape.bounds.min_x - moving.bounds.min_x,
            hole_shape.bounds.max_y - moving.bounds.max_y,
        );
        push_candidate(
            points,
            seen,
            hole_shape.bounds.max_x - moving.bounds.max_x,
            hole_shape.bounds.max_y - moving.bounds.max_y,
        );

        for hole_vertex in sample_points(&collect_vertices(&hole_shape), MAX_PAIRWISE_SHAPE_POINTS) {
            for moving_vertex in &moving_vertices {
                push_candidate(points, seen, hole_vertex.x - moving_vertex.x, hole_vertex.y - moving_vertex.y);
            }
        }
    }
}

fn candidate_points(bin: &Shape, moving: &Shape, placed_parts: &[PlacedPart], gap: f64) -> Vec<Point> {
    let mut points = Vec::new();
    let mut seen = HashSet::new();

    push_candidate(&mut points, &mut seen, bin.bounds.min_x, bin.bounds.min_y);
    push_candidate(
        &mut points,
        &mut seen,
        bin.bounds.max_x - moving.bounds.width,
        bin.bounds.min_y,
    );
    push_candidate(
        &mut points,
        &mut seen,
        bin.bounds.min_x,
        bin.bounds.max_y - moving.bounds.height,
    );
    push_candidate(
        &mut points,
        &mut seen,
        bin.bounds.max_x - moving.bounds.width,
        bin.bounds.max_y - moving.bounds.height,
    );
    add_vertex_alignment_candidates(&mut points, &mut seen, bin, moving);

    for placed in placed_parts {
        push_candidate(&mut points, &mut seen, placed.shape.bounds.max_x + gap, placed.shape.bounds.min_y);
        push_candidate(&mut points, &mut seen, placed.shape.bounds.min_x, placed.shape.bounds.max_y + gap);
        add_vertex_alignment_candidates(&mut points, &mut seen, &placed.shape, moving);
        add_hole_candidates(&mut points, &mut seen, &placed.shape, moving, gap);
    }

    points.sort_by(|a, b| a.y.total_cmp(&b.y).then_with(|| a.x.total_cmp(&b.x)));

    if points.len() <= MAX_CANDIDATES_PER_ROTATION {
        return points;
    }

    let head_count = PRIORITY_CANDIDATES_PER_ROTATION.min(MAX_CANDIDATES_PER_ROTATION);
    let mut limited = points[..head_count].to_vec();
    let remaining_budget = MAX_CANDIDATES_PER_ROTATION - limited.len();

    if remaining_budget > 0 {
        let tail = &points[head_count..];
        let stride = tail.len() as f64 / remaining_budget as f64;

        for index in 0..remaining_budget {
            let tail_index = ((index as f64) * stride).floor() as usize;
            limited.push(tail[tail_index.min(tail.len() - 1)]);
        }
    }

    limited.sort_by(|a, b| a.y.total_cmp(&b.y).then_with(|| a.x.total_cmp(&b.x)));
    limited
}

fn rotations(options: &NestOptions) -> Vec<f64> {
    let source = if options.rotations.is_empty() {
        vec![0.0]
    } else {
        options.rotations.clone()
    };
    let mut normalized = source
        .into_iter()
        .filter(|rotation| rotation.is_finite())
        .map(|rotation| {
            let value = rotation % 360.0;
            if value < 0.0 { value + 360.0 } else { value }
        })
        .collect::<Vec<_>>();

    normalized.sort_by(|a, b| a.total_cmp(b));
    normalized.dedup_by(|a, b| (*a - *b).abs() <= 1e-6);

    if normalized.is_empty() {
        normalized.push(0.0);
    }

    normalized
}

fn better_score(a: CandidateScore, b: CandidateScore) -> Ordering {
    a.area
        .total_cmp(&b.area)
        .then_with(|| a.height.total_cmp(&b.height))
        .then_with(|| a.width.total_cmp(&b.width))
        .then_with(|| a.y.total_cmp(&b.y))
        .then_with(|| a.x.total_cmp(&b.x))
}

fn combined_bounds_with_candidate(candidate: Bounds, placed_parts: &[PlacedPart]) -> Bounds {
    let mut min_x = candidate.min_x;
    let mut min_y = candidate.min_y;
    let mut max_x = candidate.max_x;
    let mut max_y = candidate.max_y;

    for placed in placed_parts {
        min_x = min_x.min(placed.shape.bounds.min_x);
        min_y = min_y.min(placed.shape.bounds.min_y);
        max_x = max_x.max(placed.shape.bounds.max_x);
        max_y = max_y.max(placed.shape.bounds.max_y);
    }

    Bounds {
        min_x,
        min_y,
        max_x,
        max_y,
        width: max_x - min_x,
        height: max_y - min_y,
    }
}

fn candidate_bounds(moving: &Shape, point: Point) -> Bounds {
    Bounds {
        min_x: moving.bounds.min_x + point.x,
        min_y: moving.bounds.min_y + point.y,
        max_x: moving.bounds.max_x + point.x,
        max_y: moving.bounds.max_y + point.y,
        width: moving.bounds.width,
        height: moving.bounds.height,
    }
}

fn candidate_bounds_inside(candidate: Bounds, bin: &Shape) -> bool {
    candidate.min_x >= bin.bounds.min_x - EPSILON
        && candidate.max_x <= bin.bounds.max_x + EPSILON
        && candidate.min_y >= bin.bounds.min_y - EPSILON
        && candidate.max_y <= bin.bounds.max_y + EPSILON
}

fn place_parts_greedy(input: &NestInput) -> NestOutput {
    let bin = target_shape(&input.target);
    let rotations = rotations(&input.options);
    let mut parts = input
        .parts
        .iter()
        .map(|part| (part, normalize_source_shape(&part.shape)))
        .collect::<Vec<_>>();

    parts.sort_by(|(part_a, shape_a), (part_b, shape_b)| {
        shape_b
            .area
            .total_cmp(&shape_a.area)
            .then_with(|| part_a.id.cmp(&part_b.id))
    });

    let mut placements = Vec::new();
    let mut not_placed_ids = Vec::new();
    let mut placed_parts = Vec::new();

    for (part, source_shape) in parts {
        let mut best_candidate: Option<Candidate> = None;
        let mut best_rotation = 0.0;

        for rotation in &rotations {
            let moving = normalize_shape_for_rotation(&source_shape, *rotation);
            let placed_shapes = placed_parts
                .iter()
                .map(|placed: &PlacedPart| placed.shape.clone())
                .collect::<Vec<_>>();

            for point in candidate_points(&bin, &moving, &placed_parts, input.options.gap) {
                let bounds = candidate_bounds(&moving, point);

                if !candidate_bounds_inside(bounds, &bin) {
                    continue;
                }

                let candidate_shape = translate_shape(&moving, point.x, point.y);

                if !shape_inside_bin(&candidate_shape, &bin, input.options.gap) {
                    continue;
                }

                if placed_shapes
                    .iter()
                    .any(|placed_shape| polygons_overlap(&candidate_shape, placed_shape, input.options.gap))
                {
                    continue;
                }

                let combined_bounds = combined_bounds_with_candidate(candidate_shape.bounds, &placed_parts);
                let score = CandidateScore {
                    area: combined_bounds.width * combined_bounds.height,
                    width: combined_bounds.width,
                    height: combined_bounds.height,
                    y: point.y,
                    x: point.x,
                };

                let candidate = Candidate {
                    x: point.x,
                    y: point.y,
                    shape: candidate_shape,
                    score,
                };

                if best_candidate
                    .as_ref()
                    .map_or(true, |best| better_score(candidate.score, best.score).is_lt())
                {
                    best_candidate = Some(candidate);
                    best_rotation = *rotation;
                }
            }
        }

        let Some(candidate) = best_candidate else {
            not_placed_ids.push(part.id.clone());
            continue;
        };

        placements.push(NestPlacement {
            id: part.id.clone(),
            x: candidate.x,
            y: candidate.y,
            rotation: best_rotation,
        });
        placed_parts.push(PlacedPart {
            id: part.id.clone(),
            x: candidate.x,
            y: candidate.y,
            rotation: best_rotation,
            shape: candidate.shape,
        });
    }

    NestOutput {
        placements,
        not_placed_ids,
    }
}

fn pack(input: NestInput) -> Result<NestOutput, String> {
    if input.target.contours.is_empty() {
        return Err("Target has no contours.".to_string());
    }

    if input.target.bounds.width <= 0.0 || input.target.bounds.height <= 0.0 {
        return Err("Target bounds must have positive width and height.".to_string());
    }

    Ok(place_parts_greedy(&input))
}

#[wasm_bindgen]
pub fn run_nesting(input_json: &str) -> Result<String, JsValue> {
    console_error_panic_hook::set_once();

    let input: NestInput = serde_json::from_str(input_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid nesting input: {error}")))?;
    let output = pack(input).map_err(|error| JsValue::from_str(&error))?;

    serde_json::to_string(&output)
        .map_err(|error| JsValue::from_str(&format!("Invalid nesting output: {error}")))
}
