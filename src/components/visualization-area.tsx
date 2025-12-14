import { CoordinateGrid } from '@/components/coordinate-grid';
import React from 'react';

interface VisualizationAreaProps {
  svgString: string;
}

export const VisualizationArea = ({ svgString }: VisualizationAreaProps) => {
  return (
    <>
      <div
        dangerouslySetInnerHTML={{ __html: svgString }}
        className="w-full h-full relative"
      />
      <CoordinateGrid />
    </>
  );
};
