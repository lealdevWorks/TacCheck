import { calculateAnalysis } from "../core/analysis.js";
import { buildCalibration, buildRegisterTop, pointForSpeed } from "../core/geometry.js";
import { getCalculationReadiness } from "../core/readiness.js";
import { formatNumber, parseNumber } from "../core/tolerance.js";
import {
  buildCameraConstraints,
  createCameraFileName,
  loadDefaultCamera,
  normalizeVideoDevices,
  saveDefaultCamera,
  selectPreferredCamera
} from "./camera.js";
import { ImageViewer } from "./viewer.js";

const $ = (id) => document.getElementById(id);

const APP_VERSION = "0.2.3";
const HISTORY_STORAGE_KEY = "taccheck_analises";
const METHODOLOGY_TEXT = "A analise foi realizada por conferencia rapida em imagem digital do disco de tacografo, utilizando calibracao em pixels a partir das linhas reais de 40 km/h e 60 km/h impressas no disco. A linha de 50 km/h foi calculada automaticamente como ponto medio entre as referencias 40 km/h e 60 km/h. A velocidade indicada no disco foi obtida por uma linha de leitura paralela a escala, criada a partir de 1 ponto marcado no topo do registro e ajustada por deslocamento perpendicular. O resultado foi calculado pela diferenca entre a velocidade indicada no disco e a velocidade maxima real do ensaio, respeitando a tolerancia configurada.";

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
  cameraStream: null,
  cameraDevices: [],
  cameraMode: "live",
  capturedCameraFile: null,
  capturedCameraUrl: "",
  marks: {
    line40: [],
    line60: [],
    registerTop: []
  },
  readingOffsetPx: 0,
  mode: null,
  contrast: 1,
  showMarks: true,
  lastAnalysis: null,
  lastSnapshot: null,
  lastError: null
};

let lastCalculateTriggerAt = 0;

const els = {
  fileInput: $("fileInput"),
  canvas: $("imageCanvas"),
  canvasWrap: $("canvasWrap"),
  emptyState: $("emptyState"),
  loadImageButton: $("loadImageButton"),
  openCameraButton: $("openCameraButton"),
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
  markTopButton: $("markTopButton"),
  clearMarksButton: $("clearMarksButton"),
  markedImageButton: $("markedImageButton"),
  calculateResultButton: $("calculateResultButton"),
  historyCount: $("historyCount"),
  historyList: $("historyList"),
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
  readingOffsetText: $("readingOffsetText"),
  readingPreviewText: $("readingPreviewText"),
  readingUpButton: $("readingUpButton"),
  readingResetButton: $("readingResetButton"),
  readingDownButton: $("readingDownButton"),
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
  lastCalcText: $("lastCalcText"),
  cameraModal: $("cameraModal"),
  cameraSelect: $("cameraSelect"),
  cameraVideo: $("cameraVideo"),
  cameraPreview: $("cameraPreview"),
  cameraStatusText: $("cameraStatusText"),
  refreshCamerasButton: $("refreshCamerasButton"),
  capturePhotoButton: $("capturePhotoButton"),
  usePhotoButton: $("usePhotoButton"),
  retakePhotoButton: $("retakePhotoButton"),
  closeCameraButton: $("closeCameraButton"),
  cancelCameraButton: $("cancelCameraButton")
};

const viewer = new ImageViewer(els.canvas, els.canvasWrap, drawScene);

init();

function init() {
  els.dateInput.valueAsDate = new Date(2024, 4, 24);
  window.TacCheckCalculate = triggerCalculate;
  bindEvents();
  updateUi();
  renderHistory();

  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") {
    loadDemo();
  }
}

function bindEvents() {
  els.loadImageButton.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", handleFile);
  els.openCameraButton.addEventListener("click", openCameraModal);
  els.calculateButton.addEventListener("click", triggerCalculate);
  els.calculateButton.addEventListener("pointerup", triggerCalculate);
  els.calculateResultButton.addEventListener("click", triggerCalculate);
  els.calculateResultButton.addEventListener("pointerup", triggerCalculate);
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleDocumentKeydown);
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
  els.mark40Button.addEventListener("click", () => startReferenceMark("line40"));
  els.mark60Button.addEventListener("click", () => startReferenceMark("line60"));
  els.markTopButton.addEventListener("click", () => setMode("registerTop"));
  els.readingUpButton.addEventListener("click", (event) => adjustReadingOffset(1, event));
  els.readingResetButton.addEventListener("click", resetReadingOffset);
  els.readingDownButton.addEventListener("click", (event) => adjustReadingOffset(-1, event));
  els.clearMarksButton.addEventListener("click", clearMarks);
  els.markedImageButton.addEventListener("click", downloadMarkedImage);
  els.historyList.addEventListener("click", handleHistoryClick);
  els.cameraSelect.addEventListener("change", handleCameraSelection);
  els.refreshCamerasButton.addEventListener("click", refreshCameraDevices);
  els.capturePhotoButton.addEventListener("click", captureCameraPhoto);
  els.usePhotoButton.addEventListener("click", useCapturedCameraPhoto);
  els.retakePhotoButton.addEventListener("click", retakeCameraPhoto);
  els.closeCameraButton.addEventListener("click", closeCameraModal);
  els.cancelCameraButton.addEventListener("click", closeCameraModal);
  els.canvas.addEventListener("click", handleCanvasClick);
  els.toleranceInput.addEventListener("input", clearCalculationError);
  els.maxSpeedInput.addEventListener("input", clearCalculationError);
}

