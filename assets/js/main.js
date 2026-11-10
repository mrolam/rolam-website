(function () {
  const html = document.documentElement;
  html.classList.add("js");

  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const sparkleCanvas = document.getElementById("sparkle");
  const ballCanvas = document.getElementById("disco-ball");
  const spotsCanvas = document.getElementById("disco-spots");
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

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
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
    return clamp(t, 0, 1);
  }

  // The sun sinks down and toward the left horizon as you scroll through
  // sunset and dusk. The ball only lights once the sun has set.
  function updateSunAndBall() {
    const max = html.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;

    // 0 at the top of the page, 1 once the sun is below the horizon (dusk).
    const sink = clamp((p - 0.02) / 0.42, 0, 1);
    const ease = sink * sink * (3 - 2 * sink);
    const sunX = 50 - ease * 34;      // 50% → 16% (horizon, viewer's left)
    const sunY = 96 + ease * 18;      // 96% → 114% (starts under the hero, then dips out)
    const sunOp = clamp(1 - ease * 1.15, 0, 1);
    const sunSc = 1 - ease * 0.32;

    html.style.setProperty("--sun-x", sunX.toFixed(2) + "%");
    html.style.setProperty("--sun-y", sunY.toFixed(2) + "%");
    html.style.setProperty("--sun-opacity", sunOp.toFixed(3));
    html.style.setProperty("--sun-scale", sunSc.toFixed(3));
    html.style.setProperty("--sun-sink", ease.toFixed(3));

    const contact = document.getElementById("contact");
    let lit = 0;
    if (contact) {
      const top = contact.getBoundingClientRect().top;
      // Starts coming on as the contact section approaches, but only after
      // the sun is mostly set.
      const enter = clamp((window.innerHeight * 0.92 - top) / (window.innerHeight * 0.7), 0, 1);
      const sunSet = clamp((ease - 0.72) / 0.28, 0, 1);
      lit = enter * sunSet;
    }
    html.style.setProperty("--ball-lit", lit.toFixed(3));
    html.style.setProperty("--sparkle", sparkleAmount().toFixed(3));
    headerOverDark();
    return lit;
  }

  // ---- Night sparkles (existing, sparse star-like dots) ----------------
  const sparkleCtx = sparkleCanvas ? sparkleCanvas.getContext("2d", { alpha: true }) : null;
  let dots = [];

  function sizeCanvas(canvas, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h, dpr: dpr };
  }

  function seedDots() {
    if (!sparkleCanvas || !sparkleCtx) return;
    const sized = sizeCanvas(sparkleCanvas, sparkleCtx);
    const count = Math.max(18, Math.min(70, Math.floor((sized.w * sized.h) / 22000)));
    dots = [];
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * sized.w,
        y: Math.random() * sized.h,
        r: Math.random() < 0.8 ? 0.55 + Math.random() * 0.7 : 1.1 + Math.random() * 1.15,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.7,
        gold: Math.random() > 0.55
      });
    }
  }

  function drawSparkles(t) {
    if (!sparkleCtx || !sparkleCanvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    sparkleCtx.clearRect(0, 0, w, h);
    const amount = parseFloat(getComputedStyle(html).getPropertyValue("--sparkle")) || 0;
    if (amount < 0.02) return;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const twinkle = reduce ? 0.7 : 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * d.speed + d.phase));
      const a = twinkle * 0.85;
      sparkleCtx.beginPath();
      sparkleCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      sparkleCtx.fillStyle = d.gold
        ? "rgba(232, 205, 160," + a + ")"
        : "rgba(255, 248, 242," + a + ")";
      sparkleCtx.fill();
      if (d.r > 1.3) {
        sparkleCtx.beginPath();
        sparkleCtx.arc(d.x, d.y, d.r * 3.2, 0, Math.PI * 2);
        sparkleCtx.fillStyle = d.gold
          ? "rgba(190, 154, 117," + a * 0.16 + ")"
          : "rgba(255, 248, 242," + a * 0.12 + ")";
        sparkleCtx.fill();
      }
    }
  }

  // ---- Disco ball: logo-like square tiles, lit from the set sun --------
  // Light comes from the lower-left horizon (peach/coral/gold afterglow).
  const ballCtx = ballCanvas ? ballCanvas.getContext("2d", { alpha: true }) : null;
  const spotsCtx = spotsCanvas ? spotsCanvas.getContext("2d", { alpha: true }) : null;

  // Light direction: from the viewer's left, slightly below, a little in front.
  // In ball space, +x is right, +y is down, +z is toward the camera.
  const LX = -0.82;
  const LY = 0.36;
  const LZ = 0.45;
  const LLEN = Math.sqrt(LX * LX + LY * LY + LZ * LZ);
  const lx = LX / LLEN, ly = LY / LLEN, lz = LZ / LLEN;

  let tiles = [];
  let spots = [];
  let ballRadius = 0;
  let mobile = false;
  // Exposed so screenshots can freeze a moment in the rotation.
  let debugTime = null;
  window.__discoSetTime = function (t) {
    debugTime = t == null ? null : t;
  };
  window.__discoDraw = function (t) {
    if (t != null) debugTime = t;
    frame(0);
  };

  function buildTiles(coarse) {
    tiles = [];
    const latStep = (coarse ? 16 : 12) * Math.PI / 180;
    for (let lat = -Math.PI / 2 + latStep * 0.7; lat <= Math.PI / 2 - latStep * 0.55; lat += latStep) {
      const circ = Math.cos(lat);
      const n = Math.max(8, Math.round((coarse ? 16 : 22) * Math.max(circ, 0.28)));
      const lonStep = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        tiles.push({
          lat: lat,
          lon: i * lonStep,
          dLat: latStep * 0.86,
          dLon: lonStep * 0.86
        });
      }
    }
  }

  function seedSpots(w, h) {
    const count = mobile ? 13 : 24;
    spots = [];
    for (let i = 0; i < count; i++) {
      const warm = Math.random();
      spots.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.18 + Math.random() * 0.72,
        size: (mobile ? 7 : 9) + Math.random() * (mobile ? 14 : 22),
        speed: 0.12 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.4,
        // Peach / coral / gold / cream — brand afterglow, not rainbow
        rgb: warm < 0.3
          ? [252, 230, 210]
          : warm < 0.6
            ? [246, 210, 191]
            : warm < 0.85
              ? [232, 200, 150]
              : [216, 168, 136],
        long: Math.random() > 0.55
      });
    }
  }

  function sizeBallCanvas() {
    if (!ballCanvas || !ballCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    const w = ballCanvas.clientWidth || 180;
    const h = ballCanvas.clientHeight || 216;
    ballCanvas.width = Math.max(1, Math.floor(w * dpr));
    ballCanvas.height = Math.max(1, Math.floor(h * dpr));
    ballCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ballRadius = Math.min(w, h) * 0.38;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tileColor(ndotl, z, lit) {
    // Unlit: cool dusk purple. Lit: peach / coral / gold from the set sun.
    const unlit = [40, 30, 50];
    const mid = [168, 140, 150];
    const warm = [246, 210, 191];
    const gold = [236, 204, 148];
    const cream = [255, 248, 242];
    const heat = Math.pow(Math.max(0, ndotl), 0.75) * (0.2 + 0.8 * lit);
    let r, g, b;
    if (heat < 0.22) {
      const t = heat / 0.22;
      r = lerp(unlit[0], mid[0], t);
      g = lerp(unlit[1], mid[1], t);
      b = lerp(unlit[2], mid[2], t);
    } else if (heat < 0.58) {
      const t = (heat - 0.22) / 0.36;
      r = lerp(mid[0], warm[0], t);
      g = lerp(mid[1], warm[1], t);
      b = lerp(mid[2], warm[2], t);
    } else {
      const t = (heat - 0.58) / 0.42;
      r = lerp(warm[0], gold[0], t);
      g = lerp(warm[1], gold[1], t);
      b = lerp(warm[2], gold[2], t);
    }
    const face = 0.78 + 0.22 * z;
    r *= face;
    g *= face;
    b *= face;
    let glint = 0;
    if (heat > 0.62 && z > 0.22) {
      glint = Math.pow((heat - 0.62) / 0.38, 1.15);
      r = lerp(r, cream[0], glint);
      g = lerp(g, cream[1], glint);
      b = lerp(b, cream[2], glint);
    }
    return { r: r, g: g, b: b, glint: glint, a: 0.96 };
  }

  function projectTile(lat, lon, rot, cx, cy, r) {
    const lo = lon + rot;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    const x = cl * Math.sin(lo);
    const y = sl;
    const z = cl * Math.cos(lo);
    return {
      x: cx + x * r,
      y: cy + y * r,
      z: z,
      nx: x,
      ny: y,
      nz: z
    };
  }

  function drawBall(rot, lit) {
    if (!ballCtx || !ballCanvas) return;
    const w = ballCanvas.clientWidth || 180;
    const h = ballCanvas.clientHeight || 216;
    ballCtx.clearRect(0, 0, w, h);

    const r = ballRadius || Math.min(w, h) * 0.38;
    const cx = w * 0.5;
    // Leave room for the cord and cap at the top.
    const cy = h * 0.58;

    // Soft ambient bloom on the lit side — the afterglow catching the sphere.
    if (lit > 0.02) {
      const gx = cx + lx * r * 0.55;
      const gy = cy + ly * r * 0.55;
      const bloom = ballCtx.createRadialGradient(gx, gy, r * 0.05, cx, cy, r * 1.55);
      bloom.addColorStop(0, "rgba(255, 240, 214," + (0.5 * lit) + ")");
      bloom.addColorStop(0.28, "rgba(246, 210, 191," + (0.26 * lit) + ")");
      bloom.addColorStop(0.65, "rgba(216, 168, 136," + (0.1 * lit) + ")");
      bloom.addColorStop(1, "rgba(216, 168, 136, 0)");
      ballCtx.fillStyle = bloom;
      ballCtx.beginPath();
      ballCtx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
      ballCtx.fill();
    }

    // Base sphere (unlit body)
    const base = ballCtx.createRadialGradient(
      cx - r * 0.35, cy + r * 0.25, r * 0.1,
      cx, cy, r
    );
    base.addColorStop(0, "#3a3044");
    base.addColorStop(0.55, "#24182c");
    base.addColorStop(1, "#120c18");
    ballCtx.beginPath();
    ballCtx.arc(cx, cy, r, 0, Math.PI * 2);
    ballCtx.fillStyle = base;
    ballCtx.fill();

    // Clip tiles to the sphere.
    ballCtx.save();
    ballCtx.beginPath();
    ballCtx.arc(cx, cy, r - 0.4, 0, Math.PI * 2);
    ballCtx.clip();

    // Draw tiles back-to-front within the front hemisphere.
    const drawn = [];
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const p = projectTile(t.lat, t.lon, rot, cx, cy, r);
      if (p.z <= 0.04) continue;
      drawn.push({ t: t, p: p });
    }
    drawn.sort(function (a, b) { return a.p.z - b.p.z; });

    for (let i = 0; i < drawn.length; i++) {
      const t = drawn[i].t;
      const p = drawn[i].p;
      const ndotl = Math.max(0, p.nx * lx + p.ny * ly + p.nz * lz);
      const col = tileColor(ndotl, p.z, lit);

      // Four corners of a small spherical quad, projected.
      const corners = [
        projectTile(t.lat - t.dLat * 0.5, t.lon - t.dLon * 0.5, rot, cx, cy, r),
        projectTile(t.lat - t.dLat * 0.5, t.lon + t.dLon * 0.5, rot, cx, cy, r),
        projectTile(t.lat + t.dLat * 0.5, t.lon + t.dLon * 0.5, rot, cx, cy, r),
        projectTile(t.lat + t.dLat * 0.5, t.lon - t.dLon * 0.5, rot, cx, cy, r)
      ];
      // Skip if a corner flipped to the back (prevents stretched edge tiles).
      let ok = true;
      for (let k = 0; k < 4; k++) {
        if (corners[k].z < 0.02) { ok = false; break; }
      }
      if (!ok) continue;

      ballCtx.beginPath();
      ballCtx.moveTo(corners[0].x, corners[0].y);
      for (let k = 1; k < 4; k++) ballCtx.lineTo(corners[k].x, corners[k].y);
      ballCtx.closePath();
      ballCtx.fillStyle = "rgba(" + (col.r | 0) + "," + (col.g | 0) + "," + (col.b | 0) + "," + col.a + ")";
      ballCtx.fill();
      ballCtx.strokeStyle = "rgba(18, 12, 24," + (0.35 + (1 - p.z) * 0.25) + ")";
      ballCtx.lineWidth = 0.6;
      ballCtx.stroke();

      // Tight specular on the most directly lit tiles.
      if (col.glint > 0.35) {
        const gx = p.x - 0.4;
        const gy = p.y - 0.4;
        const gr = Math.max(1.2, (t.dLon * r * p.z) * 0.28);
        const gcol = ballCtx.createRadialGradient(gx, gy, 0, gx, gy, gr * 3);
        gcol.addColorStop(0, "rgba(255, 248, 242," + (0.9 * col.glint) + ")");
        gcol.addColorStop(0.4, "rgba(252, 230, 210," + (0.45 * col.glint) + ")");
        gcol.addColorStop(1, "rgba(252, 230, 210, 0)");
        ballCtx.fillStyle = gcol;
        ballCtx.beginPath();
        ballCtx.arc(gx, gy, gr * 3, 0, Math.PI * 2);
        ballCtx.fill();
      }
    }

    // Rim / glass edge
    const rim = ballCtx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
    rim.addColorStop(0, "rgba(0,0,0,0)");
    rim.addColorStop(1, "rgba(10, 8, 14, 0.35)");
    ballCtx.fillStyle = rim;
    ballCtx.beginPath();
    ballCtx.arc(cx, cy, r, 0, Math.PI * 2);
    ballCtx.fill();
    ballCtx.restore();

    // Thin gold rim
    ballCtx.beginPath();
    ballCtx.arc(cx, cy, r, 0, Math.PI * 2);
    ballCtx.strokeStyle = "rgba(190, 154, 117," + (0.28 + lit * 0.35) + ")";
    ballCtx.lineWidth = 1;
    ballCtx.stroke();

    // Cap at the top
    const capY = cy - r;
    ballCtx.fillStyle = "#c4a07a";
    ballCtx.beginPath();
    ballCtx.moveTo(cx - r * 0.11, capY + 2);
    ballCtx.lineTo(cx - r * 0.06, capY - r * 0.08);
    ballCtx.lineTo(cx + r * 0.06, capY - r * 0.08);
    ballCtx.lineTo(cx + r * 0.11, capY + 2);
    ballCtx.closePath();
    ballCtx.fill();
    ballCtx.fillStyle = "#e8d0b0";
    ballCtx.beginPath();
    ballCtx.ellipse(cx, capY - r * 0.08, r * 0.06, r * 0.025, 0, 0, Math.PI * 2);
    ballCtx.fill();
  }

  function drawSpots(t, lit, rot) {
    if (!spotsCtx || !spotsCanvas || !ballCanvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    spotsCtx.clearRect(0, 0, w, h);
    if (lit < 0.02) return;

    const rect = ballCanvas.getBoundingClientRect();
    // Center of the sphere (not the canvas, which includes the cord).
    const bx = rect.left + rect.width * 0.5;
    const by = rect.top + rect.height * 0.58;
    if (by < -80 || by > h + 80) return;

    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      // Drift with the ball's rotation, plus a slow elliptical wander.
      const ang = s.angle + rot * (0.85 + s.spin) + (reduce ? 0 : Math.sin(t * s.speed + s.phase) * 0.18);
      const dist = s.dist * Math.min(w, h) * (mobile ? 0.55 : 0.7);
      const pulse = reduce ? 0.85 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (s.speed * 1.6) + s.phase));
      const x = bx + Math.cos(ang) * dist;
      const y = by + Math.sin(ang) * dist * 0.78;
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;

      const a = pulse * lit * 0.85;
      const rx = s.long ? s.size * 1.8 : s.size;
      const ry = s.long ? s.size * 0.55 : s.size * 0.85;

      spotsCtx.save();
      spotsCtx.translate(x, y);
      spotsCtx.rotate(ang + 0.4);
      const g = spotsCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, "rgba(255, 248, 242," + a + ")");
      g.addColorStop(0.22, "rgba(" + s.rgb[0] + "," + s.rgb[1] + "," + s.rgb[2] + "," + (a * 0.7) + ")");
      g.addColorStop(1, "rgba(" + s.rgb[0] + "," + s.rgb[1] + "," + s.rgb[2] + ",0)");
      spotsCtx.fillStyle = g;
      spotsCtx.beginPath();
      spotsCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      spotsCtx.fill();
      // A faint cross-flare on the larger spots, like a mirror flash.
      if (s.size > 11 && !mobile) {
        spotsCtx.strokeStyle = "rgba(255, 248, 242," + (a * 0.35) + ")";
        spotsCtx.lineWidth = 0.7;
        spotsCtx.beginPath();
        spotsCtx.moveTo(-rx * 1.15, 0);
        spotsCtx.lineTo(rx * 1.15, 0);
        spotsCtx.moveTo(0, -ry * 1.15);
        spotsCtx.lineTo(0, ry * 1.15);
        spotsCtx.stroke();
      }
      spotsCtx.restore();
    }
  }

  function layout() {
    mobile = window.innerWidth <= 800;
    seedDots();
    if (spotsCanvas && spotsCtx) {
      sizeCanvas(spotsCanvas, spotsCtx);
      seedSpots(window.innerWidth, window.innerHeight);
    }
    sizeBallCanvas();
    buildTiles(mobile);
  }

  let raf = 0;
  const rotSpeed = 0.22; // radians per second — a slow, even turn

  function frame(ts) {
    const t = debugTime != null ? debugTime : (ts || 0) / 1000;
    const lit = parseFloat(getComputedStyle(html).getPropertyValue("--ball-lit")) || 0;
    const rot = reduce ? 0.35 : t * rotSpeed;

    drawSparkles(t);
    drawBall(rot, Math.max(lit, 0.08)); // a dim unlit sphere is always visible at the bottom once painted
    // Only throw spots once the ball is catching the afterglow.
    drawSpots(t, lit, rot);

    if (!reduce) raf = requestAnimationFrame(frame);
  }

  function onScroll() {
    updateSunAndBall();
  }

  window.addEventListener("resize", function () {
    layout();
    onScroll();
    if (reduce) frame(0);
  });
  window.addEventListener("scroll", onScroll, { passive: true });

  layout();
  onScroll();
  if (reduce) {
    frame(0);
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
