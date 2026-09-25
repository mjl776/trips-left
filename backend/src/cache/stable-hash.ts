import { createHash } from 'crypto';

// JSON with object keys sorted at every level, so logically equal values
// serialize identically regardless of key order. Array order is preserved.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
      );
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

// Short, key-order-independent fingerprint for use inside cache keys (e.g.
// a league's scoring settings).
export function stableHash(value: unknown): string {
  return createHash('sha1').update(stableStringify(value)).digest('hex');
}
