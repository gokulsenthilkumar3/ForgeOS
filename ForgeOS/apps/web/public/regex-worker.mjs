import { evaluateRegex } from './regex-engine.mjs';

self.onmessage = event => {
  try {
    self.postMessage({ result: evaluateRegex(event.data.pattern, event.data.flags, event.data.sample) });
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : 'Could not test this expression.' });
  }
};
