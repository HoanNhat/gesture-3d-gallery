/**
 * Aetheria 3D Gallery - HandTracker
 * Manages webcam video stream, MediaPipe Hands pipeline, and rendering
 * futuristic neon glowing landmarks on the landmark canvas overlay.
 */

export class HandTracker {
  /**
   * @param {Object} options
   * @param {string|HTMLVideoElement} [options.videoElement='#webcam']
   * @param {string|HTMLCanvasElement} [options.canvasElement='#landmark-canvas']
   * @param {number} [options.maxNumHands=1]
   * @param {number} [options.modelComplexity=1]
   * @param {number} [options.minDetectionConfidence=0.5]
   * @param {number} [options.minTrackingConfidence=0.5]
   * @param {Function} [options.onResults=null]
   * @param {Function} [options.onError=null]
   * @param {Function} [options.onStatusChange=null]
   */
  constructor(options = {}) {
    this.options = {
      videoElement: '#webcam',
      canvasElement: '#landmark-canvas',
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      onResults: null,
      onError: null,
      onStatusChange: null,
      ...options
    };

    // DOM Elements
    this.video = typeof this.options.videoElement === 'string'
      ? document.querySelector(this.options.videoElement)
      : this.options.videoElement;

    this.canvas = typeof this.options.canvasElement === 'string'
      ? document.querySelector(this.options.canvasElement)
      : this.options.canvasElement;

    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Callbacks
    this.onResultsCallback = this.options.onResults;
    this.onErrorCallback = this.options.onError;
    this.onStatusChangeCallback = this.options.onStatusChange;

    // State
    this.isRunning = false;
    this.isInitializing = false;
    this.mediaStream = null;
    this.cameraUtilsInstance = null;
    this.handsInstance = null;
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;
    this.fps = 0;

    // Connections between MediaPipe hand landmarks (21 points)
    this.HAND_CONNECTIONS = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [9, 10], [10, 11], [11, 12],
      // Ring finger
      [13, 14], [14, 15], [15, 16],
      // Pinky finger
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm base joints
      [5, 9], [9, 13], [13, 17]
    ];

