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

const APP_VERSION = "0.3.0";
const HISTORY_STORAGE_KEY = "taccheck_analises";
const THEME_COOKIE_NAME = "taccheck_theme";
const THEME_VALUES = ["auto", "light", "dark"];
const METHODOLOGY_TEXT = "A análise compara a velocidade frequente estimada no disco com a velocidade registrada no relatório. A escala é calibrada pelas linhas 40 e 60 km/h; a linha de 50 km/h é somente referência visual. Os limites objetivos são calculados pelo relatório ±4,000 km/h. Picos e quedas marcados permanecem suspeitos até confirmação visual de continuidade e coerência com o traço.";

const COLORS = {
  line40: "#149447",
  line60: "#0b6bdc",
  line50: "#e02020",
  max: "#7a2fb8",
  limit: "#ef4444",
  register: "#e1b400",
  peak: "#f97316",
  drop: "#06b6d4",
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
    registerTop: [],
    peak: [],
    drop: []
  },
  occurrenceConfirmation: { peak: "suspected", drop: "suspected" },
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
  guideButton: $("guideButton"),
  settingsButton: $("settingsButton"),
  settingsPopover: $("settingsPopover"),
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
  markPeakButton: $("markPeakButton"),
  markDropButton: $("markDropButton"),
  highestSpeedOutput: $("highestSpeedOutput"),
  lowestSpeedOutput: $("lowestSpeedOutput"),
  peakLimitOutput: $("peakLimitOutput"),
  dropLimitOutput: $("dropLimitOutput"),
  occurrenceStatus: $("occurrenceStatus"),
  occurrenceReason: $("occurrenceReason"),
  occurrenceActions: $("occurrenceActions"),
  confirmOccurrenceButton: $("confirmOccurrenceButton"),
  ignoreOccurrenceButton: $("ignoreOccurrenceButton"),
  adjustRegionButton: $("adjustRegionButton"),
  statusText: $("statusText"),
  lastCalcText: $("lastCalcText"),
  guideModal: $("guideModal"),
  closeGuideButton: $("closeGuideButton"),
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
  els.dateInput.value = todayInputDate();
  window.TacCheckCalculate = triggerCalculate;
  initThemeSettings();
  bindEvents();
  updateUi();
  renderHistory();

  const params = new URLSearchParams(window.location.search);
  if (params.get("guide") === "1") {
    els.guideModal.hidden = false;
  }
  if (params.get("demo") === "1") {
    loadDemo(params.get("case") || "default", params.get("save") === "1");
  }
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    const parts = cookie.split("=");
    const key = decodeURIComponent(parts.shift());
    const value = decodeURIComponent(parts.join("="));

    if (key === name) {
      return value;
    }
  }

  return null;
}

function getThemeCookiePath() {
  return window.location.pathname.startsWith("/TacCheck/") ? "/TacCheck/" : "/";
}