function handleDocumentClick(event) {
  if (event.target.closest?.("#calculateButton, #calculateResultButton")) {
    triggerCalculate(event);
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== "Enter") return;
  if (document.activeElement?.matches?.("textarea, select, button")) return;
  const readiness = getUiReadiness();
  if (!readiness.canCalculate) return;
  triggerCalculate(event);
}

function clearCalculationError() {
  state.lastError = null;
  updateUi();
}

function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  loadImageFile(file);
  event.target.value = "";
}

function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    setImage(image, file.name);
    setStatus("Imagem carregada. Marque a linha 40 km/h.");
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    setStatus("Nao foi possivel carregar a imagem selecionada.");
  };
  image.src = url;
}

async function openCameraModal() {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
    const message = "Seu navegador ou ambiente atual nao permite acesso a camera. Abra o sistema em HTTPS ou localhost.";
    setStatus(message);
    return;
  }

  clearCapturedCameraPhoto();
  els.cameraModal.hidden = false;
  setCameraStatus("Solicitando acesso a camera...");
  updateCameraCaptureState("live");

  try {
    const devices = await refreshCameraDevices();
    const savedCamera = loadDefaultCamera(localStorage);
    const preferred = selectPreferredCamera(devices, savedCamera);
    if (savedCamera && preferred && preferred.deviceId !== savedCamera.deviceId) {
      setCameraStatus("Camera padrao nao encontrada. Selecione outra camera.");
    }
    await openCamera(preferred?.deviceId || "");
    await refreshCameraDevices();
    const selected = selectedCameraDevice();
    if (selected) saveDefaultCamera(localStorage, selected);
    setCameraStatus("Camera aberta. Posicione o disco e tire a foto.");
  } catch (error) {
    setCameraStatus(cameraErrorMessage(error));
    setStatus(cameraErrorMessage(error));
  }
}

async function refreshCameraDevices() {
  const devices = normalizeVideoDevices(await navigator.mediaDevices.enumerateDevices());
  state.cameraDevices = devices;
  renderCameraOptions(devices);
  return devices;
}

function renderCameraOptions(devices) {
  els.cameraSelect.innerHTML = "";
  if (!devices.length) {
    els.cameraSelect.append(new Option("Nenhuma camera encontrada", ""));
    return;
  }

  const savedCamera = loadDefaultCamera(localStorage);
  const preferred = selectPreferredCamera(devices, savedCamera);
  devices.forEach((device) => {
    els.cameraSelect.append(new Option(device.label, device.deviceId));
  });
  els.cameraSelect.value = preferred?.deviceId || devices[0].deviceId;
}

async function handleCameraSelection() {
  const device = selectedCameraDevice();
  if (device) saveDefaultCamera(localStorage, device);
  clearCapturedCameraPhoto();
  updateCameraCaptureState("live");
  try {
    await openCamera(device?.deviceId || "");
    setCameraStatus("Camera selecionada e salva como padrao.");
  } catch (error) {
    setCameraStatus(cameraErrorMessage(error));
  }
}

async function openCamera(deviceId) {
  stopCameraStream();
  const stream = await navigator.mediaDevices.getUserMedia(buildCameraConstraints(deviceId));
  state.cameraStream = stream;
  els.cameraVideo.srcObject = stream;
  els.cameraVideo.hidden = false;
  els.cameraPreview.hidden = true;
  await els.cameraVideo.play();

  const selected = selectedCameraDevice();
  if (selected) saveDefaultCamera(localStorage, selected);
}

function stopCameraStream() {
  if (!state.cameraStream) return;
  state.cameraStream.getTracks().forEach((track) => track.stop());
  state.cameraStream = null;
  els.cameraVideo.srcObject = null;
}

