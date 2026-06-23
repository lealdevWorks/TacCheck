export function makePoint(x, y) {
  return { x: Number(x), y: Number(y) };
}

export function add(a, b) {
  return makePoint(a.x + b.x, a.y + b.y);
}

export function sub(a, b) {
  return makePoint(a.x - b.x, a.y - b.y);
}

export function scale(a, factor) {
  return makePoint(a.x * factor, a.y * factor);
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function length(a) {
  return Math.hypot(a.x, a.y);
}

export function normalize(a) {
  const len = length(a);
  if (len === 0) throw new Error("Vetor sem comprimento.");
  return makePoint(a.x / len, a.y / len);
}

export function midpoint(points) {
  if (!points.length) throw new Error("Nenhum ponto informado.");
  const total = points.reduce((acc, point) => add(acc, point), makePoint(0, 0));
  return scale(total, 1 / points.length);
}

export function fitLine(points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error("A linha precisa de pelo menos 2 pontos.");
  }

  const pts = points.map((point) => makePoint(point.x, point.y));
  const center = midpoint(pts);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (const point of pts) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  let direction;
  if (Math.abs(sxy) < 1e-9 && Math.abs(sxx - syy) < 1e-9) {
    direction = normalize(sub(pts[pts.length - 1], pts[0]));
  } else {
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    direction = normalize(makePoint(Math.cos(angle), Math.sin(angle)));
  }

  if (dot(direction, sub(pts[pts.length - 1], pts[0])) < 0) {
    direction = scale(direction, -1);
  }

  const normal = makePoint(-direction.y, direction.x);
  const deviations = pts.map((point) => Math.abs(dot(sub(point, center), normal)));
  const meanDeviation = deviations.reduce((sum, item) => sum + item, 0) / deviations.length;
  const maxDeviation = Math.max(...deviations);
  const angleDegrees = Math.atan2(direction.y, direction.x) * 180 / Math.PI;

  return {
    points: pts,
    center,
    direction,
    normal,
    angleDegrees,
    meanDeviation,
    maxDeviation
  };
}

export function angleDifferenceDegrees(a, b) {
  let diff = Math.abs(a - b) % 180;
  if (diff > 90) diff = 180 - diff;
  return diff;
}

export function classifyQuality(pixelsPerKm) {
  if (pixelsPerKm >= 6) return "boa";
  if (pixelsPerKm >= 4) return "aceitavel";
  return "baixa";
}

export function classifyParallelism(angle) {
  if (angle < 2) return "ok";
  if (angle <= 5) return "alerta";
  return "critico";
}

export function buildCalibration(line40Points, line60Points) {
  const line40 = fitLine(line40Points);
  const line60 = fitLine(line60Points);
  const directionSum = add(line40.direction, line60.direction);
  let direction = length(directionSum) < 0.25 ? line40.direction : normalize(directionSum);
  let normal = makePoint(-direction.y, direction.x);
  const axis40To60 = sub(line60.center, line40.center);

  if (dot(axis40To60, normal) < 0) normal = scale(normal, -1);

  const distance = dot(axis40To60, normal);
  if (Math.abs(distance) < 1e-6) {
    throw new Error("As linhas 40 e 60 ficaram sobrepostas ou sem distancia util.");
  }

  const pixelsPerKm = Math.abs(distance) / 20;
  const angularDifference = angleDifferenceDegrees(line40.angleDegrees, line60.angleDegrees);

  return {
    line40,
    line60,
    origin: line40.center,
    direction,
    normal,
    distance,
    pixelsPerKm,
    angularDifference,
    quality: classifyQuality(pixelsPerKm),
    parallelism: classifyParallelism(angularDifference)
  };
}

export function pointForSpeed(calibration, speed) {
  const ratio = (speed - 40) / 20;
  return add(calibration.origin, scale(calibration.normal, calibration.distance * ratio));
}

export function speedFromPoint(calibration, point) {
  const projected = dot(sub(point, calibration.origin), calibration.normal);
  return 40 + (projected / calibration.distance) * 20;
}

export function buildRegisterTop(topPoints, calibration, offsetPx = 0) {
  if (!Array.isArray(topPoints) || topPoints.length < 1) {
    throw new Error("A velocidade frequente precisa de pelo menos 1 ponto.");
  }

  const points = topPoints.map((point) => makePoint(point.x, point.y));
  const offset = Number(offsetPx) || 0;
  const center = add(points[0], scale(calibration.normal, offset));
  const line = {
    points: [center],
    center,
    direction: calibration.direction,
    normal: calibration.normal,
    angleDegrees: Math.atan2(calibration.direction.y, calibration.direction.x) * 180 / Math.PI,
    meanDeviation: 0,
    maxDeviation: 0
  };
  const projection = dot(sub(line.center, calibration.origin), calibration.normal);
  const readingPoint = add(calibration.origin, scale(calibration.normal, projection));

  return {
    points,
    line,
    offsetPx: offset,
    projection,
    readingPoint,
    indicatedSpeed: speedFromPoint(calibration, readingPoint)
  };
}

export function screenToImagePoint(screenPoint, viewport) {
  return makePoint(
    (screenPoint.x - viewport.offsetX) / viewport.scale,
    (screenPoint.y - viewport.offsetY) / viewport.scale
  );
}

export function imageToScreenPoint(imagePoint, viewport) {
  return makePoint(
    imagePoint.x * viewport.scale + viewport.offsetX,
    imagePoint.y * viewport.scale + viewport.offsetY
  );
}
