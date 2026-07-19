/* ═══════════════════════════════════════════
   ART VAULT — APP.JS
   State management, routing, artwork data
═══════════════════════════════════════════ */

/* ── ARTWORK MANIFEST ───────────────────────
   Add your artwork filenames here.
   Titles are auto-generated from filenames.
   Format: 'my_artwork_name.webp' → 'My Artwork Name'
   
   To add real artwork: place files in /artwork/
   and add their filenames to this array.
──────────────────────────────────────────── */
const ARTWORK_FILES = [
  'A_Cozy_Christmas.webp',
  'A_Day_at_the_Pool.webp',
  'A_Moment_of_Reflection.webp',
  'A_Siggy_Memory.webp',
  'Among_the_Butterflies.webp',
  'Captain_Siggy.webp',
  'Cool_Cat_Siggy.webp',
  'Cowboy_Siggy.webp',
  'Distinguished_Siggy.webp',
  'ET_Friends_In_Space.webp',
  'Follow_Ritual\'s_Light.webp',
  'Gaming_Until_Sunrise.webp',
  'Riding_The_Waves.webp',
  'Ritual_Airways.webp',
  'Ritual_Racer.webp',
  'Ritual_Run.webp',
  'Running_with_the_Tide.webp',
  'Sig_Wu_Kong.webp',
  'Siggy\'s_Quest_in_Ritual.webp',
  'Siggy_and_Ploplo\'s_Adventure.webp',
  'Siggy_and_Ploplo_At_The_Movies.webp',
  'Siggy_Beyond_Ritual.webp',
  'Siggy_Dreaming.webp',
  'Siggy_Herald_of_Storms.webp',
  'Siggy_Master_of_Elements.webp',
  'Siggy_Master_of_Ritual.webp',
  'Siggy_in_a_Bag.webp',
  'Siggy_in_a_Box.webp',
  'Siggy_the_Scholar.webp',
  'Siggys_Kitchen_Disaster.webp',
  'Spirit_of_Vengeance.webp',
  'SUPERSIGGY.webp',
  'The_Adventure_Begins.webp',
  'The_Bond_of_Siggy_and_Kash.webp',
  'The_Bright_Horizon.webp',
  'The_Discovery_of_Ritual.webp',
  'The_Face_of_Ritual.webp',
  'The_Flying_Couch.webp',
  'The_Interstellar_Snack.webp',
  'The_Oath_of_Sir_Sigwald.webp',
  'The_Ritual_Alliance.webp',
  'The_Ritual_Commandos.webp',
  'The_Ritual_Guardian.webp',
  'The_Ritual_Heist.webp',
  'The_Ritual_Mage.webp',
  'The_Silent_Traveler.webp',
  'The_Vigil_of_Sir_Sigwald.webp',
  'The_Wilderness_Calling.webp',
  'Thirsty_For_Ritual.webp',
  'Wild_West_Siggy.webp',
];

// Artwork height variants for masonry interest
const HEIGHT_VARIANTS = [280, 340, 400, 320, 380, 300, 460, 350, 310, 420, 370, 290];

/* ── FILENAME → TITLE ─────────────────────── */
function filenameToTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, '')           // remove extension
    .replace(/[_\-]+/g, ' ')          // underscores/dashes → spaces
    .replace(/\b\w/g, c => c.toUpperCase()) // Title Case
    .replace(/'S\b/g, "'s");          // possessive 's should remain lowercase
}

/* ── ARTWORK DATA ─────────────────────────── */
const Artworks = ARTWORK_FILES.map((filename, index) => ({
  id: index,
  filename,
  title: filenameToTitle(filename),
  heightVariant: HEIGHT_VARIANTS[index % HEIGHT_VARIANTS.length],
}));

