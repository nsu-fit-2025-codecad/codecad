import { describe, expect, it } from 'vitest';
import {
  highlightSelectedModelInSvg,
  SELECTED_MODEL_ATTRIBUTE,
  SELECTED_MODEL_CLASS,
} from '@/lib/svg-highlight';

const svgFixture = `
  <svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <g id="svgGroup">
      <g id="0">
        <g id="square">
          <line id="ShapeLine1" x1="0" y1="100" x2="100" y2="100" />
        </g>
        <g id="circle">
          <circle id="Ring_outer" r="50" cx="150" cy="100" />
        </g>
      </g>
    </g>
  </svg>
`;

describe('highlightSelectedModelInSvg', () => {
  it('adds highlight marker to selected model tag', () => {
    const highlightedSvg = highlightSelectedModelInSvg(svgFixture, 'square');
    const selectedTag = getTagById(highlightedSvg, 'square');
    const nonSelectedTag = getTagById(highlightedSvg, 'circle');

    expect(selectedTag).toContain(`${SELECTED_MODEL_ATTRIBUTE}="true"`);
    expect(selectedTag).toContain(SELECTED_MODEL_CLASS);
    expect(selectedTag).toContain('stroke:#0284c7');
    expect(nonSelectedTag).not.toContain(`${SELECTED_MODEL_ATTRIBUTE}="true"`);
  });

  it('returns original svg when selected model is null', () => {
    const highlightedSvg = highlightSelectedModelInSvg(svgFixture, null);
    expect(highlightedSvg).toBe(svgFixture);
  });

  it('returns original svg when selected model id is not found', () => {
    const highlightedSvg = highlightSelectedModelInSvg(svgFixture, 'triangle');
    expect(highlightedSvg).toBe(svgFixture);
  });
});

const getTagById = (svgString: string, id: string): string => {
  const tagMatch = svgString.match(
    new RegExp(`<[^>]+\\sid=(["'])${id}\\1[^>]*>`, 'i')
  );

  return tagMatch?.[0] ?? '';
};
