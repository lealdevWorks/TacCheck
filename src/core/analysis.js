import { buildCalibration, buildRegister } from "./geometry.js";
import { DEFAULT_CONFIG, calculateResult } from "./tolerance.js";

export function calculateAnalysis({
  line40Points,
  line60Points,
  registerUpperPoints,
  registerLowerPoints,
  maxSpeed,
  tolerance = DEFAULT_CONFIG.tolerance,
  failCriterion = DEFAULT_CONFIG.failCriterion
}) {
  const calibration = buildCalibration(line40Points, line60Points);
  const register = buildRegister(registerUpperPoints, registerLowerPoints, calibration);
  const result = calculateResult({
    indicatedSpeed: register.indicatedSpeed,
    maxSpeed,
    tolerance,
    failCriterion
  });

  return { calibration, register, result };
}
