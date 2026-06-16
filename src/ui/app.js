import { calculateAnalysis } from "../core/analysis.js";
import { pointForSpeed } from "../core/geometry.js";
import { formatNumber, parseNumber } from "../core/tolerance.js";
import { ImageViewer } from "./viewer.js";

const $ = (id) => document.getElementById(id);

const COLORS = {
  line40: "#149447",
  line60: "#0b6bdc",
  line50: "#e02020",
  max: "#7a2fb8",
  limit: "#ef4444",
  register: "#e1b400",
  text: "#0f172a"
};

const state = {
  image: null,
  imageName: "",
  marks: {
    line40: [],
    line60: [],
    registerUpper: [],
    registerLower: []
  },
  mode: null,
  contrast: 1,
  showMarks: true,
  lastAnalysis: null,
  lastSnapshot: null
};

const els = {
  fileInput: $("fileInput"),
  canvas: $("imageCanvas"),
  canvasWrap: $("canvasWrap"),
  emptyState: $("emptyState"),
  loadImageButton: $("loadImageButton"),
  calculateButton: $("calculateButton"),
  saveButton: $("saveButton"),
  zoomInButton: $("zoomInButton"),
  zoomOutButton: $("zoomOutButton"),
  fitButton: $("fitButton"),
  actualSizeButton: $("actualSizeButton"),
  contrastButton: $("contrastButton"),
  resetViewButton: $("resetViewButton"),
  toggleMarksButton: $("toggleMarksButton"),
  undoButton: $("undoButton"),
  mark40Button: $("mark40Button"),
  mark60Button: $("mark60Button"),
  markUpperButton: $("markUpperButton"),
  markLowerButton: $("markLowerButton"),
  clearMarksButton: $("clearMarksButton"),
  markedImageButton: $("markedImageButton"),
  plateInput: $("plateInput"),
  dateInput: $("dateInput"),
  targetSpeedInput: $("targetSpeedInput"),
  maxSpeedInput: $("maxSpeedInput"),
  toleranceInput: $("toleranceInput"),
  criterionInput: $("criterionInput"),
  noteInput: $("noteInput"),
  modeTitle: $("modeTitle"),
  modeText: $("modeText"),
  qualityText: $("qualityText"),
  imageStepStatus: $("imageStepStatus"),
  scaleStepStatus: $("scaleStepStatus"),
  registerStepStatus: $("registerStepStatus"),
  resultStepStatus: $("resultStepStatus"),
  maxSpeedOutput: $("maxSpeedOutput"),
  indicatedSpeedOutput: $("indicatedSpeedOutput"),
  divergenceOutput: $("divergenceOutput"),
  lowerLimitOutput: $("lowerLimitOutput"),
  upperLimitOutput: $("upperLimitOutput"),
  toleranceOutput: $("toleranceOutput"),
  statusBadge: $("statusBadge"),
  reasonOutput: $("reasonOutput"),
  statusText: $("statusText"),
  lastCalcText: $("lastCalcText")
};

const viewer = new ImageViewer(els.canvas, els.canvasWrap, drawScene);

init();

function init() {
  els.dateInput.valueAsDate = new Date(2024, 4, 24);
  bindEvents();
  updateUi();

  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") {
    loadDemo();
  }
}

