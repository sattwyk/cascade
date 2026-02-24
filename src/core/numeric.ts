export function toNumericString(value: number | bigint | string): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString(10);
  }

  if (!Number.isFinite(value)) {
    throw new Error('Numeric values must be finite.');
  }

  return value.toString();
}
