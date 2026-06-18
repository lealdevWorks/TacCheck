import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCameraConstraints,
  createCameraFileName,
  loadDefaultCamera,
  normalizeVideoDevices,
  saveDefaultCamera,
  selectPreferredCamera
} from "../src/ui/camera.js";

function createStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value))
  };
}

test("normalizeVideoDevices filtra apenas cameras de video", () => {
  const devices = normalizeVideoDevices([
    { kind: "audioinput", deviceId: "mic", label: "Microfone" },
    { kind: "videoinput", deviceId: "cam1", label: "USB Camera" },
    { kind: "videoinput", deviceId: "cam2", label: "" }
  ]);

  assert.deepEqual(devices, [
    { deviceId: "cam1", label: "USB Camera" },
    { deviceId: "cam2", label: "Camera 2" }
  ]);
});

test("salva e carrega camera padrao", () => {
  const storage = createStorage();
  saveDefaultCamera(storage, { deviceId: "cam1", label: "USB Camera" });

  assert.deepEqual(loadDefaultCamera(storage), {
    deviceId: "cam1",
    label: "USB Camera"
  });
});

test("selectPreferredCamera usa salva quando existir e primeira como fallback", () => {
  const devices = [
    { deviceId: "cam1", label: "Camera 1" },
    { deviceId: "cam2", label: "Camera 2" }
  ];

  assert.equal(selectPreferredCamera(devices, { deviceId: "cam2" }).deviceId, "cam2");
  assert.equal(selectPreferredCamera(devices, { deviceId: "sumiu" }).deviceId, "cam1");
});

test("buildCameraConstraints nao solicita audio", () => {
  assert.deepEqual(buildCameraConstraints("cam1"), {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      deviceId: { exact: "cam1" }
    },
    audio: false
  });

  assert.equal(buildCameraConstraints("").video.facingMode, "environment");
});

test("createCameraFileName gera arquivo jpg estavel", () => {
  const name = createCameraFileName(new Date("2026-06-17T12:34:56.000Z"));
  assert.equal(name, "taccheck_camera_2026-06-17T12-34-56-000Z.jpg");
});
