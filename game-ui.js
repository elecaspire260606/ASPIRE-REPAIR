'use strict';
// V3.23: optional presentation only. No API, credentials, drafts or submission changes.
(() => {
  function initGameUI() {
    const form = document.getElementById('page-form');
    if (!form || document.getElementById('gameReview')) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;
    const toggle = document.createElement('button');
    toggle.id = 'gameEffectsToggle'; toggle.type = 'button';
    let effects = !reduce.matches;
    function setEffects(on) {
      effects = on && !reduce.matches;
      root.classList.toggle('game-effects-off', !effects);
      toggle.textContent = effects ? '特效：開' : '特效：關';
      toggle.setAttribute('aria-pressed', String(effects));
      toggle.setAttribute('aria-label', '介面特效，' + (effects ? '已開啟' : '已關閉'));
    }
    toggle.addEventListener('click', () => setEffects(!effects));
    reduce.addEventListener('change', () => setEffects(!reduce.matches));
    form.querySelector('.page-hero').append(toggle);
    setEffects(effects);

    const selectors = ['.form-module-photos .section-label', '#reporterDetails summary', '.form-module-location .section-label', '.form-module-issue .section-label'];
    selectors.forEach((selector, i) => {
      const heading = form.querySelector(selector);
      if (!heading) return;
      const number = document.createElement('span'); number.className = 'game-section-number';
      number.textContent = String(i + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
      heading.prepend(number);
    });
    const progress = document.createElement('div'); progress.className = 'game-progress';
    progress.innerHTML = '<div class="game-progress-label"></div><div class="game-progress-track" aria-hidden="true"><i></i></div>';
    form.querySelector('.card-body').prepend(progress);
    const review = document.createElement('section'); review.id = 'gameReview'; review.className = 'game-review';
    review.setAttribute('aria-labelledby', 'gameReviewTitle');
    review.innerHTML = '<h2 id="gameReviewTitle" class="section-label"><span class="game-section-number" aria-hidden="true">05</span>確認送出</h2><dl><dt>照片</dt><dd data-review="photos"></dd><dt>申請人</dt><dd data-review="person"></dd><dt>地點</dt><dd data-review="place"></dd><dt>狀況描述</dt><dd data-review="description"></dd><dt>處理時效</dt><dd data-review="priority"></dd></dl><p class="hint">確認資料後，按下方按鈕送出報修。</p>';
    const list = review.querySelector('dl');
    for (const term of [...list.querySelectorAll('dt')]) {
      const row = document.createElement('div'); const detail = term.nextElementSibling;
      term.before(row); row.append(term, detail);
    }
    document.getElementById('submitBtn').before(review);
    const value = id => (document.getElementById(id)?.value || '').trim();
    function refresh() {
      const unit = value('f-unit'), name = value('f-name'), area = value('f-area');
      const place = value('f-location'), description = value('f-desc');
      const type = typeof locType === 'string' ? locType : '';
      const building = typeof selectedBuilding === 'string' ? selectedBuilding : '';
      const photoCount = typeof photoData !== 'undefined' && Array.isArray(photoData.report) ? photoData.report.filter(Boolean).length : 0;
      const priority = document.getElementById('todayPriorityBtn').classList.contains('active');
      const reason = form.querySelector('#priorityReasonRow .active')?.textContent.trim();
      const facilityReady = type !== 'facility' || (typeof facilityForm320_ === 'function' && !!facilityForm320_());
      const priorityReady = !priority || !!(reason && (reason !== '其他' || value('priorityReasonOther')));
      const required = [!!(unit && name), !!(area && type && place && (area !== '雅舍' || building) && facilityReady), !!(description && priorityReady)];
      const complete = required.filter(Boolean).length;
      progress.querySelector('.game-progress-label').textContent = complete === 3 ? '必填資料已填寫，請確認後送出' : '填寫進度 · ' + complete + ' / 3 項必填資料';
      progress.querySelector('i').style.width = (complete / 3 * 100) + '%';
      const values = {
        photos: photoCount ? photoCount + ' 張' : '未加入（選填）',
        person: [unit, name].filter(Boolean).join(' · ') || '尚未填寫',
        place: [area, building, place].filter(Boolean).join(' · ') || '尚未選擇',
        description: description || '尚未填寫',
        priority: priority ? '今日需優先' + (reason ? ' · ' + (reason === '其他' ? value('priorityReasonOther') || '請補充原因' : reason) : ' · 請選擇原因') : '一般處理'
      };
      for (const [key, text] of Object.entries(values)) {
        const cell = review.querySelector('[data-review="' + key + '"]');
        if (cell.textContent !== text) cell.textContent = text;
      }
    }
    let scheduled = false;
    function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; refresh(); }); }
    form.addEventListener('input', schedule);
    form.addEventListener('change', schedule);
    form.addEventListener('click', schedule);
    new MutationObserver(schedule).observe(document.getElementById('report-photo-preview'), {childList: true, subtree: true});
    const success = document.getElementById('reporterSuccess');
    if (success) new MutationObserver(schedule).observe(success, {attributes: true, attributeFilter: ['hidden']});
    refresh();
    // A single short ripple per button; nothing animates when the page is idle.
    document.addEventListener('click', event => {
      if (!effects) return;
      const button = event.target.closest('button');
      if (!button || button.disabled || button.id === 'gameEffectsToggle') return;
      button.querySelector('.game-ripple')?.remove();
      const ripple = document.createElement('span'); ripple.className = 'game-ripple'; ripple.setAttribute('aria-hidden', 'true');
      const bounds = button.getBoundingClientRect();
      ripple.style.left = (event.detail ? event.clientX - bounds.left : bounds.width / 2) + 'px';
      ripple.style.top = (event.detail ? event.clientY - bounds.top : bounds.height / 2) + 'px';
      button.append(ripple); setTimeout(() => ripple.remove(), 650);
    });
    // Existing navigation keeps its original handlers, with keyboard activation added.
    document.querySelectorAll('.nav-tab,.logout-btn').forEach(item => {
      item.setAttribute('role', 'button'); item.tabIndex = 0;
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
      });
    });
  }
  if (document.readyState === 'complete') initGameUI();
  else window.addEventListener('load', initGameUI, {once: true});
})();
