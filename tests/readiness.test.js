import test from "node:test";
import assert from "node:assert/strict";
import { getCalculationReadiness } from "../src/core/readiness.js";

test("libera calculo com imagem, escala, frequente, velocidade registrada e tolerancia validos", () => {
  const readiness = getCalculationReadiness({
    imageLoaded: true,
    line40Points: [{}, {}],
    line60Points: [{}, {}],
    registerTopPoints: [{}, {}, {}],
    maxSpeed: 52.101,
    tolerance: 4
  });

  assert.equal(readiness.canCalculate, true);
  assert.equal(readiness.reason, "pronto para calcular");
});

test("bloqueia calculo sem escala completa", () => {
  const readiness = getCalculationReadiness({
    imageLoaded: true,
    line40Points: [{}, {}],
    line60Points: [],
    registerTopPoints: [{}, {}, {}],
    maxSpeed: 51,
    tolerance: 4
  });

  assert.equal(readiness.canCalculate, false);
  assert.equal(readiness.reason, "aguardando escala");
});

test("bloqueia calculo sem velocidade frequente", () => {
  const readiness = getCalculationReadiness({
    imageLoaded: true,
    line40Points: [{}, {}],
    line60Points: [{}, {}],
    registerTopPoints: [],
    maxSpeed: 51,
    tolerance: 4
  });

  assert.equal(readiness.canCalculate, false);
  assert.equal(readiness.reason, "aguardando velocidade frequente");
});

test("nao exige pico ou queda para liberar calculo principal", () => {
  const readiness = getCalculationReadiness({
    imageLoaded: true,
    line40Points: [{}, {}],
    line60Points: [{}, {}],
    registerTopPoints: [{}],
    maxSpeed: 51,
    tolerance: 4
  });

  assert.equal(readiness.canCalculate, true);
  assert.equal(readiness.reason, "pronto para calcular");
});

test("bloqueia calculo sem velocidade registrada/maxima do ensaio", () => {
  const readiness = getCalculationReadiness({
    imageLoaded: true,
    line40Points: [{}, {}],
    line60Points: [{}, {}],
    registerTopPoints: [{}],
    maxSpeed: "",
    tolerance: 4
  });

  assert.equal(readiness.canCalculate, false);
  assert.equal(readiness.reason, "aguardando velocidade maxima");
});

test("bloqueia tolerancia acima de 4 km/h", () => {
  const readiness = getCalculationReadiness({
    imageLoaded: true,
    line40Points: [{}, {}],
    line60Points: [{}, {}],
    registerTopPoints: [{}],
    maxSpeed: 52.101,
    tolerance: "4,001"
  });

  assert.equal(readiness.canCalculate, false);
  assert.equal(readiness.reason, "aguardando tolerancia");
});
