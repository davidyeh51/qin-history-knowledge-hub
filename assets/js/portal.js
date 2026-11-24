/**
 * 秦朝歷史知識庫 — 首頁互動引擎
 * 負責：載入 library.json 與 search-index.json、全域即時搜尋 (Ctrl+K)、分類篩選、
 * 委託-代理與制度診斷預演器、團隊共學筆記與行動打卡同步
 */

(function () {
  let libraryData = null;
  let searchIndex = [];
  let activeCategory = 'all';

  const els = {};

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightText(text, terms) {
    let safe = escapeHtml(text);
    terms.forEach(term => {
      if (!term) return;
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      safe = safe.replace(regex, '<mark>$1</mark>');
    });
    return safe;
  }

  async function loadData() {
    try {
      const [libRes, idxRes] = await Promise.all([
        fetch('data/library.json'),
        fetch('data/search-index.json')
      ]);
      libraryData = await libRes.json();
      searchIndex = await idxRes.json();
      renderPortal();
    } catch (err) {
      console.error('載入知識庫資料失敗：', err);
      if (els.featuredWrap) {
        els.featuredWrap.innerHTML = `<div class="notice-box">無法載入資料檔（若以本機檔案直接開啟，請透過 GitHub Pages 或本機 HTTP 伺服器預覽）。</div>`;
      }
    }
  }

  function renderPortal() {
    if (!libraryData) return;

    if (els.hotTags) {
      els.hotTags.innerHTML =
        `<span class="hot-label">熱門檢索：</span>` +
        libraryData.hotKeywords
          .map(kw => `<button type="button" class="hot-chip" data-kw="${escapeHtml(kw)}">${escapeHtml(kw)}</button>`)
          .join('');
    }

    if (els.categoryTabs) {
      els.categoryTabs.innerHTML = libraryData.categories
        .map(cat => {
          const count = cat.id === 'all'
            ? libraryData.books.length
            : libraryData.books.filter(b => b.category === cat.id).length;
          return `<button type="button" class="cat-tab ${cat.id === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(cat.id)}">${escapeHtml(cat.name)} (${count})</button>`;
        })
        .join('');
    }

    const readyBooks = libraryData.books.filter(b => b.status === 'ready');
    const totalSlides = readyBooks.reduce((s, b) => s + (b.slidesCount || 0), 0);
    const totalSvgs = readyBooks.reduce((s, b) => s + (b.svgCount || 0), 0);
    if (els.statBooks) els.statBooks.innerHTML = `${readyBooks.length}<em>/ ${libraryData.books.length} 席位</em>`;
    if (els.statSlides) els.statSlides.innerHTML = `${totalSlides}<em>頁</em>`;
    if (els.statSvgs) els.statSvgs.innerHTML = `${totalSvgs}+<em>張</em>`;
    if (els.statKeywords) els.statKeywords.innerHTML = `${searchIndex.length}<em>條索引</em>`;

    renderBooks();
    renderActions();
  }

  function renderBooks() {
    if (!libraryData) return;
    const filtered = activeCategory === 'all'
      ? libraryData.books
      : libraryData.books.filter(b => b.category === activeCategory);

    const readyList = filtered.filter(b => b.status === 'ready');
    const plannedList = filtered.filter(b => b.status !== 'ready');

    if (els.featuredWrap) {
      if (readyList.length === 0) {
        els.featuredWrap.innerHTML = '';
      } else {
        els.featuredWrap.innerHTML = readyList.map(book => `
          <article class="featured-book" id="book-${escapeHtml(book.slug)}">
            <a href="${escapeHtml(book.deckUrl)}" class="book-cover-frame" aria-label="開啟 ${escapeHtml(book.title)} 10 分鐘簡報">
              <img src="${escapeHtml(book.coverImage)}" alt="${escapeHtml(book.title)} 重新繪製典藏封面" class="book-cover-art">
              <div class="book-cover-scrim"></div>
              <div class="book-cover-top">
                <span class="book-cover-code">${escapeHtml(book.code)} · McKINSEY BRIEF</span>
                <h3 class="book-cover-title">${escapeHtml(book.title.replace(/[《》]/g, ''))}</h3>
                <p class="book-cover-sub">${escapeHtml(book.subtitle)}</p>
              </div>
              <div class="book-cover-bottom">
                <span>${escapeHtml(book.author.split('（')[0])}</span>
                <span>${book.slidesCount}P · 10 MIN</span>
              </div>
            </a>

            <div>
              <div class="book-meta-row">
                <span class="pill pill-navy">${escapeHtml(book.badge)}</span>
                <span class="pill pill-gold">${escapeHtml(book.readingTime)} · ${book.slidesCount} 頁</span>
                <span class="pill pill-slate">${escapeHtml(book.categoryLabel)}</span>
                <span class="pill pill-slate">${book.svgCount} 張原創 SVG 圖解</span>
              </div>

              <h3 class="book-headline">${escapeHtml(book.title)}：${escapeHtml(book.subtitle)}</h3>
              <p class="book-author">作者／講述：${escapeHtml(book.author)} ｜ 來源：${escapeHtml(book.sourceMeta)}</p>
              <div class="book-thesis">${escapeHtml(book.coreThesis)}</div>

              <div class="pillars-grid">
                ${book.keyPillars.map(p => `
                  <div class="pillar-mini">
                    <strong>${escapeHtml(p.label)}</strong>
                    <span>${escapeHtml(p.desc)}</span>
                  </div>
                `).join('')}
              </div>

              <div class="module-strip" aria-label="章節快速導覽">
                ${book.modules.map(m => {
                  const startSlide = Number((m.range.match(/\d+/) || [1])[0]);
                  return `<a class="module-chip" href="${escapeHtml(book.deckUrl)}#slide-${startSlide}" title="${escapeHtml(m.desc)}"><strong>${escapeHtml(m.range)}</strong> ${escapeHtml(m.name)}</a>`;
                }).join('')}
              </div>

              <div class="book-cta-row">
                <a class="btn-primary" href="${escapeHtml(book.deckUrl)}">
                  開啟 10 分鐘麥肯錫完整簡報 →
                </a>
                <a class="btn-gold" href="${escapeHtml(book.deckUrl)}#slide-14">
                  直達「兩千年死結與因果總圖」
                </a>
              </div>
            </div>
          </article>
        `).join('');
      }
    }

    if (els.plannedGrid) {
      els.plannedGrid.innerHTML = plannedList.map(book => `
        <article class="slot-card" id="book-${escapeHtml(book.slug)}">
          <div>
            <div class="book-meta-row">
              <span class="pill pill-planned">${escapeHtml(book.badge)}</span>
              <span class="pill pill-slate">${escapeHtml(book.code)}</span>
            </div>
            <h3>${escapeHtml(book.title)}</h3>
            <p class="slot-sub">${escapeHtml(book.subtitle)} · ${escapeHtml(book.author)}</p>
            <p class="slot-thesis">${escapeHtml(book.coreThesis)}</p>
          </div>
          <div class="slot-footer">
            <span>${escapeHtml(book.categoryLabel)}</span>
            <span>狀態：${escapeHtml(book.readingTime)}</span>
          </div>
        </article>
      `).join('') + (activeCategory === 'all' ? `
        <article class="slot-card" style="background: linear-gradient(135deg, #F8FAFC, #FEF7E8); border-color: #C88A2E;">
          <div>
            <div class="book-meta-row">
              <span class="pill pill-gold">開放擴充介面</span>
              <span class="pill pill-slate">DATA-DRIVEN</span>
            </div>
            <h3>新增下一本秦史著作／簡牘專題簡報</h3>
            <p class="slot-sub">遵循 3 步擴充標準：建立 16:9 簡報 → 註冊 library.json → 同步 search-index.json</p>
            <p class="slot-thesis">任何新加入的書籍或考證簡報，將自動獲得首頁卡片牆、分類篩選、Ctrl+K 全文檢索與 Supabase 團隊共學筆記整合。</p>
          </div>
          <div class="slot-footer">
            <span>擴充規範文件</span>
            <a href="docs/EXPANSION.md" target="_blank" style="color:#0B1F3A;font-weight:700;">檢視 EXPANSION.md →</a>
          </div>
        </article>
      ` : '');
    }
  }

  /* ---------- Global Search Engine ---------- */
  function runSearch(rawQuery) {
    const q = (rawQuery || '').trim();
    if (els.searchClear) els.searchClear.classList.toggle('visible', q.length > 0);
    if (!q) {
      if (els.searchResultsBox) els.searchResultsBox.classList.remove('active');
      return;
    }

    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = searchIndex
      .map(item => {
        const haystack = [
          item.bookTitle,
          item.author,
          item.module,
          item.actionTitle,
          item.summary,
          (item.keywords || []).join(' ')
        ].join(' ').toLowerCase();

        const allMatched = terms.every(t => haystack.includes(t));
        if (!allMatched) return null;

        let score = 0;
        terms.forEach(t => {
          if ((item.keywords || []).some(k => k.toLowerCase().includes(t))) score += 5;
          if ((item.actionTitle || '').toLowerCase().includes(t)) score += 4;
          if ((item.module || '').toLowerCase().includes(t)) score += 3;
          if ((item.summary || '').toLowerCase().includes(t)) score += 2;
        });
        return { item, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    if (els.searchResultsBox) els.searchResultsBox.classList.add('active');
    if (els.searchMeta) {
      els.searchMeta.innerHTML = `搜尋「<strong>${escapeHtml(q)}</strong>」共找到 <strong>${matches.length}</strong> 筆精準知識節點`;
    }

    if (els.searchList) {
      if (matches.length === 0) {
        els.searchList.innerHTML = `<div style="padding:18px;text-align:center;color:#64748B;">查無符合「${escapeHtml(q)}」的條目，建議改試「周秦之變」「編戶齊民」「軍功制」「儒表法裡」「集權-分權鐘擺」「井田制」。</div>`;
      } else {
        els.searchList.innerHTML = matches.map(({ item }) => `
          <a class="search-hit" href="${escapeHtml(item.url)}">
            <div class="hit-top">
              <span class="hit-badge">${escapeHtml(item.bookTitle)}</span>
              ${item.slideNo > 0 ? `<span class="hit-slide">Slide ${String(item.slideNo).padStart(2, '0')}</span>` : `<span class="hit-slide">預留書目</span>`}
              <span class="hit-module">${escapeHtml(item.module)}</span>
            </div>
            <h4 class="hit-title">${highlightText(item.actionTitle, terms)}</h4>
            <p class="hit-summary">${highlightText(item.summary, terms)}</p>
          </a>
        `).join('');
      }
    }
  }

  /* ---------- Action Checkins & Team Notes ---------- */
  async function renderActions() {
    if (!libraryData || !els.actionList || !window.QinSync) return;
    const readyBooks = libraryData.books.filter(b => b.status === 'ready' && (b.teamActions || []).length > 0);
    if (!readyBooks.length) return;

    const checkinMaps = await Promise.all(
      readyBooks.map(async b => {
        const res = await window.QinSync.getCheckins(b.slug);
        return { slug: b.slug, map: res.map || {} };
      })
    );

    const mapBySlug = Object.fromEntries(checkinMaps.map(item => [item.slug, item.map]));

    els.actionList.innerHTML = readyBooks.map(book => {
      const map = mapBySlug[book.slug] || {};
      return book.teamActions.map(act => {
        const checked = !!map[act.key];
        return `
          <label class="action-check-item ${checked ? 'done' : ''}">
            <input type="checkbox" data-book="${escapeHtml(book.slug)}" data-key="${escapeHtml(act.key)}" ${checked ? 'checked' : ''}>
            <div>
              <div style="font-weight:700;font-size:14px;color:#0B1F3A;">
                <span class="pill pill-navy" style="font-size:10.5px;padding:1px 6px;margin-right:4px;">${escapeHtml(book.code)}</span>
                ${escapeHtml(act.title)}
                <span class="pill pill-slate" style="font-size:11px;margin-left:4px;">${escapeHtml(act.owner)}</span>
              </div>
              <div style="font-size:12.5px;color:#475569;margin-top:3px;">${escapeHtml(act.desc)}</div>
            </div>
          </label>
        `;
      }).join('');
    }).join('');
  }

  async function renderNotes() {
    if (!els.notesList || !window.QinSync) return;
    const { mode, items, notice } = await window.QinSync.listNotes('all');

    if (els.syncStatusBadge) {
      if (mode === 'cloud') {
        els.syncStatusBadge.textContent = 'Supabase 雲端同步中';
        els.syncStatusBadge.className = 'pill pill-gold';
      } else {
        els.syncStatusBadge.textContent = notice ? '本機暫存（待建 Supabase 表）' : '本機暫存模式（登入可雲端同步）';
        els.syncStatusBadge.className = 'pill pill-slate';
      }
    }

    if (!items.length) {
      els.notesList.innerHTML = `<div style="padding:18px;border:1px dashed #CBD5E1;border-radius:10px;text-align:center;color:#64748B;font-size:13.5px;">尚無團隊筆記。可利用上方「委託-代理制度診斷器」一鍵儲存，或於左側新增第一筆研讀心得！</div>`;
      return;
    }

    els.notesList.innerHTML = items.map(n => {
      const dateStr = n.created_at ? new Date(n.created_at).toLocaleString('zh-TW', { hour12: false }) : '';
      return `
        <div class="note-item">
          <div class="note-item-head">
            <span><strong>${escapeHtml(n.author_name || '團隊成員')}</strong> · <span class="pill pill-slate" style="padding:1px 7px;font-size:11px;">${escapeHtml(n.category)}</span> ${n.slide_no ? `· Slide ${n.slide_no}` : ''}</span>
            <span>${escapeHtml(dateStr)} <button type="button" class="btn-delete-note" data-del-id="${escapeHtml(n.id)}" title="刪除">刪除</button></span>
          </div>
          <h4 class="note-item-title">${escapeHtml(n.title)}</h4>
          <p class="note-item-body">${escapeHtml(n.content)}</p>
        </div>
      `;
    }).join('');
  }

  function updateAuthUI({ user }) {
    if (els.authLabel) {
      els.authLabel.textContent = user ? `${user.email.split('@')[0]}（已登入）` : '團隊登入 / Supabase';
    }
    if (els.syncDot) {
      els.syncDot.classList.toggle('online', !!user);
    }
    if (els.authLoggedInBox && els.authFormBox) {
      els.authLoggedInBox.style.display = user ? 'block' : 'none';
      els.authFormBox.style.display = user ? 'none' : 'block';
      if (user && els.authUserEmail) els.authUserEmail.textContent = user.email;
    }
    renderActions();
    renderNotes();
  }

  function bindEvents() {
    els.searchInput?.addEventListener('input', e => runSearch(e.target.value));
    els.searchClear?.addEventListener('click', () => {
      els.searchInput.value = '';
      runSearch('');
      els.searchInput.focus();
    });

    els.topSearchBtn?.addEventListener('click', () => {
      els.searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => els.searchInput?.focus(), 250);
    });

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        els.searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        els.searchInput?.focus();
      }
    });

    els.hotTags?.addEventListener('click', e => {
      const btn = e.target.closest('.hot-chip');
      if (!btn) return;
      els.searchInput.value = btn.dataset.kw;
      runSearch(btn.dataset.kw);
    });

    els.categoryTabs?.addEventListener('click', e => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      activeCategory = tab.dataset.cat;
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t === tab));
      renderBooks();
    });

    els.actionList?.addEventListener('change', async e => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb || !window.QinSync) return;
      cb.closest('.action-check-item')?.classList.toggle('done', cb.checked);
      await window.QinSync.toggleCheckin(cb.dataset.book, cb.dataset.key, cb.checked);
    });

    els.savePrecheckBtn?.addEventListener('click', async () => {
      const q1 = document.getElementById('pq-1')?.value.trim();
      const q2 = document.getElementById('pq-2')?.value.trim();
      const q3 = document.getElementById('pq-3')?.value.trim();
      const q4 = document.getElementById('pq-4')?.value.trim();
      const topic = document.getElementById('pq-topic')?.value.trim() || '制度與組織診斷';
      if (!q1 && !q2 && !q3 && !q4) {
        els.precheckMsg.textContent = '請至少填寫一項診斷洞察再儲存。';
        els.precheckMsg.className = 'status-msg err';
        return;
      }
      const content = [
        `【1. 代理鏈條｜分包（周制）vs. 直管（秦制）的訊息損耗】\n${q1 || '（未填寫）'}`,
        `【2. 激勵相容｜代理人收益是否與委託人目標對齊】\n${q2 || '（未填寫）'}`,
        `【3. 選拔機制｜鄉舉里選（口碑）vs. 強謹／量化選拔的風險】\n${q3 || '（未填寫）'}`,
        `【4. 硬體與軟體｜強制監督成本 vs. 文化合法性配比】\n${q4 || '（未填寫）'}`
      ].join('\n\n');

      const res = await window.QinSync.addNote({
        title: `代理成本診斷｜${topic}`,
        category: '代理成本診斷',
        slide_no: 14,
        content
      });
      els.precheckMsg.textContent = res.mode === 'cloud'
        ? '已同步至 Supabase 團隊共學紀錄！'
        : '已儲存至本機紀錄（登入 Supabase 後可團隊跨裝置同步）。';
      els.precheckMsg.className = 'status-msg ok';
      renderNotes();
    });

    els.noteForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const title = document.getElementById('note-title').value.trim();
      const content = document.getElementById('note-content').value.trim();
      const author_name = document.getElementById('note-author').value.trim();
      const category = document.getElementById('note-category').value;
      const slide_no = document.getElementById('note-slide').value;
      if (!title || !content) return;

      const res = await window.QinSync.addNote({ title, content, author_name, category, slide_no });
      els.noteForm.reset();
      els.noteFormMsg.textContent = res.mode === 'cloud'
        ? '已發佈至 Supabase 團隊共學庫！'
        : '已儲存於本機暫存（登入團隊帳號即可同步雲端）。';
      els.noteFormMsg.className = 'status-msg ok';
      renderNotes();
    });

    els.notesList?.addEventListener('click', async e => {
      const btn = e.target.closest('.btn-delete-note');
      if (!btn) return;
      if (!confirm('確定要刪除這筆筆記嗎？')) return;
      try {
        await window.QinSync.deleteNote(btn.dataset.delId);
        renderNotes();
      } catch (err) {
        alert('刪除失敗：' + (err.message || '僅限本人刪除雲端筆記'));
      }
    });

    els.authBtn?.addEventListener('click', () => els.authModal?.classList.add('open'));
    els.authModalClose?.addEventListener('click', () => els.authModal?.classList.remove('open'));
    els.authModal?.addEventListener('click', e => {
      if (e.target === els.authModal) els.authModal.classList.remove('open');
    });

    els.loginSubmit?.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const pw = document.getElementById('auth-password').value;
      if (!email || !pw) return;
      els.authMsg.textContent = '登入驗證中...';
      els.authMsg.className = 'status-msg';
      try {
        await window.QinSync.signIn(email, pw);
        els.authMsg.textContent = '登入成功！已切換為 Supabase 雲端同步模式。';
        els.authMsg.className = 'status-msg ok';
        setTimeout(() => els.authModal?.classList.remove('open'), 700);
      } catch (err) {
        els.authMsg.textContent = '登入失敗：' + (err.message || '請檢查信箱與密碼');
        els.authMsg.className = 'status-msg err';
      }
    });

    els.signupSubmit?.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const pw = document.getElementById('auth-password').value;
      if (!email || pw.length < 6) {
        els.authMsg.textContent = '請輸入有效 Email 與至少 6 碼密碼。';
        els.authMsg.className = 'status-msg err';
        return;
      }
      try {
        await window.QinSync.signUp(email, pw);
        els.authMsg.textContent = '註冊已送出！請至信箱完成驗證後登入。';
        els.authMsg.className = 'status-msg ok';
      } catch (err) {
        els.authMsg.textContent = '註冊失敗：' + err.message;
        els.authMsg.className = 'status-msg err';
      }
    });

    els.logoutBtn?.addEventListener('click', async () => {
      await window.QinSync.signOut();
      els.authModal?.classList.remove('open');
    });

    els.copySqlBtn?.addEventListener('click', async () => {
      try {
        const res = await fetch('supabase/schema.sql');
        const sql = await res.text();
        await navigator.clipboard.writeText(sql);
        els.authMsg.textContent = '已複製完整 RLS 建表腳本 (supabase/schema.sql)！可直接貼至 Supabase SQL Editor 執行。';
        els.authMsg.className = 'status-msg ok';
      } catch {
        els.authMsg.textContent = '請直接開啟專案內 supabase/schema.sql 檔案複製。';
        els.authMsg.className = 'status-msg err';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    els.searchInput = document.getElementById('global-search-input');
    els.searchClear = document.getElementById('search-clear-btn');
    els.hotTags = document.getElementById('hot-tags');
    els.searchResultsBox = document.getElementById('search-results-box');
    els.searchMeta = document.getElementById('search-meta');
    els.searchList = document.getElementById('search-results-list');
    els.categoryTabs = document.getElementById('category-tabs');
    els.featuredWrap = document.getElementById('featured-books-wrap');
    els.plannedGrid = document.getElementById('planned-books-grid');
    els.statBooks = document.getElementById('stat-books');
    els.statSlides = document.getElementById('stat-slides');
    els.statSvgs = document.getElementById('stat-svgs');
    els.statKeywords = document.getElementById('stat-keywords');
    els.actionList = document.getElementById('action-checkins-list');
    els.notesList = document.getElementById('team-notes-list');
    els.syncStatusBadge = document.getElementById('sync-status-badge');
    els.savePrecheckBtn = document.getElementById('save-precheck-btn');
    els.precheckMsg = document.getElementById('precheck-msg');
    els.noteForm = document.getElementById('team-note-form');
    els.noteFormMsg = document.getElementById('note-form-msg');
    els.topSearchBtn = document.getElementById('top-search-btn');
    els.authBtn = document.getElementById('auth-open-btn');
    els.authLabel = document.getElementById('auth-btn-label');
    els.syncDot = document.getElementById('sync-dot');
    els.authModal = document.getElementById('auth-modal');
    els.authModalClose = document.getElementById('auth-modal-close');
    els.authFormBox = document.getElementById('auth-form-box');
    els.authLoggedInBox = document.getElementById('auth-logged-in-box');
    els.authUserEmail = document.getElementById('auth-user-email');
    els.authMsg = document.getElementById('auth-msg');
    els.loginSubmit = document.getElementById('auth-login-submit');
    els.signupSubmit = document.getElementById('auth-signup-submit');
    els.logoutBtn = document.getElementById('auth-logout-btn');
    els.copySqlBtn = document.getElementById('copy-sql-btn');

    bindEvents();
    loadData();
    if (window.QinSync) {
      window.QinSync.init(updateAuthUI);
    }
  });
})();
