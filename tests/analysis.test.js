import test from "node:test";
import assert from "node:assert/strict";
import { calculateAnalysis } from "../src/core/analysis.js";
import { buildCalibration, pointForSpeed } from "../src/core/geometry.js";
import { RESULT_STATUS } from "../src/core/tolerance.js";

function close(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("analise completa usa topo do registro como velocidade indicada", () => {
  const analysis = calculateAnalysis({
    line40Points: [{ x: 0, y: 300 }, { x: 800, y: 300 }],
    line60Points: [{ x: 0, y: 100 }, { x: 800, y: 100 }],
    registerTopPoints: [{ x: 100, y: 228 }, { x: 700, y: 228 }],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.2);
  assert.equal(analysis.result.status, RESULT_STATUS.POSSIBLE_FAILURE);
});

test("analise completa reproduz caso real 1 por topo do registro", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const top = pointForSpeed(calibration, 46.31);

  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [{ x: 100, y: top.y }, { x: 700, y: top.y }],
    maxSpeed: 51.173,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 46.31);
  close(analysis.result.divergence, -4.863);
  close(analysis.result.lowerLimit, 47.173);
  close(analysis.result.upperLimit, 55.173);
  assert.equal(analysis.result.status, RESULT_STATUS.POSSIBLE_FAILURE);
});

test("analise completa reproduz caso real 2 por topo do registro", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const top = pointForSpeed(calibration, 47.74);

  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [{ x: 100, y: top.y }, { x: 700, y: top.y }],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.74);
  close(analysis.result.divergence, -4.361);
  close(analysis.result.lowerLimit, 48.101);
  close(analysis.result.upperLimit, 56.101);
  assert.equal(analysis.result.status, RESULT_STATUS.POSSIBLE_FAILURE);
});

test("analise aceita um ponto simples no topo do registro", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const top = pointForSpeed(calibration, 48.5);

  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [top],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 48.5);
  assert.equal(analysis.result.status, RESULT_STATUS.NEAR);
});

test("analise usa apenas o ponto inicial do topo do registro", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const top = pointForSpeed(calibration, 47.74);

  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [
      top,
      { x: 400, y: top.y },
      { x: 700, y: top.y + 1 }
    ],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.74);
  assert.equal(analysis.result.status, RESULT_STATUS.POSSIBLE_FAILURE);
});

test("deslocamento do topo move a linha paralela sem mudar o angulo", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 380 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 180 }];
  const calibration = buildCalibration(line40, line60);
  const top = pointForSpeed(calibration, 48);

  const base = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [top],
    registerTopOffsetPx: 0,
    maxSpeed: 52,
    tolerance: 4
  });
  const adjusted = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [top],
    registerTopOffsetPx: 10,
    maxSpeed: 52,
    tolerance: 4
  });

  close(base.register.indicatedSpeed, 48);
  close(adjusted.register.indicatedSpeed, 48 + (10 / calibration.distance) * 20, 0.001);
  close(adjusted.register.line.angleDegrees, base.register.line.angleDegrees, 0.001);
});

test("análise converte marcas de pico e queda e exige confirmação", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [pointForSpeed(calibration, 52)],
    peakPoint: pointForSpeed(calibration, 56.001),
    dropPoint: pointForSpeed(calibration, 47.999),
    reportSpeed: 52
  });

  close(analysis.occurrences.highestSpeed, 56.001, 0.00001);
  close(analysis.occurrences.lowestSpeed, 47.999, 0.00001);
  assert.equal(analysis.occurrences.status, "SUSPEITA_FORA_DO_LIMITE");
});
