export const CoordinateGrid = () => {
  return (
    <svg className="w-full h-full absolute">
      <defs>
        <pattern id="lines" x="0" y="0" width="1" height="1">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="100%"
            stroke="#3B82F6"
            strokeOpacity="0.8"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="0"
            x2="100%"
            y2="0"
            stroke="#3B82F6"
            strokeOpacity="0.8"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="grid"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect fill="url(#lines)" width="20" height="20" x="0" y="0" />
        </pattern>
      </defs>
      <rect fill="url(#grid)" width="100%" height="100%" x="0" y="0" />
    </svg>
  );
};