/* ── STATE ────────────────────────────────── */
const State = {
  /* ratings: { artworkId: { username: stars, ... } }
     Stored in Firebase Realtime Database → shared globally, free forever. */
  ratings: {},
  currentUser: null, // { username } — stored in localStorage for this session

  /* ── Realtime Database listener (fires on load + every update) ── */
  initDatabase() {
    db.ref('ratings').on('value', snapshot => {
      const data = snapshot.val() || {};
      State.ratings = {};
      Object.entries(data).forEach(([artworkId, artworkData]) => {
        State.ratings[artworkId] = artworkData?.votes || {};
      });
      // Re-render the currently visible page with fresh data
      if (Router.current === 'home')       Gallery.render();
      if (Router.current === 'halloffame') HallOfFame.render();
    }, err => {
      console.error('[Art Vault] Database error:', err);
    });
  },

  /* Persist one vote — only updates this user's entry, leaves others untouched */
  addRating(artworkId, stars) {
    const username = this.currentUser?.username || 'guest';
    // Optimistic local update so UI responds immediately
    if (!this.ratings[artworkId]) this.ratings[artworkId] = {};
    this.ratings[artworkId][username] = stars;
    // Write single key to Realtime Database
    db.ref(`ratings/${artworkId}/votes/${username}`).set(stars)
      .catch(err => console.error('[Art Vault] Failed to save rating:', err));
  },

  getAvgRating(artworkId) {
    const votes = this.ratings[artworkId];
    if (!votes) return null;
    const vals = Object.values(votes);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },

  getVoteCount(artworkId) {
    const votes = this.ratings[artworkId];
    if (!votes) return 0;
    return Object.values(votes).length;
  },

  getRankedArtworks() {
    return [...Artworks].sort((a, b) => {
      const ra = this.getAvgRating(a.id) ?? -1;
      const rb = this.getAvgRating(b.id) ?? -1;
      if (ra !== rb) {
        return rb - ra;
      }
      // Tie-breaker: rank by number of votes descending
      const va = this.getVoteCount(a.id);
      const vb = this.getVoteCount(b.id);
      return vb - va;
    });
  },

  /* ── Session (localStorage only — just remembers who is logged in) ── */
  loadUser() {
    try {
      const saved = localStorage.getItem('artVault_currentUser');
      if (saved) this.currentUser = JSON.parse(saved);
    } catch(e) { this.currentUser = null; }
  },

  saveSession() {
    try {
      if (this.currentUser) {
        localStorage.setItem('artVault_currentUser', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('artVault_currentUser');
      }
    } catch(e) {}
  },

  /* ── User auth (username-only, Realtime Database) ──
     If the username exists → log them in.
     If it's new → create the account and log them in.
     No passwords. Zero friction. */
  async loginOrRegister(username) {
    const norm = username.trim().toLowerCase();
    if (!norm) return { success: false, message: 'Please enter your name.' };
    if (norm.length < 2) return { success: false, message: 'Name must be at least 2 characters.' };
    try {
      const snap = await db.ref('users/' + norm).once('value');
      if (!snap.exists()) {
        // New user — create automatically
        await db.ref('users/' + norm).set({ username: username.trim() });
      }
      const stored = snap.exists() ? snap.val() : { username: username.trim() };
      this.currentUser = { username: stored.username || username.trim() };
      this.saveSession();
      return { success: true };
    } catch(e) {
      console.error('[Art Vault] Auth error:', e);
      return { success: false, message: 'Connection error. Please check your internet and try again.' };
    }
  },

  logout() {
    this.currentUser = null;
    this.saveSession();
  },
};

/* ── ROUTER ───────────────────────────────── */
const Router = {
  current: 'home',

  navigate(page) {
    // If not logged in, force page to 'login'
    if (!State.currentUser) {
      page = 'login';
      if (location.hash !== '#login') {
        location.hash = 'login';
        return; // hashchange listener will trigger navigate('login')
      }
    } else if (page === 'login') {
      // If logged in and trying to go to login, redirect to home
      page = 'home';
      location.hash = 'home';
      return;
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    // Show/hide global nav (hidden on rate page and login page)
    const globalNav = document.getElementById('nav');
    if (globalNav) {
      globalNav.style.display = (page === 'rate' || page === 'login') ? 'none' : '';
    }

    const target = document.getElementById(`${page}-page`);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Toggle scroll prevention class on body when on rate page
    document.body.classList.toggle('rate-page-active', page === 'rate');

    this.current = page;

    // Trigger page-specific init
    if (page === 'home') Gallery.render();
    if (page === 'rate') RatingSession.start();
    if (page === 'halloffame') HallOfFame.render();
  },

  init() {
    const hash = location.hash.slice(1) || 'home';
    this.navigate(hash);
    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1) || 'home';
      this.navigate(page);
    });
  }
};

