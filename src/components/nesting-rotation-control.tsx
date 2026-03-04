import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  MAX_ROTATION_COUNT,
  MIN_ROTATION_COUNT,
  normalizeRotationCount,
} from '@/lib/nesting/polygon/rotations';

const formatRotationStep = (rotationCount: number) =>
  `${Number((360 / rotationCount).toFixed(2)).toString()}°`;

const formatRotationLabel = (rotationCount: number) => {
  if (rotationCount === 1) {
    return '1 orientation (no rotation)';
  }

  return `${rotationCount} orientations (${formatRotationStep(rotationCount)} step)`;
};

interface NestingRotationControlProps {
  rotationCount: number;
  isNesting: boolean;
  onChange: (rotationCount: number) => void;
}

export const NestingRotationControl = ({
  rotationCount,
  isNesting,
  onChange,
}: NestingRotationControlProps) => (
  <div className="space-y-1.5">
    <Label htmlFor="nesting-rotation-count" className="text-sm font-medium">
      Part rotations
    </Label>
    <p className="text-sm text-muted-foreground">
      {formatRotationLabel(rotationCount)}
    </p>
    <Slider
      id="nesting-rotation-count"
      value={[rotationCount]}
      onValueChange={(values) =>
        onChange(normalizeRotationCount(values[0], rotationCount))
      }
      min={MIN_ROTATION_COUNT}
      max={MAX_ROTATION_COUNT}
      step={1}
      disabled={isNesting}
    />
    <p className="text-xs text-muted-foreground">
      Higher values try more angles and may improve fit, but run slower.
    </p>
  </div>
);
