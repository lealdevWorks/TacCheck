import test from "node:test";
import assert from "node:assert/strict";
import { calculateResult, parseNumber } from "../src/core/tolerance.js";

function close(actual, expected, tolerance = 0.001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("caso real 1 reprova abaixo do limite", () => {
  const result = calculateResult({
    maxSpeed: 51.173,
    indicatedSpeed: 46.31,
    tolerance: 4
  });

  close(result.divergence, -4.863);
  close(result.lowerLimit, 47.173);
  close(result.upperLimit, 55.173);
  close(result.outsideBy, 0.863);
  assert.equal(result.result, "REPROVADO");
  assert.equal(result.reason, "Abaixo do limite por 0,863 km/h.");
});

test("caso real 2 reprova abaixo do limite", () => {
  const result = calculateResult({
    maxSpeed: 52.101,
    indicatedSpeed: 47.74,
    tolerance: 4
  });

  close(result.divergence, -4.361);
  close(result.lowerLimit, 48.101);
  close(result.upperLimit, 56.101);
  close(result.outsideBy, 0.361);
  assert.equal(result.result, "REPROVADO");
  assert.equal(result.reason, "Abaixo do limite por 0,361 km/h.");
});

test("aprova dentro da tolerancia", () => {
  const result = calculateResult({
    maxSpeed: 52.101,
    indicatedSpeed: 48.5,
    tolerance: 4
  });

  close(result.divergence, -3.601);
  assert.equal(result.result, "APROVADO");
});

test("exatamente no limite respeita criterio configurado", () => {
  const approved = calculateResult({
    maxSpeed: 52,
    indicatedSpeed: 48,
    tolerance: 4,
    failCriterion: "gt"
  });
  const failed = calculateResult({
    maxSpeed: 52,
    indicatedSpeed: 48,
    tolerance: 4,
    failCriterion: "gte"
  });

  assert.equal(approved.result, "APROVADO");
  assert.equal(failed.result, "REPROVADO");
});

test("parseNumber aceita decimal brasileiro e decimal com ponto", () => {
  assert.equal(parseNumber("52,101"), 52.101);
  assert.equal(parseNumber("52.101"), 52.101);
});