function navigateTo(page) {
  location.hash = page;
}

/* ── NAV SCROLL EFFECT ────────────────────── */
function initNavScroll() {
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}


/* ── INIT ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  State.loadUser();       // restore session from localStorage
  State.initDatabase();   // open real-time Realtime Database listener for ratings
  initNavScroll();
  Router.init();

  // Gallery nav link stays highlighted at all times while on the homepage

  // Nav click events
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (link.id === 'nav-logout') {
        State.logout();
        navigateTo('login');
        closeMobileNav();
        return;
      }
      const page = link.dataset.page;
      if (Router.current !== page) {
        navigateTo(page);
      }
      closeMobileNav();
    });
  });

  document.querySelector('.nav-logo').addEventListener('click', () => {
    if (State.currentUser) {
      navigateTo('home');
    }
    closeMobileNav();
  });

  // Hero CTA
  document.getElementById('cta-rate').addEventListener('click', () => navigateTo('rate'));
  document.getElementById('cta-hof').addEventListener('click', () => navigateTo('halloffame'));

  // Modal backdrop close
  document.querySelector('.modal-backdrop').addEventListener('click', () => Modal.close());
  document.querySelector('.modal-close').addEventListener('click', () => Modal.close());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.close(); });

  // Hamburger toggle
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });
  }

  /* ── AUTH UI LOGIC ── */
  const subtitle = document.getElementById('login-subtitle');
  const errBanner = document.getElementById('auth-error-banner');
  const errText   = document.getElementById('auth-error-text');
  const card      = document.querySelector('.login-card');

  const subtitleMap = {
    'auth-landing-panel': 'A premium personal art gallery',
    'auth-login-panel':   'Enter your name to access the vault',
  };

  const showPanel = (panelId) => {
    const landingEl   = document.getElementById('auth-landing-panel');
    const formsWrapEl = document.getElementById('auth-forms-wrap');
    hideError();

    if (panelId === 'auth-landing-panel') {
      // Show the hero, hide the form card
      if (formsWrapEl) formsWrapEl.style.display = 'none';
      if (landingEl) {
        landingEl.style.display = 'flex';
        landingEl.style.animation = 'none';
        void landingEl.offsetWidth;
        landingEl.style.animation = '';
      }
    } else {
      // Show the form card, hide the hero
      if (landingEl) landingEl.style.display = 'none';
      if (formsWrapEl) {
        formsWrapEl.style.display = 'flex';
        formsWrapEl.style.animation = 'none';
        void formsWrapEl.offsetWidth;
        formsWrapEl.style.animation = '';
      }
      // Switch inner form panel
      document.querySelectorAll('.auth-panel').forEach(p => { p.style.display = 'none'; });
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.style.display = 'block';
        panel.style.animation = 'none';
        void panel.offsetWidth;
        panel.style.animation = '';
      }
    }
    if (subtitle && subtitleMap[panelId]) subtitle.textContent = subtitleMap[panelId];
  };

  const showError = (msg) => {
    errText.textContent = msg;
    errBanner.classList.add('visible');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 450);
    }
  };

  const hideError = () => { errBanner.classList.remove('visible'); };

  // Landing → username form
  document.getElementById('landing-go-login')?.addEventListener('click', () => showPanel('auth-login-panel'));

  // Back to landing
  document.getElementById('login-go-back')?.addEventListener('click', () => showPanel('auth-landing-panel'));

  // Username-only form submit — auto login or register
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const userEl = document.getElementById('login-username');
    const btn    = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Entering…'; }
    const res = await State.loginOrRegister(userEl.value);
    if (btn) { btn.disabled = false; btn.textContent = 'Enter Vault'; }
    if (res.success) {
      userEl.value = '';
      navigateTo('home');
    } else {
      showError(res.message);
    }
  });
});

/* Close mobile nav helper */
function closeMobileNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (!navLinks) return;
  navLinks.classList.remove('mobile-open');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
}

