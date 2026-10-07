/**
 * Aetheria 3D Gallery - GestureDetector
 * Real-time analysis of 21 MediaPipe hand landmarks.
 * Recognizes pinch, horizontal swipes, palm orbiting/drag, fist/lock, and peace/point poses.
 */

import { GESTURE_CONFIG } from './config.js';

export class GestureDetector {
  /**
   * @param {Object} [config=GESTURE_CONFIG]
   */
  constructor(config = {}) {
    this.config = { ...GESTURE_CONFIG, ...config };

    // Callbacks
    this.callbacks = {
      onSwipe: null,        // (direction: 'left' | 'right', velocity: number) => void
      onPinch: null,        // (distance: number, delta: number, state: 'start'|'move'|'end') => void
      onPalmMove: null,     // (deltaX: number, deltaY: number, normX: number, normY: number) => void
      onPose: null,         // (poseName: 'open_palm'|'fist'|'peace'|'point'|'idle', details: Object) => void
      onHandLost: null      // () => void
    };

    // Tracking history & rolling window for velocity calculation
    this.history = [];      // Array of { time, x, y, z }
    this.maxHistoryLength = 10;

    // Swipe state
    this.lastSwipeTime = 0;
    this.swipeCooldownMs = this.config.swipeCooldownMs || 450;

    // Pinch state
    this.isPinching = false;
    this.lastPinchDistance = null;
    this.pinchSmoothDist = null;

    // Palm drag state
    this.lastPalmPos = null;
    this.isHandPresent = false;
    this.currentPose = 'idle';

    // Exponential smoothing for landmark coordinates
    this.smoothedPalm = null;

    // Key Landmark Indices
    this.LANDMARKS = {
      WRIST: 0,
      THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
      INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
      MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
      RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
      PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
    };
  }

  /**
   * Register event listeners
   */
  onSwipe(cb) { this.callbacks.onSwipe = cb; return this; }
  onPinch(cb) { this.callbacks.onPinch = cb; return this; }
  onPalmMove(cb) { this.callbacks.onPalmMove = cb; return this; }
  onPose(cb) { this.callbacks.onPose = cb; return this; }
  onHandLost(cb) { this.callbacks.onHandLost = cb; return this; }

  /**
   * Reset tracking state
   */
  reset() {
    this.history = [];
    this.lastSwipeTime = 0;
    this.isPinching = false;
    this.lastPinchDistance = null;
    this.pinchSmoothDist = null;
    this.lastPalmPos = null;
    this.smoothedPalm = null;
    this.currentPose = 'idle';

    if (this.isHandPresent) {
      this.isHandPresent = false;
      this._emit('onHandLost');
    }
  }

