/* ============================================================
   STILL / FORM — clone study
   Interaction layer: loader, nav, line/word reveals, pinned
   stages (marquee → structure, residence slides, tone, apartment),
   drag viewer, local time.
   ============================================================ */
(() => {
  "use strict";

  const html = document.documentElement;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* the ink-dissolve is progressive enhancement: no WebGL, no drama */
  const Smoke = window.Smoke;
  const canDissolve = Boolean(Smoke && Smoke.supported && !reduce);
  const dissolveIn = (host, img, duration = 900) => {
    if (!canDissolve || !host || !img) return;
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener("load", () => Smoke.dissolve(host, img, { duration }), { once: true });
      return;
    }
    Smoke.dissolve(host, img, { duration });
  };

  /* ---------------- loader ---------------- */
  const loader = $("#loader");
  const countEl = $("#loaderCount");
  const barEl = $("#loaderBar");
  let loaded = false;

  const finishLoad = () => {
    if (loaded) return;
    loaded = true;
    html.classList.remove("lock");
    if (loader) loader.classList.add("is-done");
    const title = $(".hero__title");
    if (title) {
      $$(".mask > .line", title).forEach((line, i) => line.style.setProperty("--d", `${0.05 + i * 0.1}s`));
      title.classList.add("is-in");
    }
    $$("[data-hero] .hero__actions, [data-hero] .hero__meta, [data-hero] .hero__bottom").forEach((el, i) => {
      el.style.transition = "opacity 1s var(--ease)";
      el.style.transitionDelay = `${0.45 + i * 0.1}s`;
      el.style.opacity = "0";
      requestAnimationFrame(() => { el.style.opacity = "1"; });
    });
    document.body.classList.add("is-ready");
    const heroImg = $(".hero__media img");
    if (heroImg) setTimeout(() => dissolveIn($(".hero__media"), heroImg, 1700), 320);
  };

  if (loader && countEl && !reduce) {
    html.classList.add("lock");
    let n = 0;
    const step = () => {
      n = Math.min(100, n + Math.random() * 9 + 3);
      const v = Math.round(n);
      countEl.textContent = String(v).padStart(2, "0");
      if (barEl) barEl.style.width = v + "%";
      if (v < 100) setTimeout(step, 55);
      else setTimeout(finishLoad, 180);
    };
    setTimeout(step, 120);
    // never trap the page if something above throws
    setTimeout(() => { if (!loaded) finishLoad(); }, 4200);
  } else {
    if (loader) loader.classList.add("is-done");
    finishLoad();
  }

  /* ---------------- nav ---------------- */
  const nav = $("#nav");
  const menuBtn = $("#menuBtn");
  const menuLabel = $("#menuLabel");
  const hero = $("[data-hero]");

  const onNav = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("is-solid", y > (hero ? hero.offsetHeight * 0.55 : 400));
  };

  if (menuBtn && nav) {
    const setMenu = (open) => {
      nav.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      if (menuLabel) menuLabel.textContent = open ? "CLOSE" : "MENU";
      $$(".menu-item", nav).forEach((el, i) => el.style.setProperty("--d", `${i * 0.045}s`));
    };
    menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    $$(".menu-item", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------------- statement word split ---------------- */
  const statement = $("[data-words]");
  if (statement) {
    const nodes = Array.from(statement.childNodes);
    let wi = 0;
    const frag = document.createDocumentFragment();
    nodes.forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/\s+/).filter(Boolean).forEach((word) => {
          const outer = document.createElement("span");
          outer.className = "w";
          outer.style.setProperty("--d", `${Math.min(wi * 0.028, 0.6)}s`);
          const inner = document.createElement("span");
          inner.textContent = word;
          outer.appendChild(inner);
          frag.appendChild(outer);
          frag.appendChild(document.createTextNode(" "));
          wi++;
        });
      } else {
        frag.appendChild(node);
      }
    });
    statement.replaceChildren(frag);
  }

  /* ---------------- character reveals ---------------- */
  $$("[data-chars]").forEach((el) => {
    let ci = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((token) => {
            if (!token) return;
            if (/^\s+$/.test(token)) {
              frag.appendChild(document.createTextNode(token));
              return;
            }
            // one nowrap wrapper per word, so characters never break a word
            const word = document.createElement("span");
            word.className = "cw";
            Array.from(token).forEach((ch) => {
              const outer = document.createElement("span");
              outer.className = "ch";
              outer.style.setProperty("--d", `${Math.min(ci * 0.018, 0.5)}s`);
              const inner = document.createElement("span");
              inner.textContent = ch;
              outer.appendChild(inner);
              word.appendChild(outer);
              ci++;
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  });

  /* ---------------- reveal observer ---------------- */
  const revealTargets = [$(".about"), $(".tone"), $(".foot"), $(".tour")].filter(Boolean)
    .concat($$("[data-reveal]"));
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------------- structure viewer ---------------- */
  const stage = $("[data-stage]");
  const viewer = $("#viewer");
  const frames = $$(".frame");
  const railDots = $$("[data-go]");
  const railFill = $("[data-rail-fill]");
  const nameEl = $("#frameName");
  const descEl = $("#frameDesc");
  const countEl2 = $("#frameCount");
  const progFill = $("#progFill");
  const progThumb = $("#progThumb");

  const META = [
    ["Full View", "Complete building overview"],
    ["Water Court", "Pool against the stone wall"],
    ["Reflecting Pool", "Glazing, water and sky"],
    ["Garden Facade", "Pergola and planting"],
    ["Winter Light", "Illuminated facade after dark"],
    ["Living Volume", "Daylight through full-height glazing"],
    ["Evening Room", "Low light, linen and timber"],
  ];

  let current = 0;
  let painted = false;
  let dragging = false;
  let startX = 0;
  let startT = 0;

  const paintViewer = (i) => {
    if (!frames.length) return;
    const idx = Math.round(clamp(i, 0, frames.length - 1));
    if (painted && idx === current) return;
    painted = true;
    current = idx;
    frames.forEach((f, k) => f.classList.toggle("is-active", k === idx));
    railDots.forEach((d, k) => d.classList.toggle("is-active", k === idx));
    const t = frames.length > 1 ? idx / (frames.length - 1) : 0;
    if (railFill) railFill.style.transform = `scaleY(${t})`;
    if (progFill) progFill.style.transform = `scaleX(${t})`;
    if (progThumb) progThumb.style.left = `${t * 100}%`;
    if (nameEl) nameEl.textContent = META[idx][0];
    if (descEl) descEl.textContent = META[idx][1];
    if (countEl2) countEl2.textContent = String(idx + 1).padStart(2, "0");
    [nameEl, countEl2].forEach((el) => {
      if (!el || reduce) return;
      el.classList.remove("is-swap");
      void el.offsetWidth; // restart the animation on every change
      el.classList.add("is-swap");
    });
  };

  if (viewer && frames.length) {
    const position = (clientX) => {
      const delta = (startX - clientX) / (viewer.offsetWidth * 0.72);
      paintViewer(startT + delta * (frames.length - 1));
    };

    viewer.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      startT = current;
      viewer.setPointerCapture(e.pointerId);
      if (stage) stage.classList.add("has-dragged");
    });
    viewer.addEventListener("pointermove", (e) => {
      if (dragging) position(e.clientX);
    });
    const stop = () => { dragging = false; };
    viewer.addEventListener("pointerup", stop);
    viewer.addEventListener("pointercancel", stop);
    viewer.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { paintViewer(current + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { paintViewer(current - 1); e.preventDefault(); }
    });

    railDots.forEach((dot) => {
      dot.addEventListener("click", () => paintViewer(Number(dot.dataset.go)));
    });

    paintViewer(0);
  }

  /* ---------------- about gallery ---------------- */
  const cardFrames = $$(".card__frames img");
  if (cardFrames.length) {
    let gi = 0;
    const paintCard = (i) => {
      gi = (i + cardFrames.length) % cardFrames.length;
      cardFrames.forEach((f, k) => f.classList.toggle("is-active", k === gi));
      dissolveIn($(".card__frames"), cardFrames[gi], 780);
    };
    const prev = $("[data-prev]");
    const next = $("[data-next]");
    if (prev) prev.addEventListener("click", () => paintCard(gi - 1));
    if (next) next.addEventListener("click", () => paintCard(gi + 1));
  }

  /* ---------------- scroll engine ---------------- */
  const about = $("[data-about]");
  const belt = $("[data-belt]");
  const slides = $("[data-slides]");
  const slideEls = $$("[data-slide]");
  const tone = $("[data-tone]");
  const toneHead = $(".tone__heading");
  const apt = $("[data-apt]");
  const aptImgs = $$("[data-apt-img]");
  const aptTexts = $$("[data-apt-text]");
  const aptRoll = $("#aptRoll");
  const parallaxEls = $$("[data-parallax]");
  const cloudLayers = $$("[data-cloud]");
  let viewerShown = false;
  let lastSlide = 0;
  let lastApt = -1;

  const progressOf = (el) => {
    if (!el) return 0;
    const h = el.offsetHeight - window.innerHeight;
    if (h <= 0) return 0;
    return clamp(-el.getBoundingClientRect().top / h);
  };

  let lastY = 0;
  let ticking = false;

  const paint = () => {
    ticking = false;
    const y = window.scrollY;
    if (nav) {
      if (y > lastY && y > 260 && !nav.classList.contains("is-open")) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
    }
    lastY = y;
    onNav();

    const vh = window.innerHeight;

    // hero parallax
    if (!reduce) {
      parallaxEls.forEach((el) => {
        const amount = parseFloat(el.dataset.parallax || "0.12");
        el.style.transform = `translate3d(0, ${clamp(y, 0, vh * 1.4) * amount}px, 0)`;
      });
    }

    // about: gallery phase → statement phase
    if (about) {
      const ap = progressOf(about);
      const threshold = window.innerWidth < 768 ? 0.16 : 0.38;
      about.classList.toggle("is-reading", ap > threshold);
      if (!reduce) {
        $$("[data-cloud]", about).forEach((layer) => {
          layer.style.setProperty("--c", String((ap - 0.5) * 1.5));
        });
      }
    }

    // stage: marquee → structure
    if (stage) {
      const p = progressOf(stage);
      const viewing = p > 0.46;
      stage.classList.toggle("is-viewing", viewing);
      if (belt) belt.style.transform = `translate3d(${-p * 42}%, 0, 0)`;
      if (viewing && !viewerShown) {
        viewerShown = true;
        setTimeout(() => dissolveIn(frames[current] && frames[current].parentNode, frames[current], 1300), 260);
      }
    }

    // residence slides
    if (slides && slideEls.length) {
      const p = progressOf(slides);
      const idx = p < 0.5 ? 0 : 1;
      slides.style.setProperty("--sp", String(p));
      slideEls.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      if (idx !== lastSlide) {
        lastSlide = idx;
        const media = slideEls[idx] && $(".slide__media", slideEls[idx]);
        if (media) dissolveIn(media, $("img", media), 950);
      }
    }

    // tone heading
    if (tone && toneHead) {
      const p = progressOf(tone);
      const lift = (0.5 - p) * 40;
      toneHead.style.transform = `translate3d(0, ${reduce ? 0 : lift}px, 0)`;
    }

    // apartment sequence
    if (apt) {
      const p = progressOf(apt);
      const reading = p > 0.08;
      apt.classList.toggle("is-reading", reading);
      let idx = 0;
      if (p >= 0.72) idx = 2;
      else if (p >= 0.42) idx = 1;
      else if (p < 0.1) idx = -1; // hero only
      aptImgs.forEach((im, i) => im.classList.toggle("is-active", i === Math.max(idx, 0)));
      aptTexts.forEach((tx, i) => tx.classList.toggle("is-active", i === idx));
      if (aptRoll) aptRoll.style.transform = `translate3d(0, ${-Math.max(idx, 0) * 1.4}em, 0)`;
      if (!reduce) {
        $$("[data-cloud]", apt).forEach((layer) => {
          layer.style.setProperty("--c", String((p - 0.3) * 1.1));
        });
      }
      if (idx !== lastApt) {
        const changed = idx > lastApt;
        lastApt = idx;
        if (changed && idx > 0) {
          const host = $(".apt__images");
          const img = aptImgs[idx] && $("img", aptImgs[idx]);
          dissolveIn(host, img, 1000);
        }
      }
    }

    ticking = false;
  };

  const requestPaint = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(paint);
    }
  };

  window.addEventListener("scroll", requestPaint, { passive: true });
  window.addEventListener("resize", requestPaint);
  requestPaint();
  setTimeout(requestPaint, 60);

  /* ---------------- magnetic call-to-action ---------------- */
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".btn").forEach((btn) => {
      const move = (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transform = `translate3d(${clamp(x, -1, 1) * 5}px, ${clamp(y, -1, 1) * 4}px, 0)`;
      };
      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------------- clock ---------------- */
  const clock = $("#clock");
  const year = $("#year");
  const tick = () => {
    const now = new Date();
    if (clock) {
      const opts = { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi", hour12: false };
      try { clock.textContent = new Intl.DateTimeFormat("en-GB", opts).format(now); }
      catch { clock.textContent = now.toTimeString().slice(0, 5); }
    }
    if (year) year.textContent = String(now.getFullYear());
  };
  tick();
  setInterval(tick, 20000);
})();
