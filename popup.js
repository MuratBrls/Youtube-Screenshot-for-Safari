/**
 * popup.js — YouTube Screenshot Studio  v2.1 (Safari, macOS Native)
 * Formats: PNG (lossless, default), JPG (compressed), TIF (lossless professional)
 */

(function () {
  'use strict';

  const _browser = (typeof browser !== 'undefined') ? browser : chrome;

  // ── Refs ─────────────────────────────────────────────────────────────────
  const segPng      = document.getElementById('seg-png');
  const segJpg      = document.getElementById('seg-jpg');
  const segTif      = document.getElementById('seg-tif');
  const fmtDesc     = document.getElementById('fmt-desc');
  const qualityWrap = document.getElementById('quality-wrap');
  const slider      = document.getElementById('jpg-quality');
  const qDisplay    = document.getElementById('q-display');
  const kbdBox      = document.getElementById('kbd-box');
  const recBtn      = document.getElementById('rec-btn');
  const shortcutHint = document.getElementById('shortcut-hint');
  const saveBtn     = document.getElementById('save-btn');
  const statusDot   = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');

  let currentFormat = 'png';

  const fmtDescriptions = {
    png: 'Kayıpsız — 4K için önerilen',
    jpg: 'Sıkıştırılmış — küçük dosya boyutu',
    tif: 'Kayıpsız profesyonel format',
  };

  // ── Load Settings ─────────────────────────────────────────────────────────
  _browser.storage.local.get(['format', 'jpgQuality', 'shortcutKey'], (d) => {
    currentFormat = d.format || 'png';
    const quality = d.jpgQuality !== undefined ? d.jpgQuality : 100;
    const key     = (d.shortcutKey || 'p').toUpperCase();

    setFormat(currentFormat, false);
    slider.value         = quality;
    qDisplay.textContent = quality;
    updateSlider(quality);
    kbdBox.textContent   = key;
    shortcutHint.textContent = `${key} tuşuna bas → frame yakala`;
  });

  // ── YouTube Tab Status ────────────────────────────────────────────────────
  _browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    if (url.includes('youtube.com/watch')) {
      statusDot.classList.add('on');
      statusLabel.textContent = 'Hazır';
      statusLabel.style.color = '#34c759';
    } else {
      statusLabel.textContent = 'YouTube değil';
    }
  });

  // ── Format Selection ──────────────────────────────────────────────────────
  function setFormat(fmt, save = true) {
    currentFormat = fmt;

    [segPng, segJpg, segTif].forEach(s => s.classList.remove('active'));
    const activeBtn = { png: segPng, jpg: segJpg, tif: segTif }[fmt];
    if (activeBtn) activeBtn.classList.add('active');

    fmtDesc.textContent = fmtDescriptions[fmt] || '';

    if (fmt === 'jpg') {
      qualityWrap.classList.add('show');
    } else {
      qualityWrap.classList.remove('show');
    }

    if (save) _browser.storage.local.set({ format: fmt });
  }

  segPng.addEventListener('click', () => setFormat('png'));
  segJpg.addEventListener('click', () => setFormat('jpg'));
  segTif.addEventListener('click', () => setFormat('tif'));

  // ── Quality Slider ────────────────────────────────────────────────────────
  slider.addEventListener('input', () => {
    qDisplay.textContent = slider.value;
    updateSlider(slider.value);
  });

  function updateSlider(val) {
    const pct = ((val - 60) / 40) * 100;
    slider.style.setProperty('--pct', pct + '%');
  }

  // ── Keyboard Shortcut Recorder ────────────────────────────────────────────
  let recording = false;

  recBtn.addEventListener('click', () => {
    if (!recording) {
      recording = true;
      kbdBox.textContent = '·';
      kbdBox.classList.add('recording');
      recBtn.textContent = 'İptal';
      shortcutHint.textContent = 'Herhangi bir tuşa bas…';
      shortcutHint.style.color = '#007aff';
    } else {
      cancelRecording();
    }
  });

  function cancelRecording() {
    recording = false;
    kbdBox.classList.remove('recording');
    recBtn.textContent = 'Değiştir';
    shortcutHint.style.color = '';
    _browser.storage.local.get(['shortcutKey'], (d) => {
      const k = (d.shortcutKey || 'p').toUpperCase();
      kbdBox.textContent = k;
      shortcutHint.textContent = `${k} tuşuna bas → frame yakala`;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!recording) return;
    if (['Control','Shift','Alt','Meta','CapsLock','Tab'].includes(e.key)) return;
    if (e.key === 'Escape') { cancelRecording(); return; }
    e.preventDefault();

    const key = e.key.toLowerCase();
    recording = false;
    kbdBox.textContent = key.toUpperCase();
    kbdBox.classList.remove('recording');
    kbdBox.style.borderColor = '#34c759';
    kbdBox.style.color = '#34c759';
    recBtn.textContent = 'Değiştir';
    shortcutHint.textContent = `${key.toUpperCase()} tuşuna bas → frame yakala`;
    shortcutHint.style.color = '#34c759';

    setTimeout(() => {
      kbdBox.style.borderColor = '';
      kbdBox.style.color = '';
      shortcutHint.style.color = '';
    }, 1500);

    _browser.storage.local.set({ shortcutKey: key });
  });

  // ── Save ─────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const quality = parseInt(slider.value, 10);
    const key     = kbdBox.textContent.toLowerCase();

    _browser.storage.local.set(
      { format: currentFormat, jpgQuality: quality, shortcutKey: key },
      () => {
        saveBtn.textContent = '✓ Kaydedildi';
        saveBtn.classList.add('ok');
        setTimeout(() => {
          saveBtn.textContent = 'Ayarları Kaydet';
          saveBtn.classList.remove('ok');
        }, 1600);
      }
    );
  });

})();
