import { parseNumber } from "./tolerance.js";

export function getCalculationReadiness({
  imageLoaded,
  line40Points = [],
  line60Points = [],
  registerTopPoints = [],
  maxSpeed,
  tolerance,
  maxSpeedRequired = true
}) {
  const hasImage = Boolean(imageLoaded);
  const hasScale = line40Points.length >= 2 && line60Points.length >= 2;
  const hasRegister = registerTopPoints.length >= 1;
  const parsedMaxSpeed = parseNumber(maxSpeed, Number.NaN);
  const parsedTolerance = parseNumber(tolerance, Number.NaN);
  const hasMaxSpeed = !maxSpeedRequired || (Number.isFinite(parsedMaxSpeed) && parsedMaxSpeed > 0);
  const hasTolerance = Number.isFinite(parsedTolerance) && parsedTolerance >= 0;
  const canCalculate = hasImage && hasScale && hasRegister && hasMaxSpeed && hasTolerance;

  let reason = "pronto para calcular";
  if (!hasImage) {
    reason = "aguardando imagem";
  } else if (!hasScale) {
    reason = "aguardando escala";
  } else if (!hasRegister) {
    reason = "aguardando topo do registro";
  } else if (!hasMaxSpeed) {
    reason = "aguardando velocidade maxima";
  } else if (!hasTolerance) {
    reason = "aguardando tolerancia";
  }

  return {
    hasImage,
    hasScale,
    hasRegister,
    hasInputs: hasMaxSpeed && hasTolerance,
    hasMaxSpeed,
    hasTolerance,
    canCalculate,
    reason
  };
}
