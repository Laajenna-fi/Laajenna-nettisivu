/* ================================================================
   LAAJENNA — Interactive JS
   spring easing · custom cursor · scroll reveals · counters
   ================================================================ */

'use strict';

/* ── Page load fade-in ─────────────────────────────────────── */
(function initPageLoad() {
  function reveal() {
    document.documentElement.classList.add('ready');
  }
  if (document.readyState === 'complete') {
    reveal();
  } else {
    window.addEventListener('load', reveal);
    // Fallback — never block the reveal
    setTimeout(reveal, 900);
  }
})();

/* ── Detect touch/hover capability ───────────────────────────*/
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================================================================
   HERO CURSOR BLOB
================================================================ */
(function initHeroBlob() {
  const blob = document.getElementById('heroBlob');
  const hero = document.getElementById('hero');
  if (!blob || !hero || reducedMotion) return;

  // bX/bY are offsets from hero center; blob anchored at left:50% top:50% in CSS
  let bX = 0, bY = 0, tX = 0, tY = 0;

  blob.style.transform = `translate(calc(-50% + ${bX}px), calc(-50% + ${bY}px))`;

  if (canHover) {
    // Desktop: follow cursor
    document.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        tX = e.clientX - rect.width  / 2;
        tY = e.clientY - rect.height / 2 - rect.top;
      }
    });

    (function tick() {
      bX += (tX - bX) * 0.072;
      bY += (tY - bY) * 0.072;
      blob.style.transform = `translate(calc(-50% + ${bX}px), calc(-50% + ${bY}px))`;
      requestAnimationFrame(tick);
    })();

  } else {
    // Mobile: auto-drift + touch follow
    let autoT    = 0;
    let touching = false;

    hero.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      tX = t.clientX - window.innerWidth  / 2;
      tY = t.clientY - window.innerHeight / 2;
    }, { passive: true });

    hero.addEventListener('touchstart', (e) => {
      touching = true;
      const t = e.touches[0];
      tX = t.clientX - window.innerWidth  / 2;
      tY = t.clientY - window.innerHeight / 2;
    }, { passive: true });

    hero.addEventListener('touchend', () => {
      touching = false;
    }, { passive: true });

    (function tick() {
      if (!touching) {
        autoT += 0.004;
        tX = Math.sin(autoT * 1.3) * window.innerWidth  * 0.22;
        tY = -window.innerHeight * 0.08 + Math.sin(autoT * 0.9) * window.innerHeight * 0.16;
      }
      bX += (tX - bX) * 0.038;
      bY += (tY - bY) * 0.038;
      blob.style.transform = `translate(calc(-50% + ${bX}px), calc(-50% + ${bY}px))`;
      requestAnimationFrame(tick);
    })();
  }
})();

/* ================================================================
   HERO HEADLINE WORD REVEAL
================================================================ */
(function initHeroReveal() {
  const headline = document.getElementById('heroHeadline');
  if (!headline) return;

  if (reducedMotion) {
    headline.classList.add('revealed');
    return;
  }

  // Trigger after initial load animation sequence
  setTimeout(() => {
    headline.classList.add('revealed');
  }, 620);
})();

/* ================================================================
   NAVIGATION SCROLL BEHAVIOR
================================================================ */
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 48);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on init
})();

/* ================================================================
   INTERSECTION OBSERVER — SCROLL REVEALS
================================================================ */
(function initReveal() {
  const targets = document.querySelectorAll('.reveal-up');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0,
      rootMargin: '0px 0px 160px 0px',
    }
  );

  targets.forEach((el) => observer.observe(el));
})();

/* ================================================================
   ANIMATED COUNTERS
================================================================ */
(function initCounters() {
  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  if (reducedMotion) {
    statsSection.querySelectorAll('.stat-number[data-target]').forEach((el) => {
      el.textContent = el.dataset.target;
    });
    return;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter(el, target, duration) {
    const startTime = performance.now();

    function update(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value    = Math.round(easeOutCubic(progress) * target);
      el.textContent = value;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stat-number[data-target]').forEach((numEl) => {
            const target = parseInt(numEl.dataset.target, 10);
            // Longer duration for bigger numbers; shorter for small ones
            const duration = target > 20 ? 1800 : 1200;
            animateCounter(numEl, target, duration);
            delete numEl.dataset.target; // prevent replay on re-observe
          });
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.35 }
  );

  counterObserver.observe(statsSection);
})();

/* ================================================================
   MARQUEE — RAF-driven for pixel-perfect loop
================================================================ */
(function initMarquee() {
  const inner = document.querySelector('.marquee-inner');
  if (!inner || reducedMotion) return;

  let paused = false;
  let x = 0;
  const speed = 50 / 60;

  function setup() {
    const setW = inner.scrollWidth;
    if (!setW) { requestAnimationFrame(setup); return; }

    // Clone one set at a time until total width covers 3× the viewport
    const original = [...inner.children];
    const setsNeeded = Math.ceil((window.innerWidth * 3) / setW);
    for (let i = 1; i < setsNeeded; i++) {
      original.forEach(el => inner.appendChild(el.cloneNode(true)));
    }

    (function tick() {
      if (!paused) {
        x -= speed;
        if (x <= -setW) x += setW;
        inner.style.transform = `translateX(${x}px)`;
      }
      requestAnimationFrame(tick);
    })();
  }

  document.fonts.ready.then(() => requestAnimationFrame(setup));

  inner.addEventListener('mouseenter', () => { paused = true; });
  inner.addEventListener('mouseleave', () => { paused = false; });
})();

