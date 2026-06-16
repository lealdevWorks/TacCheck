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

test("analise completa usa topo do registro como velocidade indicada", () => {
  const analysis = calculateAnalysis({
    line40Points: [{ x: 0, y: 300 }, { x: 800, y: 300 }],
    line60Points: [{ x: 0, y: 100 }, { x: 800, y: 100 }],
    registerTopPoints: [{ x: 100, y: 228 }, { x: 700, y: 228 }],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.2);
  assert.equal(analysis.result.result, "REPROVADO");
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
  assert.equal(analysis.result.result, "REPROVADO");
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
  assert.equal(analysis.result.result, "REPROVADO");
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
  assert.equal(analysis.result.result, "APROVADO");
});

test("analise usa linha media com tres pontos no topo do registro", () => {
  const line40 = [{ x: 0, y: 300 }, { x: 800, y: 300 }];
  const line60 = [{ x: 0, y: 100 }, { x: 800, y: 100 }];
  const calibration = buildCalibration(line40, line60);
  const top = pointForSpeed(calibration, 47.74);

  const analysis = calculateAnalysis({
    line40Points: line40,
    line60Points: line60,
    registerTopPoints: [
      { x: 100, y: top.y - 1 },
      { x: 400, y: top.y },
      { x: 700, y: top.y + 1 }
    ],
    maxSpeed: 52.101,
    tolerance: 4
  });

  close(analysis.register.indicatedSpeed, 47.74);
  assert.equal(analysis.result.result, "REPROVADO");
});
