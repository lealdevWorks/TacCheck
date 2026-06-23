import test from "node:test";
import assert from "node:assert/strict";
import {
  OCCURRENCE_STATUS,
  RESULT_STATUS,
  calculateResult,
  classifyOccurrences,
  parseNumber
} from "../src/core/tolerance.js";

const cases = [
  [52, 56, 4, RESULT_STATUS.CRITICAL],
  [52, 56.001, 4.001, RESULT_STATUS.POSSIBLE_FAILURE],
  [52, 47.999, 4.001, RESULT_STATUS.POSSIBLE_FAILURE],
  [50, 46, 4, RESULT_STATUS.CRITICAL],
  [50, 45.999, 4.001, RESULT_STATUS.POSSIBLE_FAILURE]
];

for (const [reportSpeed, indicatedSpeed, difference, status] of cases) {
  test(`relatório ${reportSpeed} / disco ${indicatedSpeed}`, () => {
    const result = calculateResult({ reportSpeed, indicatedSpeed });
    assert.ok(Math.abs(result.divergenceAbs - difference) < 1e-9);
    assert.equal(result.status, status);
    assert.equal(result.possibleFailure, difference > 4);
  });
}

test("classifica as quatro faixas sem arredondar antes", () => {
  assert.equal(calculateResult({ reportSpeed: 50, indicatedSpeed: 53.5 }).status, RESULT_STATUS.WITHIN);
  assert.equal(calculateResult({ reportSpeed: 50, indicatedSpeed: 53.501 }).status, RESULT_STATUS.NEAR);
  assert.equal(calculateResult({ reportSpeed: 50, indicatedSpeed: 54 }).status, RESULT_STATUS.CRITICAL);
  assert.equal(calculateResult({ reportSpeed: 50, indicatedSpeed: 54.0001 }).status, RESULT_STATUS.POSSIBLE_FAILURE);
  assert.equal(calculateResult({ reportSpeed: 50, indicatedSpeed: 54.0001 }).roundingWarning, true);
});

test("limites são sempre derivados da velocidade do relatório", () => {
  const result = calculateResult({ reportSpeed: 52, indicatedSpeed: 52 });
  assert.equal(result.lowerLimit, 48);
  assert.equal(result.upperLimit, 56);
});

test("pico e queda exatamente no limite exigem revisão", () => {
  const result = classifyOccurrences({ highestSpeed: 56, lowestSpeed: 48, lowerLimit: 48, upperLimit: 56 });
  assert.equal(result.peak.status, OCCURRENCE_STATUS.CRITICAL);
  assert.equal(result.drop.status, OCCURRENCE_STATUS.CRITICAL);
});

test("pico confirmado acima e queda confirmada abaixo geram possível reprovação", () => {
  const result = classifyOccurrences({
    highestSpeed: 56.001,
    lowestSpeed: 47.999,
    lowerLimit: 48,
    upperLimit: 56,
    peakConfirmation: "confirmed",
    dropConfirmation: "confirmed"
  });
  assert.equal(result.peak.status, OCCURRENCE_STATUS.POSSIBLE_FAILURE);
  assert.equal(result.drop.status, OCCURRENCE_STATUS.POSSIBLE_FAILURE);
});

test("marca isolada permanece suspeita até confirmação manual", () => {
  const result = classifyOccurrences({ highestSpeed: 56.5, lowerLimit: 48, upperLimit: 56 });
  assert.equal(result.status, OCCURRENCE_STATUS.SUSPECTED);
});

test("ocorrência ignorada como ruído não gera alerta", () => {
  const result = classifyOccurrences({
    highestSpeed: 60,
    lowerLimit: 48,
    upperLimit: 56,
    peakConfirmation: "ignored"
  });
  assert.equal(result.status, OCCURRENCE_STATUS.CLEAR);
});

test("parseNumber aceita decimal brasileiro e decimal com ponto", () => {
  assert.equal(parseNumber("52,101"), 52.101);
  assert.equal(parseNumber("52.101"), 52.101);
});