    // Fingertip landmark indices
    this.FINGERTIPS = [4, 8, 12, 16, 20];
  }

  /**
   * Set callback for landmark detection results.
   * @param {Function} callback
   */
  onResults(callback) {
    this.onResultsCallback = callback;
  }

  /**
   * Set callback for tracking or device errors.
   * @param {Function} callback
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for status state transitions ('starting', 'active', 'stopped', 'error').
   * @param {Function} callback
   */
  onStatusChange(callback) {
    this.onStatusChangeCallback = callback;
  }

  /**
   * Notify status change subscriber.
   * @private
   */
  _emitStatus(status, details = null) {
    if (typeof this.onStatusChangeCallback === 'function') {
      try {
        this.onStatusChangeCallback(status, details);
      } catch (err) {
        console.error('[HandTracker] Error in onStatusChange callback:', err);
      }
    }
  }

  /**
   * Notify error subscriber.
   * @private
   */
  _emitError(error) {
    if (typeof this.onErrorCallback === 'function') {
      try {
        this.onErrorCallback(error);
      } catch (err) {
        console.error('[HandTracker] Error in onError callback:', err);
      }
    }
  }

  /**
   * Start webcam streaming and MediaPipe hand tracking pipeline.
   * @returns {Promise<boolean>}
   */
  async start() {
    if (this.isRunning || this.isInitializing) return true;

    this.isInitializing = true;
    this._emitStatus('starting', { message: 'Initializing camera & tracking models...' });

    try {
      // 1. Verify Browser Support for WebRTC / getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser or blocked by insecure context (HTTPS/localhost required).');
      }

      // 2. Initialize MediaPipe Hands model instance
      await this._initMediaPipeHands();

      // 3. Request user camera access
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.video) {
        this.video.srcObject = this.mediaStream;
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play().then(resolve).catch(resolve);
          };
        });
      }

      // 4. Setup Camera feed loop via MediaPipe CameraUtils if available, else requestAnimationFrame fallback
      if (window.Camera && this.video) {
        this.cameraUtilsInstance = new window.Camera(this.video, {
          onFrame: async () => {
            if (this.isRunning && this.handsInstance && this.video.readyState >= 2) {
              await this.handsInstance.send({ image: this.video });
            }
          },
          width: 640,
          height: 480
        });
        await this.cameraUtilsInstance.start();
      } else {
        // Fallback requestAnimationFrame loop
        this._startCustomLoop();
      }

      this.isRunning = true;
      this.isInitializing = false;
      this._emitStatus('active', { message: 'Camera feed active and tracking' });
      return true;

    } catch (err) {
      this.isInitializing = false;
      this.isRunning = false;
      this._cleanUpMedia();

      let friendlyMessage = 'Could not access camera feed.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMessage = 'Camera permission was denied. Please allow camera access in browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMessage = 'No camera device detected on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMessage = 'Camera is already in use by another application.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }

      console.error('[HandTracker] Start error:', err);
      this._emitError({ error: err, message: friendlyMessage });
      this._emitStatus('error', { message: friendlyMessage, error: err });
      return false;
    }
  }

  /**
   * Initializes MediaPipe Hands engine from CDN loaded global.
   * @private
   */
  async _initMediaPipeHands() {
    if (this.handsInstance) return;

    if (!window.Hands) {
      throw new Error('MediaPipe Hands library is not loaded on window.Hands. Please check internet connection.');
    }

    this.handsInstance = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.handsInstance.setOptions({
      maxNumHands: this.options.maxNumHands || 1,
      modelComplexity: this.options.modelComplexity ?? 1,
      minDetectionConfidence: this.options.minDetectionConfidence ?? 0.5,
      minTrackingConfidence: this.options.minTrackingConfidence ?? 0.5
    });

    this.handsInstance.onResults((results) => this._handleResults(results));
  }

  /**
   * Fallback loop when CameraUtils is not loaded.
   * @private
   */
  _startCustomLoop() {
    const processFrame = async () => {
      if (!this.isRunning) return;
      if (this.handsInstance && this.video && this.video.readyState >= 2) {
        try {
          await this.handsInstance.send({ image: this.video });
        } catch (e) {
          console.warn('[HandTracker] Frame processing error:', e);
        }
      }
      if (this.isRunning) {
        requestAnimationFrame(processFrame);
      }
    };
    requestAnimationFrame(processFrame);
  }

  /**
   * Internal handler for MediaPipe results.
   * Clears overlay canvas, draws futuristic skeletal glow, and forwards results to detector.
   * @private
   */
  _handleResults(results) {
    if (!this.isRunning) return;

    // Track FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // Match canvas dimensions to video or parent container
    this._syncCanvasSize();

    // Render futuristic glowing skeleton & landmarks
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          this._drawFuturisticHand(landmarks);
        }
      }
    }

    // Forward to callback
    if (typeof this.onResultsCallback === 'function') {
      try {
        this.onResultsCallback(results);
      } catch (err) {
        console.error('[HandTracker] Error in onResults callback:', err);
      }
    }
  }

  /**
   * Synchronize landmark canvas internal pixel dimensions with layout.
   * @private
   */
  _syncCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width) || 240;
    const h = Math.round(rect.height) || 160;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /**
   * Renders a glowing futuristic cyber-skeleton on the 2D overlay canvas.
   * @param {Array<Object>} landmarks 21 normalized landmarks [{x, y, z}]
   * @private
   */
  /**
   * Renders a discrete, minimalist landmark overlay on the canvas.
   * Subtle monochromatic joints with champagne amber accents for pinch.
   * @param {Array<Object>} landmarks 21 normalized landmarks [{x, y, z}]
   * @private
   */
  _drawFuturisticHand(landmarks) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // 1. Draw ultra-fine bone connections
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(245, 243, 239, 0.35)';

    for (const [startIndex, endIndex] of this.HAND_CONNECTIONS) {
      const p1 = landmarks[startIndex];
      const p2 = landmarks[endIndex];
      if (!p1 || !p2) continue;

      const x1 = p1.x * w;
      const y1 = p1.y * h;
      const x2 = p2.x * w;
      const y2 = p2.y * h;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 2. Draw landmarks / joints
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * w;
      const y = lm.y * h;
      const isFingertip = this.FINGERTIPS.includes(i);
      const isThumbOrIndex = i === 4 || i === 8;

      if (isThumbOrIndex) {
        // Subtle amber indicator for Pinch keypoints (thumb & index tip)
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (isFingertip) {
        // Fingertip points (warm off-white)
        ctx.fillStyle = '#f5f3ef';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Regular knuckle joint (subtle muted dot)
        ctx.fillStyle = 'rgba(245, 243, 239, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Stop camera feed and cleanup resources.
   */
  stop() {
    if (!this.isRunning && !this.isInitializing) return;

    this.isRunning = false;
    this.isInitializing = false;

    if (this.cameraUtilsInstance && typeof this.cameraUtilsInstance.stop === 'function') {
      try {
        this.cameraUtilsInstance.stop();
      } catch (e) {
        console.warn('[HandTracker] Error stopping CameraUtils:', e);
      }
      this.cameraUtilsInstance = null;
    }

    this._cleanUpMedia();

    // Clear canvas
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this._emitStatus('stopped', { message: 'Camera feed stopped' });
  }

  /**
   * Toggles tracking on or off.
   * @returns {Promise<boolean>} Current running state after toggle
   */
  async toggle() {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      return await this.start();
    }
  }

  /**
   * Stop media tracks and clear video source.
   * @private
   */
  _cleanUpMedia() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }
  }
}
