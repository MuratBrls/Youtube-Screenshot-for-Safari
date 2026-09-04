/**
 * content.js — YouTube Frame Catcher  v2.1 (Safari)
 * Formats: PNG (lossless, recommended), JPG (compressed), TIF (lossless professional)
 * Always downloads to system Downloads folder.
 */

(function () {
  'use strict';

  // ── Safari Compatibility Shim ──────────────────────────────────────────────
  const _browser = (typeof browser !== 'undefined') ? browser : chrome;

  // ── Prefs ──────────────────────────────────────────────────────────────────
  let prefs = { format: 'png', jpgQuality: 100, shortcutKey: 'p' };

  function reloadPrefs() {
    _browser.storage.local.get(['format', 'jpgQuality', 'shortcutKey'], (d) => {
      prefs.format      = d.format      || 'png';
      prefs.jpgQuality  = d.jpgQuality  !== undefined ? d.jpgQuality : 100;
      prefs.shortcutKey = (d.shortcutKey || 'p').toLowerCase();
    });
  }
  reloadPrefs();
  _browser.storage.onChanged.addListener(reloadPrefs);

  // ── Utilities ──────────────────────────────────────────────────────────────
  function sanitize(s) {
    return (s || '')
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 100);
  }

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const p = n => String(n).padStart(2, '0');
    // Format: 1h02m03s  veya  01m23s
    return h > 0
      ? `${h}h${p(m)}m${p(s)}s`
      : `${p(m)}m${p(s)}s`;
  }

  // ── Notification ──────────────────────────────────────────────────────────
  let _notifTimer = null;

  function notify(msg, ok = true) {
    const prev = document.getElementById('yt-fc-notif');
    if (prev) { prev.remove(); clearTimeout(_notifTimer); }

    const accent = ok ? '#34c759' : '#ff3b30';
    const iconBg = ok ? '#edfaf2' : '#fff0ee';
    const icon   = ok
      ? `<polyline points="20 6 9 17 4 12"/>`
      : `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>`;

    const n = document.createElement('div');
    n.id = 'yt-fc-notif';
    n.style.cssText = `
      position:fixed; top:16px; right:-290px; z-index:2147483647;
      width:270px; padding:10px 13px;
      display:flex; align-items:center; gap:10px;
      background:#fff;
      border:1px solid rgba(0,0,0,0.08);
      border-radius:14px;
      box-shadow:0 4px 24px rgba(0,0,0,0.12);
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      font-size:12px; color:#1c1c1e; pointer-events:none;
      transition:right 0.4s cubic-bezier(0.34,1.56,0.64,1);
    `;
    n.innerHTML = `
      <div style="width:30px;height:30px;flex-shrink:0;border-radius:8px;background:${iconBg};
                  display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="${accent}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          ${icon}
        </svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11.5px;font-weight:600;color:#1c1c1e;margin-bottom:1px;">Frame Catcher</div>
        <div style="font-size:10.5px;color:#8e8e93;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${msg}</div>
      </div>
    `;
    document.body.appendChild(n);
    requestAnimationFrame(() => requestAnimationFrame(() => { n.style.right = '16px'; }));
    _notifTimer = setTimeout(() => {
      n.style.transition = 'right 0.3s ease, opacity 0.25s ease';
      n.style.right = '-290px'; n.style.opacity = '0';
      setTimeout(() => n.remove(), 340);
    }, 4000);
  }

  // ── Download ──────────────────────────────────────────────────────────────
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
  }

  // ── Capture ────────────────────────────────────────────────────────────────
  async function captureFrame() {
    const video = document.querySelector('video');
    if (!video || !video.videoWidth) {
      notify('Video bulunamadı', false);
      return;
    }

    const W = video.videoWidth;
    const H = video.videoHeight;

    // Çözünürlük uyarısı — YouTube oynatıcısı düşük kalitede olabilir
    if (W < 1280) {
      notify(`⚠️ Video kalitesi düşük (${W}×${H}) — YouTube oynatıcısından kaliteyi artırın`, false);
    }

    // Frame-perfect capture: GPU decode tamamlanmış frame'i bekle
    const canvas = await new Promise((resolve) => {
      const doCapture = () => {
        const cv = document.createElement('canvas');
        cv.width  = W;
        cv.height = H;
        // display-p3: geniş gamut — HDR/4K renk uzayını korur, sRGB'den üstün
        let ctx;
        try {
          ctx = cv.getContext('2d', { colorSpace: 'display-p3', alpha: false });
        } catch {
          ctx = cv.getContext('2d', { alpha: false });
        }
        try { ctx.drawImage(video, 0, 0, W, H); }
        catch { return null; }
        return cv;
      };

      // Oynatılıyorsa: bir sonraki decode edilmiş frame'i bekle
      if (!video.paused && video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => resolve(doCapture()));
      } else {
        resolve(doCapture()); // Duraklatılmış video: direkt yakala
      }
    });

    if (!canvas) {
      notify('Frame alınamadı (video korumalı olabilir)', false);
      return;
    }

    const timeLabel = fmtTime(video.currentTime || 0);
    const titleEl =
      document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
      document.querySelector('#title h1 yt-formatted-string')             ||
      document.querySelector('ytd-watch-metadata h1');
    const title = titleEl ? titleEl.textContent.trim() : 'Video';
    const ctx2d = canvas.getContext('2d');

    let blob, ext;
    try {
      if (prefs.format === 'tif' && typeof UTIF !== 'undefined') {
        const imgData = ctx2d.getImageData(0, 0, W, H);
        const tifBuf  = UTIF.encodeImage(new Uint8Array(imgData.data.buffer), W, H);
        blob = new Blob([tifBuf], { type: 'image/tiff' });
        ext  = 'tif';

      } else if (prefs.format === 'jpg') {
        const quality = Math.max(0.1, Math.min(1.0, prefs.jpgQuality / 100));
        blob = await new Promise((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', quality)
        );
        ext = 'jpg';

      } else {
        // PNG — kayıpsız, display-p3 renk profili korunur
        blob = await new Promise((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
        );
        ext = 'png';
        if (prefs.format === 'tif') notify('TIF encoder yok → PNG kaydedildi', false);
      }
    } catch (e) {
      notify('Encoding hatası: ' + e.message, false);
      return;
    }

    if (!blob) { notify('Frame kaydedilemedi', false); return; }

    const filename = `${sanitize(title)}_${timeLabel}.${ext}`;
    downloadBlob(blob, filename);
    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
    notify(`✓ ${W}×${H}  ·  ${sizeMB} MB  ·  ${ext.toUpperCase()}`, true);
  }

  // ── Settings Panel ─────────────────────────────────────────────────────────
  function toggleSettingsPanel() {
    const ex = document.getElementById('yt-fc-panel');
    if (ex) { ex.remove(); return; }

    const btn    = document.getElementById('yt-fc-settings-btn');
    const rect   = btn ? btn.getBoundingClientRect() : { top: 100, right: 120 };
    const panelW = 260;
    const right  = Math.max(8, window.innerWidth - rect.right - 4);
    const bottom = Math.max(8, window.innerHeight - rect.top + 8);

    const p = document.createElement('div');
    p.id = 'yt-fc-panel';
    p.style.cssText = `
      position:fixed;
      bottom:${bottom}px;
      right:${right}px;
      z-index:2147483647;
      width:${panelW}px;
      background:#ffffff;
      border-radius:16px;
      box-shadow:0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08);
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      font-size:13px; color:#1c1c1e;
      overflow:hidden;
      opacity:0; transform:translateY(8px) scale(0.97);
      transition:opacity 0.2s ease, transform 0.2s ease;
    `;

    p.innerHTML = `
      <!-- Title bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:12px 14px 10px;border-bottom:0.5px solid rgba(0,0,0,0.1);">
        <span style="font-size:13px;font-weight:600;">Frame Catcher</span>
        <button id="fc-close" style="width:20px;height:20px;border:none;background:#e5e5ea;
               border-radius:50%;cursor:pointer;font-size:10px;color:#6c6c70;
               display:flex;align-items:center;justify-content:center;padding:0;line-height:1;">✕</button>
      </div>

      <!-- Format -->
      <div style="padding:12px 14px 0;">
        <div style="font-size:10.5px;font-weight:500;color:#8e8e93;text-transform:uppercase;
                    letter-spacing:0.05em;margin-bottom:8px;">Format</div>
        <div id="fc-fmt-row" style="display:flex;background:rgba(120,120,128,0.12);
             border-radius:9px;padding:2px;gap:2px;">
          <div class="fc-seg" data-fmt="png"
            style="flex:1;text-align:center;padding:6px 2px;border-radius:7px;
                   font-size:11.5px;font-weight:600;cursor:pointer;transition:all 0.15s;">PNG</div>
          <div class="fc-seg" data-fmt="jpg"
            style="flex:1;text-align:center;padding:6px 2px;border-radius:7px;
                   font-size:11.5px;font-weight:600;cursor:pointer;transition:all 0.15s;">JPG</div>
          <div class="fc-seg" data-fmt="tif"
            style="flex:1;text-align:center;padding:6px 2px;border-radius:7px;
                   font-size:11.5px;font-weight:600;cursor:pointer;transition:all 0.15s;">TIF</div>
        </div>
        <div id="fc-fmt-hint" style="font-size:10px;color:#8e8e93;margin-top:5px;padding-left:2px;"></div>
      </div>

      <!-- Quality (JPG only) -->
      <div id="fc-quality-wrap" style="overflow:hidden;max-height:0;opacity:0;
           transition:max-height 0.25s,opacity 0.25s;padding:0 14px;">
        <div style="display:flex;align-items:center;gap:10px;padding-top:10px;">
          <span style="font-size:12px;color:#3a3a3c;flex:1;">JPG Kalitesi</span>
          <input type="range" id="fc-quality" min="60" max="100" value="100" step="1"
            style="width:90px;height:3px;-webkit-appearance:none;border-radius:4px;outline:none;cursor:pointer;
                   background:linear-gradient(to right,#007aff 0%,#007aff var(--pct,100%),rgba(120,120,128,0.2) var(--pct,100%));">
          <span id="fc-quality-val" style="font-size:12px;font-weight:600;color:#007aff;min-width:28px;text-align:right;">100</span>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:0.5px;background:rgba(0,0,0,0.1);margin:12px 0 0;"></div>

      <!-- Shortcut -->
      <div style="padding:12px 14px 0;">
        <div style="font-size:10.5px;font-weight:500;color:#8e8e93;text-transform:uppercase;
                    letter-spacing:0.05em;margin-bottom:8px;">Kısayol</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div id="fc-kbd"
            style="min-width:32px;height:26px;padding:0 9px;
                   background:#f5f5f7;border:0.5px solid rgba(0,0,0,0.18);
                   border-bottom:2px solid rgba(0,0,0,0.22);border-radius:6px;
                   font-family:-apple-system,monospace;font-size:13px;font-weight:700;
                   color:#1c1c1e;display:flex;align-items:center;justify-content:center;">P</div>
          <button id="fc-rec-btn"
            style="padding:5px 10px;border:0.5px solid rgba(0,0,0,0.18);border-radius:7px;
                   background:#f5f5f7;color:#1c1c1e;font-family:inherit;font-size:11.5px;
                   font-weight:500;cursor:pointer;outline:none;">Değiştir</button>
          <span id="fc-rec-hint" style="font-size:11px;color:#8e8e93;flex:1;"></span>
        </div>
      </div>

      <!-- Save location info -->
      <div style="margin:12px 14px 0;padding:9px 12px;background:#f2f9f4;border-radius:9px;
                  display:flex;align-items:center;gap:8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34c759"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span style="font-size:11px;color:#3a3a3c;">Downloads klasörüne otomatik kaydedilir</span>
      </div>

      <div style="height:14px;"></div>
    `;

    document.body.appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.opacity = '1';
      p.style.transform = 'translateY(0) scale(1)';
    }));

    // ── Close ──
    p.querySelector('#fc-close').addEventListener('click', (e) => {
      e.stopPropagation();
      p.remove();
    });

    // ── Format segment ──
    const segs     = p.querySelectorAll('.fc-seg');
    const fmtHint  = p.querySelector('#fc-fmt-hint');
    const qualWrap = p.querySelector('#fc-quality-wrap');

    const hints = {
      png: '🟢 Kayıpsız — 4K için önerilen',
      jpg: '🟡 Sıkıştırılmış — küçük dosya boyutu',
      tif: '🟢 Kayıpsız profesyonel format',
    };

    function setActiveFmt(fmt) {
      segs.forEach(el => {
        const active = el.dataset.fmt === fmt;
        el.style.background = active ? '#ffffff' : 'transparent';
        el.style.color      = active ? '#1c1c1e' : '#6c6c70';
        el.style.boxShadow  = active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none';
      });
      fmtHint.textContent      = hints[fmt] || '';
      qualWrap.style.maxHeight = fmt === 'jpg' ? '50px' : '0';
      qualWrap.style.opacity   = fmt === 'jpg' ? '1'    : '0';
    }

    _browser.storage.local.get(['format'], (d) => setActiveFmt(d.format || prefs.format));

    segs.forEach(el => {
      el.addEventListener('click', () => {
        prefs.format = el.dataset.fmt;
        _browser.storage.local.set({ format: prefs.format });
        setActiveFmt(prefs.format);
      });
    });

    // ── Quality slider ──
    const qualSlider = p.querySelector('#fc-quality');
    const qualVal    = p.querySelector('#fc-quality-val');

    _browser.storage.local.get(['jpgQuality'], (d) => {
      const q = d.jpgQuality !== undefined ? d.jpgQuality : 100;
      qualSlider.value = q;
      qualVal.textContent = q;
      qualSlider.style.setProperty('--pct', ((q - 60) / 40 * 100) + '%');
    });

    qualSlider.addEventListener('input', () => {
      qualVal.textContent = qualSlider.value;
      qualSlider.style.setProperty('--pct', ((qualSlider.value - 60) / 40 * 100) + '%');
      _browser.storage.local.set({ jpgQuality: parseInt(qualSlider.value) });
    });

    // ── Shortcut recorder ──
    const kbdEl   = p.querySelector('#fc-kbd');
    const recBtn  = p.querySelector('#fc-rec-btn');
    const recHint = p.querySelector('#fc-rec-hint');

    _browser.storage.local.get(['shortcutKey'], (d) => {
      const k = (d.shortcutKey || 'p').toUpperCase();
      kbdEl.textContent   = k;
      recHint.textContent = `"${k}" → yakala`;
    });

    let recording = false;
    recBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      recording = !recording;
      if (recording) {
        kbdEl.textContent = '·';
        kbdEl.style.borderColor  = '#007aff';
        kbdEl.style.color        = '#007aff';
        kbdEl.style.background   = '#f0f6ff';
        recBtn.textContent       = 'İptal';
        recHint.textContent      = 'Bir tuşa bas…';
        recHint.style.color      = '#007aff';
        p.setAttribute('tabindex', '-1');
        p.focus();
      } else {
        kbdEl.style.cssText = '';
        kbdEl.style.cssText = `min-width:32px;height:26px;padding:0 9px;
          background:#f5f5f7;border:0.5px solid rgba(0,0,0,0.18);
          border-bottom:2px solid rgba(0,0,0,0.22);border-radius:6px;
          font-family:-apple-system,monospace;font-size:13px;font-weight:700;
          color:#1c1c1e;display:flex;align-items:center;justify-content:center;`;
        kbdEl.textContent   = prefs.shortcutKey.toUpperCase();
        recBtn.textContent  = 'Değiştir';
        recHint.textContent = `"${prefs.shortcutKey.toUpperCase()}" → yakala`;
        recHint.style.color = '#8e8e93';
      }
    });

    document.addEventListener('keydown', function rec(e) {
      if (!recording) return;
      if (['Control','Shift','Alt','Meta','CapsLock','Tab'].includes(e.key)) return;
      if (e.key === 'Escape') { recBtn.click(); document.removeEventListener('keydown', rec); return; }
      e.preventDefault(); e.stopPropagation();
      recording = false;
      document.removeEventListener('keydown', rec);
      const k = e.key.toLowerCase();
      prefs.shortcutKey = k;
      _browser.storage.local.set({ shortcutKey: k });
      kbdEl.textContent   = k.toUpperCase();
      kbdEl.style.borderColor = '#34c759';
      recBtn.textContent  = 'Değiştir';
      recHint.textContent = `"${k.toUpperCase()}" → yakala`;
      recHint.style.color = '#34c759';
      setTimeout(() => {
        kbdEl.style.borderColor = '';
        recHint.style.color     = '#8e8e93';
      }, 1500);
    }, true);

    // ── Outside click ──
    setTimeout(() => {
      document.addEventListener('click', function outside(e) {
        if (!p.contains(e.target) && e.target.id !== 'yt-fc-settings-btn') {
          p.remove();
          document.removeEventListener('click', outside);
        }
      });
    }, 200);
  }

  // ── Player Buttons ─────────────────────────────────────────────────────────
  function injectButtons() {
    if (document.getElementById('yt-fc-btn')) return;
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) return;

    controls.insertBefore(
      makeBtn('yt-fc-settings-btn', 'Frame Catcher — Ayarlar',
        `<svg viewBox="0 0 24 24" width="20" height="20" fill="white" style="opacity:0.78">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61
                   l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54
                   c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54
                   c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87
                   c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94
                   l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96
                   c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41
                   l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32
                   c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6
                   3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>`,
        () => toggleSettingsPanel()
      ),
      controls.firstChild
    );

    controls.insertBefore(
      makeBtn('yt-fc-btn', 'Frame Catcher — Yakala',
        `<svg viewBox="0 0 36 36" width="100%" height="100%" fill="white">
          <path d="M27,11L24.5,11L23,8.5C22.7,8,22.1,7.7,21.5,7.7L14.5,7.7
                   C13.9,7.7,13.3,8,13,8.5L11.5,11L9,11C7.3,11,6,12.3,6,14L6,24
                   C6,25.7,7.3,27,9,27L27,27C28.7,27,30,25.7,30,24L30,14
                   C30,12.3,28.7,11,27,11Z M18,24C15.2,24,13,21.8,13,19
                   C13,16.2,15.2,14,18,14C20.8,14,23,16.2,23,19C23,21.8,20.8,24,18,24Z"/>
          <circle cx="18" cy="19" r="2.5"/>
        </svg>`,
        () => captureFrame()
      ),
      controls.firstChild
    );
  }

  function makeBtn(id, title, svg, onClick) {
    const b = document.createElement('button');
    b.id = id; b.title = title; b.className = 'ytp-button';
    b.innerHTML = svg;
    b.style.cssText = 'width:36px;height:36px;opacity:0.9;cursor:pointer;background:none;border:none;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:opacity .2s,transform .15s;';
    b.addEventListener('mouseenter', () => { b.style.opacity = '1';   b.style.transform = 'scale(1.1)'; });
    b.addEventListener('mouseleave', () => { b.style.opacity = '0.9'; b.style.transform = 'scale(1)'; });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      b.style.transform = 'scale(0.88)';
      setTimeout(() => { b.style.transform = 'scale(1)'; }, 140);
      onClick();
    });
    return b;
  }

  // ── Keyboard Shortcut ──────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
    if (document.getElementById('yt-fc-panel')) return;
    if (e.key.toLowerCase() === prefs.shortcutKey) {
      const v = document.querySelector('video');
      if (v && v.videoWidth) { e.preventDefault(); captureFrame(); }
    }
  }, true);

  // ── SPA Navigation ─────────────────────────────────────────────────────────
  new MutationObserver(() => injectButtons())
    .observe(document.body, { childList: true, subtree: true });

  let lastUrl = location.href;
  function onNav() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    ['yt-fc-btn', 'yt-fc-settings-btn', 'yt-fc-panel'].forEach(id =>
      document.getElementById(id)?.remove()
    );
    setTimeout(injectButtons, 1200);
  }
  const _ps = history.pushState.bind(history);
  const _rs = history.replaceState.bind(history);
  history.pushState    = (...a) => { _ps(...a); onNav(); };
  history.replaceState = (...a) => { _rs(...a); onNav(); };
  window.addEventListener('popstate', onNav);

  injectButtons();
})();
