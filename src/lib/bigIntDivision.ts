// Retain 2 decimal places of precision
export function divideBigIntWithDecimals(
  numerator: bigint,
  denominator: bigint,
  decimalPlaces = 2,
): number {
  if (denominator === 0n) {
    return 0;
  }
  // Determine the scaling factor based on desired decimal places
  const scalingFactor = BigInt(10 ** decimalPlaces);

  // Scale the numerator
  const scaledNumerator: bigint = numerator * scalingFactor;

  // Perform BigInt division
  const resultBigInt: bigint = scaledNumerator / denominator;

  // Convert to Number and rescale to get the decimal result
  const finalResult = Number(resultBigInt) / Number(scalingFactor);

  return finalResult;
}
