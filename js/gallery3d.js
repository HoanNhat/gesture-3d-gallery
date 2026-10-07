/**
 * Ethan Vale - I See Through the Wild
 * Core Three.js 3D Engine - Floating Orbital Archival Cloud
 * Museum-grade editorial presentation with dynamic floating depth,
 * natural cinematic lighting, organic dust motes, and direct card raycasting.
 */

import { GALLERY_CONFIG, DEMO_ITEMS, createProceduralArtworkCanvas } from './config.js';

export class Gallery3D {
  /**
   * @param {HTMLElement|string} [container='#canvas-container'] Target DOM container
   * @param {Array<Object>} [items=DEMO_ITEMS] Array of artwork items
   * @param {Object} [config=GALLERY_CONFIG] Gallery configuration overrides
   */
  constructor(container = '#canvas-container', items = DEMO_ITEMS, config = GALLERY_CONFIG) {
    this.config = { ...GALLERY_CONFIG, ...config };
    this.items = items && items.length > 0 ? items : DEMO_ITEMS;

    // Resolve DOM container
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error(`[Gallery3D] Container element not found: ${container}`);
    }

    // Verify THREE.js presence
    this.THREE = window.THREE;
    if (!this.THREE) {
      throw new Error('[Gallery3D] Three.js library is not loaded on window.THREE');
    }

    // State & Physics
    this.currentIndex = 0;
    this.targetRotationY = 0;
    this.currentRotationY = 0;
    this.targetZoom = this.config.defaultZoom;
    this.currentZoom = this.config.defaultZoom;
    this.angleStep = (Math.PI * 2) / this.items.length;
    this.isPaused = false;

    // Drag interaction tracking
    this.isPointerDown = false;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.lastPointerX = 0;
    this.lastPointerTime = 0;
    this.dragDeltaX = 0;
    this.dragVelocity = 0;
    this.totalDragDist = 0;

    // Raycasting for card selection
    this.raycaster = new this.THREE.Raycaster();
    this.mouse = new this.THREE.Vector2();

    // Callbacks
    this.onCardChange = null;
    this.onCardClick = null;

    // Collections
    this.cards = [];
    this.cardMeshes = [];

    // Internal loop state
    this.animationFrameId = null;
    this.clock = new this.THREE.Clock();
    this.isDisposed = false;

    // Initialize 3D Engine
    this._initScene();
    this._initLights();
    this._initFloor();
    this._initParticles();
    this._initCarousel();
    this._initEventListeners();

    // Start render loop
    this._animate();

