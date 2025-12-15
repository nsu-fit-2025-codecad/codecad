declare global {
  interface Window {
    SVGnest: {
      nest: (
        polygons: Array<Array<{x: number, y: number}>>,
        containers: Array<Array<{x: number, y: number}>>,
        config: {
          curveTolerance?: number;
          spacing?: number;
          rotations?: number;
          populationSize?: number;
          mutationRate?: number;
          useHoles?: boolean;
        },
        progressCallback: (progress: number) => void,
        callback: (error: Error | null, placements: Array<{x: number, y: number, rotation: number}>) => void
      ) => void;
    };
  }
}

export {};