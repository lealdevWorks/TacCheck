import { buildCalibration, buildRegisterTop } from "./geometry.js";
import { DEFAULT_CONFIG, calculateResult } from "./tolerance.js";

export function calculateAnalysis({
  line40Points,
  line60Points,
  registerTopPoints,
  registerTopOffsetPx = 0,
  maxSpeed,
  tolerance = DEFAULT_CONFIG.tolerance,
  failCriterion = DEFAULT_CONFIG.failCriterion
}) {
  const calibration = buildCalibration(line40Points, line60Points);
  const register = buildRegisterTop(registerTopPoints, calibration, registerTopOffsetPx);
  const result = calculateResult({
    indicatedSpeed: register.indicatedSpeed,
    maxSpeed,
    tolerance,
    failCriterion
  });

  return { calibration, register, result };
}
