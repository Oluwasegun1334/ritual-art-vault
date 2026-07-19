/* ═══════════════════════════════════════════
   ART VAULT — RATING.JS
   Rating session: shuffle, star UI,
   slide transitions, end screen
═══════════════════════════════════════════ */

const RatingSession = {
  queue:            [],
  currentIndex:     0,
  ratedThisSession: 0,
  skippedIds:       new Set(),
  slideDir:         0,   // incremented after each transition
  isTransitioning:  false,

  /* Fisher-Yates shuffle */
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  start() {
    // Filter to only artworks NOT yet rated by this specific user
    const username = State.currentUser?.username;
    const unrated = Artworks.filter(art => {
      const votes = State.ratings[art.id];
      return !votes || !votes[username];
    });

    // If everything has been rated already, show the end screen immediately
    if (unrated.length === 0) {
      this.alreadyRated = Artworks.length;
      this.ratedThisSession = 0;
      this.skippedIds = new Set();
      this.queue = [];
      this.currentIndex = 0;
      
      const stage = document.getElementById('rate-stage');
      if (stage) stage.innerHTML = '';
      
      this.updateProgress();
      this.showEndScreen();
      return;
    }

    // Calculate how many artworks this user has already rated before starting this session
    this.alreadyRated = Artworks.length - unrated.length;

    this.queue            = this.shuffle(unrated);
    this.currentIndex     = 0;
    this.ratedThisSession = 0;
    this.skippedIds       = new Set();
    this.slideDir         = 0;
    this.isTransitioning  = false;

    // Clear any leftover elements from previous sessions to prevent duplicate cards
    const stage = document.getElementById('rate-stage');
    if (stage) stage.innerHTML = '';

    this.updateProgress();
    this.showArtwork();
  },

  get currentArtwork() {
    return this.queue[this.currentIndex];
  },

  updateProgress() {
    const total = Artworks.length;
    const isFinished = this.currentIndex >= this.queue.length;
    const current = isFinished
      ? (this.alreadyRated + this.ratedThisSession)
      : (this.alreadyRated + this.currentIndex + 1);

    const progressCount = isFinished
      ? (this.alreadyRated + this.ratedThisSession)
      : (this.alreadyRated + this.currentIndex);
    const pct = total > 0 ? (progressCount / total * 100) : 0;

    const curEl  = document.getElementById('rate-progress-current');
    const totEl  = document.getElementById('rate-progress-total');
    const barEl  = document.getElementById('rate-progress-bar');
    const lblEl  = document.getElementById('rate-progress-label');

    if (curEl)  curEl.textContent  = current;
    if (totEl)  totEl.textContent  = total;
    if (barEl)  barEl.style.width  = `${pct}%`;
    if (lblEl)  lblEl.textContent  = 'Artworks Rated';
  },

  showArtwork() {
    const stage = document.getElementById('rate-stage');
    if (!stage) return;

    if (this.currentIndex >= this.queue.length) {
      this.showEndScreen();
      return;
    }

    const artwork = this.currentArtwork;

    const item = document.createElement('div');
    item.className = 'rate-artwork-item';
    item.id = 'rate-current-item';

    /* ── Image frame ── */
    const frame = document.createElement('div');
    frame.className = 'rate-img-frame';

    const artEl = getArtworkElement(artwork, 600, 500, 'rate-artwork-img');
    artEl.style.width     = 'auto';
    artEl.style.height    = 'auto';
    artEl.style.maxWidth  = '100%';
    artEl.style.maxHeight = '100%';
    artEl.style.objectFit = 'contain';
    frame.appendChild(artEl);

    /* ── Artwork info ── */
    const info = document.createElement('div');
    info.className = 'rate-artwork-info';
    info.innerHTML = `
      <div class="rate-artwork-title">${artwork.title}</div>
    `;

    /* ── Stars ── */
    const starsContainer = document.createElement('div');
    starsContainer.className = 'rate-stars-container';

    const starsRow = document.createElement('div');
    starsRow.className = 'rate-stars';

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('div');
      star.className   = 'rate-star';
      star.textContent = '★';
      star.dataset.value = i;
      star.setAttribute('aria-label', `${i} star${i !== 1 ? 's' : ''}`);
      star.setAttribute('role', 'button');
      star.setAttribute('tabindex', '0');

      star.addEventListener('mouseenter', () => this.hoverStar(i));
      star.addEventListener('mouseleave', () => this.unhoverStar());
      star.addEventListener('click',      () => this.selectStar(i));
      star.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.selectStar(i); }
      });
      star.addEventListener('touchstart', e => {
        e.preventDefault();
        this.selectStar(i);
      }, { passive: false });

      starsRow.appendChild(star);
    }

    const hint = document.createElement('div');
    hint.className   = 'rate-hint';
    hint.id          = 'rate-hint';
    hint.textContent = 'Tap a star to rate';

    starsContainer.appendChild(starsRow);
    starsContainer.appendChild(hint);

    item.appendChild(frame);
    item.appendChild(info);
    item.appendChild(starsContainer);

    /* ── Entrance animation ── */
    const inClass = this.slideDir % 2 === 0 ? 'slide-in-left' : 'slide-in-right';
    item.classList.add(inClass);

    const oldItem = document.getElementById('rate-current-item');
    if (oldItem) {
      oldItem.id = ''; // remove ID so we don't have duplicate IDs
      // If it's not currently animating slide-out, remove it immediately to avoid overlaying cards
      if (!oldItem.classList.contains('slide-out-left') && !oldItem.classList.contains('slide-out-right')) {
        oldItem.remove();
      }
    } else {
      stage.innerHTML = ''; // Only clear stage if there is no animating old item
    }
    stage.appendChild(item);

    // Silently preload the next image so it's in cache before the user taps a star
    this.preloadNext();
  },

  preloadNext() {
    const next = this.queue[this.currentIndex + 1];
    if (!next) return;
    const img = new Image();
    img.src = `artwork/${next.filename}`;
  },


  hoverStar(n) {
    if (this.isTransitioning) return;
    const labels = ['Terrible', 'Meh', 'Decent', 'Great', 'Masterpiece!'];
    document.querySelectorAll('.rate-star').forEach((s, i) => {
      s.classList.toggle('hovered', i < n);
    });
    const hint = document.getElementById('rate-hint');
    if (hint) hint.textContent = labels[n - 1];
  },

  unhoverStar() {
    if (this.isTransitioning) return;
    document.querySelectorAll('.rate-star').forEach(s => s.classList.remove('hovered'));
    const hint = document.getElementById('rate-hint');
    if (hint) hint.textContent = 'Tap a star to rate';
  },

  selectStar(n) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const labels = ['Terrible', 'Meh', 'Decent', 'Great', 'Masterpiece!'];
    const hint   = document.getElementById('rate-hint');
    if (hint) hint.textContent = labels[n - 1];

    /* Animate stars with sequential pop */
    document.querySelectorAll('.rate-star').forEach((star, i) => {
      star.classList.remove('hovered');
      setTimeout(() => {
        if (i < n) star.classList.add('lit', 'pulse');
        else       star.classList.remove('lit');
      }, i * 80);
    });

    /* Submit after the selected stars complete their pop animation */
    const delay = (n - 1) * 80 + 500;
    setTimeout(() => this.submitRating(n), delay);
  },

  skipArtwork() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.skippedIds.add(this.currentArtwork.id);
    this.transitionOut();
  },

  submitRating(stars) {
    State.addRating(this.currentArtwork.id, stars);
    this.ratedThisSession++;
    this.transitionOut();
  },

  transitionOut() {
    /* Alternating exit direction - matches same side as entry */
    const outClass = this.slideDir % 2 === 0 ? 'slide-out-left' : 'slide-out-right';
    this.slideDir++;

    const currentItem = document.getElementById('rate-current-item');
    if (currentItem) {
      // Remove entrance classes so the exit animation doesn't get overridden by CSS specificity
      currentItem.classList.remove('slide-in-left', 'slide-in-right');
      currentItem.classList.add(outClass);
      
      // Only remove the element when its OWN slide-out animation finishes.
      // Checking e.target avoids premature removal triggered by bubbled animationend events from child stars.
      currentItem.addEventListener('animationend', (e) => {
        if (e.target === currentItem) {
          currentItem.remove();
        }
      });
    }

    this.currentIndex++;
    this.updateProgress();

    setTimeout(() => {
      this.isTransitioning = false;
      this.showArtwork();
    }, 240);
  },

  showEndScreen() {
    const stage = document.getElementById('rate-stage');
    const count = this.alreadyRated + this.ratedThisSession;
    const skipped = this.skippedIds.size;

    this.launchConfetti();

    stage.innerHTML = `
      <div class="rate-end-screen">
        <div class="rate-end-emoji">🎨</div>
        <div class="rate-end-title">Thanks for Rating!</div>
        <div class="rate-end-subtitle">Your votes have been saved.</div>
        <div class="rate-end-count">
          You rated <strong>${count} artwork${count !== 1 ? 's' : ''}</strong>
          ${skipped > 0 ? ` and skipped <strong>${skipped}</strong>` : ''}.
        </div>
        <div class="rate-end-actions">
          <button class="btn btn-primary" onclick="navigateTo('halloffame')">
            🏆 View Hall of Fame
          </button>
        </div>
      </div>
    `;

    // Update progress counter to show final count
    const curEl = document.getElementById('rate-progress-current');
    if (curEl) curEl.textContent = this.alreadyRated + this.ratedThisSession;
  },

  launchConfetti() {
    const wrap = document.createElement('div');
    wrap.className = 'confetti-wrap';
    document.body.appendChild(wrap);

    const colors = ['#FFD700', '#0057FF', '#E63946', '#4D8FFF', '#FF9F1C', '#A78BFA', '#34D399'];

    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        width: ${4 + Math.random() * 7}px;
        height: ${4 + Math.random() * 7}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${2 + Math.random() * 3}s;
        animation-delay: ${Math.random() * 1.2}s;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      wrap.appendChild(p);
    }

    setTimeout(() => wrap.remove(), 6000);
  },
};
