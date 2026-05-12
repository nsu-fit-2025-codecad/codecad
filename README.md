Vite template with my main stack.

```bash
npm install -g degit

degit mordv/clean-vite
```

Se details for [Degit](https://github.com/Rich-Harris/degit)

## Reusable Nesting API

The reusable nesting surface is exported from `src/lib/nesting.ts`. It has no
React, Zustand, UI, or worker protocol dependency; the app controller and worker
client are adapters around it.

```ts
import makerjs from 'makerjs';
import { runNestingInArea } from '@/lib/nesting';

const result = runNestingInArea({
  nestingArea: new makerjs.models.Rectangle(300, 200),
  modelsToNest: {
    part: new makerjs.models.Rectangle(80, 40),
  },
  options: {
    gap: 4,
    allowRotation: true,
    useGeneticSearch: false,
  },
});

console.log(result.packedModels, result.didNotFitModels, result.stats);
```
