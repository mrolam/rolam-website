(function () {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const canvas = document.getElementById("sparkle");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      nav.classList.toggle("is-open", !open);
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
  }

  function headerOverDark() {
    if (!header) return;
    const artists = document.getElementById("artists");
    if (!artists) return;
    const switchAt = artists.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 8;
    header.classList.toggle("is-dark", window.scrollY >= switchAt);
  }

  function sparkleAmount() {
    const artists = document.getElementById("artists");
    if (!artists) return 0;
    const top = artists.getBoundingClientRect().top;
    const start = window.innerHeight * 0.7;
    const t = (start - top) / (window.innerHeight * 1.1);
    return Math.max(0, Math.min(1, t));
  }

  // Canvas sparkle — sparse gold and soft-white dots, only as the page turns to night
  const ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;
  let dots = [];
  let raf = 0;
  let last = 0;

  function seedDots() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(18, Math.min(70, Math.floor((w * h) / 22000)));
    dots = [];
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.8 ? 0.55 + Math.random() * 0.7 : 1.1 + Math.random() * 1.15,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.7,
        gold: Math.random() > 0.55
      });
    }
  }

  function draw(ts) {
    if (!ctx || !canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const amount = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sparkle")) || 0;
    if (amount < 0.02) {
      if (!reduce) raf = requestAnimationFrame(draw);
      return;
    }
    const t = (ts || 0) / 1000;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const twinkle = reduce ? 0.7 : 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * d.speed + d.phase));
      const a = twinkle * 0.85;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      if (d.gold) {
        ctx.fillStyle = "rgba(232, 205, 160," + a + ")";
      } else {
        ctx.fillStyle = "rgba(255, 248, 242," + a + ")";
      }
      ctx.fill();
      if (d.r > 1.3) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = d.gold
          ? "rgba(190, 154, 117," + a * 0.16 + ")"
          : "rgba(255, 248, 242," + a * 0.12 + ")";
        ctx.fill();
      }
    }
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  function onScroll() {
    const amount = sparkleAmount();
    document.documentElement.style.setProperty("--sparkle", amount.toFixed(3));
    headerOverDark();
  }

  window.addEventListener("resize", function () {
    seedDots();
    onScroll();
    if (reduce && ctx) {
      document.documentElement.style.setProperty("--sparkle", sparkleAmount().toFixed(3));
      draw(0);
    }
  });
  window.addEventListener("scroll", onScroll, { passive: true });

  seedDots();
  onScroll();
  if (reduce) {
    draw(0);
  } else {
    raf = requestAnimationFrame(draw);
  }
})();