function setCookie(name, value, days = 365) {
  const maxAge = days * 24 * 60 * 60;

  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAge}`,
    `Path=${getThemeCookiePath()}`,
    "SameSite=Lax"
  ].join("; ");
}

function normalizeTheme(theme) {
  return THEME_VALUES.includes(theme) ? theme : "auto";
}

function applyTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);
  document.documentElement.setAttribute("data-theme", normalizedTheme);
}

function saveTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);
  setCookie(THEME_COOKIE_NAME, normalizedTheme);
  applyTheme(normalizedTheme);
  syncThemeControls(normalizedTheme);
}

function loadSavedTheme() {
  return normalizeTheme(getCookie(THEME_COOKIE_NAME));
}

function initThemeSettings() {
  const theme = loadSavedTheme();

  applyTheme(theme);
  syncThemeControls(theme);

  if (!els.settingsButton || !els.settingsPopover) {
    return;
  }

  els.settingsButton.addEventListener("click", () => {
    toggleSettingsPopover();
  });

  getThemeOptionButtons().forEach((button) => {
    button.addEventListener("click", () => {
      saveTheme(button.dataset.themeOption);
      closeSettingsPopover();
    });
  });

  if (window.matchMedia) {
    const systemThemeWatcher = window.matchMedia("(prefers-color-scheme: dark)");
    systemThemeWatcher.addEventListener("change", () => {
      if (loadSavedTheme() === "auto") {
        applyTheme("auto");
      }
    });
  }
}

function getThemeOptionButtons() {
  return Array.from(document.querySelectorAll("[data-theme-option]"));
}

function syncThemeControls(theme) {
  const normalizedTheme = normalizeTheme(theme);

  getThemeOptionButtons().forEach((button) => {
    const isActive = button.dataset.themeOption === normalizedTheme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function toggleSettingsPopover() {
  if (els.settingsPopover.hidden) {
    openSettingsPopover();
  } else {
    closeSettingsPopover();
  }
}

function openSettingsPopover() {
  els.settingsPopover.hidden = false;
  els.settingsButton.setAttribute("aria-expanded", "true");
}

function closeSettingsPopover() {
  if (!els.settingsPopover || els.settingsPopover.hidden) {
    return;
  }

  els.settingsPopover.hidden = true;
  els.settingsButton?.setAttribute("aria-expanded", "false");
}

function todayInputDate(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
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
  els.guideButton.addEventListener("click", () => { els.guideModal.hidden = false; });
  els.closeGuideButton.addEventListener("click", () => { els.guideModal.hidden = true; });
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
  els.markPeakButton.addEventListener("click", () => setMode("peak"));
  els.markDropButton.addEventListener("click", () => setMode("drop"));
  els.confirmOccurrenceButton.addEventListener("click", () => setOccurrenceConfirmation("confirmed"));
  els.ignoreOccurrenceButton.addEventListener("click", () => setOccurrenceConfirmation("ignored"));
  els.adjustRegionButton.addEventListener("click", adjustOccurrenceRegion);
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

  if (!event.target.closest?.(".settings-menu")) {
    closeSettingsPopover();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    closeSettingsPopover();
    els.guideModal.hidden = true;
    return;
  }

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
  if (["registerTop", "peak", "drop"].includes(state.mode)) {
    state.marks[state.mode] = [point];
    if (state.mode === "peak" || state.mode === "drop") {
      state.occurrenceConfirmation[state.mode] = "suspected";
    }
    if (state.mode === "registerTop") {
    state.readingOffsetPx = 0;
    }
  } else {
    if (bucket.length >= 3) bucket.shift();
    bucket.push(point);
  }

  const label = modeLabel(state.mode);
  const singlePointMode = ["registerTop", "peak", "drop"].includes(state.mode);
  const count = singlePointMode ? 1 : state.marks[state.mode].length;
  const message = state.mode === "registerTop"
    ? "Linha criada. Use os controles para ajustar a leitura."
    : state.mode === "peak" || state.mode === "drop"
      ? "Extremo marcado como suspeita. Confirme visualmente após calcular."
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

function setOccurrenceConfirmation(value) {
  if (state.marks.peak.length) state.occurrenceConfirmation.peak = value;
  if (state.marks.drop.length) state.occurrenceConfirmation.drop = value;
  if (state.lastAnalysis) {
    calculate({ reportSpeed: state.lastAnalysis.result.reportSpeed, statusMessage: "Classificação de pico/queda atualizada." });
  }
}

function adjustOccurrenceRegion() {
  const mode = state.marks.peak.length ? "peak" : "drop";
  setMode(mode);
  setStatus("Clique novamente no extremo do traço para ajustar a região selecionada.");
}

function calculate(options = {}) {
  const config = options instanceof Event ? {} : options;
  try {
    validateBeforeSpeedRequest();
    const reportSpeed = config.reportSpeed ?? config.maxSpeed ?? getMaxSpeedForCalculation();
    validateBeforeCalculation(reportSpeed);
    const analysis = calculateAnalysis({
      line40Points: state.marks.line40,
      line60Points: state.marks.line60,
      registerTopPoints: state.marks.registerTop,
      registerTopOffsetPx: state.readingOffsetPx,
      reportSpeed,
      tolerance: 4,
      peakPoint: state.marks.peak[0] || null,
      dropPoint: state.marks.drop[0] || null,
      peakConfirmation: state.occurrenceConfirmation.peak,
      dropConfirmation: state.occurrenceConfirmation.drop
    });
    state.lastAnalysis = analysis;
    state.lastSnapshot = buildSnapshot(analysis);
    state.lastError = null;
    updateResult(analysis);
    setStatus(config.statusMessage || "Cálculo concluído com a velocidade frequente do disco.");
    els.lastCalcText.textContent = `Ultimo calculo: ${new Date().toLocaleString("pt-BR")}`;
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
  const answer = window.prompt("Informe a velocidade registrada no relatório de ensaio (km/h):", currentValue);
  if (answer === null) throw new Error("Cálculo cancelado. Informe a velocidade registrada no relatório.");
  const maxSpeed = parseNumber(answer);
  els.maxSpeedInput.value = formatNumber(maxSpeed);
  return maxSpeed;
}

function validateBeforeCalculation(maxSpeed) {
  if (maxSpeed <= 0) throw new Error("Informe a velocidade registrada no relatório.");
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
      reportSpeed: state.lastAnalysis.result.reportSpeed,
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
  drawPointSet(ctx, state.marks.line40, COLORS.line40);
  drawPointSet(ctx, state.marks.line60, COLORS.line60);
  drawPointSet(ctx, state.marks.registerTop, COLORS.register);
  drawPointSet(ctx, state.marks.peak, COLORS.peak);
  drawPointSet(ctx, state.marks.drop, COLORS.drop);

  if (state.lastAnalysis) {
    drawEvidence(ctx, viewport, state.lastAnalysis, rect);
  } else {
    const preview = getReadingPreview();
    if (preview) {
      const labels = createCanvasLabelLayout(rect);
      drawLineAtCenter(ctx, preview.calibration, preview.register.line.center, COLORS.register, {
        dashed: false,
        label: "TOPO",
        importance: "low",
        normalOffset: 26,
        lineOffset: 82
      }, labels);
    }
  }
  ctx.restore();
}

function drawEvidence(ctx, viewport, analysis, rect = null) {
  const reportSpeed = analysis.result.reportSpeed;
  const lower = analysis.result.lowerLimit;
  const upper = analysis.result.upperLimit;
  const indicated = analysis.result.indicatedSpeed;
  const labels = createCanvasLabelLayout(rect);

  drawSpeedLine(ctx, analysis.calibration, 40, COLORS.line40, {
    label: "40 km/h",
    normalOffset: 24,
    lineOffset: -96,
    importance: "low"
  }, labels);
  drawSpeedLine(ctx, analysis.calibration, 60, COLORS.line60, {
    label: "60 km/h",
    normalOffset: -24,
    lineOffset: 94,
    importance: "low"
  }, labels);
  drawSpeedLine(ctx, analysis.calibration, 50, COLORS.line50, {
    label: "50 km/h",
    normalOffset: -22,
    lineOffset: 24,
    importance: "normal"
  }, labels);
  drawSpeedLine(ctx, analysis.calibration, reportSpeed, COLORS.max, {
    label: `RELATÓRIO ${formatNumber(reportSpeed)}`,
    normalOffset: -34,
    lineOffset: -44,
    importance: "strong"
  }, labels);
  drawSpeedLine(ctx, analysis.calibration, lower, COLORS.limit, {
    dashed: true,
    label: `LIMITE INFERIOR ${formatNumber(lower)}`,
    normalOffset: 34,
    lineOffset: -126,
    importance: "secondary"
  }, labels);
  drawSpeedLine(ctx, analysis.calibration, upper, COLORS.limit, {
    dashed: true,
    label: `LIMITE SUPERIOR ${formatNumber(upper)}`,
    normalOffset: -34,
    lineOffset: -126,
    importance: "secondary"
  }, labels);
  drawSpeedLine(ctx, analysis.calibration, indicated, COLORS.register, {
    label: `FREQUENTE ${formatNumber(indicated)}`,
    normalOffset: 44,
    lineOffset: 126,
    importance: "primary"
  }, labels);
  if (analysis.occurrences.highestSpeed !== null) {
    drawSpeedLine(ctx, analysis.calibration, analysis.occurrences.highestSpeed, COLORS.peak, {
      label: `PICO ${formatNumber(analysis.occurrences.highestSpeed)}`,
      importance: "secondary",
      lineOffset: 176
    }, labels);
  }
  if (analysis.occurrences.lowestSpeed !== null) {
    drawSpeedLine(ctx, analysis.calibration, analysis.occurrences.lowestSpeed, COLORS.drop, {
      label: `QUEDA ${formatNumber(analysis.occurrences.lowestSpeed)}`,
      importance: "secondary",
      lineOffset: 226
    }, labels);
  }
}

function drawPointSet(ctx, points, color) {
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
}

function drawSpeedLine(ctx, calibration, speed, color, options = {}, labels = null) {
  const center = pointForSpeed(calibration, speed);
  drawLineAtCenter(ctx, calibration, center, color, options, labels);
}

function drawLineAtCenter(ctx, calibration, center, color, options = {}, labels = null) {
  const {
    dashed = false,
    label = "",
    normalOffset = 0,
    lineOffset = 0,
    importance = "normal"
  } = options;
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
  const direction = normalizeVector({ x: sb.x - sa.x, y: sb.y - sa.y });
  const normal = { x: -direction.y, y: direction.x };

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

  if (label) {
    drawCanvasTag(ctx, {
      anchor: st,
      direction,
      normal,
      lineOffset,
      normalOffset,
      color,
      label,
      importance
    }, labels);
  }
  ctx.restore();
}

function createCanvasLabelLayout(rect) {
  const bounds = rect || { width: state.image?.naturalWidth || 1, height: state.image?.naturalHeight || 1 };
  return {
    bounds: {
      width: bounds.width,
      height: bounds.height
    },
    boxes: []
  };
}

function drawCanvasTag(ctx, tag, layout) {
  const style = canvasTagStyle(tag.importance);
  ctx.save();
  ctx.font = `${style.weight} ${style.fontSize}px Segoe UI, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const textWidth = Math.ceil(ctx.measureText(tag.label).width);
  const width = textWidth + style.paddingX * 2 + style.chipWidth + style.chipGap;
  const height = style.height;
  const anchor = {
    x: tag.anchor.x + tag.direction.x * tag.lineOffset + tag.normal.x * tag.normalOffset,
    y: tag.anchor.y + tag.direction.y * tag.lineOffset + tag.normal.y * tag.normalOffset
  };
  const box = placeCanvasTagBox(anchor, width, height, tag.normal, layout);
  const pointerEnd = {
    x: tag.anchor.x + tag.direction.x * Math.min(Math.abs(tag.lineOffset), 18) * Math.sign(tag.lineOffset || 1),
    y: tag.anchor.y + tag.direction.y * Math.min(Math.abs(tag.lineOffset), 18) * Math.sign(tag.lineOffset || 1)
  };
  const pointerStart = nearestPointOnBox(pointerEnd, box);

  ctx.strokeStyle = withAlpha(tag.color, 0.62);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pointerEnd.x, pointerEnd.y);
  ctx.lineTo(pointerStart.x, pointerStart.y);
  ctx.stroke();

  ctx.fillStyle = withAlpha("#020914", style.fillAlpha);
  roundRect(ctx, box.x, box.y, box.width, box.height, style.radius);
  ctx.fill();
  ctx.strokeStyle = withAlpha(tag.color, style.borderAlpha);
  ctx.stroke();

  ctx.fillStyle = withAlpha(tag.color, style.chipAlpha);
  roundRect(ctx, box.x + style.paddingX, box.y + (height - style.chipHeight) / 2, style.chipWidth, style.chipHeight, 2);
  ctx.fill();

  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 7;
  ctx.fillStyle = style.textColor;
  ctx.fillText(
    tag.label,
    box.x + style.paddingX + style.chipWidth + style.chipGap,
    box.y + height / 2
  );
  ctx.restore();
}

