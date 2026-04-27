use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use u_nesting_d2::{Boundary2D, Config, Geometry2D, Nester2D, Solver, Strategy};
use wasm_bindgen::prelude::*;

#[derive(Clone, Deserialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Deserialize)]
struct Bounds {
    #[serde(rename = "minX")]
    min_x: f64,
    #[serde(rename = "minY")]
    min_y: f64,
    #[serde(rename = "maxX")]
    _max_x: f64,
    #[serde(rename = "maxY")]
    _max_y: f64,
    #[serde(rename = "width")]
    _width: f64,
    #[serde(rename = "height")]
    _height: f64,
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

fn normalize_contour(contour: &[Point], offset_x: f64, offset_y: f64) -> Vec<(f64, f64)> {
    contour
        .iter()
        .map(|point| (point.x - offset_x, point.y - offset_y))
        .collect()
}

fn build_boundary(shape: &PolygonShape) -> Result<Boundary2D, String> {
    let exterior = shape
        .contours
        .first()
        .ok_or_else(|| "Target has no exterior contour.".to_string())?;
    let mut boundary = Boundary2D::new(normalize_contour(
        exterior,
        shape.bounds.min_x,
        shape.bounds.min_y,
    ));

    for hole in shape.contours.iter().skip(1) {
        boundary = boundary.with_hole(normalize_contour(
            hole,
            shape.bounds.min_x,
            shape.bounds.min_y,
        ));
    }

    Ok(boundary)
}

fn build_geometry(part: &NestPart, rotations_deg: &[f64]) -> Result<Geometry2D, String> {
    let exterior = part
        .shape
        .contours
        .first()
        .ok_or_else(|| format!("Part {} has no exterior contour.", part.id))?;
    let mut geometry = Geometry2D::new(part.id.clone())
        .with_polygon(normalize_contour(
            exterior,
            part.shape.bounds.min_x,
            part.shape.bounds.min_y,
        ))
        .with_quantity(1)
        .with_rotations_deg(rotations_deg.to_vec());

    for hole in part.shape.contours.iter().skip(1) {
        geometry = geometry.with_hole(normalize_contour(
            hole,
            part.shape.bounds.min_x,
            part.shape.bounds.min_y,
        ));
    }

    Ok(geometry)
}

fn pack(input: NestInput) -> Result<NestOutput, String> {
    if input.target.contours.is_empty() {
        return Err("Target has no contours.".to_string());
    }

    if input.parts.is_empty() {
        return Ok(NestOutput {
            placements: Vec::new(),
            not_placed_ids: Vec::new(),
        });
    }

    let rotations = if input.options.rotations.is_empty() {
        vec![0.0]
    } else {
        input.options.rotations.clone()
    };
    let boundary = build_boundary(&input.target)?;
    let mut geometries = Vec::with_capacity(input.parts.len());

    for part in &input.parts {
        geometries.push(build_geometry(part, &rotations)?);
    }

    let config = Config::new()
        .with_strategy(Strategy::NfpGuided)
        .with_spacing(input.options.gap)
        .with_time_limit(5_000);
    let result = Nester2D::new(config)
        .solve(&geometries, &boundary)
        .map_err(|error| format!("u-nesting-d2 solve failed: {error}"))?;
    let placed_ids: HashSet<String> = result
        .placements
        .iter()
        .map(|placement| placement.geometry_id.clone())
        .collect();
    let mut not_placed_ids = Vec::new();

    for part in &input.parts {
        if !placed_ids.contains(&part.id) {
            not_placed_ids.push(part.id.clone());
        }
    }

    for id in result.unplaced {
        if !not_placed_ids.contains(&id) {
            not_placed_ids.push(id);
        }
    }

    Ok(NestOutput {
        placements: result
            .placements
            .into_iter()
            .map(|placement| {
                let id = placement.geometry_id.clone();
                let x = placement.x();
                let y = placement.y();
                let rotation = placement.angle().to_degrees();
                let part = input
                    .parts
                    .iter()
                    .find(|candidate| candidate.id == id);
                let part_min_x = part.map(|candidate| candidate.shape.bounds.min_x).unwrap_or(0.0);
                let part_min_y = part.map(|candidate| candidate.shape.bounds.min_y).unwrap_or(0.0);

                NestPlacement {
                    id,
                    x: input.target.bounds.min_x + x - part_min_x,
                    y: input.target.bounds.min_y + y - part_min_y,
                    rotation,
                }
            })
            .collect(),
        not_placed_ids,
    })
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