function bindEvents() {
  els.loadImageButton.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", handleFile);
  els.calculateButton.addEventListener("click", calculate);
  els.saveButton.addEventListener("click", saveAnalysis);
  els.zoomInButton.addEventListener("click", () => viewer.zoom(1.2));
  els.zoomOutButton.addEventListener("click", () => viewer.zoom(0.82));
  els.fitButton.addEventListener("click", () => viewer.fitToScreen());
  els.actualSizeButton.addEventListener("click", () => viewer.actualSize());
  els.contrastButton.addEventListener("click", () => {
    state.contrast = state.contrast === 1 ? 1.35 : 1;
    viewer.draw();
  });
  els.resetViewButton.addEventListener("click", () => {
    state.contrast = 1;
    viewer.fitToScreen();
  });
  els.toggleMarksButton.addEventListener("click", () => {
    state.showMarks = !state.showMarks;
    viewer.draw();
  });
  els.undoButton.addEventListener("click", undoLastMark);
  els.mark40Button.addEventListener("click", () => setMode("line40"));
  els.mark60Button.addEventListener("click", () => setMode("line60"));
  els.markUpperButton.addEventListener("click", () => setMode("registerUpper"));
  els.markLowerButton.addEventListener("click", () => setMode("registerLower"));
  els.clearMarksButton.addEventListener("click", clearMarks);
  els.markedImageButton.addEventListener("click", downloadMarkedImage);
  els.canvas.addEventListener("click", handleCanvasClick);
}

function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    setImage(image, file.name);
    setStatus("Imagem carregada. Marque a linha 40 km/h.");
  };
  image.src = url;
}

function setImage(image, name) {
  state.image = image;
  state.imageName = name;
  state.lastAnalysis = null;
  state.lastSnapshot = null;
  clearMarks(false);
  viewer.setImage(image);
  els.emptyState.style.display = "none";
  updateUi();
}

function setMode(mode) {
  if (!state.image) {
    setStatus("Carregue uma imagem antes de marcar.");
    return;
  }
  state.mode = mode;
  updateModeText();
}

function handleCanvasClick(event) {
  if (!state.image || !state.mode || viewer.dragging) return;
  const point = viewer.eventToImage(event);
  if (point.x < 0 || point.y < 0 || point.x > state.image.naturalWidth || point.y > state.image.naturalHeight) {
    setStatus("Clique ficou fora da imagem.");
    return;
  }

  const bucket = state.marks[state.mode];
  if (bucket.length >= 3) bucket.shift();
  bucket.push(point);

  const label = modeLabel(state.mode);
  setStatus(`${label}: ponto ${bucket.length} marcado em coordenada real (${formatNumber(point.x, 1)}, ${formatNumber(point.y, 1)}).`);

  if ((state.mode === "registerUpper" || state.mode === "registerLower") && bucket.length >= 2) {
    state.mode = null;
  }
  updateUi();
  viewer.draw();
}

function calculate() {
  try {
    validateBeforeCalculation();
    const analysis = calculateAnalysis({
      line40Points: state.marks.line40,
      line60Points: state.marks.line60,
      registerUpperPoints: state.marks.registerUpper,
      registerLowerPoints: state.marks.registerLower,
      maxSpeed: parseNumber(els.maxSpeedInput.value),
      tolerance: parseNumber(els.toleranceInput.value, 4),
      failCriterion: els.criterionInput.value
    });
    state.lastAnalysis = analysis;
    state.lastSnapshot = buildSnapshot(analysis);
    updateResult(analysis);
    setStatus("Cálculo concluído com coordenadas reais da imagem.");
    els.lastCalcText.textContent = `Último cálculo: ${new Date().toLocaleString("pt-BR")}`;
    viewer.draw();
  } catch (error) {
    setStatus(error.message);
  }
  updateUi();
}

function validateBeforeCalculation() {
  if (!state.image) throw new Error("Carregue uma imagem.");
  if (state.marks.line40.length < 2) throw new Error("Marque pelo menos 2 pontos na linha 40 km/h.");
  if (state.marks.line60.length < 2) throw new Error("Marque pelo menos 2 pontos na linha 60 km/h.");
  if (state.marks.registerUpper.length < 2) throw new Error("Marque pelo menos 2 pontos na borda superior do registro.");
  if (state.marks.registerLower.length < 2) throw new Error("Marque pelo menos 2 pontos na borda inferior do registro.");
  if (parseNumber(els.maxSpeedInput.value) <= 0) throw new Error("Informe a velocidade máxima real do ensaio.");
}