  /**
   * Process results payload from MediaPipe Hands.
   * @param {Object} results MediaPipe results object
   */
  process(results) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      if (this.isHandPresent) {
        this.reset();
      }
      return;
    }

    this.isHandPresent = true;
    const landmarks = results.multiHandLandmarks[0];
    const now = performance.now();

    // 1. Calculate Palm Center (average of Wrist, Index MCP, Middle MCP, Pinky MCP)
    const palm = this._computePalmCenter(landmarks);

    // Smooth palm position with exponential moving average
    const alpha = this.config.smoothingFactor || 0.3;
    if (!this.smoothedPalm) {
      this.smoothedPalm = { ...palm };
    } else {
      this.smoothedPalm.x = this.smoothedPalm.x * (1 - alpha) + palm.x * alpha;
      this.smoothedPalm.y = this.smoothedPalm.y * (1 - alpha) + palm.y * alpha;
      this.smoothedPalm.z = this.smoothedPalm.z * (1 - alpha) + palm.z * alpha;
    }

    // Add to rolling history
    this.history.push({ time: now, x: this.smoothedPalm.x, y: this.smoothedPalm.y, z: this.smoothedPalm.z });
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    // 2. Classify Hand Pose (Fist, Open Palm, Peace, Point)
    const pose = this._classifyPose(landmarks);
    if (pose !== this.currentPose) {
      this.currentPose = pose;
      this._emit('onPose', pose, { landmarks, palm: this.smoothedPalm });
    }

    // 3. Pinch Detection (Thumb Tip to Index Tip distance)
    this._detectPinch(landmarks);

    // 4. Swipe Detection (Velocity over rolling history window)
    // Note: Don't trigger swipe if hand is tightly closed into a fist or actively pinching
    if (pose !== 'fist' && !this.isPinching) {
      this._detectSwipe(now);
    }

    // 5. Palm Move / Orbit Drag
    // Active when open palm or pointing, and not in mid-pinch
    if ((pose === 'open_palm' || pose === 'idle' || pose === 'peace') && !this.isPinching) {
      this._detectPalmMove(this.smoothedPalm);
    } else {
      this.lastPalmPos = null;
    }
  }

  /**
   * Computes center of hand palm.
   * @private
   */
  _computePalmCenter(lm) {
    const w = lm[0];
    const im = lm[5];
    const mm = lm[9];
    const pm = lm[17];
    return {
      x: (w.x + im.x + mm.x + pm.x) / 4,
      y: (w.y + im.y + mm.y + pm.y) / 4,
      z: (w.z + im.z + mm.z + pm.z) / 4
    };
  }

  /**
   * Euclidean distance between two 3D landmarks.
   * @private
   */
  _dist3D(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 2D Euclidean distance between two landmarks (normalized coordinates).
   * @private
   */
  _dist2D(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Classify current hand posture using finger extension states.
   * @private
   */
  _classifyPose(lm) {
    const wrist = lm[0];
    const palmBaseDist = this._dist2D(wrist, lm[9]); // Reference hand size scale

    // Check extension for fingers 1..4 (Index, Middle, Ring, Pinky)
    // A finger is extended if tip is further from wrist than PIP joint by an adequate margin
    const indexExt = this._dist2D(wrist, lm[8]) > this._dist2D(wrist, lm[6]) * 1.15;
    const middleExt = this._dist2D(wrist, lm[12]) > this._dist2D(wrist, lm[10]) * 1.15;
    const ringExt = this._dist2D(wrist, lm[16]) > this._dist2D(wrist, lm[14]) * 1.15;
    const pinkyExt = this._dist2D(wrist, lm[20]) > this._dist2D(wrist, lm[18]) * 1.15;

    // Thumb extension relative to index MCP
    const thumbExt = this._dist2D(lm[4], lm[5]) > palmBaseDist * 0.45;

    const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

    // 1. Fist: all fingers folded close to palm
    if (!indexExt && !middleExt && !ringExt && !pinkyExt && !thumbExt) {
      return 'fist';
    }

    // 2. Peace / Victory: Index and Middle extended, Ring and Pinky curled
    if (indexExt && middleExt && !ringExt && !pinkyExt) {
      return 'peace';
    }

    // 3. Point: Index extended, Middle, Ring, Pinky curled
    if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'point';
    }

    // 4. Open Palm: 4 or 5 fingers extended
    if (extendedCount >= 3) {
      return 'open_palm';
    }

    return 'idle';
  }

  /**
   * Detects pinch gesture between Thumb Tip (4) and Index Tip (8).
   * @private
   */
  _detectPinch(lm) {
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const dist = this._dist2D(thumbTip, indexTip);

    // Reference hand scale: wrist to middle MCP
    const handScale = this._dist2D(lm[0], lm[9]) || 0.25;
    const normalizedDist = dist / handScale; // Normalized relative to user's hand distance

    const closeThreshold = 0.38; // In normalized hand units (~0.05 absolute)
    const openThreshold = 0.65;

    const isClose = normalizedDist < closeThreshold;

    if (isClose) {
      if (!this.isPinching) {
        this.isPinching = true;
        this.lastPinchDistance = normalizedDist;
        this.pinchSmoothDist = normalizedDist;
        this._emit('onPinch', normalizedDist, 0, 'start');
      } else {
        const delta = normalizedDist - (this.lastPinchDistance || normalizedDist);
        this.lastPinchDistance = normalizedDist;
        this._emit('onPinch', normalizedDist, delta, 'move');
      }
    } else if (normalizedDist > openThreshold) {
      if (this.isPinching) {
        this.isPinching = false;
        this._emit('onPinch', normalizedDist, 0, 'end');
      }
      this.lastPinchDistance = null;
    }
  }

  /**
   * Detects brisk horizontal swipe gestures with cooldown to prevent duplicate triggers.
   * @private
   */
  _detectSwipe(now) {
    if (now - this.lastSwipeTime < this.swipeCooldownMs) {
      return;
    }

    if (this.history.length < 5) return;

    // Look at recent window (e.g. past ~180-250ms)
    const oldest = this.history[0];
    const newest = this.history[this.history.length - 1];
    const dt = (newest.time - oldest.time) / 1000; // in seconds

    if (dt <= 0.05 || dt > 0.4) return;

    const dx = newest.x - oldest.x;
    const dy = newest.y - oldest.y;
    const velocityX = dx / dt; // units per second (normalized width)

    const minVelocity = this.config.swipeThresholdVelocity || 0.65;
    const minDistance = this.config.swipeMinDistance || 0.12;

    // Primary horizontal movement (horizontal delta significantly greater than vertical delta)
    if (Math.abs(dx) >= minDistance && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if (Math.abs(velocityX) >= minVelocity) {
        // Because webcam feed is mirrored horizontally, a physical swipe to user's left
        // translates to a rightward landmark movement unless accounted for:
        // When user moves hand towards their physical left (index.html has scaleX(-1)),
        // let's define intuitive direction:
        // dx > 0 in mirrored coordinates means moving to visual Right.
        const direction = dx > 0 ? 'right' : 'left';

        this.lastSwipeTime = now;
        this.history = []; // Clear history after triggering swipe to prevent trail-echo
        this._emit('onSwipe', direction, Math.abs(velocityX));
      }
    }
  }

  /**
   * Tracks smooth continuous open-palm movement for carousel rotation.
   * @private
   */
  _detectPalmMove(palm) {
    if (!this.lastPalmPos) {
      this.lastPalmPos = { ...palm };
      return;
    }

    const deltaX = palm.x - this.lastPalmPos.x;
    const deltaY = palm.y - this.lastPalmPos.y;

    this.lastPalmPos = { ...palm };

    const deadzone = this.config.palmMoveDeadzone || 0.003;
    if (Math.abs(deltaX) > deadzone || Math.abs(deltaY) > deadzone) {
      this._emit('onPalmMove', deltaX, deltaY, palm.x, palm.y);
    }
  }

  /**
   * Helper to emit registered callbacks safely.
   * @private
   */
  _emit(eventName, ...args) {
    const cb = this.callbacks[eventName];
    if (typeof cb === 'function') {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[GestureDetector] Error in ${eventName} callback:`, err);
      }
    }
  }
}
