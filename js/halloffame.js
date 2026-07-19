/* ═══════════════════════════════════════════
   ART VAULT — HALLOFFAME.JS
   Podium + ranked list rendering
═══════════════════════════════════════════ */

const HallOfFame = {
  render() {
    const ranked    = State.getRankedArtworks();
    const podiumEl  = document.getElementById('hof-podium');
    const listEl    = document.getElementById('hof-rank-list');
    const hasRated  = ranked.some(a => State.getAvgRating(a.id) !== null);

    if (!hasRated) {
      this.renderEmpty(podiumEl, listEl);
      return;
    }

    this.renderPodium(podiumEl, ranked);
    this.renderList(listEl, ranked);
  },

  renderEmpty(podiumEl, listEl) {
    podiumEl.innerHTML = `
      <div class="hof-empty" style="width:100%; padding:4rem 2rem;">
        <div class="hof-empty-icon">🎨</div>
        <div class="hof-empty-title">No Ratings Yet</div>
        <div class="hof-empty-text">Rate some artwork first — then the Hall of Fame will come alive.</div>
        <button class="btn btn-primary" style="margin-top:1rem" onclick="navigateTo('rate')">
          ★ Start Rating
        </button>
      </div>
    `;
    if (listEl) listEl.innerHTML = '';
  },

  renderPodium(container, ranked) {
    container.innerHTML = '';

    const top3   = ranked.filter(a => State.getAvgRating(a.id) !== null).slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    const labels = ['1st Place', '2nd Place', '3rd Place'];

    // Pad to 3 slots if fewer rated artworks exist
    while (top3.length < 3) top3.push(null);

    // Render order: [2nd, 1st, 3rd] → CSS order props handle visual layout
    [1, 0, 2].forEach(rank0 => {
      const pos     = rank0 + 1;   // 1, 2, or 3
      const artwork = top3[rank0];
      const slot    = document.createElement('div');
      slot.className = `podium-slot podium-slot-${pos}`;
      slot.style.animationDelay = `${rank0 * 0.12}s`;
      slot.classList.add('podium-entrance');

      if (!artwork) {
        slot.innerHTML = `
          <div class="podium-empty-slot">
            <div class="podium-empty-medal">${medals[rank0]}</div>
            <div class="podium-empty-label">${labels[rank0]}</div>
          </div>
        `;
        container.appendChild(slot);
        return;
      }

      const avg  = State.getAvgRating(artwork.id);
      const full = Math.floor(avg ?? 0);
      const frac = (avg ?? 0) - full;
      const starsHtml = Array.from({ length: 5 }, (_, i) => {
        if (avg === null || avg === undefined)
          return `<span class="podium-star empty">★</span>`;
        if (i < full)
          return `<span class="podium-star">★</span>`;
        if (i === full && frac > 0) {
          const pct = Math.round(frac * 100);
          return `<span class="podium-star partial" style="--fill:${pct}%">★</span>`;
        }
        return `<span class="podium-star empty">★</span>`;
      }).join('');

      slot.innerHTML = `
        <div class="podium-card" role="button" tabindex="0" aria-label="${labels[rank0]}: ${artwork.title}">
          <div class="podium-rank-bar"></div>
          <div class="podium-medal">${medals[rank0]}</div>
          <div class="podium-img-wrap"></div>
          <div class="podium-info">
            <div class="podium-place">${labels[rank0]}</div>
            <div class="podium-art-title">${artwork.title}</div>
            <div class="podium-rating">
              <div class="podium-stars">${starsHtml}</div>
              ${avg !== null ? `<span class="podium-avg">${avg.toFixed(1)}</span>` : ''}
            </div>
          </div>
        </div>
      `;

      // Inject artwork image
      const imgWrap = slot.querySelector('.podium-img-wrap');
      const artEl   = getArtworkElement(artwork, 400, pos === 1 ? 280 : 200);
      artEl.style.width      = '100%';
      artEl.style.height     = '100%';
      artEl.style.objectFit  = 'cover';
      imgWrap.appendChild(artEl);

      const card = slot.querySelector('.podium-card');
      card.addEventListener('click',   () => Modal.open(artwork));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') Modal.open(artwork); });

      container.appendChild(slot);
    });
  },

  renderList(container, ranked) {
    container.innerHTML = '';

    // Use IntersectionObserver for staggered row reveals
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('hof-row-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -30px 0px', threshold: 0.05 });

    ranked.forEach((artwork, i) => {
      const rank     = i + 1;
      const avg      = State.getAvgRating(artwork.id);
      const isTop3   = rank <= 3 && avg !== null;
      const rankDisplay = isTop3
        ? ['🥇', '🥈', '🥉'][rank - 1]
        : `#${rank}`;

      const full  = Math.floor(avg ?? 0);
      const frac  = (avg ?? 0) - full;
      const starsHtml = Array.from({ length: 5 }, (_, j) => {
        if (avg === null || avg === undefined)
          return `<span class="hof-rank-star empty">★</span>`;
        if (j < full)
          return `<span class="hof-rank-star">★</span>`;
        if (j === full && frac > 0) {
          const pct = Math.round(frac * 100);
          return `<span class="hof-rank-star partial" style="--fill:${pct}%">★</span>`;
        }
        return `<span class="hof-rank-star empty">★</span>`;
      }).join('');

      const row = document.createElement('div');
      row.className = 'hof-rank-row';
      row.style.animationDelay = `${Math.min(i, 12) * 0.04}s`;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `${artwork.title}, ranked ${rank}`);

      row.innerHTML = `
        <div class="hof-rank-num${isTop3 ? ' top3' : ''}">${rankDisplay}</div>
        <div class="hof-rank-thumb"></div>
        <div class="hof-rank-info">
          <div class="hof-rank-title">${artwork.title}</div>
          <div class="hof-rank-meta">
            ${avg !== null
              ? `<div class="hof-rank-stars">${starsHtml}</div>
                 <span class="hof-rank-avg">${avg.toFixed(1)} avg</span>`
              : `<span class="hof-unrated">Not yet rated</span>`
            }
          </div>
        </div>
        <div class="hof-rank-badge">
          ${avg !== null ? avg.toFixed(1) : '—'}
          <small>${avg !== null ? 'avg' : 'unrated'}</small>
        </div>
      `;

      // Inject thumbnail
      const thumb  = row.querySelector('.hof-rank-thumb');
      const artEl  = getArtworkElement(artwork, 80, 60);
      artEl.style.width     = '100%';
      artEl.style.height    = '100%';
      artEl.style.objectFit = 'cover';
      thumb.appendChild(artEl);

      row.addEventListener('click',   () => Modal.open(artwork));
      row.addEventListener('keydown', e => { if (e.key === 'Enter') Modal.open(artwork); });

      container.appendChild(row);
      observer.observe(row);
    });

    // Back to top button
    const topBtn = document.createElement('div');
    topBtn.className = 'hof-top-btn';
    topBtn.innerHTML = `<button class="btn btn-ghost" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑ Back to Top</button>`;
    topBtn.style.textAlign = 'center';
    topBtn.style.paddingTop = '2rem';
    container.appendChild(topBtn);
  },
};