function drawScene(ctx, viewport, rect) {
  if (!state.image) return;

  ctx.save();
  ctx.filter = `contrast(${state.contrast})`;
  ctx.drawImage(
    state.image,
    viewport.offsetX,
    viewport.offsetY,
    state.image.naturalWidth * viewport.scale,
    state.image.naturalHeight * viewport.scale
  );
  ctx.restore();

  if (!state.showMarks) return;

  ctx.save();
  ctx.lineWidth = 2;
  drawPointSet(ctx, viewport, state.marks.line40, COLORS.line40, "40");
  drawPointSet(ctx, viewport, state.marks.line60, COLORS.line60, "60");
  drawPointSet(ctx, viewport, state.marks.registerUpper, COLORS.limit, "");
  drawPointSet(ctx, viewport, state.marks.registerLower, COLORS.limit, "");

  if (state.lastAnalysis) {
    drawEvidence(ctx, viewport, state.lastAnalysis, rect);
  }
  ctx.restore();
}

function drawEvidence(ctx, viewport, analysis) {
  const maxSpeed = analysis.result.maxSpeed;
  const lower = analysis.result.lowerLimit;
  const upper = analysis.result.upperLimit;
  const indicated = analysis.result.indicatedSpeed;

  drawSpeedLine(ctx, viewport, analysis.calibration, 40, COLORS.line40, "40 km/h", false, 0, 0);
  drawSpeedLine(ctx, viewport, analysis.calibration, 60, COLORS.line60, "60 km/h", false, 0, 0);
  drawSpeedLine(ctx, viewport, analysis.calibration, 50, COLORS.line50, "50 km/h", false, -4, 20);
  drawSpeedLine(ctx, viewport, analysis.calibration, maxSpeed, COLORS.max, `Máx. ${formatNumber(maxSpeed)}`, false, -10, -40);
  drawSpeedLine(ctx, viewport, analysis.calibration, lower, COLORS.limit, `Limite inf. ${formatNumber(lower)}`, true, 20, -120);
  drawSpeedLine(ctx, viewport, analysis.calibration, upper, COLORS.limit, `Limite sup. ${formatNumber(upper)}`, true, -10, -120);

  drawRegisterBand(ctx, viewport, analysis);
  drawSpeedLine(ctx, viewport, analysis.calibration, indicated, COLORS.register, `Centro ${formatNumber(indicated)}`, false, 38, 170);
}

function drawPointSet(ctx, viewport, points, color, label) {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (points.length >= 2) {
    const a = viewer.imageToScreen(points[0]);
    const b = viewer.imageToScreen(points[points.length - 1]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  points.forEach((point, index) => {
    const p = viewer.imageToScreen(point);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 10px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), p.x, p.y);
    ctx.fillStyle = color;
  });
  if (label) {
    const first = viewer.imageToScreen(points[0]);
    ctx.font = "700 12px Segoe UI";
    ctx.fillText(label, first.x + 10, first.y - 10);
  }
}

