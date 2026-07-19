/* ═══════════════════════════════════════════
   ART VAULT — GALLERY.JS
   Masonry gallery rendering + modal
═══════════════════════════════════════════ */

/* ── SHARED IMAGE HELPER ─────────────────────
   Shows a clean loading shimmer, then swaps in
   the real artwork image once it has loaded.
   No colourful placeholder art ever appears.
──────────────────────────────────────────── */
const lazyImageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const container = entry.target;
      const img = container._lazyImg;
      if (img && !img.src) {
        img.src = container._lazySrc;
      }
      lazyImageObserver.unobserve(container);
    }
  });
}, { rootMargin: '200px 0px' });

function getArtworkElement(artwork, width, height, className = '') {
  // Create a shimmer container that matches the expected size
  const shimmer = document.createElement('div');
  shimmer.className = 'artwork-shimmer' + (className ? ' ' + className : '');
  shimmer.style.width  = '100%';
  shimmer.style.height = (height || 400) + 'px';
  shimmer.style.display = 'block';

  // Load the real image in the background
  const img = new Image();
  img.alt = artwork.title;
  if (className) img.className = className;
  
  // Set default initial styles (can be overridden by caller on the shimmer)
  img.style.display    = 'block';

  img.onload = () => {
    // Dynamically transfer any inline styles applied to the shimmer over to the loaded image
    img.style.width      = shimmer.style.width || '100%';
    img.style.height     = shimmer.style.height || 'auto';
    img.style.objectFit  = shimmer.style.objectFit || '';
    
    if (shimmer.style.maxWidth)  img.style.maxWidth  = shimmer.style.maxWidth;
    if (shimmer.style.maxHeight) img.style.maxHeight = shimmer.style.maxHeight;

    if (shimmer.parentNode) shimmer.parentNode.replaceChild(img, shimmer);
  };

  img.onerror = () => {
    // Artwork file missing — show a minimal dark tile with the title
    const fallback = document.createElement('div');
    fallback.className = 'artwork-fallback' + (className ? ' ' + className : '');
    fallback.style.width   = shimmer.style.width || '100%';
    fallback.style.height  = shimmer.style.height || (height || 400) + 'px';
    fallback.style.display = 'flex';
    fallback.innerHTML = `<span class="artwork-fallback-label">${artwork.title}</span>`;
    if (shimmer.parentNode) shimmer.parentNode.replaceChild(fallback, shimmer);
  };

  // Attach properties to shimmer for lazy loading
  shimmer._lazyImg = img;
  shimmer._lazySrc = `artwork/${artwork.filename}`;
  lazyImageObserver.observe(shimmer);

  return shimmer;
}

/* ── INTERSECTION OBSERVER for card reveal ── */
let _revealObserver = null;

function getRevealObserver() {
  if (_revealObserver) return _revealObserver;
  _revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        card.classList.remove('pre-reveal');
        card.classList.add('reveal');
        _revealObserver.unobserve(card);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
  return _revealObserver;
}

/* ══════════════════════════════════════════ */

