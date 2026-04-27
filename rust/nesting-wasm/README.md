# Nesting WASM Prototype

This crate is the narrow browser boundary for the experimental Rust/WASM
nesting engine.

Build from the repository root:

```sh
npm run wasm:build
```

The generated package is written to:

```text
src/lib/nesting/solver/rust-wasm/pkg
```

CI uploads the same folder as the `nesting-wasm-pkg` workflow artifact. To use
that build locally, download the artifact from a GitHub Actions run and extract
its contents into the same `pkg` folder.

The current Rust code adapts the app's JSON payload into `u-nesting-d2` and
runs its `BottomLeftFill` strategy. It is still experimental until parity
fixtures cover holes, concave parts, spacing, and rotations.