function drawSpeedLine(ctx, viewport, calibration, speed, color, label, dashed, labelOffsetY = 0, labelOffsetX = 0) {
  const center = pointForSpeed(calibration, speed);
  const half = Math.max(state.image.naturalWidth, state.image.naturalHeight);
  const a = {
    x: center.x - calibration.direction.x * half,
    y: center.y - calibration.direction.y * half
  };
  const b = {
    x: center.x + calibration.direction.x * half,
    y: center.y + calibration.direction.y * half
  };
  const sa = viewer.imageToScreen(a);
  const sb = viewer.imageToScreen(b);
  const st = viewer.imageToScreen(center);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = dashed ? 1.5 : 2;
  ctx.setLineDash(dashed ? [6, 6] : []);
  ctx.beginPath();
  ctx.moveTo(sa.x, sa.y);
  ctx.lineTo(sb.x, sb.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "700 13px Segoe UI";
  ctx.textBaseline = "middle";
  const textX = st.x + 8 + labelOffsetX;
  const textY = st.y + labelOffsetY;
  const metrics = ctx.measureText(label);
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.fillRect(textX - 4, textY - 9, metrics.width + 8, 18);
  ctx.fillStyle = color;
  ctx.fillText(label, textX, textY);
  ctx.restore();
}

function drawRegisterBand(ctx, viewport, analysis) {
  const calibration = analysis.calibration;
  const upper = analysis.register.upperProjection;
  const lower = analysis.register.lowerProjection;
  const left = -Math.max(state.image.naturalWidth, state.image.naturalHeight);
  const right = Math.max(state.image.naturalWidth, state.image.naturalHeight);
  const corners = [
    pointOnAxis(calibration, upper, left),
    pointOnAxis(calibration, upper, right),
    pointOnAxis(calibration, lower, right),
    pointOnAxis(calibration, lower, left)
  ].map((point) => viewer.imageToScreen(point));

  ctx.save();
  ctx.fillStyle = "rgba(225, 180, 0, 0.22)";
  ctx.strokeStyle = COLORS.register;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function pointOnAxis(calibration, projection, along) {
  return {
    x: calibration.origin.x + calibration.normal.x * projection + calibration.direction.x * along,
    y: calibration.origin.y + calibration.normal.y * projection + calibration.direction.y * along
  };
}

function updateUi() {
  els.imageStepStatus.textContent = state.image ? "carregada" : "pendente";
  els.scaleStepStatus.textContent = `${state.marks.line40.length}/2 40 | ${state.marks.line60.length}/2 60`;
  els.registerStepStatus.textContent = `${state.marks.registerUpper.length}/2 sup. | ${state.marks.registerLower.length}/2 inf.`;
  els.resultStepStatus.textContent = state.lastAnalysis ? "calculado" : "aguardando";
  updateStepClasses();
  updateModeText();
  updateQuality();
}

function updateStepClasses() {
  const steps = document.querySelectorAll(".step");
  steps.forEach((step) => step.classList.remove("is-active", "is-done"));
  if (state.image) document.querySelector('[data-step="image"]').classList.add("is-done");
  if (state.marks.line40.length >= 2 && state.marks.line60.length >= 2) {
    document.querySelector('[data-step="scale"]').classList.add("is-done");
  }
  if (state.marks.registerUpper.length >= 2 && state.marks.registerLower.length >= 2) {
    document.querySelector('[data-step="register"]').classList.add("is-done");
  }
  if (state.lastAnalysis) {
    document.querySelector('[data-step="result"]').classList.add("is-done", "is-active");
  } else if (state.marks.line40.length >= 2 && state.marks.line60.length >= 2) {
    document.querySelector('[data-step="register"]').classList.add("is-active");
  } else if (state.image) {
    document.querySelector('[data-step="scale"]').classList.add("is-active");
  } else {
    document.querySelector('[data-step="image"]').classList.add("is-active");
  }
}

function updateModeText() {
  const texts = {
    line40: ["Modo marcação: linha 40 km/h", "Clique em 2 pontos sobre a linha verde de 40 km/h. Um 3º ponto é aceito para melhorar a reta."],
    line60: ["Modo marcação: linha 60 km/h", "Clique em 2 pontos sobre a linha azul de 60 km/h. O eixo de cálculo será 40 -> 60."],
    registerUpper: ["Modo marcação: borda superior", "Clique em 2 pontos na borda superior do traço do tacógrafo."],
    registerLower: ["Modo marcação: borda inferior", "Clique em 2 pontos na borda inferior do traço. O centro será calculado entre as bordas."]
  };
  const [title, text] = texts[state.mode] || ["Como marcar", "Carregue a imagem e use os botões de marcação. Cada linha precisa de pelo menos 2 pontos."];
  els.modeTitle.textContent = title;
  els.modeText.textContent = text;
}

function updateQuality() {
  if (state.lastAnalysis) {
    const cal = state.lastAnalysis.calibration;
    els.qualityText.textContent = `${cal.quality} | ${formatNumber(cal.pixelsPerKm, 2)} px/km | ${formatNumber(cal.angularDifference, 2)}°`;
    return;
  }
  els.qualityText.textContent = "aguardando escala";
}

function updateResult(analysis) {
  const result = analysis.result;
  els.maxSpeedOutput.textContent = `${formatNumber(result.maxSpeed)} km/h`;
  els.indicatedSpeedOutput.textContent = `${formatNumber(result.indicatedSpeed)} km/h`;
  els.divergenceOutput.textContent = `${formatNumber(result.divergence)} km/h`;
  els.lowerLimitOutput.textContent = `${formatNumber(result.lowerLimit)} km/h`;
  els.upperLimitOutput.textContent = `${formatNumber(result.upperLimit)} km/h`;
  els.toleranceOutput.textContent = `±${formatNumber(result.tolerance)} km/h`;
  els.statusBadge.textContent = result.result;
  els.statusBadge.className = `status-badge ${result.approved ? "approved" : ""}`;
  els.reasonOutput.textContent = result.reason;
}

function buildSnapshot(analysis) {
  return {
    metodo: "recorte_40_60",
    imagem: state.imageName,
    placa: els.plateInput.value,
    data_ensaio: els.dateInput.value,
    velocidade_alvo: els.targetSpeedInput.value,
    velocidade_maxima_ensaio: analysis.result.maxSpeed,
    tolerancia: analysis.result.tolerance,
    criterio_reprovacao: els.criterionInput.value,
    pontos: structuredClone(state.marks),
    qualidade: {
      pixels_por_km: analysis.calibration.pixelsPerKm,
      diferenca_angular: analysis.calibration.angularDifference,
      classificacao: analysis.calibration.quality
    },
    resultado: analysis.result,
    observacao: els.noteInput.value,
    criado_em: new Date().toISOString()
  };
}

function saveAnalysis() {
  if (!state.lastSnapshot) {
    setStatus("Calcule antes de salvar.");
    return;
  }
  const list = JSON.parse(localStorage.getItem("taccheck_analises") || "[]");
  list.unshift(state.lastSnapshot);
  localStorage.setItem("taccheck_analises", JSON.stringify(list.slice(0, 50)));
  setStatus("Análise salva no armazenamento local do navegador.");
}

function downloadMarkedImage() {
  if (!state.lastAnalysis) {
    setStatus("Calcule antes de gerar a imagem marcada.");
    return;
  }
  const canvas = renderMarkedImage();
  const link = document.createElement("a");
  link.download = `taccheck_${els.plateInput.value || "analise"}_marcada.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  setStatus("Imagem marcada gerada.");
}

function renderMarkedImage() {
  const canvas = document.createElement("canvas");
  canvas.width = state.image.naturalWidth;
  canvas.height = state.image.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(state.image, 0, 0);
  const previousViewer = {
    imageToScreen: viewer.imageToScreen.bind(viewer)
  };
  const backup = viewer.imageToScreen;
  viewer.imageToScreen = (point) => point;
  drawEvidence(ctx, { scale: 1, offsetX: 0, offsetY: 0 }, state.lastAnalysis);
  drawResultBox(ctx, state.lastAnalysis);
  viewer.imageToScreen = backup || previousViewer.imageToScreen;
  return canvas;
}

function drawResultBox(ctx, analysis) {
  const result = analysis.result;
  const boxWidth = 430;
  const boxHeight = 178;
  const x = 24;
  const y = 24;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.strokeStyle = result.approved ? COLORS.line40 : COLORS.line50;
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = "700 18px Segoe UI";
  ctx.fillText("TacCheck - Análise de velocidade", x + 14, y + 28);
  ctx.font = "14px Segoe UI";
  const rows = [
    `Vel. máxima do ensaio: ${formatNumber(result.maxSpeed)} km/h`,
    `Vel. indicada no disco: ${formatNumber(result.indicatedSpeed)} km/h`,
    `Divergência: ${formatNumber(result.divergence)} km/h`,
    `Tolerância: ±${formatNumber(result.tolerance)} km/h`,
    `Limites: ${formatNumber(result.lowerLimit)} a ${formatNumber(result.upperLimit)} km/h`,
    `Resultado: ${result.result}`,
    `Motivo: ${result.reason}`
  ];
  rows.forEach((row, index) => ctx.fillText(row, x + 14, y + 56 + index * 18));
  ctx.restore();
}

function clearMarks(resetStatus = true) {
  state.marks = {
    line40: [],
    line60: [],
    registerUpper: [],
    registerLower: []
  };
  state.mode = null;
  state.lastAnalysis = null;
  state.lastSnapshot = null;
  if (resetStatus) setStatus("Marcações limpas.");
  resetResult();
  updateUi();
  viewer.draw();
}

function undoLastMark() {
  const order = ["registerLower", "registerUpper", "line60", "line40"];
  for (const key of order) {
    if (state.marks[key].length) {
      state.marks[key].pop();
      state.lastAnalysis = null;
      state.lastSnapshot = null;
      setStatus(`Último ponto removido de ${modeLabel(key)}.`);
      resetResult();
      updateUi();
      viewer.draw();
      return;
    }
  }
}

function resetResult() {
  els.maxSpeedOutput.textContent = "-";
  els.indicatedSpeedOutput.textContent = "-";
  els.divergenceOutput.textContent = "-";
  els.lowerLimitOutput.textContent = "-";
  els.upperLimitOutput.textContent = "-";
  els.toleranceOutput.textContent = "-";
  els.statusBadge.textContent = "Aguardando cálculo";
  els.statusBadge.className = "status-badge muted";
  els.reasonOutput.textContent = "Marque a escala e o registro para calcular.";
}

function modeLabel(mode) {
  return {
    line40: "Linha 40",
    line60: "Linha 60",
    registerUpper: "Borda superior",
    registerLower: "Borda inferior"
  }[mode] || "Marcação";
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function loadDemo() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8faf6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(58, 113, 72, 0.28)";
  ctx.lineWidth = 4;
  for (let x = 180; x < 1100; x += 170) {
    ctx.beginPath();
    for (let y = 80; y < 700; y += 24) {
      ctx.moveTo(x + Math.sin(y / 40) * 4, y);
      ctx.lineTo(x + Math.sin(y / 40) * 4, y + 8);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(58, 113, 72, 0.5)";
  ctx.font = "700 78px Segoe UI";
  ctx.save();
  ctx.translate(1030, 140);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("60", 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(1030, 600);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("80", 0, 0);
  ctx.restore();
  ctx.strokeStyle = "rgba(70, 100, 70, 0.45)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(350, 461);
  ctx.bezierCurveTo(500, 458, 680, 466, 860, 462);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(350, 469);
  ctx.bezierCurveTo(520, 471, 690, 466, 860, 470);
  ctx.stroke();

  const image = new Image();
  image.onload = () => {
    setImage(image, "demo_52_101_47_740.png");
    state.marks.line40 = [{ x: 80, y: 620 }, { x: 1120, y: 620 }];
    state.marks.line60 = [{ x: 80, y: 220 }, { x: 1120, y: 220 }];
    state.marks.registerUpper = [{ x: 350, y: 461.2 }, { x: 860, y: 461.2 }];
    state.marks.registerLower = [{ x: 350, y: 469.2 }, { x: 860, y: 469.2 }];
    calculate();
  };
  image.src = canvas.toDataURL("image/png");
}
