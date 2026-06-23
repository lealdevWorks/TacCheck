export const DEFAULT_CONFIG = Object.freeze({
  lowerRefValue: 40,
  upperRefValue: 60,
  targetSpeed: 50,
  tolerance: 4
});

export const RESULT_STATUS = Object.freeze({
  WITHIN: "DENTRO_DO_LIMITE",
  NEAR: "ATENCAO_PROXIMO_DO_LIMITE",
  CRITICAL: "ATENCAO_CRITICA",
  POSSIBLE_FAILURE: "POSSIVEL_REPROVACAO"
});

export const OCCURRENCE_STATUS = Object.freeze({
  CLEAR: "SEM_PICO_FORA_DO_LIMITE",
  CRITICAL: "ATENCAO_CRITICA",
  SUSPECTED: "SUSPEITA_FORA_DO_LIMITE",
  POSSIBLE_FAILURE: "POSSIVEL_REPROVACAO"
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

function classifyDifference(divergenceAbs, tolerance) {
  const equalWithinMachinePrecision = Math.abs(divergenceAbs - tolerance) <= 1e-12;
  if (divergenceAbs > tolerance && !equalWithinMachinePrecision) {
    return {
      status: RESULT_STATUS.POSSIBLE_FAILURE,
      label: "Possível reprovação — diferença superior a 4 km/h",
      reason: "A diferença calculada é superior a 4,000 km/h."
    };
  }
  if (equalWithinMachinePrecision) {
    return {
      status: RESULT_STATUS.CRITICAL,
      label: "Atenção crítica — exatamente no limite",
      reason: "Diferença exatamente igual a 4,000 km/h. Revisar leitura."
    };
  }
  if (divergenceAbs > 3.5) {
    return {
      status: RESULT_STATUS.NEAR,
      label: "Atenção — próximo do limite",
      reason: "A diferença está próxima do limite de 4,000 km/h."
    };
  }
  return {
    status: RESULT_STATUS.WITHIN,
    label: "Dentro do limite",
    reason: "Diferença dentro do limite objetivo."
  };
}

export function calculateResult({
  indicatedSpeed,
  reportSpeed,
  maxSpeed,
  tolerance = DEFAULT_CONFIG.tolerance
}) {
  const referenceSpeed = Number.isFinite(reportSpeed) ? reportSpeed : maxSpeed;
  const divergence = indicatedSpeed - referenceSpeed;
  const divergenceAbs = Math.abs(divergence);
  const lowerLimit = referenceSpeed - tolerance;
  const upperLimit = referenceSpeed + tolerance;
  const classification = classifyDifference(divergenceAbs, tolerance);
  const displayedAsBoundary = divergenceAbs !== tolerance
    && Number(divergenceAbs.toFixed(3)) === tolerance;
  const roundingWarning = displayedAsBoundary
    ? " Valor próximo do limite. Revisar leitura e marcações."
    : "";

  return {
    indicatedSpeed,
    reportSpeed: referenceSpeed,
    // Alias mantido para abrir evidências gravadas por versões anteriores.
    maxSpeed: referenceSpeed,
    tolerance,
    failCriterion: "gt",
    divergence,
    divergenceAbs,
    lowerLimit,
    upperLimit,
    outsideBy: Math.max(0, divergenceAbs - tolerance),
    status: classification.status,
    result: classification.label,
    approved: classification.status === RESULT_STATUS.WITHIN,
    possibleFailure: classification.status === RESULT_STATUS.POSSIBLE_FAILURE,
    critical: classification.status === RESULT_STATUS.CRITICAL,
    roundingWarning: displayedAsBoundary,
    reason: `${classification.reason}${roundingWarning}`
  };
}

function occurrenceCandidate(kind, speed, limit, confirmation) {
  if (!Number.isFinite(speed)) return null;
  const delta = kind === "peak" ? speed - limit : limit - speed;
  const atLimit = Math.abs(delta) <= 1e-12;
  const outside = delta > 0 && !atLimit;

  if (confirmation === "ignored") return null;
  if (atLimit) {
    return {
      kind,
      speed,
      limit,
      delta: 0,
      status: OCCURRENCE_STATUS.CRITICAL,
      label: "Atenção crítica — ponto exatamente no limite"
    };
  }
  if (!outside) return null;
  if (confirmation !== "confirmed") {
    return {
      kind,
      speed,
      limit,
      delta,
      status: OCCURRENCE_STATUS.SUSPECTED,
      label: "Suspeita de pico/queda fora do limite — revisar"
    };
  }
  return {
    kind,
    speed,
    limit,
    delta,
    status: OCCURRENCE_STATUS.POSSIBLE_FAILURE,
    label: kind === "peak"
      ? "Possível reprovação — pico real acima do limite"
      : "Possível reprovação — queda real abaixo do limite"
  };
}

export function classifyOccurrences({
  highestSpeed,
  lowestSpeed,
  lowerLimit,
  upperLimit,
  peakConfirmation = "suspected",
  dropConfirmation = "suspected"
}) {
  const peak = occurrenceCandidate("peak", highestSpeed, upperLimit, peakConfirmation);
  const drop = occurrenceCandidate("drop", lowestSpeed, lowerLimit, dropConfirmation);
  const occurrences = [peak, drop].filter(Boolean);
  const priority = [
    OCCURRENCE_STATUS.POSSIBLE_FAILURE,
    OCCURRENCE_STATUS.SUSPECTED,
    OCCURRENCE_STATUS.CRITICAL
  ];
  const status = priority.find((item) => occurrences.some((entry) => entry.status === item))
    || OCCURRENCE_STATUS.CLEAR;

  return {
    highestSpeed: Number.isFinite(highestSpeed) ? highestSpeed : null,
    lowestSpeed: Number.isFinite(lowestSpeed) ? lowestSpeed : null,
    lowerLimit,
    upperLimit,
    peak,
    drop,
    occurrences,
    status,
    label: status === OCCURRENCE_STATUS.CLEAR
      ? "Sem pico fora do limite"
      : occurrences.find((entry) => entry.status === status)?.label
  };
}
