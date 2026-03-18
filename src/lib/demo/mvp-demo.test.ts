import { describe, expect, it } from 'vitest';
import { getCadSnippet } from '@/lib/cad/snippets';
import { normalizePackingOptions } from '@/lib/nesting/orchestration/options';
import {
  getMvpDemoNestingPreset,
  getMvpDemoScene,
  MVP_DEMO_NESTING_PRESET_IDS,
  MVP_DEMO_SCENES,
} from '@/lib/demo/mvp-demo';

describe('MVP demo configuration', () => {
  it('defines exactly five demo scenes with unique English titles', () => {
    expect(MVP_DEMO_SCENES).toHaveLength(6);

    const titles = MVP_DEMO_SCENES.map((scene) => scene.title);

    expect(titles).toEqual([
      'Mounting Plate',
      'Rail Pack',
      'Tray Inserts',
      'Frame Insert',
      'Perforated Sheet',
      'Rounded Mix',
    ]);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('keeps one DSL scene and five nesting scenes', () => {
    const dslScenes = MVP_DEMO_SCENES.filter((scene) => scene.kind === 'dsl');
    const nestingScenes = MVP_DEMO_SCENES.filter(
      (scene) => scene.kind === 'nesting'
    );

    expect(dslScenes).toHaveLength(1);
    expect(dslScenes[0].id).toBe('mountingPlate');
    expect(nestingScenes).toHaveLength(5);
    nestingScenes.forEach((scene) => {
      expect(scene.recommendedTargetModelId).toBe('target');
    });
  });

  it('keeps all scene snippets loadable through the shared registry', () => {
    MVP_DEMO_SCENES.forEach((scene) => {
      expect(scene.code).toBe(getCadSnippet(scene.snippetId).code);
      expect(scene.parameters).toEqual(
        getCadSnippet(scene.snippetId).parameters
      );
      expect(scene.parameters.length).toBeGreaterThan(0);
      expect(scene.code).toContain('return cad.flatLayout');
    });
  });

  it('defines exactly four nesting presets for nesting scenes', () => {
    expect(MVP_DEMO_NESTING_PRESET_IDS).toEqual([
      'standard',
      'genetic',
      'rotationOff',
      'wideGap',
    ]);

    const presetTitles = MVP_DEMO_NESTING_PRESET_IDS.map(
      (presetId) => getMvpDemoNestingPreset(presetId).title
    );

    expect(presetTitles).toEqual(['Standard', 'Genetic', 'No Rot', 'Wide Gap']);
    expect(new Set(presetTitles).size).toBe(presetTitles.length);
  });

  it('keeps preset options normalized and scene lookup stable', () => {
    expect(getMvpDemoScene('railPack').kind).toBe('nesting');
    expect(getMvpDemoScene('frameInsert').kind).toBe('nesting');
    expect(getMvpDemoScene('mountingPlate').kind).toBe('dsl');

    const standard = normalizePackingOptions(
      getMvpDemoNestingPreset('standard').options
    );
    const genetic = normalizePackingOptions(
      getMvpDemoNestingPreset('genetic').options
    );
    const rotationOff = normalizePackingOptions(
      getMvpDemoNestingPreset('rotationOff').options
    );
    const wideGap = normalizePackingOptions(
      getMvpDemoNestingPreset('wideGap').options
    );

    expect(standard.useGeneticSearch).toBe(false);
    expect(standard.rotations).toEqual([0, 90, 180, 270]);
    expect(genetic.useGeneticSearch).toBe(true);
    expect(rotationOff.rotations).toEqual([0]);
    expect(wideGap.gap).toBe(10);
  });
});
