use jagua_rs::io::ext_repr::{
    ExtItem as JaguaExtItem, ExtPolygon, ExtSPolygon, ExtShape,
};
use jagua_rs::io::import::Importer;
use jagua_rs::probs::spp::io::ext_repr::{
    ExtItem as StripExtItem, ExtSPInstance,
};
use rand::SeedableRng;
use rand_xoshiro::Xoshiro256PlusPlus;
use serde::{Deserialize, Serialize};
use sparrow::config::DEFAULT_SPARROW_CONFIG;
use sparrow::optimizer::optimize;
use sparrow::util::listener::DummySolListener;
use sparrow::util::terminator::Terminator;
use std::collections::HashSet;
use std::time::Duration;
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
    width: f64,
    #[serde(rename = "height")]
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
    seed: Option<u64>,
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

struct WasmTerminator {
    timeout: Option<jagua_rs::Instant>,
}

impl WasmTerminator {
    fn new() -> Self {
        Self { timeout: None }
    }
}

impl Terminator for WasmTerminator {
    fn kill(&self) -> bool {
        self.timeout
            .map_or(false, |timeout| jagua_rs::Instant::now() > timeout)
    }

    fn new_timeout(&mut self, timeout: Duration) {
        self.timeout = Some(jagua_rs::Instant::now() + timeout);
    }

    fn timeout_at(&self) -> Option<jagua_rs::Instant> {
        self.timeout
    }
}

fn normalize_contour(contour: &[Point], offset_x: f64, offset_y: f64) -> ExtSPolygon {
    ExtSPolygon(
        contour
            .iter()
            .map(|point| ((point.x - offset_x) as f32, (point.y - offset_y) as f32))
            .collect(),
    )
}

fn build_shape(shape: &PolygonShape) -> Result<ExtShape, String> {
    let exterior = shape
        .contours
        .first()
        .ok_or_else(|| "Shape has no exterior contour.".to_string())?;
    let outer = normalize_contour(exterior, shape.bounds.min_x, shape.bounds.min_y);

    if shape.contours.len() <= 1 {
        return Ok(ExtShape::SimplePolygon(outer));
    }

    Ok(ExtShape::Polygon(ExtPolygon {
        outer,
        inner: shape
            .contours
            .iter()
            .skip(1)
            .map(|hole| normalize_contour(hole, shape.bounds.min_x, shape.bounds.min_y))
            .collect(),
    }))
}

fn build_instance(input: &NestInput) -> Result<ExtSPInstance, String> {
    let rotations = if input.options.rotations.is_empty() {
        vec![0.0]
    } else {
        input.options.rotations.clone()
    };
    Ok(ExtSPInstance {
        name: "code-cad".to_string(),
        strip_height: input.target.bounds.height as f32,
        items: input
            .parts
            .iter()
            .enumerate()
            .map(|(index, part)| {
                Ok(StripExtItem {
                    base: JaguaExtItem {
                        id: index as u64,
                        allowed_orientations: Some(
                            rotations.iter().map(|rotation| *rotation as f32).collect(),
                        ),
                        shape: build_shape(&part.shape)?,
                        min_quality: None,
                    },
                    demand: 1,
                })
            })
            .collect::<Result<Vec<_>, String>>()?,
    })
}

fn transformed_bounds(part: &NestPart, rotation: f64, translation: (f32, f32)) -> (f64, f64) {
    let radians = rotation;
    let cos = radians.cos();
    let sin = radians.sin();
    let tx = f64::from(translation.0);
    let ty = f64::from(translation.1);
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;

    if let Some(exterior) = part.shape.contours.first() {
        for point in exterior {
            let x = point.x - part.shape.bounds.min_x;
            let y = point.y - part.shape.bounds.min_y;
            let transformed_x = x * cos - y * sin + tx;
            let transformed_y = x * sin + y * cos + ty;

            min_x = min_x.min(transformed_x);
            min_y = min_y.min(transformed_y);
        }
    }

    (min_x.max(0.0), min_y.max(0.0))
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

    if input.target.bounds.height <= 0.0 || input.target.bounds.width <= 0.0 {
        return Err("Target bounds must have positive width and height.".to_string());
    }

    let mut config = DEFAULT_SPARROW_CONFIG;
    config.expl_cfg.time_limit = Duration::from_millis(150);
    config.cmpr_cfg.time_limit = Duration::from_millis(50);
    config.expl_cfg.separator_config.n_workers = 1;
    config.cmpr_cfg.separator_config.n_workers = 1;
    config.min_item_separation = if input.options.gap > 0.0 {
        Some(input.options.gap as f32)
    } else {
        None
    };

    let ext_instance = build_instance(&input)?;
    let importer = Importer::new(
        config.cde_config,
        config.poly_simpl_tolerance,
        config.min_item_separation,
        config.narrow_concavity_cutoff_ratio,
    );
    let instance = jagua_rs::probs::spp::io::import(&importer, &ext_instance)
        .map_err(|error| format!("sparrow import failed: {error}"))?;
    let rng = Xoshiro256PlusPlus::seed_from_u64(input.options.seed.unwrap_or(1));
    let mut listener = DummySolListener;
    let mut terminator = WasmTerminator::new();
    let epoch = jagua_rs::Instant::now();
    let solution = optimize(
        instance.clone(),
        rng,
        &mut listener,
        &mut terminator,
        &config.expl_cfg,
        &config.cmpr_cfg,
    );
    let exported = jagua_rs::probs::spp::io::export(&instance, &solution, epoch);
    let mut placed_ids = HashSet::new();
    let mut placements = Vec::new();

    for placed_item in exported.layout.placed_items {
        let part_index = placed_item.item_id as usize;
        let Some(part) = input.parts.get(part_index) else {
            continue;
        };
        let rotation_rad = f64::from(placed_item.transformation.rotation);
        let (x, y) = transformed_bounds(
            part,
            rotation_rad,
            placed_item.transformation.translation,
        );

        placed_ids.insert(part.id.clone());
        placements.push(NestPlacement {
            id: part.id.clone(),
            x,
            y,
            rotation: rotation_rad.to_degrees(),
        });
    }

    let not_placed_ids = input
        .parts
        .iter()
        .filter(|part| !placed_ids.contains(&part.id))
        .map(|part| part.id.clone())
        .collect();

    Ok(NestOutput {
        placements,
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