function canvasTagStyle(importance) {
  return {
    primary: {
      height: 28,
      paddingX: 9,
      chipWidth: 5,
      chipHeight: 18,
      chipGap: 8,
      radius: 7,
      fontSize: 13,
      weight: 900,
      fillAlpha: 0.86,
      borderAlpha: 0.92,
      chipAlpha: 1,
      textColor: "#fff8d6"
    },
    strong: {
      height: 25,
      paddingX: 8,
      chipWidth: 5,
      chipHeight: 15,
      chipGap: 7,
      radius: 7,
      fontSize: 12,
      weight: 850,
      fillAlpha: 0.82,
      borderAlpha: 0.82,
      chipAlpha: 0.95,
      textColor: "#f3efff"
    },
    secondary: {
      height: 24,
      paddingX: 8,
      chipWidth: 4,
      chipHeight: 14,
      chipGap: 7,
      radius: 6,
      fontSize: 12,
      weight: 800,
      fillAlpha: 0.78,
      borderAlpha: 0.72,
      chipAlpha: 0.86,
      textColor: "#f3f7ff"
    },
    low: {
      height: 22,
      paddingX: 7,
      chipWidth: 4,
      chipHeight: 12,
      chipGap: 6,
      radius: 6,
      fontSize: 11,
      weight: 800,
      fillAlpha: 0.68,
      borderAlpha: 0.58,
      chipAlpha: 0.82,
      textColor: "#e9f2ff"
    },
    normal: {
      height: 24,
      paddingX: 8,
      chipWidth: 5,
      chipHeight: 14,
      chipGap: 7,
      radius: 6,
      fontSize: 12,
      weight: 850,
      fillAlpha: 0.8,
      borderAlpha: 0.78,
      chipAlpha: 0.92,
      textColor: "#f4f8ff"
    }
  }[importance] || canvasTagStyle("normal");
}

