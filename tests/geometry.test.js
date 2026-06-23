import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalibration,
  imageToScreenPoint,
  pointForSpeed,
  screenToImagePoint,
  speedFromPoint
} from "../src/core/geometry.js";

function close(actual, expected, tolerance = 0.001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("linha 40 acima e 60 abaixo calcula eixo corretamente", () => {
  const calibration = buildCalibration(
    [{ x: 0, y: 100 }, { x: 500, y: 100 }],
    [{ x: 0, y: 300 }, { x: 500, y: 300 }]
  );
  close(speedFromPoint(calibration, { x: 250, y: 200 }), 50);
});

test("linha 60 acima e 40 abaixo calcula eixo corretamente", () => {
  const calibration = buildCalibration(
    [{ x: 0, y: 300 }, { x: 500, y: 300 }],
    [{ x: 0, y: 100 }, { x: 500, y: 100 }]
  );
  close(speedFromPoint(calibration, { x: 250, y: 200 }), 50);
});

test("linhas inclinadas calculam velocidade por projecao 2D", () => {
  const line40 = [{ x: 100, y: 300 }, { x: 500, y: 340 }, { x: 900, y: 380 }];
  const line60 = [{ x: 110, y: 100 }, { x: 510, y: 140 }, { x: 910, y: 180 }];
  const calibration = buildCalibration(line40, line60);
  const point = pointForSpeed(calibration, 47.74);

  close(speedFromPoint(calibration, point), 47.74);
  assert.equal(calibration.parallelism, "ok");
});

test("conversao tela para imagem nao usa coordenada visual direta", () => {
  const viewport = { scale: 2.5, offsetX: 120, offsetY: 80 };
  const imagePoint = { x: 210, y: 88 };
  const screenPoint = imageToScreenPoint(imagePoint, viewport);
  const converted = screenToImagePoint(screenPoint, viewport);

  close(converted.x, imagePoint.x);
  close(converted.y, imagePoint.y);
  assert.notEqual(screenPoint.x, imagePoint.x);
  assert.notEqual(screenPoint.y, imagePoint.y);
});

test("zoom diferente de 100% preserva coordenada real da imagem", () => {
  const viewport = { scale: 1.75, offsetX: -32, offsetY: 44 };
  const converted = screenToImagePoint({ x: 318, y: 219 }, viewport);

  close(converted.x, 200);
  close(converted.y, 100);
});

test("referências 40 e 60 desalinhadas exigem revisão", () => {
  const calibration = buildCalibration(
    [{ x: 0, y: 300 }, { x: 800, y: 300 }],
    [{ x: 0, y: 100 }, { x: 800, y: 200 }]
  );

  assert.equal(calibration.parallelism, "critico");
  assert.ok(calibration.angularDifference > 5);
});
