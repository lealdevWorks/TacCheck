import { imageToScreenPoint, screenToImagePoint } from "../core/geometry.js";

export class ImageViewer {
  constructor(canvas, wrap, drawCallback) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.ctx = canvas.getContext("2d");
    this.drawCallback = drawCallback;
    this.viewport = { scale: 1, offsetX: 0, offsetY: 0 };
    this.image = null;
    this.dragging = false;
    this.dragStart = null;
    this.spaceDown = false;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(wrap);
    this.bind();
    this.resize();
  }

  bind() {
    this.canvas.addEventListener("wheel", (event) => {
      if (!this.image) return;
      event.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const before = this.screenToImage(anchor);
      const factor = event.deltaY < 0 ? 1.12 : 0.88;
      this.viewport.scale = clamp(this.viewport.scale * factor, 0.08, 12);
      this.viewport.offsetX = anchor.x - before.x * this.viewport.scale;
      this.viewport.offsetY = anchor.y - before.y * this.viewport.scale;
      this.draw();
    }, { passive: false });

    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button === 2 || this.spaceDown) {
        this.dragging = true;
        this.dragStart = {
          x: event.clientX,
          y: event.clientY,
          offsetX: this.viewport.offsetX,
          offsetY: this.viewport.offsetY
        };
        this.canvas.setPointerCapture(event.pointerId);
      }
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.dragging || !this.dragStart) return;
      this.viewport.offsetX = this.dragStart.offsetX + event.clientX - this.dragStart.x;
      this.viewport.offsetY = this.dragStart.offsetY + event.clientY - this.dragStart.y;
      this.draw();
    });

    this.canvas.addEventListener("pointerup", (event) => {
      this.dragging = false;
      this.dragStart = null;
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    });

    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") this.spaceDown = true;
    });
    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") this.spaceDown = false;
    });
  }

  resize() {
    const rect = this.wrap.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }

  setImage(image) {
    this.image = image;
    this.fitToScreen();
  }

  fitToScreen() {
    if (!this.image) return;
    const rect = this.wrap.getBoundingClientRect();
    const scale = Math.min(rect.width / this.image.naturalWidth, rect.height / this.image.naturalHeight) * 0.92;
    this.viewport.scale = clamp(scale, 0.08, 12);
    this.viewport.offsetX = (rect.width - this.image.naturalWidth * this.viewport.scale) / 2;
    this.viewport.offsetY = (rect.height - this.image.naturalHeight * this.viewport.scale) / 2;
    this.draw();
  }

  actualSize() {
    if (!this.image) return;
    this.viewport.scale = 1;
    this.viewport.offsetX = 40;
    this.viewport.offsetY = 40;
    this.draw();
  }

  zoom(factor) {
    if (!this.image) return;
    const rect = this.wrap.getBoundingClientRect();
    const anchor = { x: rect.width / 2, y: rect.height / 2 };
    const before = this.screenToImage(anchor);
    this.viewport.scale = clamp(this.viewport.scale * factor, 0.08, 12);
    this.viewport.offsetX = anchor.x - before.x * this.viewport.scale;
    this.viewport.offsetY = anchor.y - before.y * this.viewport.scale;
    this.draw();
  }

  screenToImage(point) {
    return screenToImagePoint(point, this.viewport);
  }

  imageToScreen(point) {
    return imageToScreenPoint(point, this.viewport);
  }

  eventToImage(event) {
    const rect = this.canvas.getBoundingClientRect();
    return this.screenToImage({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  draw() {
    const rect = this.wrap.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.drawCallback(this.ctx, this.viewport, rect);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