    console.log(`✨ [Gallery3D] Initialized archival orbital cloud with ${this.items.length} works`);
  }

  // =========================================================================
  // Scene, Camera & Renderer Setup
  // =========================================================================

  _initScene() {
    const THREE = this.THREE;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Scene with deep editorial obsidian fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070708, 0.04);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      this.config.cameraFov,
      width / height,
      0.1,
      100
    );
    this.camera.position.set(0, this.config.cameraHeight, this.currentZoom);
    this.camera.lookAt(0, 0, 0);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Attach to DOM
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  _initLights() {
    const THREE = this.THREE;

    // Ambient light - warm museum illumination
    this.ambientLight = new THREE.AmbientLight(0xf5f3ee, 0.75);
    this.scene.add(this.ambientLight);

    // Directional Key Light (angled natural sunlight / gallery spot)
    this.dirLight = new THREE.DirectionalLight(0xfff8ee, 1.1);
    this.dirLight.position.set(4, 12, 7);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 25;
    this.scene.add(this.dirLight);

    // Secondary Warm Fill Light from opposite side
    this.fillLight = new THREE.DirectionalLight(0xdcd4c4, 0.45);
    this.fillLight.position.set(-6, 4, -4);
    this.scene.add(this.fillLight);

    // Subtle Champagne Gold Rim Light
    this.rimLight = new THREE.PointLight(0xd4af37, 0.8, 22, 1.8);
    this.rimLight.position.set(0, 5, -2);
    this.scene.add(this.rimLight);

    // Front Active Card Spotlight
    this.activeSpotlight = new THREE.SpotLight(
      0xfffdfa,
      1.6,
      18,
      Math.PI / 4.5,
      0.35,
      1.1
    );
    this.activeSpotlight.position.set(0, 5, this.config.radius + 1.5);
    this.activeSpotlight.target.position.set(0, 0, this.config.radius);
    this.scene.add(this.activeSpotlight);
    this.scene.add(this.activeSpotlight.target);
  }

  // =========================================================================
  // Environment: Deep Obsidian Floor & Atmospheric Dust Motes
  // =========================================================================

  _initFloor() {
    const THREE = this.THREE;
    const floorSize = this.config.floorSize;

    // Deep matte obsidian reflective floor (No gaudy cyan grid!)
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060608,
      roughness: 0.4,
      metalness: 0.25
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = this.config.floorY;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);
  }

  _initParticles() {
    const THREE = this.THREE;
    const count = this.config.particleCount;
    const spread = this.config.particleSpread;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);

    // Warm organic dust mote tones (champagne, warm ivory, muted stone)
    const cIvory = new THREE.Color(0xf6f3ec);
    const cGold = new THREE.Color(0xd4c29d);
    const cStone = new THREE.Color(0x8a857b);

    for (let i = 0; i < count; i++) {
      // Coordinates
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 10 - 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      // Slow organic drift velocities
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.0008;
      this.particleVelocities[i * 3 + 1] = Math.random() * 0.0016 + 0.0004;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0008;

      // Color scheme
      const rnd = Math.random();
      const col = rnd < 0.5 ? cIvory : (rnd < 0.8 ? cGold : cStone);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Delicate circular soft particle sprite
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 32;
    spriteCanvas.height = 32;
    const ctx = spriteCanvas.getContext('2d');
    const radGrad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    radGrad.addColorStop(0.3, 'rgba(240, 235, 225, 0.45)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 32, 32);

    const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: spriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  // =========================================================================
  // 3D Orbital Spherical Cloud & Archival Cards
  // =========================================================================

  /**
   * Generates a curved plane geometry matching archival plate dimensions.
   */
  _createCurvedCardGeometry(width, height, radius, segments = 16) {
    const THREE = this.THREE;
    const geo = new THREE.PlaneGeometry(width, height, segments, 1);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const angle = x / radius;
      pos.setX(i, radius * Math.sin(angle));
      pos.setZ(i, radius * (Math.cos(angle) - 1)); // Subtle curvature
    }

    geo.computeVertexNormals();
    return geo;
  }

  _initCarousel() {
    const THREE = this.THREE;
    this.carouselGroup = new THREE.Group();
    this.scene.add(this.carouselGroup);
    this.textureLoader = new THREE.TextureLoader();

    this._buildCards();
  }

  /**
   * Cleans up existing card meshes, materials, and textures from the 3D scene.
   */
  _clearCards() {
    if (!this.carouselGroup) return;

    for (const card of this.cards) {
      if (card.borderLine) {
        if (card.borderLine.geometry) card.borderLine.geometry.dispose();
        if (card.borderMat) card.borderMat.dispose();
      }
      if (card.group) {
        card.group.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (obj.material.map) obj.material.map.dispose();
              obj.material.dispose();
            }
          }
        });
        this.carouselGroup.remove(card.group);
      }
    }

    this.cards = [];
    this.cardMeshes = [];
  }

  /**
   * Builds the curved archival photographic plates and positions them in an orbital cloud.
   */
  _buildCards() {
    const THREE = this.THREE;
    const baseRadius = this.config.radius;
    const cardW = this.config.cardWidth;
    const cardH = this.config.cardHeight;
    const count = this.items.length;

    this.angleStep = (Math.PI * 2) / (count || 1);

    // Shared geometries
    const cardGeo = this._createCurvedCardGeometry(cardW, cardH, baseRadius * 1.5, this.config.cardSegments);
    const backingGeo = this._createCurvedCardGeometry(cardW + 0.08, cardH + 0.08, baseRadius * 1.5, this.config.cardSegments);

    if (!this.textureLoader) {
      this.textureLoader = new THREE.TextureLoader();
    }

    for (let i = 0; i < count; i++) {
      const item = this.items[i];
      const theta = i * this.angleStep;

      // Staggered orbital cloud distribution across upper, mid, and lower tiers
      const tier = i % 3;
      let yOffset = 0;
      if (tier === 0) {
        yOffset = 1.05 + Math.sin(i * 1.3) * 0.3;
      } else if (tier === 1) {
        yOffset = -1.05 + Math.cos(i * 1.3) * 0.3;
      } else {
        yOffset = Math.sin(i * 2.2) * 0.2;
      }

      const rOffset = baseRadius + Math.sin(i * 1.9) * (this.config.radiusVariance || 0.45);
      const tiltZ = Math.sin(i * 1.7) * 0.04;
      const tiltX = -yOffset * 0.04;

      // Card root group
      const cardGroup = new THREE.Group();
      cardGroup.position.set(
        rOffset * Math.sin(theta),
        yOffset,
        rOffset * Math.cos(theta)
      );
      cardGroup.rotation.y = theta;
      cardGroup.rotation.z = tiltZ;
      cardGroup.rotation.x = tiltX;

      // 1. Artwork Material & Mesh
      const artworkMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: this.config.cardRoughness,
        metalness: this.config.cardMetalness,
        side: THREE.DoubleSide
      });

      this._loadArtworkTexture(item, artworkMat);

      const artworkMesh = new THREE.Mesh(cardGeo, artworkMat);
      artworkMesh.castShadow = true;
      artworkMesh.receiveShadow = true;
      artworkMesh.userData = { cardIndex: i, item };
      cardGroup.add(artworkMesh);
      this.cardMeshes.push(artworkMesh);

      // 2. Archival Dark Obsidian Backing Plate
      const backingMat = new THREE.MeshStandardMaterial({
        color: 0x070709,
        roughness: 0.35,
        metalness: 0.12,
        side: THREE.DoubleSide
      });
      const backingMesh = new THREE.Mesh(backingGeo, backingMat);
      backingMesh.position.z = -0.015;
      cardGroup.add(backingMesh);

      // 3. Ultra-refined Archival Framing Line (threshold 40 deg ignores internal curvature segments)
      const edges = new THREE.EdgesGeometry(cardGeo, 40);
      const borderMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xf5f3ee),
        transparent: true,
        opacity: i === this.currentIndex ? 0.85 : 0.16
      });
      const borderLine = new THREE.LineSegments(edges, borderMat);
      borderLine.position.z = 0.005;
      cardGroup.add(borderLine);

      // Store card record with animation offsets
      const cardRecord = {
        index: i,
        item,
        group: cardGroup,
        mesh: artworkMesh,
        borderLine,
        borderMat,
        angle: theta,
        baseY: yOffset,
        baseRotZ: tiltZ,
        floatOffset: i * 0.95,
        baseScale: 1.0,
        currentScale: 1.0
      };

      this.cards.push(cardRecord);
      this.carouselGroup.add(cardGroup);
    }

    this._updateCardsVisualState(true);
  }

  /**
   * Dynamically rebuilds the 3D orbital cloud with new artwork items.
   * Cleans up existing 3D geometries and textures, updates layout,
   * adjusts active index, and syncs callbacks.
   * @param {Array<Object>} newItems Updated array of artworks
   * @param {number|null} [focusIndex=null] Optional index to center on
   */
  updateItems(newItems, focusIndex = null) {
    if (!newItems || newItems.length === 0) return;

    this._clearCards();
    this.items = newItems;
    this._buildCards();

    // Determine target index
    if (focusIndex !== null && focusIndex >= 0 && focusIndex < this.items.length) {
      this.currentIndex = focusIndex;
    } else if (this.currentIndex >= this.items.length) {
      this.currentIndex = Math.max(0, this.items.length - 1);
    }

    // Align rotation to the active card
    this.selectCard(this.currentIndex);

    if (typeof this.onCardChange === 'function') {
      this.onCardChange(this.currentIndex, this.items[this.currentIndex]);
    }
  }

  /**
   * Loads texture with high-resolution Unsplash photography or procedural canvas fallback.
   */
  _loadArtworkTexture(item, material) {
    const THREE = this.THREE;

    this.textureLoader.load(
      item.image,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        material.map = texture;
        material.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn(`[Gallery3D] Falling back to procedural archival canvas for: "${item.title}"`, err);
        const canvas = createProceduralArtworkCanvas(item.title, item.subtitle, item.accentColor);
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.minFilter = THREE.LinearFilter;
        fallbackTexture.magFilter = THREE.LinearFilter;
        material.map = fallbackTexture;
        material.needsUpdate = true;
      }
    );
  }

  // =========================================================================
  // Control Methods & State Transitions
  // =========================================================================

  /**
   * Rotates cloud by delta angle (radians).
   * @param {number} deltaAngle Delta in radians
   */
  rotate(deltaAngle) {
    if (this.isPaused) return;
    this.targetRotationY += deltaAngle;
  }

  /**
   * Navigates to the next artwork card.
   */
  next() {
    const nextIndex = (this.currentIndex + 1) % this.items.length;
    this.selectCard(nextIndex);
  }

  /**
   * Navigates to the previous artwork card.
   */
  prev() {
    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.selectCard(prevIndex);
  }

  /**
   * Adjusts camera target zoom distance.
   * @param {number} delta Positive zooms out, negative zooms in
   */
  zoom(delta) {
    const nextZoom = this.targetZoom + delta;
    this.targetZoom = Math.min(Math.max(nextZoom, this.config.minZoom), this.config.maxZoom);
  }

  /**
   * Rotates directly to focus on specified card in the shortest direction.
   * @param {number} index Card index
   */
  selectCard(index) {
    if (index < 0 || index >= this.items.length) return;

    const twoPi = Math.PI * 2;
    const targetAngle = -index * this.angleStep;
    const currentRot = this.targetRotationY;

    // Shortest angular path calculation
    const diff = ((targetAngle - currentRot) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
    this.targetRotationY = currentRot + diff;
  }

  /**
   * Restores initial camera distance and centers the first card.
   */
  resetView() {
    this.selectCard(0);
    this.targetZoom = this.config.defaultZoom;
  }

  /**
   * Returns currently active artwork item.
   * @returns {Object}
   */
  getActiveItem() {
    return this.items[this.currentIndex];
  }

  /**
   * Pause or resume orbit rotation (e.g. while modal is open).
   */
  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  // =========================================================================
  // Visual Updates & Card State Smoothing
  // =========================================================================

  _updateCardsVisualState(force = false) {
    const THREE = this.THREE;
    const twoPi = Math.PI * 2;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const isCurrent = i === this.currentIndex;

      // Angular offset relative to active front position
      const cardEffectiveAngle = ((card.angle + this.currentRotationY) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
      const distFromFront = Math.abs(cardEffectiveAngle);

      // Active scale magnification
      const targetScale = isCurrent ? 1.08 : 1.0;
      card.currentScale = THREE.MathUtils.lerp(card.currentScale, targetScale, 0.1);
      card.group.scale.set(card.currentScale, card.currentScale, card.currentScale);

      // Dynamic border opacity based on focus proximity
      const proximity = Math.max(0, 1 - distFromFront / (this.angleStep * 1.6));
      const targetBorderOpacity = isCurrent ? 0.85 : 0.12 + proximity * 0.35;
      card.borderMat.opacity = THREE.MathUtils.lerp(card.borderMat.opacity, targetBorderOpacity, 0.1);

      // Soft focus warm emissive
      if (card.mesh.material) {
        if (!card.mesh.material.emissive) {
          card.mesh.material.emissive = new THREE.Color(0x000000);
        }
        const targetEmissive = isCurrent ? 0.08 : 0.0;
        card.mesh.material.emissiveIntensity = THREE.MathUtils.lerp(
          card.mesh.material.emissiveIntensity || 0,
          targetEmissive,
          0.1
        );
      }
    }
  }

  // =========================================================================
  // Mouse, Touch & Resize Fallback Event Listeners
  // =========================================================================

  _initEventListeners() {
    this._boundOnPointerDown = this._onPointerDown.bind(this);
    this._boundOnPointerMove = this._onPointerMove.bind(this);
    this._boundOnPointerUp = this._onPointerUp.bind(this);
    this._boundOnWheel = this._onWheel.bind(this);
    this._boundOnResize = this._onResize.bind(this);

    const dom = this.container;
    dom.addEventListener('pointerdown', this._boundOnPointerDown);
    dom.addEventListener('pointermove', this._boundOnPointerMove);
    dom.addEventListener('pointerup', this._boundOnPointerUp);
    dom.addEventListener('pointercancel', this._boundOnPointerUp);
    dom.addEventListener('wheel', this._boundOnWheel, { passive: false });
    window.addEventListener('resize', this._boundOnResize);
  }

  _onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click only

    this.isPointerDown = true;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.lastPointerX = e.clientX;
    this.lastPointerTime = performance.now();
    this.dragDeltaX = 0;
    this.dragVelocity = 0;
    this.totalDragDist = 0;

    if (this.container.setPointerCapture) {
      try {
        this.container.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  }

  _onPointerMove(e) {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Update normalized mouse vector for raycasting
    this.mouse.x = (e.clientX / width) * 2 - 1;
    this.mouse.y = -(e.clientY / height) * 2 + 1;

    if (!this.isPointerDown) {
      // Hover detection on cards
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.cardMeshes, false);
      this.container.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      return;
    }

    const now = performance.now();
    const dt = Math.max(1, now - this.lastPointerTime);
    const dx = e.clientX - this.lastPointerX;

    this.totalDragDist += Math.abs(dx);
    this.dragVelocity = dx / dt;
    this.lastPointerX = e.clientX;
    this.lastPointerTime = now;

    // Apply rotational drag
    this.rotate(dx * this.config.rotationSpeed);
  }

  _onPointerUp(e) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    if (this.container.releasePointerCapture) {
      try {
        this.container.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    // Direct card click / tap selection if drag was minimal
    if (this.totalDragDist < 7) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.cardMeshes, false);
      if (hits.length > 0 && hits[0].object.userData.cardIndex !== undefined) {
        const clickedIdx = hits[0].object.userData.cardIndex;
        const clickedItem = hits[0].object.userData.item;
        this.selectCard(clickedIdx);

        if (typeof this.onCardClick === 'function') {
          this.onCardClick(clickedIdx, clickedItem);
        }
        return;
      }
    }

    // Apply swipe inertia release
    if (Math.abs(this.dragVelocity) > 0.35 && !this.isPaused) {
      const inertiaImpulse = this.dragVelocity * 0.16;
      this.targetRotationY += inertiaImpulse;
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.45 : -0.45;
    this.zoom(delta);
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  // =========================================================================
  // Main Animation & Render Loop
  // =========================================================================

  _animate() {
    if (this.isDisposed) return;

    this.animationFrameId = requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Smooth Rotational Damping (Lerp)
    this.currentRotationY = this.THREE.MathUtils.lerp(
      this.currentRotationY,
      this.targetRotationY,
      this.config.rotationDamping
    );
    this.carouselGroup.rotation.y = this.currentRotationY;

    // 2. Smooth Zoom Distance Damping (Lerp)
    this.currentZoom = this.THREE.MathUtils.lerp(
      this.currentZoom,
      this.targetZoom,
      this.config.zoomDamping
    );
    this.camera.position.z = this.currentZoom;

    // 3. Gentle organic floating oscillation per card (Floating Archival Plates)
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      card.group.position.y = card.baseY + Math.sin(elapsedTime * 0.75 + card.floatOffset) * 0.06;
      card.group.rotation.z = card.baseRotZ + Math.cos(elapsedTime * 0.55 + card.floatOffset) * 0.012;
    }

    // 4. Evaluate Active Card Index
    const twoPi = Math.PI * 2;
    const normAngle = ((-this.currentRotationY) % twoPi + twoPi) % twoPi;
    const detectedIndex = Math.round(normAngle / this.angleStep) % this.items.length;

    if (detectedIndex !== this.currentIndex) {
      this.currentIndex = detectedIndex;
      if (typeof this.onCardChange === 'function') {
        this.onCardChange(this.currentIndex, this.items[this.currentIndex]);
      }
    }

    // 5. Update dynamic card states (scale, border opacity)
    this._updateCardsVisualState();

    // 6. Atmospheric Floating Dust Motes Motion
    if (this.particles) {
      const posAttr = this.particles.geometry.attributes.position;
      const positions = posAttr.array;
      const count = this.config.particleCount;

      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
        positions[i * 3] += Math.sin(elapsedTime * 0.35 + i) * 0.0006;

        // Reset dust mote when passing upper boundary
        if (positions[i * 3 + 1] > 8) {
          positions[i * 3 + 1] = -2.5;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  // =========================================================================
  // Cleanup & Resource Deallocation
  // =========================================================================

  dispose() {
    this.isDisposed = true;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this._clearCards();

    const dom = this.container;
    if (dom) {
      dom.removeEventListener('pointerdown', this._boundOnPointerDown);
      dom.removeEventListener('pointermove', this._boundOnPointerMove);
      dom.removeEventListener('pointerup', this._boundOnPointerUp);
      dom.removeEventListener('pointercancel', this._boundOnPointerUp);
      dom.removeEventListener('wheel', this._boundOnWheel);
    }
    window.removeEventListener('resize', this._boundOnResize);

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }

    console.log('🧹 [Gallery3D] Cleaned up and disposed 3D resources');
  }
}
