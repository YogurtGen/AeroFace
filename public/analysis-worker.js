/* Only app assets may be requested. Photos arrive as transferable ImageBitmaps. */
const origin = self.location.origin;
const nativeFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url, self.location.href);
  const method = init?.method || (typeof input === 'object' && input.method) || 'GET';
  if (url.origin !== origin || method.toUpperCase() !== 'GET') {
    return Promise.reject(new Error('External network requests are disabled.'));
  }
  return nativeFetch(input, init);
};
const nativeImport = self.importScripts.bind(self);
self.importScripts = (...urls) => {
  if (urls.some(url => new URL(url, self.location.href).origin !== origin)) throw new Error('External scripts are disabled.');
  return nativeImport(...urls);
};
const NativeXHR = self.XMLHttpRequest;
if (NativeXHR) self.XMLHttpRequest = class extends NativeXHR {
  open(method, url, ...rest) {
    if (new URL(url, self.location.href).origin !== origin || method.toUpperCase() !== 'GET') throw new Error('External network requests are disabled.');
    return super.open(method, url, ...rest);
  }
};
self.WebSocket = class { constructor() { throw new Error('WebSocket connections are disabled.'); } };
importScripts('./vendor/vision_bundle.js');
let detector;
self.onmessage = async event => {
  const { bitmap, id } = event.data;
  try {
    if (!detector) {
      const base = new URL('./', self.location.href).href;
      const fileset = await Vision.FilesetResolver.forVisionTasks(base + 'vendor/wasm');
      self.postMessage({ id, stage: 'model' });
      detector = await Vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: base + 'models/face_landmarker.task', delegate: 'CPU' },
        runningMode: 'IMAGE', numFaces: 2,
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.6,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    self.postMessage({ id, stage: 'detecting' });
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const result = detector.detect(canvas);
    self.postMessage({ id, landmarks: result.faceLandmarks });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Deteksi gagal.' });
  } finally { bitmap.close(); }
};