function placeCanvasTagBox(anchor, width, height, normal, layout) {
  const bounds = layout?.bounds || { width: state.image?.naturalWidth || 1, height: state.image?.naturalHeight || 1 };
  const margin = 8;
  const attempts = [
    { x: anchor.x - width / 2, y: anchor.y - height / 2 },
    { x: anchor.x - width / 2 + normal.x * 18, y: anchor.y - height / 2 + normal.y * 18 },
    { x: anchor.x - width / 2 - normal.x * 18, y: anchor.y - height / 2 - normal.y * 18 },
    { x: anchor.x - width / 2, y: anchor.y - height / 2 - 28 },
    { x: anchor.x - width / 2, y: anchor.y - height / 2 + 28 }
  ];

  for (const attempt of attempts) {
    const box = clampCanvasBox({
      x: attempt.x,
      y: attempt.y,
      width,
      height
    }, bounds, margin);
    if (!layout || !layout.boxes.some((existing) => boxesOverlap(box, existing, 4))) {
      layout?.boxes.push(box);
      return box;
    }
  }

  const fallback = clampCanvasBox({ ...attempts[0], width, height }, bounds, margin);
  layout?.boxes.push(fallback);
  return fallback;
}

function clampCanvasBox(box, bounds, margin) {
  return {
    ...box,
    x: Math.max(margin, Math.min(bounds.width - box.width - margin, box.x)),
    y: Math.max(margin, Math.min(bounds.height - box.height - margin, box.y))
  };
}

