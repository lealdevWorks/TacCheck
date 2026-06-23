import { buildCalibration, buildRegisterTop } from "./geometry.js";
import { DEFAULT_CONFIG, calculateResult, classifyOccurrences } from "./tolerance.js";

export function calculateAnalysis({
  line40Points,
  line60Points,
  registerTopPoints,
  registerTopOffsetPx = 0,
  reportSpeed,
  maxSpeed,
  tolerance = DEFAULT_CONFIG.tolerance,
  peakPoint = null,
  dropPoint = null,
  peakConfirmation = "suspected",
  dropConfirmation = "suspected"
}) {
  const calibration = buildCalibration(line40Points, line60Points);
  const register = buildRegisterTop(registerTopPoints, calibration, registerTopOffsetPx);
  const result = calculateResult({
    indicatedSpeed: register.indicatedSpeed,
    reportSpeed: Number.isFinite(reportSpeed) ? reportSpeed : maxSpeed,
    tolerance
  });
  const highestSpeed = peakPoint ? buildRegisterTop([peakPoint], calibration).indicatedSpeed : null;
  const lowestSpeed = dropPoint ? buildRegisterTop([dropPoint], calibration).indicatedSpeed : null;
  const occurrences = classifyOccurrences({
    highestSpeed,
    lowestSpeed,
    lowerLimit: result.lowerLimit,
    upperLimit: result.upperLimit,
    peakConfirmation,
    dropConfirmation
  });

  return { calibration, register, result, occurrences };
}