const Gallery = {
  render() {
    const container = document.getElementById('masonry-gallery');
    if (!container) return;

    container.innerHTML = '';

    const badge = document.getElementById('gallery-count');
    if (badge) badge.textContent = `${Artworks.length} works`;

    const observer = getRevealObserver();

    Artworks.forEach((artwork, i) => {
      const card = this.buildCard(artwork, i);
      container.appendChild(card);
      // Observe for scroll-triggered reveal
      observer.observe(card);
    });
  },

  buildCard(artwork, index) {
    const card = document.createElement('div');
    card.className = 'artwork-card pre-reveal';
    // Slight stagger so cards near the top animate in sequence
    card.style.animationDelay = `${Math.min(index, 8) * 0.06}s`;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View ${artwork.title}`);
    card.setAttribute('tabindex', '0');

    const avg = State.getAvgRating(artwork.id);
    const stars = this.buildMiniStars(avg);

    card.innerHTML = `
      <div class="artwork-card-img-wrap">
        <div class="artwork-card-overlay">
          <span class="overlay-expand" aria-hidden="true">⤢</span>
          <div class="overlay-title">${artwork.title}</div>
          <div class="overlay-rating">
            ${avg !== null
              ? `<div class="overlay-stars">${stars.overlay}</div>
                 <span class="overlay-avg">${avg.toFixed(1)}</span>`
              : `<span class="overlay-unrated" style="font-size:0.73rem; color:var(--text-muted); font-style:italic;">Not yet rated</span>`
            }
          </div>
        </div>
      </div>
    `;

    // Inject artwork image — no forced aspect ratio; real images show at natural size
    const imgWrap = card.querySelector('.artwork-card-img-wrap');
    const artEl = getArtworkElement(artwork, 400, artwork.heightVariant);
    artEl.style.height = 'auto';
    artEl.style.aspectRatio = `400 / ${artwork.heightVariant}`; // only applies to placeholder canvas
    imgWrap.style.minHeight = ''; // don't lock the wrapper height
    imgWrap.prepend(artEl);

    const open = () => Modal.open(artwork);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    return card;
  },

  buildMiniStars(avg) {
    // Returns a star span with exact fractional fill
    const makeSpan = (baseClass, i) => {
      if (avg === null || avg === undefined)
        return `<span class="${baseClass} empty">★</span>`;
      const full  = Math.floor(avg);
      const frac  = avg - full;
      if (i < full)
        return `<span class="${baseClass}">★</span>`;
      if (i === full && frac > 0) {
        const pct = Math.round(frac * 100);
        return `<span class="${baseClass} partial" style="--fill:${pct}%">★</span>`;
      }
      return `<span class="${baseClass} empty">★</span>`;
    };

    const overlay = Array.from({ length: 5 }, (_, i) => makeSpan('overlay-star',   i)).join('');
    const mini    = Array.from({ length: 5 }, (_, i) => makeSpan('card-mini-star', i)).join('');

    return { overlay, mini };
  },
};

/* ── MODAL ────────────────────────────────── */
const Modal = {
  current: null,

  open(artwork) {
    this.current = artwork;
    const modal = document.getElementById('artwork-modal');
    const avg   = State.getAvgRating(artwork.id);
    const ranked = State.getRankedArtworks();
    const rank  = ranked.findIndex(a => a.id === artwork.id) + 1;

    document.getElementById('modal-title').textContent = artwork.title;

    // Image
    const imgWrap = document.getElementById('modal-img-wrap');
    imgWrap.innerHTML = '';
    const artEl = getArtworkElement(artwork, 700, 700, 'modal-artwork-img');
    artEl.style.width = 'auto';
    artEl.style.height = 'auto';
    artEl.style.maxWidth = '100%';
    artEl.style.maxHeight = '100%';
    artEl.style.objectFit = 'contain';
    imgWrap.appendChild(artEl);

    // Rating section
    const ratingSection = document.getElementById('modal-rating-section');
    if (avg !== null) {
      const full  = Math.floor(avg);
      const frac  = avg - full;
      const voteCount = Object.values(State.ratings[artwork.id] || {}).length;
      const starsHtml = Array.from({ length: 5 }, (_, i) => {
        if (i < full)  return `<span class="modal-star-icon">★</span>`;
        if (i === full && frac > 0) {
          const pct = Math.round(frac * 100);
          return `<span class="modal-star-icon partial" style="--fill:${pct}%">★</span>`;
        }
        return `<span class="modal-star-icon empty">★</span>`;
      }).join('');
      ratingSection.innerHTML = `
        <div class="modal-rating-label">Community Rating</div>
        <div class="modal-avg-value">${avg.toFixed(1)}</div>
        <div class="modal-stars-display">${starsHtml}</div>
        <div class="modal-avg-text">${voteCount} vote${voteCount !== 1 ? 's' : ''}</div>
      `;
    } else {
      ratingSection.innerHTML = `
        <div class="modal-rating-label">Community Rating</div>
        <div class="modal-unrated">No ratings yet</div>
        <div class="modal-avg-text" style="margin-top:0.5rem">Be the first to rate this artwork!</div>
      `;
    }

    // Footer — always show download, plus rank badge if rated
    const footer = document.getElementById('modal-footer');
    const rankBadge = avg !== null
      ? `<div class="modal-rank-badge">🏅 Ranked #${rank} overall</div>`
      : `<button class="btn btn-ghost" onclick="navigateTo('rate'); Modal.close()">Rate This Art →</button>`;
    footer.innerHTML = `
      ${rankBadge}
      <button class="btn btn-primary modal-download-btn" id="modal-download-btn" aria-label="Download ${artwork.title}">
        <span class="modal-download-icon">⬇</span>
        <span>Download</span>
      </button>
    `;

    // Wire up download — fetch as blob so browser forces save-as dialog
    document.getElementById('modal-download-btn').addEventListener('click', async () => {
      const btn = document.getElementById('modal-download-btn');
      btn.classList.add('downloading');
      btn.querySelector('span:last-child').textContent = 'Downloading…';
      try {
        const res  = await fetch(`artwork/${artwork.filename}`);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = artwork.filename;
        a.click();
        URL.revokeObjectURL(url);
        btn.querySelector('span:last-child').textContent = 'Downloaded ✓';
        setTimeout(() => {
          if (document.getElementById('modal-download-btn')) {
            btn.classList.remove('downloading');
            btn.querySelector('span:last-child').textContent = 'Download';
          }
        }, 2500);
      } catch (e) {
        btn.querySelector('span:last-child').textContent = 'Failed — try again';
        setTimeout(() => {
          if (document.getElementById('modal-download-btn')) {
            btn.classList.remove('downloading');
            btn.querySelector('span:last-child').textContent = 'Download';
          }
        }, 2000);
      }
    });

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    const modal = document.getElementById('artwork-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    this.current = null;
  },
};
