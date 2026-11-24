/**
 * McKinsey 16:9 Presentation Deck Engine
 * Features: Viewport auto-scaling, keyboard/swipe nav, #slide-N hash routing,
 * 3-part Speaker Notes drawer (N), Thumbnail Overview + in-deck filter (G),
 * 10-minute presentation timer (T), Fullscreen (F), Print/PDF export.
 */

(function () {
  let slides = [];
  let currentIdx = 0;
  let timerSeconds = 600;
  let timerRunning = false;
  let timerInterval = null;

  const els = {};

  function formatTime(sec) {
    const abs = Math.abs(sec);
    const m = String(Math.floor(abs / 60)).padStart(2, '0');
    const s = String(abs % 60).padStart(2, '0');
    return (sec < 0 ? '-' : '') + `${m}:${s}`;
  }

  function scaleStage() {
    if (!els.scaler || !els.wrapper) return;
    const rect = els.wrapper.getBoundingClientRect();
    const availW = Math.max(320, rect.width - 112);
    const availH = Math.max(200, rect.height - 28);
    const scale = Math.min(availW / 1280, availH / 720, 1.35);
    els.scaler.style.transform = `scale(${scale})`;
  }

  function renderNotes(slide) {
    if (!slide) return;
    els.noteConclusion.textContent = slide.dataset.noteConclusion || '（本頁無補充結論）';
    els.noteEvidence.textContent = slide.dataset.noteEvidence || '（詳見投影片圖表與來源原文）';
    els.noteTransition.textContent = slide.dataset.noteTransition || '（結束）';
    els.notesSlideLabel.textContent = `Slide ${String(currentIdx + 1).padStart(2, '0')} / ${slides.length} — ${slide.dataset.kicker || ''}`;
  }

  function goToSlide(index, updateHash = true) {
    if (!slides.length) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    currentIdx = clamped;

    slides.forEach((s, i) => s.classList.toggle('active', i === currentIdx));

    if (els.counter) {
      els.counter.textContent = `${String(currentIdx + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    }
    if (els.progress) {
      els.progress.style.width = `${((currentIdx + 1) / slides.length) * 100}%`;
    }
    if (els.prevBtn) els.prevBtn.disabled = currentIdx === 0;
    if (els.nextBtn) els.nextBtn.disabled = currentIdx === slides.length - 1;

    renderNotes(slides[currentIdx]);

    document.querySelectorAll('.thumb-card').forEach((card, i) => {
      card.classList.toggle('current', i === currentIdx);
    });

    if (updateHash) {
      history.replaceState(null, '', `#slide-${currentIdx + 1}`);
    }
  }

  function parseHash() {
    const match = window.location.hash.match(/slide-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= slides.length) return n - 1;
    }
    return 0;
  }

  function toggleNotes() {
    document.body.classList.toggle('notes-open');
    els.notesBtn?.classList.toggle('active', document.body.classList.contains('notes-open'));
    setTimeout(scaleStage, 260);
  }

  function buildOverview(filterText = '') {
    if (!els.thumbsGrid) return;
    const q = filterText.trim().toLowerCase();
    els.thumbsGrid.innerHTML = slides
      .map((s, i) => {
        const kicker = s.dataset.kicker || `Slide ${i + 1}`;
        const title = s.dataset.title || s.querySelector('.action-title, .cover-title')?.textContent?.trim() || '';
        const text = (kicker + ' ' + title + ' ' + (s.textContent || '')).toLowerCase();
        if (q && !text.includes(q)) return '';
        return `
          <button type="button" class="thumb-card ${i === currentIdx ? 'current' : ''}" data-idx="${i}">
            <div class="thumb-top">
              <span>SLIDE ${String(i + 1).padStart(2, '0')}</span>
              <span>${kicker}</span>
            </div>
            <div class="thumb-title">${title}</div>
          </button>
        `;
      })
      .join('');
  }

  function toggleOverview(force) {
    if (!els.gridOverlay) return;
    const open = typeof force === 'boolean' ? force : !els.gridOverlay.classList.contains('open');
    els.gridOverlay.classList.toggle('open', open);
    els.gridBtn?.classList.toggle('active', open);
    if (open) {
      buildOverview(els.gridFilter?.value || '');
      setTimeout(() => els.gridFilter?.focus(), 60);
    }
  }

  function toggleTimer() {
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      els.timerPill.title = '點擊繼續 10 分鐘演講計時（雙擊重置）';
    } else {
      timerRunning = true;
      timerInterval = setInterval(() => {
        timerSeconds -= 1;
        els.timerPill.textContent = `⏱ ${formatTime(timerSeconds)}`;
      }, 1000);
      els.timerPill.title = '計時中（點擊暫停，雙擊重置）';
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    slides = Array.from(document.querySelectorAll('.slide'));
    els.wrapper = document.getElementById('stage-wrapper');
    els.scaler = document.getElementById('stage-scaler');
    els.counter = document.getElementById('slide-counter');
    els.progress = document.getElementById('progress-fill');
    els.prevBtn = document.getElementById('btn-prev');
    els.nextBtn = document.getElementById('btn-next');
    els.notesBtn = document.getElementById('btn-notes');
    els.gridBtn = document.getElementById('btn-grid');
    els.fsBtn = document.getElementById('btn-fs');
    els.printBtn = document.getElementById('btn-print');
    els.timerPill = document.getElementById('timer-pill');
    els.noteConclusion = document.getElementById('note-conclusion');
    els.noteEvidence = document.getElementById('note-evidence');
    els.noteTransition = document.getElementById('note-transition');
    els.notesSlideLabel = document.getElementById('notes-slide-label');
    els.notesClose = document.getElementById('notes-close');
    els.gridOverlay = document.getElementById('grid-overlay');
    els.thumbsGrid = document.getElementById('thumbs-grid');
    els.gridFilter = document.getElementById('grid-filter-input');
    els.gridClose = document.getElementById('grid-close');

    els.prevBtn?.addEventListener('click', () => goToSlide(currentIdx - 1));
    els.nextBtn?.addEventListener('click', () => goToSlide(currentIdx + 1));
    els.notesBtn?.addEventListener('click', toggleNotes);
    els.notesClose?.addEventListener('click', toggleNotes);
    els.gridBtn?.addEventListener('click', () => toggleOverview());
    els.gridClose?.addEventListener('click', () => toggleOverview(false));
    els.fsBtn?.addEventListener('click', toggleFullscreen);
    els.printBtn?.addEventListener('click', () => window.print());

    els.timerPill?.addEventListener('click', toggleTimer);
    els.timerPill?.addEventListener('dblclick', () => {
      clearInterval(timerInterval);
      timerRunning = false;
      timerSeconds = 600;
      els.timerPill.textContent = '⏱ 10:00';
    });

    els.gridFilter?.addEventListener('input', e => buildOverview(e.target.value));
    els.thumbsGrid?.addEventListener('click', e => {
      const card = e.target.closest('.thumb-card');
      if (!card) return;
      goToSlide(Number(card.dataset.idx));
      toggleOverview(false);
    });

    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) {
        if (e.key === 'Escape') toggleOverview(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        goToSlide(currentIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToSlide(currentIdx - 1);
      } else if (e.key === 'Home') {
        goToSlide(0);
      } else if (e.key === 'End') {
        goToSlide(slides.length - 1);
      } else if (e.key.toLowerCase() === 'n') {
        toggleNotes();
      } else if (e.key.toLowerCase() === 'g') {
        toggleOverview();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 't') {
        toggleTimer();
      } else if (e.key === 'Escape') {
        toggleOverview(false);
      }
    });

    let touchStartX = 0;
    els.wrapper?.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    els.wrapper?.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 48) {
        if (dx < 0) goToSlide(currentIdx + 1);
        else goToSlide(currentIdx - 1);
      }
    }, { passive: true });

    window.addEventListener('resize', scaleStage);
    window.addEventListener('hashchange', () => goToSlide(parseHash(), false));

    goToSlide(parseHash(), false);
    scaleStage();
  });
})();