/* ================================================================
   CTA SECTION GLOW
================================================================ */
(function initCta() {
  const ctaGlow = document.querySelector('.cta-glow');
  if (!ctaGlow || !canHover || reducedMotion) return;

  document.querySelector('.cta-section')?.addEventListener('mousemove', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 60;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 40;
    ctaGlow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  });
})();

/* ================================================================
   HAMBURGER MENU
================================================================ */
(function initHamburger() {
  const btn  = document.getElementById('navHamburger');
  const nav  = document.getElementById('nav');
  if (!btn || !nav) return;

  function close() {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  const pageContent = document.querySelectorAll('section, footer, .marquee-section, .stats-section');

  function absorbGhostClick() {
    pageContent.forEach(el => { el.style.pointerEvents = 'none'; });
    setTimeout(() => {
      pageContent.forEach(el => { el.style.pointerEvents = ''; });
    }, 400);
  }

  function toggle() {
    const isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    absorbGhostClick();
    toggle();
  });

  btn.addEventListener('click', toggle);

  // Close on any nav link click
  nav.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', close);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

/* ================================================================
   SMOOTH ANCHOR NAVIGATION
================================================================ */
(function initSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  });
})();

/* ================================================================
   FAQ ACCORDION — smooth height animation on native <details>
================================================================ */
(function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    const answer = item.querySelector('.faq-answer');
    if (!answer) return;

    item.addEventListener('toggle', () => {
      if (item.open) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        answer.style.maxHeight = '0px';
      }
    });

    // Close others when opening one (single-open accordion behavior)
    item.querySelector('summary').addEventListener('click', () => {
      if (!item.open) {
        items.forEach((other) => {
          if (other !== item && other.open) {
            other.open = false;
          }
        });
      }
    });
  });
})();

/* ================================================================
   CONTACT FORM
================================================================ */
(function initCtaHeadlineClick() {
  const headline = document.querySelector('h2.cta-headline');
  const form     = document.getElementById('contactForm');
  const firstInput = document.getElementById('contactName');
  if (!headline || !form || !firstInput) return;

  headline.addEventListener('click', () => {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
    const top  = form.getBoundingClientRect().top + window.scrollY - navH - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    setTimeout(() => firstInput.focus(), 550);
  });
})();

(function initContactForm() {
  const form   = document.getElementById('contactForm');
  const btn    = document.getElementById('formSubmit');
  const status = document.getElementById('formStatus');
  if (!form) return;

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = 'form-status ' + type;
  }

  function clearErrors() {
    form.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
      el.removeAttribute('aria-invalid');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    setStatus('', '');

    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const message = form.message.value.trim();

    let valid = true;
    if (!name)    { form.name.classList.add('error');    form.name.setAttribute('aria-invalid', 'true');    valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.email.classList.add('error'); form.email.setAttribute('aria-invalid', 'true'); valid = false;
    }
    if (!message) { form.message.classList.add('error'); form.message.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!valid) { setStatus('Tarkista pakolliset kentät.', 'error'); return; }

    btn.classList.add('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (res.ok) {
        form.reset();
        setStatus('Viesti lähetetty! Palaan sinulle pian.', 'success');
      } else {
        setStatus(data.error || 'Jotain meni pieleen.', 'error');
      }
    } catch {
      setStatus('Verkkovirhe. Yritä uudelleen.', 'error');
    } finally {
      btn.classList.remove('loading');
    }
  });
})();

/* ================================================================
   HELSINKI TIME TICKER
================================================================ */
(function initFooterTime() {
  const el = document.getElementById('footerTime');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('fi-FI', {
    timeZone: 'Europe/Helsinki',
    hour: '2-digit',
    minute: '2-digit',
  });

  function render() {
    el.textContent = fmt.format(new Date()) + ' — Helsinki';
  }

  render();
  setInterval(render, 30000);
})();

/* ================================================================
   MAGNETIC CTAs — primary button + final CTA pull toward cursor
================================================================ */
(function initMagnetic() {
  if (!canHover || reducedMotion) return;

  const targets = document.querySelectorAll('.btn-primary');

  targets.forEach((el) => {
    const strength = el.classList.contains('cta-headline') ? 0.18 : 0.32;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * strength;
      const y = (e.clientY - rect.top - rect.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
})();

/* ================================================================
   SCROLL PROGRESS BAR
================================================================ */
(function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  let ticking = false;

  function update() {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct  = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    bar.style.width = pct + '%';
    bar.classList.toggle('active', window.scrollY > 80);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

/* ================================================================
   HERO WORDMARK PARALLAX
================================================================ */
(function initWordmarkParallax() {
  if (reducedMotion) return;
  const wordmark = document.querySelector('.hero-wordmark');
  if (!wordmark) return;

  let ticking = false;

  function update() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const t = Math.min(y / vh, 1);
    wordmark.style.transform = `translate(-50%, ${t * 40}px)`;
    wordmark.style.opacity = String(1 - t * 0.6);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

/* ================================================================
   PROCESS LINE — trigger draw-in when section enters view
================================================================ */
(function initProcessLine() {
  const section = document.querySelector('.process-section');
  if (!section) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        section.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  obs.observe(section);
})();

/* ================================================================
   PORTFOLIO CARD 3-D TILT
================================================================ */
(function initCardTilt() {
  if (!canHover || reducedMotion) return;

  const STRENGTH = 9;
  const EASE_IN  = 'transform 0.08s linear';
  const EASE_OUT = 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)';

  document.querySelectorAll('.portfolio-card:not(.portfolio-next)').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transition = EASE_IN;
      card.style.transform  = `perspective(900px) rotateX(${-y * STRENGTH}deg) rotateY(${x * STRENGTH}deg) scale3d(1.015, 1.015, 1.015)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = EASE_OUT;
      card.style.transform  = '';
    });
  });
})();

