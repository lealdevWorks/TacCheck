import test from "node:test";
import assert from "node:assert/strict";
import { calculateAnalysis } from "../src/core/analysis.js";
import { buildCalibration, pointForSpeed } from "../src/core/geometry.js";

function close(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("analise completa usa centro entre bordas do registro", () => {
  const analysis = calculateAnalysis({
    line40Points: [{ x: 0, y: 300 }, { x: 800, y: 300 }],
    line60Points: [{ x: 0, y: 100 }, { x: 800, y: 100 }],
    registerUpperPoints: [{ x: 100, y: 226 }, { x: 700, y: 226 }],
    registerLowerPoints: [{ x: 100, y: 230 }, { x: 700, y: 230 }],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.2);
  assert.equal(analysis.result.result, "REPROVADO");
});

test("analise completa reproduz caso real 2 por pontos geometricos", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const center = pointForSpeed(calibration, 47.74);

  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerUpperPoints: [{ x: 100, y: center.y - 4 }, { x: 700, y: center.y - 4 }],
    registerLowerPoints: [{ x: 100, y: center.y + 4 }, { x: 700, y: center.y + 4 }],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.74);
  close(analysis.result.divergence, -4.361);
  close(analysis.result.lowerLimit, 48.101);
  close(analysis.result.upperLimit, 56.101);
  assert.equal(analysis.result.result, "REPROVADO");
});