async function captureCameraPhoto() {
  if (!state.cameraStream) {
    setCameraStatus("A camera ainda nao esta pronta para capturar.");
    return;
  }

  els.capturePhotoButton.disabled = true;
  await waitForCameraFrame();
  if (!els.cameraVideo.videoWidth || !els.cameraVideo.videoHeight) {
    els.capturePhotoButton.disabled = false;
    setCameraStatus("A camera ainda nao esta pronta para capturar.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = els.cameraVideo.videoWidth;
  canvas.height = els.cameraVideo.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(els.cameraVideo, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) {
    els.capturePhotoButton.disabled = false;
    setCameraStatus("Nao foi possivel capturar a foto. Tente novamente.");
    return;
  }

  try {
    await setCapturedCameraPreview(blob);
    stopCameraStream();
    updateCameraCaptureState("preview");
    setCameraStatus("Foto capturada. Use esta foto ou tire outra.");
  } catch {
    clearCapturedCameraPhoto();
    setCameraStatus("Nao foi possivel mostrar a pre-visualizacao. Tire outra foto.");
  } finally {
    els.capturePhotoButton.disabled = false;
  }
}

function waitForCameraFrame() {
  if (els.cameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && els.cameraVideo.videoWidth && els.cameraVideo.videoHeight) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, 1200);
    els.cameraVideo.addEventListener("loadeddata", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function setCapturedCameraPreview(blob) {
  clearCapturedCameraPhoto();
  state.capturedCameraFile = new File([blob], createCameraFileName(), { type: "image/jpeg" });
  state.capturedCameraUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    els.cameraPreview.onload = () => {
      els.cameraPreview.onload = null;
      els.cameraPreview.onerror = null;
      resolve();
    };
    els.cameraPreview.onerror = () => {
      els.cameraPreview.onload = null;
      els.cameraPreview.onerror = null;
      reject(new Error("Preview load failed."));
    };
    els.cameraPreview.src = state.capturedCameraUrl;
  });
}

function useCapturedCameraPhoto() {
  if (!state.capturedCameraFile) {
    setCameraStatus("Tire uma foto antes de usar.");
    return;
  }
  loadImageFile(state.capturedCameraFile);
  closeCameraModal();
  setStatus("Foto da camera carregada. Marque a linha 40 km/h.");
}

async function retakeCameraPhoto() {
  clearCapturedCameraPhoto();
  updateCameraCaptureState("live");
  try {
    await openCamera(els.cameraSelect.value);
    setCameraStatus("Camera reaberta. Tire outra foto.");
  } catch (error) {
    setCameraStatus(cameraErrorMessage(error));
  }
}

function closeCameraModal() {
  stopCameraStream();
  clearCapturedCameraPhoto();
  els.cameraModal.hidden = true;
}

function clearCapturedCameraPhoto() {
  if (state.capturedCameraUrl) URL.revokeObjectURL(state.capturedCameraUrl);
  state.capturedCameraUrl = "";
  state.capturedCameraFile = null;
  els.cameraPreview.onload = null;
  els.cameraPreview.onerror = null;
  els.cameraPreview.removeAttribute("src");
}

function updateCameraCaptureState(mode) {
  state.cameraMode = mode === "preview" ? "preview" : "live";
  const hasPhoto = state.cameraMode === "preview";
  els.cameraModal.dataset.cameraMode = state.cameraMode;
  els.capturePhotoButton.hidden = hasPhoto;
  els.usePhotoButton.hidden = !hasPhoto;
  els.retakePhotoButton.hidden = !hasPhoto;
  els.cameraVideo.hidden = hasPhoto;
  els.cameraPreview.hidden = !hasPhoto;
}

function selectedCameraDevice() {
  return state.cameraDevices.find((device) => device.deviceId === els.cameraSelect.value) || null;
}

function setCameraStatus(message) {
  els.cameraStatusText.textContent = message;
}

function cameraErrorMessage(error) {
  const name = error?.name || "";
  const messages = {
    NotAllowedError: "A permissao da camera foi negada. Libere o acesso a camera no navegador ou use a opcao Carregar imagem.",
    NotFoundError: "Nenhuma camera foi encontrada neste computador. Conecte uma webcam ou use a opcao Carregar imagem.",
    NotReadableError: "A camera nao pode ser acessada. Verifique se ela esta sendo usada por outro aplicativo.",
    OverconstrainedError: "A camera selecionada nao suporta esta configuracao. Escolha outra camera ou reduza a qualidade."
  };
  return messages[name] || "Nao foi possivel iniciar a camera. Use Carregar imagem ou tente novamente.";
}

function setImage(image, name) {
  state.image = image;
  state.imageName = name;
  state.readingOffsetPx = 0;
  state.lastAnalysis = null;
  state.lastSnapshot = null;
  state.lastError = null;
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

function startReferenceMark(mode) {
  if (state.marks[mode].length >= 2 && state.mode !== mode) {
    state.marks[mode] = [];
    state.lastAnalysis = null;
    state.lastSnapshot = null;
    state.lastError = null;
    resetResult();
  }
  setMode(mode);
}

function handleCanvasClick(event) {
  if (event.button !== 0 || viewer.shouldIgnoreClick() || !state.image || !state.mode) return;
  const point = viewer.eventToImage(event);
  if (point.x < 0 || point.y < 0 || point.x > state.image.naturalWidth || point.y > state.image.naturalHeight) {
    setStatus("Clique ficou fora da imagem.");
    return;
  }

  const bucket = state.marks[state.mode];
  if (state.mode === "registerTop") {
    state.marks.registerTop = [point];
    state.readingOffsetPx = 0;
  } else {
    if (bucket.length >= 3) bucket.shift();
    bucket.push(point);
  }

  const label = modeLabel(state.mode);
  const count = state.mode === "registerTop" ? 1 : state.marks[state.mode].length;
  const message = state.mode === "registerTop"
    ? "Linha criada. Use os controles para ajustar a leitura."
    : `${label}: ponto ${count} marcado em coordenada real (${formatNumber(point.x, 1)}, ${formatNumber(point.y, 1)}).`;
  setStatus(message);
  state.lastAnalysis = null;
  state.lastSnapshot = null;
  state.lastError = null;
  resetResult();
  updateUi();
  viewer.draw();
}

function triggerCalculate(event) {
  if (event) {
    if (event.__taccheckCalculateHandled) return;
    event.__taccheckCalculateHandled = true;
    event.preventDefault();
  }

  const now = Date.now();
  if (now - lastCalculateTriggerAt < 250) return;
  lastCalculateTriggerAt = now;
  calculate();
}

function calculate(options = {}) {
  const config = options instanceof Event ? {} : options;
  try {
    validateBeforeSpeedRequest();
    const maxSpeed = config.maxSpeed ?? getMaxSpeedForCalculation();
    validateBeforeCalculation(maxSpeed);
    const analysis = calculateAnalysis({
      line40Points: state.marks.line40,
      line60Points: state.marks.line60,
      registerTopPoints: state.marks.registerTop,
      registerTopOffsetPx: state.readingOffsetPx,
      maxSpeed,
      tolerance: parseNumber(els.toleranceInput.value, 4),
      failCriterion: els.criterionInput.value
    });
    state.lastAnalysis = analysis;
    state.lastSnapshot = buildSnapshot(analysis);
    state.lastError = null;
    updateResult(analysis);
    setStatus(config.statusMessage || "Calculo concluido com a linha de leitura do topo do registro.");
    els.lastCalcText.textContent = `Ultimo calculo: ${new Date().toLocaleString("pt-BR")}`;
    if (config.resetMaxSpeedInput !== false) resetMaxSpeedInput();
    viewer.draw();
  } catch (error) {
    state.lastAnalysis = null;
    state.lastSnapshot = null;
    state.lastError = error.message;
    setStatus(error.message);
    showCalculationError(error.message);
  }
  updateUi();
}

function validateBeforeSpeedRequest() {
  if (!state.image) throw new Error("Carregue uma imagem.");
  if (state.marks.line40.length < 2) throw new Error("Marque pelo menos 2 pontos na linha 40 km/h.");
  if (state.marks.line60.length < 2) throw new Error("Marque pelo menos 2 pontos na linha 60 km/h.");
  if (state.marks.registerTop.length < 1) throw new Error("Marque pelo menos 1 ponto no topo do registro.");
}

function getMaxSpeedForCalculation() {
  const typedSpeed = parseNumber(els.maxSpeedInput.value, Number.NaN);
  if (Number.isFinite(typedSpeed) && typedSpeed > 0) {
    return typedSpeed;
  }
  return requestMaxSpeed();
}

function requestMaxSpeed() {
  const currentValue = els.maxSpeedInput.value.trim();
  const answer = window.prompt("Informe a velocidade maxima atingida no ensaio (km/h):", currentValue);
  if (answer === null) throw new Error("Calculo cancelado. Informe a velocidade maxima atingida.");
  const maxSpeed = parseNumber(answer);
  els.maxSpeedInput.value = formatNumber(maxSpeed);
  return maxSpeed;
}

function resetMaxSpeedInput() {
  els.maxSpeedInput.value = "";
}

function validateBeforeCalculation(maxSpeed) {
  if (maxSpeed <= 0) throw new Error("Informe a velocidade maxima real do ensaio.");
}

function getUiReadiness() {
  return getCalculationReadiness({
    imageLoaded: Boolean(state.image),
    line40Points: state.marks.line40,
    line60Points: state.marks.line60,
    registerTopPoints: state.marks.registerTop,
    maxSpeed: els.maxSpeedInput.value,
    tolerance: els.toleranceInput.value
  });
}

function getReadingPreview() {
  if (state.marks.line40.length < 2 || state.marks.line60.length < 2 || state.marks.registerTop.length < 1) {
    return null;
  }

  try {
    const calibration = buildCalibration(state.marks.line40, state.marks.line60);
    const register = buildRegisterTop(state.marks.registerTop, calibration, state.readingOffsetPx);
    return { calibration, register };
  } catch {
    return null;
  }
}

function adjustReadingOffset(direction, event) {
  if (!state.marks.registerTop.length) {
    setStatus("Marque 1 ponto no topo do registro antes de ajustar.");
    return;
  }

  const step = event.shiftKey ? 5 : 1;
  state.readingOffsetPx += direction * step;
  handleReadingLineChanged("Linha de leitura ajustada.");
}

function resetReadingOffset() {
  if (!state.marks.registerTop.length) return;
  state.readingOffsetPx = 0;
  handleReadingLineChanged("Deslocamento da linha de leitura zerado.");
}

function handleReadingLineChanged(message) {
  state.lastSnapshot = null;
  state.lastError = null;

  if (state.lastAnalysis) {
    calculate({
      maxSpeed: state.lastAnalysis.result.maxSpeed,
      resetMaxSpeedInput: false,
      statusMessage: message
    });
    return;
  }

  resetResult();
  setStatus(message);
  updateUi();
  viewer.draw();
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
  drawPointSet(ctx, state.marks.line40, COLORS.line40, "40");
  drawPointSet(ctx, state.marks.line60, COLORS.line60, "60");
  drawPointSet(ctx, state.marks.registerTop, COLORS.register, "topo");

  if (state.lastAnalysis) {
    drawEvidence(ctx, viewport, state.lastAnalysis, rect);
  } else {
    const preview = getReadingPreview();
    if (preview) {
      drawLineAtCenter(ctx, preview.calibration, preview.register.line.center, COLORS.register, "linha de leitura", false, 34, 140);
    }
  }
  ctx.restore();
}

function drawEvidence(ctx, viewport, analysis) {
  const maxSpeed = analysis.result.maxSpeed;
  const lower = analysis.result.lowerLimit;
  const upper = analysis.result.upperLimit;
  const indicated = analysis.result.indicatedSpeed;

  drawSpeedLine(ctx, analysis.calibration, 40, COLORS.line40, "40 km/h", false, 0, 0);
  drawSpeedLine(ctx, analysis.calibration, 60, COLORS.line60, "60 km/h", false, 0, 0);
  drawSpeedLine(ctx, analysis.calibration, 50, COLORS.line50, "50 km/h", false, -4, 20);
  drawSpeedLine(ctx, analysis.calibration, maxSpeed, COLORS.max, `Max. ${formatNumber(maxSpeed)}`, false, -10, -40);
  drawSpeedLine(ctx, analysis.calibration, lower, COLORS.limit, `Limite inf. ${formatNumber(lower)}`, true, 20, -120);
  drawSpeedLine(ctx, analysis.calibration, upper, COLORS.limit, `Limite sup. ${formatNumber(upper)}`, true, -10, -120);
  drawSpeedLine(ctx, analysis.calibration, indicated, COLORS.register, `Vel. indicada ${formatNumber(indicated)}`, false, 34, 140);
}

function drawPointSet(ctx, points, color, label) {
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

function drawSpeedLine(ctx, calibration, speed, color, label, dashed, labelOffsetY = 0, labelOffsetX = 0) {
  const center = pointForSpeed(calibration, speed);
  drawLineAtCenter(ctx, calibration, center, color, label, dashed, labelOffsetY, labelOffsetX);
}

function drawLineAtCenter(ctx, calibration, center, color, label, dashed, labelOffsetY = 0, labelOffsetX = 0) {
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

function updateUi() {
  const readiness = getUiReadiness();
  els.imageStepStatus.textContent = state.image ? "carregada" : "pendente";
  els.scaleStepStatus.textContent = `${state.marks.line40.length}/2 40 | ${state.marks.line60.length}/2 60`;
  els.registerStepStatus.textContent = state.marks.registerTop.length
    ? "1/1 topo"
    : "pendente";
  els.mark40Button.textContent = state.marks.line40.length >= 2 ? "Remarcar 40" : "Marcar 40";
  els.mark60Button.textContent = state.marks.line60.length >= 2 ? "Remarcar 60" : "Marcar 60";
  els.resultStepStatus.textContent = state.lastAnalysis || state.lastSnapshot ? "calculado" : "aguardando";
  els.calculateButton.disabled = false;
  els.calculateResultButton.disabled = false;
  updateStepClasses();
  updateModeText();
  updateQuality(readiness);
  updateReadingControls();
  if (!state.lastAnalysis && !state.lastSnapshot) updateResultPlaceholder(readiness);
}

function updateStepClasses() {
  const steps = document.querySelectorAll(".step");
  steps.forEach((step) => step.classList.remove("is-active", "is-done"));
  if (state.image) document.querySelector('[data-step="image"]').classList.add("is-done");
  if (state.marks.line40.length >= 2 && state.marks.line60.length >= 2) {
    document.querySelector('[data-step="scale"]').classList.add("is-done");
  }
  if (state.marks.registerTop.length >= 1) {
    document.querySelector('[data-step="register"]').classList.add("is-done");
  }
  if (state.lastAnalysis || state.lastSnapshot) {
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
    line40: ["Marcar 40 km/h", "Clique em 2 pontos na linha 40. Um 3o ponto melhora a reta."],
    line60: ["Marcar 60 km/h", "Clique em 2 pontos na linha 60. A escala usa 40 -> 60."],
    registerTop: ["Marcar topo", "Clique em 1 ponto onde esta o topo do registro."]
  };
  const [title, text] = texts[state.mode] || ["Como marcar", "Carregue a imagem. Marque 40, 60 e o topo do registro."];
  els.modeTitle.textContent = title;
  els.modeText.textContent = text;
}

function updateQuality(readiness = getUiReadiness()) {
  if (state.lastAnalysis) {
    const cal = state.lastAnalysis.calibration;
    els.qualityText.textContent = `calculado | linha paralela | ${cal.quality} | ${formatNumber(cal.pixelsPerKm, 2)} px/km`;
    return;
  }
  if (!readiness.hasScale) {
    els.qualityText.textContent = "aguardando escala";
    return;
  }
  if (!readiness.hasRegister) {
    els.qualityText.textContent = "escala marcada | aguardando topo";
    return;
  }
  if (!readiness.hasTolerance) {
    els.qualityText.textContent = "topo marcado | aguardando tolerancia";
    return;
  }
  els.qualityText.textContent = "pronto para calcular | linha paralela";
}

function updateReadingControls() {
  const preview = getReadingPreview();
  els.readingOffsetText.textContent = formatOffsetPx(state.readingOffsetPx);
  els.readingUpButton.disabled = !state.marks.registerTop.length;
  els.readingResetButton.disabled = !state.marks.registerTop.length || state.readingOffsetPx === 0;
  els.readingDownButton.disabled = !state.marks.registerTop.length;

  if (!state.marks.registerTop.length) {
    els.readingPreviewText.textContent = "Clique em 1 ponto no topo do registro.";
  } else if (!preview) {
    els.readingPreviewText.textContent = "Linha criada. Marque 40 e 60 para calcular a leitura.";
  } else {
    els.readingPreviewText.textContent = `Vel. indicada parcial: ${formatNumber(preview.register.indicatedSpeed)} km/h`;
  }
}

function formatOffsetPx(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 1)} px`;
}

function updateResultPlaceholder(readiness) {
  els.maxSpeedOutput.textContent = "-";
  els.indicatedSpeedOutput.textContent = "-";
  els.divergenceOutput.textContent = "-";
  els.lowerLimitOutput.textContent = "-";
  els.upperLimitOutput.textContent = "-";
  els.toleranceOutput.textContent = "-";

  if (state.lastError) {
    showCalculationError(state.lastError);
    return;
  }

  if (readiness.canCalculate) {
    els.statusBadge.textContent = "Pronto para calcular";
    els.statusBadge.className = "status-badge ready";
    els.reasonOutput.textContent = "Clique em Calcular para gerar o resultado.";
    return;
  }

  els.statusBadge.textContent = "Aguardando calculo";
  els.statusBadge.className = "status-badge muted";
  els.reasonOutput.textContent = readinessMessage(readiness.reason);
}

function showCalculationError(message) {
  els.statusBadge.textContent = "Nao calculou";
  els.statusBadge.className = "status-badge error";
  els.reasonOutput.textContent = message;
}

function readinessMessage(reason) {
  return {
    "aguardando imagem": "Carregue uma imagem para iniciar a analise.",
    "aguardando escala": "Marque 2 pontos na linha 40 e 2 pontos na linha 60.",
    "aguardando topo do registro": "Marque pelo menos 1 ponto no topo do registro.",
    "aguardando velocidade maxima": "Informe a velocidade maxima do ensaio.",
    "aguardando tolerancia": "Informe uma tolerancia valida."
  }[reason] || "Complete os dados para calcular.";
}

function updateResult(analysis) {
  const result = analysis.result;
  els.maxSpeedOutput.textContent = `${formatNumber(result.maxSpeed)} km/h`;
  els.indicatedSpeedOutput.textContent = `${formatNumber(result.indicatedSpeed)} km/h`;
  els.divergenceOutput.textContent = `${formatNumber(result.divergence)} km/h`;
  els.lowerLimitOutput.textContent = `${formatNumber(result.lowerLimit)} km/h`;
  els.upperLimitOutput.textContent = `${formatNumber(result.upperLimit)} km/h`;
  els.toleranceOutput.textContent = `+/-${formatNumber(result.tolerance)} km/h`;
  els.statusBadge.textContent = result.result;
  els.statusBadge.className = `status-badge ${result.approved ? "approved" : ""}`;
  els.reasonOutput.textContent = result.reason;
}

function buildSnapshot(analysis) {
  const calculatedAt = new Date().toISOString();
  const result = analysis.result;
  const points = structuredClone(state.marks);

  return {
    metodo: "recorte_40_60_topo_registro",
    imagem: state.imageName,
    placa: els.plateInput.value,
    data_ensaio: els.dateInput.value,
    velocidade_alvo: els.targetSpeedInput.value,
    velocidade_maxima_ensaio: result.maxSpeed,
    tolerancia: result.tolerance,
    criterio: els.criterionInput.value,
    criterio_reprovacao: els.criterionInput.value,
    velocidade_indicada_disco: result.indicatedSpeed,
    divergencia: result.divergence,
    limite_inferior: result.lowerLimit,
    limite_superior: result.upperLimit,
    resultado: result.result,
    motivo: result.reason,
    pontos_linha_40: points.line40,
    pontos_linha_60: points.line60,
    pontos_topo_registro: points.registerTop,
    deslocamento_linha_leitura_px: state.readingOffsetPx,
    data_hora_calculo: calculatedAt,
    versao_taccheck: APP_VERSION,
    pontos: points,
    metodologia: METHODOLOGY_TEXT,
    qualidade: {
      pixels_por_km: analysis.calibration.pixelsPerKm,
      diferenca_angular: analysis.calibration.angularDifference,
      classificacao: analysis.calibration.quality
    },
    resultado_detalhado: result,
    observacao: els.noteInput.value,
    criado_em: calculatedAt
  };
}

function saveAnalysis() {
  if (!state.lastSnapshot) {
    setStatus("Calcule antes de salvar.");
    return;
  }
  const list = readHistory();
  const savedAt = new Date().toISOString();
  const snapshot = snapshotWithCurrentForm(state.lastSnapshot);
  const record = {
    ...snapshot,
    id: createHistoryId(),
    salvo_em: savedAt,
    versao_taccheck: snapshot.versao_taccheck || APP_VERSION
  };
  list.unshift(record);
  writeHistory(list.slice(0, 50));
  renderHistory();
  setStatus("Analise salva no armazenamento local do navegador.");
}

function snapshotWithCurrentForm(snapshot) {
  return {
    ...structuredClone(snapshot),
    placa: els.plateInput.value,
    data_ensaio: els.dateInput.value,
    velocidade_alvo: els.targetSpeedInput.value,
    observacao: els.noteInput.value
  };
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    let changed = false;
    const records = parsed
      .filter((record) => record && typeof record === "object")
      .map((record) => {
        if (record.id) return record;
        changed = true;
        return { ...record, id: createHistoryId() };
      });

    if (changed) writeHistory(records);
    return records;
  } catch {
    return [];
  }
}

function writeHistory(records) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
}

function createHistoryId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `taccheck_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function renderHistory() {
  const records = readHistory();
  els.historyCount.textContent = String(records.length);

  if (!records.length) {
    els.historyList.innerHTML = '<p class="history-empty">Nenhuma analise salva.</p>';
    return;
  }

  els.historyList.innerHTML = records.map((record) => {
    const result = getRecordResult(record);
    const approved = result === "APROVADO";
    const title = escapeHtml(record.placa || "Sem placa");
    const date = escapeHtml(formatDate(record.data_ensaio) || "Sem data");
    const calculatedAt = escapeHtml(formatDateTime(record.data_hora_calculo || record.criado_em));
    const speed = formatMaybeNumber(record.velocidade_maxima_ensaio);
    return `
      <div class="history-item" data-id="${escapeHtml(record.id)}">
        <div class="history-title">
          <strong>${title}</strong>
          <span class="history-result ${approved ? "approved" : ""}">${escapeHtml(result || "-")}</span>
        </div>
        <div class="history-meta">
          <span>${date} | Max. ${speed} km/h</span>
          <span>${calculatedAt}</span>
        </div>
        <div class="history-actions">
          <button type="button" data-action="open">Abrir</button>
          <button type="button" data-action="export">JSON</button>
          <button type="button" data-action="delete">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

function handleHistoryClick(event) {
  const button = event.target.closest("button[data-action]");
  const item = event.target.closest(".history-item");
  if (!button || !item) return;

  const records = readHistory();
  const record = records.find((entry) => entry.id === item.dataset.id);
  if (!record) return;

  const action = button.dataset.action;
  if (action === "open") {
    openSavedAnalysis(record);
  } else if (action === "export") {
    exportSavedAnalysis(record);
  } else if (action === "delete") {
    deleteSavedAnalysis(record.id);
  }
}

function openSavedAnalysis(record) {
  const points = pointsFromRecord(record);
  state.marks = points;
  state.readingOffsetPx = parseNumber(record.deslocamento_linha_leitura_px, 0);
  state.lastError = null;
  state.lastSnapshot = record;
  state.lastAnalysis = buildAnalysisFromRecord(record, points);

  els.plateInput.value = record.placa || "";
  els.dateInput.value = record.data_ensaio || "";
  els.targetSpeedInput.value = record.velocidade_alvo || "50";
  els.maxSpeedInput.value = formatMaybeNumber(record.velocidade_maxima_ensaio);
  els.toleranceInput.value = formatMaybeNumber(record.tolerancia || 4);
  els.criterionInput.value = record.criterio || record.criterio_reprovacao || "gt";
  els.noteInput.value = record.observacao || "";

  if (state.lastAnalysis) {
    updateResult(state.lastAnalysis);
  } else {
    updateResultFromRecord(record);
  }

  els.lastCalcText.textContent = `Ultimo calculo: ${formatDateTime(record.data_hora_calculo || record.criado_em)}`;
  setStatus("Analise salva aberta do historico local.");
  updateUi();
  viewer.draw();
}

function buildAnalysisFromRecord(record, points) {
  try {
    return calculateAnalysis({
      line40Points: points.line40,
      line60Points: points.line60,
      registerTopPoints: points.registerTop,
      registerTopOffsetPx: state.readingOffsetPx,
      maxSpeed: parseNumber(record.velocidade_maxima_ensaio, Number.NaN),
      tolerance: parseNumber(record.tolerancia, Number.NaN),
      failCriterion: record.criterio || record.criterio_reprovacao || "gt"
    });
  } catch {
    return null;
  }
}

function updateResultFromRecord(record) {
  els.maxSpeedOutput.textContent = `${formatMaybeNumber(record.velocidade_maxima_ensaio)} km/h`;
  els.indicatedSpeedOutput.textContent = `${formatMaybeNumber(record.velocidade_indicada_disco)} km/h`;
  els.divergenceOutput.textContent = `${formatMaybeNumber(record.divergencia)} km/h`;
  els.lowerLimitOutput.textContent = `${formatMaybeNumber(record.limite_inferior)} km/h`;
  els.upperLimitOutput.textContent = `${formatMaybeNumber(record.limite_superior)} km/h`;
  els.toleranceOutput.textContent = `+/-${formatMaybeNumber(record.tolerancia)} km/h`;
  const result = getRecordResult(record);
  els.statusBadge.textContent = result || "-";
  els.statusBadge.className = `status-badge ${result === "APROVADO" ? "approved" : ""}`;
  els.reasonOutput.textContent = record.motivo || "-";
}

function exportSavedAnalysis(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `taccheck_${record.placa || "analise"}_${record.id}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("JSON da analise exportado.");
}

function deleteSavedAnalysis(id) {
  const records = readHistory().filter((record) => record.id !== id);
  writeHistory(records);
  renderHistory();
  setStatus("Analise removida do historico local.");
}

function pointsFromRecord(record) {
  const registerTop = structuredClone(record.pontos_topo_registro || record.pontos?.registerTop || []);
  return {
    line40: structuredClone(record.pontos_linha_40 || record.pontos?.line40 || []),
    line60: structuredClone(record.pontos_linha_60 || record.pontos?.line60 || []),
    registerTop: registerTop.length ? [registerTop[0]] : []
  };
}

function getRecordResult(record) {
  if (typeof record.resultado === "string") return record.resultado;
  return record.resultado?.result || record.resultado_detalhado?.result || "";
}

function formatMaybeNumber(value, digits = 3) {
  const parsed = parseNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? formatNumber(parsed, digits) : "-";
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const backup = viewer.imageToScreen;
  viewer.imageToScreen = (point) => point;
  drawEvidence(ctx, { scale: 1, offsetX: 0, offsetY: 0 }, state.lastAnalysis);
  drawResultBox(ctx, state.lastAnalysis);
  viewer.imageToScreen = backup;
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
  ctx.fillText("TacCheck - Analise de velocidade", x + 14, y + 28);
  ctx.font = "14px Segoe UI";
  const rows = [
    `Vel. maxima do ensaio: ${formatNumber(result.maxSpeed)} km/h`,
    `Vel. indicada no disco: ${formatNumber(result.indicatedSpeed)} km/h`,
    `Divergencia: ${formatNumber(result.divergence)} km/h`,
    `Tolerancia: +/-${formatNumber(result.tolerance)} km/h`,
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
    registerTop: []
  };
  state.readingOffsetPx = 0;
  state.mode = null;
  state.lastAnalysis = null;
  state.lastSnapshot = null;
  state.lastError = null;
  if (resetStatus) setStatus("Marcacoes limpas.");
  resetResult();
  updateUi();
  viewer.draw();
}

function undoLastMark() {
  const order = ["registerTop", "line60", "line40"];
  for (const key of order) {
    if (state.marks[key].length) {
      state.marks[key].pop();
      if (key === "registerTop") state.readingOffsetPx = 0;
      state.lastAnalysis = null;
      state.lastSnapshot = null;
      state.lastError = null;
      setStatus(`Ultimo ponto removido de ${modeLabel(key)}.`);
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
  els.statusBadge.textContent = "Aguardando calculo";
  els.statusBadge.className = "status-badge muted";
  els.reasonOutput.textContent = "Marque a escala e o topo do registro para calcular.";
}

function modeLabel(mode) {
  return {
    line40: "Linha 40",
    line60: "Linha 60",
    registerTop: "Topo do registro"
  }[mode] || "Marcacao";
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
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(350, 465.2);
  ctx.bezierCurveTo(500, 462, 680, 470, 860, 466);
  ctx.stroke();

  const image = new Image();
  image.onload = () => {
    setImage(image, "demo_52_101_47_740.png");
    state.marks.line40 = [{ x: 80, y: 620 }, { x: 1120, y: 620 }];
    state.marks.line60 = [{ x: 80, y: 220 }, { x: 1120, y: 220 }];
    state.marks.registerTop = [{ x: 605, y: 465.2 }];
    state.readingOffsetPx = 0;
    calculate({ maxSpeed: 52.101 });
  };
  image.src = canvas.toDataURL("image/png");
}