function boxesOverlap(a, b, gap = 0) {
  return !(
    a.x + a.width + gap < b.x ||
    b.x + b.width + gap < a.x ||
    a.y + a.height + gap < b.y ||
    b.y + b.height + gap < a.y
  );
}

function nearestPointOnBox(point, box) {
  return {
    x: Math.max(box.x, Math.min(box.x + box.width, point.x)),
    y: Math.max(box.y, Math.min(box.y + box.height, point.y))
  };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

function withAlpha(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
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
  els.markPeakButton.textContent = state.marks.peak.length ? "Remarcar maior" : "Maior ponto";
  els.markDropButton.textContent = state.marks.drop.length ? "Remarcar menor" : "Menor ponto";
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
    registerTop: ["Velocidade frequente", "Clique no centro da faixa predominante da região constante, evitando extremos isolados."],
    peak: ["Marcar maior ponto", "Marque apenas um pico com continuidade e espessura coerentes com o traço."],
    drop: ["Marcar menor ponto", "Marque apenas uma queda com continuidade e espessura coerentes com o traço."]
  };
  const [title, text] = texts[state.mode] || ["Como marcar", "Carregue a imagem. Marque 40, 60 e a velocidade frequente."];
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
    els.readingPreviewText.textContent = "Clique na faixa predominante do registro.";
  } else if (!preview) {
    els.readingPreviewText.textContent = "Linha criada. Marque 40 e 60 para calcular a leitura.";
  } else {
    els.readingPreviewText.textContent = `Vel. frequente estimada: ${formatNumber(preview.register.indicatedSpeed)} km/h`;
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
    "aguardando velocidade maxima": "Informe a velocidade registrada no relatório.",
    "aguardando tolerancia": "Informe uma tolerancia valida."
  }[reason] || "Complete os dados para calcular.";
}

