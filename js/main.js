/**
 * Ethan Vale - I See Through the Wild
 * Main Controller - 3D Editorial Exhibition
 * Coordinates Three.js Gallery3D, MediaPipe HandTracker, GestureDetector,
 * Artwork Detail Drawer / Modal, and Minimalist Editorial UI Controls.
 */

import { Gallery3D } from './gallery3d.js';
import { HandTracker } from './handTracker.js';
import { GestureDetector } from './gestureDetector.js';
import { ArtworkStorage } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✨ Initializing Ethan Vale — I See Through the Wild Exhibition...');

  // =========================================================================
  // 1. Initialize 3D Gallery Engine
  // =========================================================================
  let gallery = null;
  let currentArtworks = [];
  try {
    currentArtworks = await ArtworkStorage.getAllArtworks();
    gallery = new Gallery3D('#canvas-container', currentArtworks);
    window.gallery3d = gallery;
  } catch (err) {
    console.error('Failed to initialize Gallery3D with storage:', err);
    try {
      gallery = new Gallery3D('#canvas-container');
      window.gallery3d = gallery;
    } catch (fallbackErr) {
      console.error('Fallback Gallery3D init failed:', fallbackErr);
    }
  }

  // =========================================================================
  // 2. DOM Elements
  // =========================================================================
  const centerpieceHeadline = document.getElementById('centerpiece-headline');
  const cameraHud = document.getElementById('camera-hud');
  const hudPrompt = document.getElementById('hud-prompt');
  const hudTrackingState = document.getElementById('hud-tracking-state');
  const hudConfidence = document.getElementById('hud-confidence');
  const gestureToast = document.getElementById('gesture-toast');
  const gestureIcon = document.getElementById('gesture-icon');
  const gestureName = document.getElementById('gesture-name');
  const feedbackOverlay = document.getElementById('gesture-flash-feedback');
  const feedbackIcon = document.getElementById('feedback-icon');
  const feedbackText = document.getElementById('feedback-text');
  const artworkCounter = document.getElementById('artwork-counter');

  // Control Buttons
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnInspect = document.getElementById('btn-inspect');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnReset = document.getElementById('btn-reset');
  const btnToggleCam = document.getElementById('btn-toggle-cam');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnHelp = document.getElementById('btn-help');
  const btnHudToggle = document.getElementById('btn-hud-toggle');
  const btnHudMinimize = document.getElementById('btn-hud-minimize');

  // Instructions Guide Modal
  const guideModal = document.getElementById('instructions-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalGotIt = document.getElementById('btn-modal-got-it');

  // High-End Artwork Detail Modal
  const detailModal = document.getElementById('artwork-detail-modal');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const btnDetailPrev = document.getElementById('btn-detail-prev');
  const btnDetailNext = document.getElementById('btn-detail-next');
  const detailImage = document.getElementById('detail-image');
  const detailSpecimenId = document.getElementById('detail-specimen-id');
  const detailTitle = document.getElementById('detail-title');
  const detailSubtitle = document.getElementById('detail-subtitle');
  const detailDate = document.getElementById('detail-date');
  const detailLocation = document.getElementById('detail-location');
  const detailCamera = document.getElementById('detail-camera');
  const detailAuthor = document.getElementById('detail-author');
  const detailDescription = document.getElementById('detail-description');

  let isDetailModalOpen = false;

  // Curator Studio Elements
  const btnStudio = document.getElementById('btn-studio');
  const studioModal = document.getElementById('upload-artwork-modal');
  const btnCloseStudio = document.getElementById('btn-close-studio');
  const btnCancelUpload = document.getElementById('btn-cancel-upload');
  const tabBtnUpload = document.getElementById('tab-btn-upload');
  const tabBtnManage = document.getElementById('tab-btn-manage');
  const tabPanelUpload = document.getElementById('tab-panel-upload');
  const tabPanelManage = document.getElementById('tab-panel-manage');
  const studioTabCount = document.getElementById('studio-tab-count');
  const manageSubCount = document.getElementById('manage-sub-count');
  const uploadDropzone = document.getElementById('upload-dropzone');
  const uploadFileInput = document.getElementById('upload-file-input');
  const dropzoneEmpty = document.getElementById('dropzone-empty');
  const dropzonePreview = document.getElementById('dropzone-preview');
  const uploadPreviewImg = document.getElementById('upload-preview-img');
  const previewFilename = document.getElementById('preview-filename');
  const previewFilesize = document.getElementById('preview-filesize');
  const btnRemovePreview = document.getElementById('btn-remove-preview');
  const uploadForm = document.getElementById('upload-form');
  const formTitle = document.getElementById('form-title');
  const formSubtitle = document.getElementById('form-subtitle');
  const formDate = document.getElementById('form-date');
  const formLocation = document.getElementById('form-location');
  const formCamera = document.getElementById('form-camera');
  const formAuthor = document.getElementById('form-author');
  const formDescription = document.getElementById('form-description');
  const btnSubmitUpload = document.getElementById('btn-submit-upload');
  const btnRestoreDefaults = document.getElementById('btn-restore-defaults');
  const manageArtworksList = document.getElementById('manage-artworks-list');
  const studioToast = document.getElementById('studio-toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');

  let isStudioModalOpen = false;
  let currentUploadedImageDataUrl = null;

  // =========================================================================
  // 3. Counter & Active Artwork Synchronization
  // =========================================================================
  function updateCounter(index) {
    if (!artworkCounter || !gallery) return;
    const total = gallery.items.length;
    const current = index + 1;
    artworkCounter.textContent = `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  }

  if (gallery) {
    updateCounter(gallery.currentIndex);

    // Sync on 3D rotation focus change
    gallery.onCardChange = (index, item) => {
      updateCounter(index);
      if (isDetailModalOpen) {
        populateDetailModal(item, index);
      }
    };

    // Direct 3D Raycasting Click / Tap triggers Detail Modal
    gallery.onCardClick = (index, item) => {
      console.log(`🔍 Direct click on specimen: "${item.title}"`);
      openDetailModal(item, index);
    };
  }

  // =========================================================================
  // 4. Artwork Detail Modal Controller
  // =========================================================================
  function populateDetailModal(item, index) {
    if (!item) return;
    const total = gallery?.items.length || 3;
    const itemNum = String(index + 1).padStart(2, '0');

    if (detailSpecimenId) detailSpecimenId.textContent = `ARCHIVAL SPECIMEN ${itemNum} / ${String(total).padStart(2, '0')}`;
    if (detailTitle) detailTitle.textContent = item.title;
    if (detailSubtitle) detailSubtitle.textContent = item.subtitle;
    if (detailDate) detailDate.textContent = item.date || 'Field Archive 2026';
    if (detailLocation) detailLocation.textContent = item.location || 'Undisclosed Coordinates';
    if (detailCamera) detailCamera.textContent = item.camera || 'Leica SL2 · Natural Light';
    if (detailAuthor) detailAuthor.textContent = item.author || 'Ethan Vale';
    if (detailDescription) detailDescription.textContent = item.description || '';

    if (detailImage) {
      detailImage.src = item.image;
      detailImage.alt = `${item.title} — ${item.subtitle}`;
    }
  }

  function openDetailModal(item, index) {
    if (!detailModal) return;
    isDetailModalOpen = true;

    const activeItem = item || gallery?.getActiveItem();
    const activeIndex = index !== undefined ? index : (gallery?.currentIndex || 0);

    populateDetailModal(activeItem, activeIndex);

    detailModal.classList.add('is-open');
    detailModal.removeAttribute('hidden');
    centerpieceHeadline?.classList.add('dimmed');

    // Pause 3D orbit rotation while inspecting
    gallery?.pause();
  }

  function closeDetailModal() {
    if (!detailModal || !isDetailModalOpen) return;
    isDetailModalOpen = false;

    detailModal.classList.remove('is-open');
    centerpieceHeadline?.classList.remove('dimmed');

    // Resume 3D orbit rotation
    gallery?.resume();
  }

  btnCloseDetail?.addEventListener('click', closeDetailModal);

  btnInspect?.addEventListener('click', () => {
    const active = gallery?.getActiveItem();
    openDetailModal(active, gallery?.currentIndex);
  });

  btnDetailPrev?.addEventListener('click', () => {
    gallery?.prev();
    const active = gallery?.getActiveItem();
    populateDetailModal(active, gallery?.currentIndex);
  });

  btnDetailNext?.addEventListener('click', () => {
    gallery?.next();
    const active = gallery?.getActiveItem();
    populateDetailModal(active, gallery?.currentIndex);
  });

  // Close modal when clicking outside card
  detailModal?.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      closeDetailModal();
    }
  });

  // =========================================================================
  // 5. UI Feedback Helpers (Toast & Center Ping)
  // =========================================================================
  let feedbackTimeout = null;

  function triggerGestureFeedback(type, label, icon = '✋', options = {}) {
    if (gestureToast && gestureName && gestureIcon) {
      gestureName.textContent = label;
      gestureIcon.textContent = icon;

      gestureToast.className = 'gesture-status-badge';
      if (options.state === 'active') {
        gestureToast.classList.add('state-active');
      } else if (options.state === 'tracking') {
        gestureToast.classList.add('state-active');
      } else if (options.state === 'lost') {
        gestureToast.classList.add('state-lost');
      } else {
        gestureToast.classList.add('state-idle');
      }
    }

    if (cameraHud && type) {
      cameraHud.classList.remove('action-pinch', 'action-swipe-left', 'action-swipe-right', 'action-drag');
      if (type === 'swipe-left') cameraHud.classList.add('action-swipe-left');
      if (type === 'swipe-right') cameraHud.classList.add('action-swipe-right');
      if (type === 'pinch') cameraHud.classList.add('action-pinch');
      if (type === 'drag') cameraHud.classList.add('action-drag');

      setTimeout(() => {
        cameraHud?.classList.remove('action-pinch', 'action-swipe-left', 'action-swipe-right', 'action-drag');
      }, 500);
    }

    // Center screen flash overlay (for prominent actions)
    if (options.flash && feedbackOverlay && feedbackIcon && feedbackText) {
      feedbackIcon.textContent = icon;
      feedbackText.textContent = label;
      feedbackOverlay.classList.add('show');

      clearTimeout(feedbackTimeout);
      feedbackTimeout = setTimeout(() => {
        feedbackOverlay.classList.remove('show');
      }, 650);
    }
  }

  window.updateGestureUI = (type, label, icon, state) => {
    triggerGestureFeedback(type, label, icon, { state, flash: state === 'active' });
  };

  function updateHudStatus(state, tagText = 'TRACKING', confidence = 0) {
    if (!cameraHud) return;

    cameraHud.classList.remove('status-active', 'status-tracking', 'status-lost', 'status-idle');
    if (state === 'active') {
      cameraHud.classList.add('status-active');
    } else if (state === 'tracking') {
      cameraHud.classList.add('status-tracking');
    } else if (state === 'lost') {
      cameraHud.classList.add('status-lost');
    } else {
      cameraHud.classList.add('status-idle');
    }

    if (hudTrackingState) hudTrackingState.textContent = tagText;
    if (hudConfidence) hudConfidence.textContent = `${Math.round(confidence * 100)}%`;

    if (hudPrompt) {
      if (state === 'active' || state === 'tracking') {
        hudPrompt.classList.add('hidden');
      } else {
        hudPrompt.classList.remove('hidden');
      }
    }
  }

  // =========================================================================
  // 6. Initialize Hand Tracker & Gesture Detector
  // =========================================================================
  const gestureDetector = new GestureDetector();
  const handTracker = new HandTracker({
    videoElement: '#webcam',
    canvasElement: '#landmark-canvas',
    maxNumHands: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,

    onResults: (results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const score = results.multiHandedness?.[0]?.score || 0.9;
        updateHudStatus('tracking', 'TRACKING', score);
        gestureDetector.process(results);
      } else {
        updateHudStatus('lost', 'NO HAND', 0);
        gestureDetector.process(null);
      }
    },

    onError: (errInfo) => {
      console.warn('[OpticalTracker] Camera warning:', errInfo.message);
      updateHudStatus('idle', 'CAM ERROR', 0);
      triggerGestureFeedback('error', 'Camera Offline', '⚠️', { state: 'lost' });
    },

    onStatusChange: (status, details) => {
      if (status === 'starting') {
        updateHudStatus('idle', 'INITIALIZING', 0);
        triggerGestureFeedback('info', 'Calibrating Tracker...', '⏳', { state: 'idle' });
      } else if (status === 'stopped') {
        updateHudStatus('idle', 'OFFLINE', 0);
        triggerGestureFeedback('info', 'Tracker Disabled', '📷', { state: 'idle' });
      }
    }
  });

  // =========================================================================
  // 7. Wire Gesture Events to 3D Gallery & Detail Modal
  // =========================================================================

  // Swipe Left / Right
  gestureDetector.onSwipe((direction, velocity) => {
    console.log(`✨ Gesture recognized: Swipe ${direction}`);
    if (direction === 'left') {
      gallery?.prev();
      triggerGestureFeedback('swipe-left', 'Previous Plate', '👈', { state: 'active', flash: true });
    } else {
      gallery?.next();
      triggerGestureFeedback('swipe-right', 'Next Plate', '👉', { state: 'active', flash: true });
    }
  });

  // Continuous Pinch Zoom
  gestureDetector.onPinch((distance, delta, state) => {
    if (!gallery) return;

    if (state === 'start') {
      triggerGestureFeedback('pinch', 'Pinch Focus', '👌', { state: 'active', flash: false });
    } else if (state === 'move') {
      const zoomStep = delta * -7.0;
      gallery.zoom(zoomStep);
      const label = delta > 0 ? 'Zoom Out' : 'Zoom In';
      triggerGestureFeedback('pinch', label, '👌', { state: 'active', flash: false });
    } else if (state === 'end') {
      triggerGestureFeedback('idle', 'Tracking Hand', '✋', { state: 'tracking', flash: false });
    }
  });

  // Palm Orbit / Free Navigation
  let palmDragCooldown = 0;
  gestureDetector.onPalmMove((deltaX, deltaY, normX, normY) => {
    if (!gallery || isDetailModalOpen) return;

    const sensitivity = 3.4;
    gallery.rotate(deltaX * sensitivity);

    const now = performance.now();
    if (now - palmDragCooldown > 220) {
      palmDragCooldown = now;
      triggerGestureFeedback('drag', 'Palm Orbiting', '✋', { state: 'active', flash: false });
    }
  });

  // Poses (Fist, Peace / Select, Point Reset)
  gestureDetector.onPose((poseName) => {
    console.log(`[Pose] Detected: ${poseName}`);
    if (poseName === 'fist') {
      triggerGestureFeedback('fist', 'Orbit Frozen', '✊', { state: 'active', flash: true });
    } else if (poseName === 'peace') {
      // Victory / Peace opens Detail View!
      const active = gallery?.getActiveItem();
      if (!isDetailModalOpen) {
        openDetailModal(active, gallery?.currentIndex);
        triggerGestureFeedback('peace', `Examine: ${active.title}`, '✌️', { state: 'active', flash: true });
      }
    } else if (poseName === 'point') {
      gallery?.resetView();
      triggerGestureFeedback('point', 'Reset Perspective', '☝️', { state: 'active', flash: true });
    } else if (poseName === 'open_palm') {
      triggerGestureFeedback('open_palm', 'Palm Ready', '✋', { state: 'tracking', flash: false });
    }
  });

  // Hand Lost
  gestureDetector.onHandLost(() => {
    updateHudStatus('lost', 'NO HAND', 0);
    triggerGestureFeedback('lost', 'Raise hand in frame', '✋', { state: 'lost', flash: false });
  });

  // Start camera tracking automatically
  setTimeout(() => {
    handTracker.start().then((started) => {
      if (started) {
        console.log('✅ Optical tracking initialized successfully');
      }
    });
  }, 350);

  // =========================================================================
  // 8. Navigation Controls & Header Actions
  // =========================================================================

  // Camera Toggle
  btnToggleCam?.addEventListener('click', async () => {
    await handTracker.toggle();
  });

  // Gallery Navigation Buttons
  btnPrev?.addEventListener('click', () => {
    gallery?.prev();
    triggerGestureFeedback('swipe-left', 'Previous Plate', '👈', { state: 'active', flash: true });
  });

  btnNext?.addEventListener('click', () => {
    gallery?.next();
    triggerGestureFeedback('swipe-right', 'Next Plate', '👉', { state: 'active', flash: true });
  });

  btnZoomIn?.addEventListener('click', () => {
    gallery?.zoom(-0.65);
    triggerGestureFeedback('pinch', 'Zoom In', '🔍', { state: 'active', flash: false });
  });

  btnZoomOut?.addEventListener('click', () => {
    gallery?.zoom(0.65);
    triggerGestureFeedback('pinch', 'Zoom Out', '🔎', { state: 'active', flash: false });
  });

  btnReset?.addEventListener('click', () => {
    gallery?.resetView();
    triggerGestureFeedback('reset', 'Reset View', '🔄', { state: 'active', flash: true });
  });

  // HUD Minimize / Maximize
  btnHudMinimize?.addEventListener('click', () => {
    cameraHud?.classList.toggle('is-minimized');
    if (cameraHud?.classList.contains('is-minimized')) {
      btnHudMinimize.innerHTML = '<i data-lucide="plus"></i>';
    } else {
      btnHudMinimize.innerHTML = '<i data-lucide="minus"></i>';
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // HUD Visibility Toggle (Header camera icon)
  btnHudToggle?.addEventListener('click', () => {
    if (cameraHud) {
      const isHidden = window.getComputedStyle(cameraHud).display === 'none';
      cameraHud.style.display = isHidden ? 'block' : 'none';
    }
  });

  // Fullscreen Button
  btnFullscreen?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  });

  // Instructions Guide Modal
  const openGuide = () => guideModal?.classList.add('is-open');
  const closeGuide = () => guideModal?.classList.remove('is-open');

  btnHelp?.addEventListener('click', openGuide);
  btnCloseModal?.addEventListener('click', closeGuide);
  btnModalGotIt?.addEventListener('click', closeGuide);
  guideModal?.addEventListener('click', (e) => {
    if (e.target === guideModal) closeGuide();
  });

  // =========================================================================
  // 8b. Curator Studio & Artwork Upload Controller
  // =========================================================================

  let toastTimer = null;
  function showToast(message, icon = '✨', durationMs = 3400) {
    if (!studioToast || !toastMessage) return;
    toastMessage.textContent = message;
    if (toastIcon) toastIcon.textContent = icon;
    studioToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      studioToast.classList.remove('show');
    }, durationMs);
  }

  function switchStudioTab(tab) {
    if (tab === 'upload') {
      tabBtnUpload?.classList.add('is-active');
      tabBtnUpload?.setAttribute('aria-selected', 'true');
      tabBtnManage?.classList.remove('is-active');
      tabBtnManage?.setAttribute('aria-selected', 'false');
      tabPanelUpload?.classList.add('is-active');
      tabPanelUpload?.removeAttribute('hidden');
      tabPanelManage?.classList.remove('is-active');
      tabPanelManage?.setAttribute('hidden', '');
    } else {
      tabBtnManage?.classList.add('is-active');
      tabBtnManage?.setAttribute('aria-selected', 'true');
      tabBtnUpload?.classList.remove('is-active');
      tabBtnUpload?.setAttribute('aria-selected', 'false');
      tabPanelManage?.classList.add('is-active');
      tabPanelManage?.removeAttribute('hidden');
      tabPanelUpload?.classList.remove('is-active');
      tabPanelUpload?.setAttribute('hidden', '');
      renderManageList();
    }
  }

  async function updateArchiveCounts() {
    const list = await ArtworkStorage.getAllArtworks();
    const total = list.length;
    if (studioTabCount) studioTabCount.textContent = total;
    if (manageSubCount) manageSubCount.textContent = `${total} Total Photographic Plates`;
  }

  function openStudioModal(tab = 'upload') {
    if (!studioModal) return;
    isStudioModalOpen = true;
    studioModal.classList.add('is-open');
    centerpieceHeadline?.classList.add('dimmed');
    gallery?.pause();
    switchStudioTab(tab);
    updateArchiveCounts();
  }

  function closeStudioModal() {
    if (!studioModal || !isStudioModalOpen) return;
    isStudioModalOpen = false;
    studioModal.classList.remove('is-open');
    centerpieceHeadline?.classList.remove('dimmed');
    gallery?.resume();
  }

  btnStudio?.addEventListener('click', () => openStudioModal('upload'));
  btnCloseStudio?.addEventListener('click', closeStudioModal);
  btnCancelUpload?.addEventListener('click', closeStudioModal);
  tabBtnUpload?.addEventListener('click', () => switchStudioTab('upload'));
  tabBtnManage?.addEventListener('click', () => switchStudioTab('manage'));

  studioModal?.addEventListener('click', (e) => {
    if (e.target === studioModal) {
      closeStudioModal();
    }
  });

  // Dropzone & File Handling
  async function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid photographic image (JPEG, PNG, WebP)', '⚠️');
      return;
    }

    try {
      const { dataUrl, width, height, sizeBytes } = await ArtworkStorage.processImageFile(file);
      currentUploadedImageDataUrl = dataUrl;

      if (uploadPreviewImg) uploadPreviewImg.src = dataUrl;
      if (previewFilename) previewFilename.textContent = file.name;
      if (previewFilesize) {
        const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
        previewFilesize.textContent = `${width} × ${height}px · ${sizeMb} MB (Optimized)`;
      }

      dropzoneEmpty?.classList.add('is-hidden');
      dropzonePreview?.classList.remove('is-hidden');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast('Could not process this image file', '⚠️');
    }
  }

  function resetDropzone() {
    currentUploadedImageDataUrl = null;
    if (uploadFileInput) uploadFileInput.value = '';
    if (uploadPreviewImg) uploadPreviewImg.src = '';
    dropzoneEmpty?.classList.remove('is-hidden');
    dropzonePreview?.classList.add('is-hidden');
  }

  uploadDropzone?.addEventListener('click', (e) => {
    if (e.target.closest('#btn-remove-preview')) return;
    uploadFileInput?.click();
  });

  uploadDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      uploadFileInput?.click();
    }
  });

  btnRemovePreview?.addEventListener('click', (e) => {
    e.stopPropagation();
    resetDropzone();
    uploadFileInput?.click();
  });

  uploadFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    uploadDropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    uploadDropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.remove('is-dragover');
    });
  });

  uploadDropzone?.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  });

  // Upload Form Submit
  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = formTitle?.value.trim();
    if (!title) {
      showToast('Please enter a Specimen Title', '⚠️');
      formTitle?.focus();
      return;
    }

    if (!currentUploadedImageDataUrl) {
      showToast('Please select or drop a photograph', '📷');
      uploadDropzone?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const originalSubmitText = btnSubmitUpload?.innerHTML;
    if (btnSubmitUpload) {
      btnSubmitUpload.disabled = true;
      btnSubmitUpload.innerHTML = '<span>Archiving...</span>';
    }

    try {
      const newArtwork = {
        title,
        subtitle: formSubtitle?.value.trim() || 'Custom Archival Plate',
        date: formDate?.value.trim() || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        location: formLocation?.value.trim() || 'Field Archive',
        camera: formCamera?.value.trim() || 'Curator Archive Capture',
        author: formAuthor?.value.trim() || 'Le Nhat',
        description: formDescription?.value.trim() || '',
        image: currentUploadedImageDataUrl
      };

      const saved = await ArtworkStorage.addArtwork(newArtwork);
      const updatedList = await ArtworkStorage.getAllArtworks();

      // Focus on newly added specimen in 3D scene
      const newIndex = updatedList.findIndex((item) => String(item.id) === String(saved.id));
      const targetIdx = newIndex >= 0 ? newIndex : updatedList.length - 1;

      gallery?.updateItems(updatedList, targetIdx);
      updateCounter(targetIdx);

      // Reset form
      uploadForm.reset();
      if (formAuthor) formAuthor.value = 'Le Nhat';
      resetDropzone();

      closeStudioModal();
      showToast(`“${saved.title}” archived to 3D collection`, '✨');
    } catch (err) {
      console.error('Error saving artwork:', err);
      showToast('Failed to archive specimen', '⚠️');
    } finally {
      if (btnSubmitUpload) {
        btnSubmitUpload.disabled = false;
        btnSubmitUpload.innerHTML = originalSubmitText;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  });

  // Manage Collection View
  async function renderManageList() {
    if (!manageArtworksList) return;
    const items = await ArtworkStorage.getAllArtworks();
    updateArchiveCounts();

    manageArtworksList.innerHTML = '';

    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'manage-item-row';

      const itemNum = String(index + 1).padStart(2, '0');
      const badgeHtml = item.isCustom
        ? '<span class="badge-tag custom">Custom Specimen</span>'
        : '<span class="badge-tag default">Default Archive</span>';

      const deleteBtnHtml = item.isCustom
        ? `<button class="item-action-btn delete-btn" data-id="${item.id}" title="Remove specimen from archive"><i data-lucide="trash-2"></i></button>`
        : '';

      row.innerHTML = `
        <img src="${item.image}" alt="${item.title}" class="manage-item-thumb" />
        <div class="manage-item-details">
          <div class="manage-item-title-row">
            <span class="manage-item-title">${item.title}</span>
            ${badgeHtml}
          </div>
          <div class="manage-item-meta">
            Plate #${itemNum} · ${item.subtitle || 'Archival Plate'} · ${item.location || 'Undisclosed'}
          </div>
        </div>
        <div class="manage-item-actions">
          <button class="item-action-btn view-btn" data-index="${index}" title="Focus & Inspect in 3D">
            <i data-lucide="eye"></i>
          </button>
          ${deleteBtnHtml}
        </div>
      `;

      // View button: inspects card in 3D
      const viewBtn = row.querySelector('.view-btn');
      viewBtn?.addEventListener('click', () => {
        closeStudioModal();
        gallery?.selectCard(index);
        openDetailModal(item, index);
      });

      // Delete button (for custom artworks)
      const deleteBtn = row.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = window.confirm(`Remove “${item.title}” from your 3D collection?`);
        if (!confirmed) return;

        await ArtworkStorage.deleteArtwork(item.id);
        const refreshed = await ArtworkStorage.getAllArtworks();
        gallery?.updateItems(refreshed);
        updateCounter(gallery.currentIndex);
        await renderManageList();
        showToast(`“${item.title}” removed from archive`, '🗑️');
      });

      manageArtworksList.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Restore defaults
  btnRestoreDefaults?.addEventListener('click', async () => {
    const confirmed = window.confirm('Restore original curated sample archive? This will clear custom uploaded specimens.');
    if (!confirmed) return;

    const defaults = await ArtworkStorage.resetToDefaults();
    gallery?.updateItems(defaults, 0);
    updateCounter(0);
    await renderManageList();
    showToast('Default archival collection restored', '🔄');
  });

  // Initial count sync
  updateArchiveCounts();

  // =========================================================================
  // 9. Keyboard Navigation Shortcuts
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        gallery?.prev();
        triggerGestureFeedback('swipe-left', 'Previous Plate', '👈', { state: 'active', flash: true });
        break;

      case 'ArrowRight':
      case 'd':
      case 'D':
        gallery?.next();
        triggerGestureFeedback('swipe-right', 'Next Plate', '👉', { state: 'active', flash: true });
        break;

      case 'Enter':
      case 'e':
      case 'E':
        if (isDetailModalOpen) {
          closeDetailModal();
        } else {
          const active = gallery?.getActiveItem();
          openDetailModal(active, gallery?.currentIndex);
        }
        break;

      case '+':
      case '=':
        gallery?.zoom(-0.6);
        triggerGestureFeedback('pinch', 'Zoom In', '🔍', { state: 'active', flash: false });
        break;

      case '-':
      case '_':
        gallery?.zoom(0.6);
        triggerGestureFeedback('pinch', 'Zoom Out', '🔎', { state: 'active', flash: false });
        break;

      case 'r':
      case 'R':
        gallery?.resetView();
        triggerGestureFeedback('reset', 'Reset View', '🔄', { state: 'active', flash: true });
        break;

      case 'f':
      case 'F':
        btnFullscreen?.click();
        break;

      case 'c':
      case 'C':
        btnToggleCam?.click();
        break;

      case 'h':
      case 'H':
      case '?':
        if (guideModal?.classList.contains('is-open')) {
          closeGuide();
        } else {
          openGuide();
        }
        break;

      case 'Escape':
        if (isStudioModalOpen) {
          closeStudioModal();
        } else if (isDetailModalOpen) {
          closeDetailModal();
        } else if (guideModal?.classList.contains('is-open')) {
          closeGuide();
        }
        break;

      case ' ': // Space: examine or reset
        e.preventDefault();
        if (isDetailModalOpen) {
          closeDetailModal();
        } else {
          const active = gallery?.getActiveItem();
          openDetailModal(active, gallery?.currentIndex);
        }
        break;
    }
  });

  // Re-create Lucide icons if dynamically loaded
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
