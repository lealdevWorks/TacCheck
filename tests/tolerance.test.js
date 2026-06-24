import test from "node:test";
import assert from "node:assert/strict";
import {
  OCCURRENCE_STATUS,
  RESULT_STATUS,
  calculateResult,
  classifyOccurrences,
  parseNumber
} from "../src/core/tolerance.js";

const mainCases = [
  [52.101, 47.74, 4, 4.361, RESULT_STATUS.POSSIBLE_FAILURE],
  [52, 48, 4, 4, RESULT_STATUS.CRITICAL],
  [51, 48.5, 4, 2.5, RESULT_STATUS.WITHIN],
  [52.101, 48.6, 3.5, 3.501, RESULT_STATUS.POSSIBLE_FAILURE],
  [52.101, 48.601, 3.5, 3.5, RESULT_STATUS.CRITICAL]
];

for (const [reportSpeed, indicatedSpeed, tolerance, difference, status] of mainCases) {
  test(`registrada ${reportSpeed} / disco ${indicatedSpeed} / tolerancia ${tolerance}`, () => {
    const result = calculateResult({ reportSpeed, indicatedSpeed, tolerance });
    assert.equal(Number(result.divergenceAbs.toFixed(3)), Number(difference.toFixed(3)));
    assert.equal(result.status, status);
  });
}

test("linhas pontilhadas usam velocidade registrada/maxima do ensaio mais tolerancia", () => {
  const result = calculateResult({ reportSpeed: 52.101, indicatedSpeed: 47.74, tolerance: 4 });
  assert.equal(Number(result.lowerLimit.toFixed(3)), 48.101);
  assert.equal(Number(result.upperLimit.toFixed(3)), 56.101);
});

test("linhas pontilhadas respeitam tolerancia reduzida", () => {
  const result = calculateResult({ reportSpeed: 52.101, indicatedSpeed: 50, tolerance: 3.5 });
  assert.equal(Number(result.lowerLimit.toFixed(3)), 48.601);
  assert.equal(Number(result.upperLimit.toFixed(3)), 55.601);
});

test("referencia 50 permanece secundaria", () => {
  const result = calculateResult({ reportSpeed: 52.101, indicatedSpeed: 47.74, tolerance: 4 });
  assert.equal(Number(result.targetErrorAbs.toFixed(3)), 2.26);
  assert.equal(result.lowerLimit !== result.targetLowerLimit, true);
});

test("bloqueia tolerancia acima de 4 km/h", () => {
  assert.throws(
    () => calculateResult({ reportSpeed: 52, indicatedSpeed: 52, tolerance: 4.001 }),
    /nao pode ser maior/
  );
});

test("bloqueia calculo sem velocidade registrada/maxima do ensaio", () => {
  assert.throws(
    () => calculateResult({ indicatedSpeed: 50, tolerance: 4 }),
    /velocidade registrada/
  );
});

test("pico e queda exatamente no limite exigem revisao", () => {
  const result = classifyOccurrences({ highestSpeed: 56.101, lowestSpeed: 48.101, lowerLimit: 48.101, upperLimit: 56.101 });
  assert.equal(result.peak.status, OCCURRENCE_STATUS.CRITICAL);
  assert.equal(result.drop.status, OCCURRENCE_STATUS.CRITICAL);
});

test("pico confirmado acima e queda confirmada abaixo geram possivel reprovacao", () => {
  const result = classifyOccurrences({
    highestSpeed: 56.102,
    lowestSpeed: 48.1,
    lowerLimit: 48.101,
    upperLimit: 56.101,
    peakConfirmation: "confirmed",
    dropConfirmation: "confirmed"
  });
  assert.equal(result.peak.status, OCCURRENCE_STATUS.POSSIBLE_FAILURE);
  assert.equal(result.drop.status, OCCURRENCE_STATUS.POSSIBLE_FAILURE);
});

test("marca isolada permanece suspeita ate confirmacao manual", () => {
  const result = classifyOccurrences({ highestSpeed: 56.5, lowerLimit: 48.101, upperLimit: 56.101 });
  assert.equal(result.status, OCCURRENCE_STATUS.SUSPECTED);
});

test("ocorrencia ignorada como ruido nao gera alerta", () => {
  const result = classifyOccurrences({
    highestSpeed: 60,
    lowerLimit: 48.101,
    upperLimit: 56.101,
    peakConfirmation: "ignored"
  });
  assert.equal(result.status, OCCURRENCE_STATUS.CLEAR);
});

test("parseNumber aceita decimal brasileiro e decimal com ponto", () => {
  assert.equal(parseNumber("52,101"), 52.101);
  assert.equal(parseNumber("52.101"), 52.101);
});