function updateResult(analysis) {
  const result = analysis.result;
  els.maxSpeedOutput.textContent = `${formatNumber(result.reportSpeed)} km/h`;
  els.indicatedSpeedOutput.textContent = `${formatNumber(result.indicatedSpeed)} km/h`;
  els.divergenceOutput.textContent = `${formatNumber(result.divergenceAbs)} km/h`;
  els.lowerLimitOutput.textContent = `${formatNumber(result.lowerLimit)} km/h`;
  els.upperLimitOutput.textContent = `${formatNumber(result.upperLimit)} km/h`;
  els.toleranceOutput.textContent = `+/-${formatNumber(result.tolerance)} km/h`;
  els.statusBadge.textContent = result.result;
  els.statusBadge.className = `status-badge ${result.approved ? "approved" : result.possibleFailure ? "error" : "ready"}`;
  els.reasonOutput.textContent = result.reason;
  updateOccurrenceResult(analysis.occurrences);
}

function updateOccurrenceResult(occurrences) {
  els.highestSpeedOutput.textContent = occurrences.highestSpeed === null ? "Não marcada" : `${formatNumber(occurrences.highestSpeed)} km/h`;
  els.lowestSpeedOutput.textContent = occurrences.lowestSpeed === null ? "Não marcada" : `${formatNumber(occurrences.lowestSpeed)} km/h`;
  els.peakLimitOutput.textContent = `${formatNumber(occurrences.upperLimit)} km/h`;
  els.dropLimitOutput.textContent = `${formatNumber(occurrences.lowerLimit)} km/h`;
  els.occurrenceStatus.textContent = occurrences.label;
  const possible = occurrences.status === "POSSIVEL_REPROVACAO";
  const suspected = occurrences.status === "SUSPEITA_FORA_DO_LIMITE";
  els.occurrenceStatus.className = `status-badge ${possible ? "error" : suspected ? "ready" : occurrences.status === "SEM_PICO_FORA_DO_LIMITE" ? "approved" : "ready"}`;
  els.occurrenceReason.textContent = suspected
    ? "Suspeita de pico/queda fora do limite. Confirmar visualmente."
    : possible
      ? "Ponto real confirmado fora do limite dinâmico do relatório."
      : occurrences.status === "ATENCAO_CRITICA"
        ? "Ponto exatamente no limite. Revisar a leitura."
        : "Nenhum extremo marcado ultrapassa os limites calculados.";
  els.occurrenceActions.hidden = !suspected;
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
    velocidade_registrada_relatorio: result.reportSpeed,
    velocidade_maxima_ensaio: result.reportSpeed,
    tolerancia: result.tolerance,
    criterio: "gt",
    criterio_reprovacao: "gt",
    velocidade_frequente_disco: result.indicatedSpeed,
    velocidade_indicada_disco: result.indicatedSpeed,
    diferenca_absoluta: result.divergenceAbs,
    divergencia: result.divergence,
    limite_inferior: result.lowerLimit,
    limite_superior: result.upperLimit,
    resultado: result.result,
    motivo: result.reason,
    pontos_linha_40: points.line40,
    pontos_linha_60: points.line60,
    pontos_topo_registro: points.registerTop,
    pontos_pico: points.peak,
    pontos_queda: points.drop,
    picos_quedas: analysis.occurrences,
    confirmacao_ocorrencias: structuredClone(state.occurrenceConfirmation),
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
    const approved = result === "Dentro do limite" || result === "APROVADO";
    const title = escapeHtml(record.placa || "Sem placa");
    const date = escapeHtml(formatDate(record.data_ensaio) || "Sem data");
    const calculatedAt = escapeHtml(formatDateTime(record.data_hora_calculo || record.criado_em));
    const speed = formatMaybeNumber(record.velocidade_registrada_relatorio ?? record.velocidade_maxima_ensaio);
    return `
      <div class="history-item" data-id="${escapeHtml(record.id)}">
        <div class="history-title">
          <strong>${title}</strong>
          <span class="history-result ${approved ? "approved" : ""}">${escapeHtml(result || "-")}</span>
        </div>
        <div class="history-meta">
          <span>${date} | Relatório ${speed} km/h</span>
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
  state.occurrenceConfirmation = structuredClone(record.confirmacao_ocorrencias || { peak: "suspected", drop: "suspected" });
  state.readingOffsetPx = parseNumber(record.deslocamento_linha_leitura_px, 0);
  state.lastError = null;
  state.lastSnapshot = record;
  state.lastAnalysis = buildAnalysisFromRecord(record, points);

  els.plateInput.value = record.placa || "";
  els.dateInput.value = record.data_ensaio || "";
  els.targetSpeedInput.value = record.velocidade_alvo || "50";
  els.maxSpeedInput.value = formatMaybeNumber(record.velocidade_registrada_relatorio ?? record.velocidade_maxima_ensaio);
  els.toleranceInput.value = formatMaybeNumber(record.tolerancia || 4);
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
      reportSpeed: parseNumber(record.velocidade_registrada_relatorio ?? record.velocidade_maxima_ensaio, Number.NaN),
      tolerance: parseNumber(record.tolerancia, Number.NaN),
      peakPoint: points.peak[0] || null,
      dropPoint: points.drop[0] || null,
      peakConfirmation: state.occurrenceConfirmation.peak,
      dropConfirmation: state.occurrenceConfirmation.drop
    });
  } catch {
    return null;
  }
}

function updateResultFromRecord(record) {
  els.maxSpeedOutput.textContent = `${formatMaybeNumber(record.velocidade_registrada_relatorio ?? record.velocidade_maxima_ensaio)} km/h`;
  els.indicatedSpeedOutput.textContent = `${formatMaybeNumber(record.velocidade_indicada_disco)} km/h`;
  els.divergenceOutput.textContent = `${formatMaybeNumber(record.diferenca_absoluta ?? Math.abs(record.divergencia))} km/h`;
  els.lowerLimitOutput.textContent = `${formatMaybeNumber(record.limite_inferior)} km/h`;
  els.upperLimitOutput.textContent = `${formatMaybeNumber(record.limite_superior)} km/h`;
  els.toleranceOutput.textContent = `+/-${formatMaybeNumber(record.tolerancia)} km/h`;
  const result = getRecordResult(record);
  els.statusBadge.textContent = result || "-";
  els.statusBadge.className = `status-badge ${result === "Dentro do limite" || result === "APROVADO" ? "approved" : ""}`;
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
    registerTop: registerTop.length ? [registerTop[0]] : [],
    peak: structuredClone(record.pontos_pico || record.pontos?.peak || []).slice(0, 1),
    drop: structuredClone(record.pontos_queda || record.pontos?.drop || []).slice(0, 1)
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
  ctx.strokeStyle = result.possibleFailure ? COLORS.line50 : result.approved ? COLORS.line40 : COLORS.register;
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = "700 18px Segoe UI";
  ctx.fillText("TacCheck - Analise de velocidade", x + 14, y + 28);
  ctx.font = "14px Segoe UI";
  const rows = [
    `Vel. registrada no relatorio: ${formatNumber(result.reportSpeed)} km/h`,
    `Vel. frequente no disco: ${formatNumber(result.indicatedSpeed)} km/h`,
    `Diferenca calculada: ${formatNumber(result.divergenceAbs)} km/h`,
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
    registerTop: [],
    peak: [],
    drop: []
  };
  state.occurrenceConfirmation = { peak: "suspected", drop: "suspected" };
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
  const order = ["drop", "peak", "registerTop", "line60", "line40"];
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
  els.highestSpeedOutput.textContent = "Não marcada";
  els.lowestSpeedOutput.textContent = "Não marcada";
  els.peakLimitOutput.textContent = "-";
  els.dropLimitOutput.textContent = "-";
  els.occurrenceStatus.textContent = "Sem pico fora do limite";
  els.occurrenceStatus.className = "status-badge muted";
  els.occurrenceReason.textContent = "Marcas opcionais devem ser confirmadas visualmente.";
  els.occurrenceActions.hidden = true;
  els.statusBadge.textContent = "Aguardando calculo";
  els.statusBadge.className = "status-badge muted";
  els.reasonOutput.textContent = "Marque a escala e o topo do registro para calcular.";
}

function modeLabel(mode) {
  return {
    line40: "Linha 40",
    line60: "Linha 60",
    registerTop: "Velocidade frequente",
    peak: "Maior ponto",
    drop: "Menor ponto"
  }[mode] || "Marcacao";
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function loadDemo(scenario = "default", saveAfterCalculation = false) {
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
    const calibration = buildCalibration(state.marks.line40, state.marks.line60);
    const scenarios = {
      critical: { report: 52, frequent: 56 },
      failure: { report: 52, frequent: 56.001 },
      peak: { report: 52, frequent: 52, peak: 56.001 },
      drop: { report: 52, frequent: 52, drop: 47.999 },
      default: { report: 52.101, frequent: 47.74 }
    };
    const selected = scenarios[scenario] || scenarios.default;
    state.marks.registerTop = [pointForSpeed(calibration, selected.frequent)];
    state.marks.peak = selected.peak ? [pointForSpeed(calibration, selected.peak)] : [];
    state.marks.drop = selected.drop ? [pointForSpeed(calibration, selected.drop)] : [];
    state.occurrenceConfirmation = {
      peak: selected.peak ? "confirmed" : "suspected",
      drop: selected.drop ? "confirmed" : "suspected"
    };
    state.readingOffsetPx = 0;
    els.maxSpeedInput.value = formatNumber(selected.report);
    calculate({ reportSpeed: selected.report });
    if (saveAfterCalculation) {
      saveAnalysis();
      document.documentElement.classList.add("history-focus");
      els.historyList.closest(".right-panel-content").scrollTop = 100000;
    }
    if (["peak", "drop"].includes(scenario)) {
      requestAnimationFrame(() => {
        const panel = els.occurrenceStatus.closest(".right-panel-content");
        panel.scrollTop = els.occurrenceStatus.closest(".card").offsetTop;
      });
    }
  };
  image.src = canvas.toDataURL("image/png");
}
