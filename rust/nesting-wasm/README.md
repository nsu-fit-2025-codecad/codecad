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

The current Rust code is a minimal bounds-based prototype that verifies the
worker, JSON, WASM, and placement mapping path. Replace the packing body with a
real solver candidate once the local Rust toolchain and `wasm-pack` are
available.
