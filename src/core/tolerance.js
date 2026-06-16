export const DEFAULT_CONFIG = Object.freeze({
  lowerRefValue: 40,
  upperRefValue: 60,
  targetSpeed: 50,
  tolerance: 4,
  failCriterion: "gt"
});

export function parseNumber(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function calculateResult({
  indicatedSpeed,
  maxSpeed,
  tolerance = DEFAULT_CONFIG.tolerance,
  failCriterion = DEFAULT_CONFIG.failCriterion
}) {
  const divergence = indicatedSpeed - maxSpeed;
  const divergenceAbs = Math.abs(divergence);
  const lowerLimit = maxSpeed - tolerance;
  const upperLimit = maxSpeed + tolerance;
  const outsideByLow = Math.max(0, lowerLimit - indicatedSpeed);
  const outsideByHigh = Math.max(0, indicatedSpeed - upperLimit);

  let failed;
  if (failCriterion === "gte") {
    failed = divergenceAbs >= tolerance;
  } else {
    failed = divergenceAbs > tolerance;
  }

  const result = failed ? "REPROVADO" : "APROVADO";
  let reason = "Dentro da tolerancia permitida.";
  let outsideBy = 0;

  if (failed && indicatedSpeed < lowerLimit) {
    outsideBy = outsideByLow;
    reason = `Abaixo do limite por ${formatNumber(outsideBy, 3)} km/h.`;
  } else if (failed && indicatedSpeed > upperLimit) {
    outsideBy = outsideByHigh;
    reason = `Acima do limite por ${formatNumber(outsideBy, 3)} km/h.`;
  } else if (failed) {
    outsideBy = divergenceAbs - tolerance;
    reason = `Fora da tolerancia por ${formatNumber(Math.max(0, outsideBy), 3)} km/h.`;
  }

  return {
    indicatedSpeed,
    maxSpeed,
    tolerance,
    failCriterion,
    divergence,
    divergenceAbs,
    lowerLimit,
    upperLimit,
    outsideBy,
    result,
    approved: result === "APROVADO",
    reason
  };
}
