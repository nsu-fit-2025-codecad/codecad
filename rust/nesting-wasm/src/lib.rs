use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Clone, Deserialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Deserialize)]
struct Bounds {
    minX: f64,
    minY: f64,
    maxX: f64,
    maxY: f64,
    width: f64,
    height: f64,
}

#[derive(Clone, Deserialize)]
struct PolygonShape {
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
    notPlacedIds: Vec<String>,
}

fn rotated_size(bounds: &Bounds, rotation: f64) -> (f64, f64) {
    let normalized = rotation.rem_euclid(180.0);

    if (normalized - 90.0).abs() < 1e-9 {
        (bounds.height, bounds.width)
    } else {
        (bounds.width, bounds.height)
    }
}

fn pack(input: NestInput) -> NestOutput {
    let target = input.target.bounds;
    let mut cursor_x = target.minX;
    let mut cursor_y = target.minY;
    let mut row_height = 0.0;
    let mut placements = Vec::new();
    let mut not_placed_ids = Vec::new();

    for part in input.parts {
        let rotation = input.options.rotations.first().copied().unwrap_or(0.0);
        let (width, height) = rotated_size(&part.shape.bounds, rotation);

        if width > target.width || height > target.height {
            not_placed_ids.push(part.id);
            continue;
        }

        if cursor_x + width > target.maxX {
            cursor_x = target.minX;
            cursor_y += row_height + input.options.gap;
            row_height = 0.0;
        }

        if cursor_y + height > target.maxY {
            not_placed_ids.push(part.id);
            continue;
        }

        placements.push(NestPlacement {
            id: part.id,
            x: cursor_x - part.shape.bounds.minX,
            y: cursor_y - part.shape.bounds.minY,
            rotation,
        });
        cursor_x += width + input.options.gap;
        row_height = row_height.max(height);
    }

    NestOutput {
        placements,
        notPlacedIds: not_placed_ids,
    }
}

#[wasm_bindgen]
pub fn run_nesting(input_json: &str) -> Result<String, JsValue> {
    let input: NestInput = serde_json::from_str(input_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid nesting input: {error}")))?;
    let output = pack(input);

    serde_json::to_string(&output)
        .map_err(|error| JsValue::from_str(&format!("Invalid nesting output: {error}")))
}
