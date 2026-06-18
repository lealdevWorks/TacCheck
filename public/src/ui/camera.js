export const DEFAULT_CAMERA_DEVICE_ID_KEY = "taccheck.defaultCameraDeviceId";
export const DEFAULT_CAMERA_LABEL_KEY = "taccheck.defaultCameraLabel";

export function normalizeVideoDevices(devices = []) {
  return devices
    .filter((device) => device?.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId || "",
      label: device.label || `Camera ${index + 1}`
    }));
}

export function saveDefaultCamera(storage, camera) {
  if (!storage || !camera?.deviceId) return;
  storage.setItem(DEFAULT_CAMERA_DEVICE_ID_KEY, camera.deviceId);
  storage.setItem(DEFAULT_CAMERA_LABEL_KEY, camera.label || "");
}

export function loadDefaultCamera(storage) {
  if (!storage) return null;
  const deviceId = storage.getItem(DEFAULT_CAMERA_DEVICE_ID_KEY);
  if (!deviceId) return null;
  return {
    deviceId,
    label: storage.getItem(DEFAULT_CAMERA_LABEL_KEY) || ""
  };
}

export function selectPreferredCamera(devices, savedCamera) {
  if (!devices.length) return null;
  if (!savedCamera?.deviceId) return devices[0];
  return devices.find((device) => device.deviceId === savedCamera.deviceId) || devices[0];
}

export function buildCameraConstraints(deviceId) {
  const video = {
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  };

  if (deviceId) {
    video.deviceId = { exact: deviceId };
  } else {
    video.facingMode = "environment";
  }

  return {
    video,
    audio: false
  };
}

export function createCameraFileName(date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `taccheck_camera_${stamp}.jpg`;
}
