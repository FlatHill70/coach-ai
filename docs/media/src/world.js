(function () {
  const W = {};

  W.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  W.theme = function () {
    const q = new URLSearchParams(location.search);
    const t = q.get("theme") || (window.__MEDIA__ && window.__MEDIA__.theme) || "light";
    document.documentElement.dataset.theme = t;
    return t;
  };

  W.surfaceTexture = function (theme, w, h, seed) {
    const scale = 2;
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    const g = c.getContext("2d");
    g.scale(scale, scale);
    const r = W.rng(seed);
    if (theme === "dark") {
      g.fillStyle = "#121314";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = r() * w, y = r() * h, s = 30 + r() * 90;
        g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(40,42,44,0.14)";
        g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2); g.fill();
      }
      const fleck = ["#24272a", "#2e3236", "#383d42", "#28313b", "#334252", "#454c53"];
      const n = Math.round((w * h) / 18);
      for (let i = 0; i < n; i++) {
        const x = r() * w, y = r() * h;
        const s = 0.7 + Math.pow(r(), 1.6) * 1.8;
        g.fillStyle = fleck[Math.floor(r() * fleck.length)];
        g.globalAlpha = 0.55 + r() * 0.45;
        g.beginPath();
        const k = 4 + Math.floor(r() * 3), rot = r() * Math.PI;
        for (let j = 0; j < k; j++) {
          const a = rot + (j / k) * Math.PI * 2, rr = s * (0.6 + r() * 0.6);
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          j ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = "#c6c9c9";
      g.fillRect(0, 0, w, h);
      g.filter = "blur(26px)";
      for (let i = 0; i < 70; i++) {
        const x = r() * w, y = r() * h, s = 40 + r() * 140;
        g.fillStyle = r() < 0.5 ? "rgba(170,175,176,0.32)" : "rgba(214,217,216,0.38)";
        g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2); g.fill();
      }
      g.filter = "none";
      const n = Math.round((w * h) / 40);
      for (let i = 0; i < n; i++) {
        const x = r() * w, y = r() * h;
        const p = r();
        if (p < 0.55) { g.fillStyle = `rgba(150,155,157,${0.2 + r() * 0.35})`; g.fillRect(x, y, 0.6 + r(), 0.6 + r()); }
        else if (p < 0.85) { g.fillStyle = `rgba(226,228,227,${0.3 + r() * 0.4})`; g.fillRect(x, y, 0.6 + r() * 1.2, 0.6 + r() * 1.2); }
        else if (p < 0.97) {
          { const v = 150 + r() * 45; g.fillStyle = `rgba(${v},${v + 2},${v + 2},${0.35 + r() * 0.3})`; }
          g.beginPath(); g.ellipse(x, y, 1 + r() * 2.5, 0.8 + r() * 2, r() * Math.PI, 0, Math.PI * 2); g.fill();
        } else {
          g.fillStyle = "rgba(110,115,117,0.55)";
          g.beginPath(); g.arc(x, y, 0.6 + r() * 1.3, 0, Math.PI * 2); g.fill();
        }
      }
    }
    return c.toDataURL("image/png");
  };

  W.paint = function (el, theme, seed) {
    const b = el.getBoundingClientRect();
    el.style.backgroundImage = `url(${W.surfaceTexture(theme, b.width, b.height, seed)})`;
  };

  W.grid = function (w, h, o) {
    const cell = o.cell || 14;
    const left = o.left || 0;
    const top = o.top || 0;
    const parts = [];
    for (let x = left; x <= w; x += cell) parts.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${h}" stroke="var(--rule-faint)" stroke-width="0.8"/>`);
    for (let y = top; y <= h; y += cell) parts.push(`<line x1="${left}" y1="${y}" x2="${w}" y2="${y}" stroke="var(--rule-faint)" stroke-width="0.8"/>`);
    for (let y = top + (o.row || cell * 2); y <= h; y += o.row || cell * 2) parts.push(`<line x1="${left}" y1="${y}" x2="${w}" y2="${y}" stroke="var(--rule)" stroke-width="1"/>`);
    (o.cols || []).forEach((x) => parts.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${h}" stroke="var(--rule-strong)" stroke-opacity="0.55" stroke-width="1.2"/>`));
    if (o.headerTop != null) {
      parts.push(`<line x1="${left}" y1="${o.headerTop}" x2="${w}" y2="${o.headerTop}" stroke="var(--rule-strong)" stroke-width="1.6"/>`);
      parts.push(`<line x1="${left}" y1="${top}" x2="${w}" y2="${top}" stroke="var(--rule-strong)" stroke-width="1.6"/>`);
    }
    return `<svg class="grid" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join("")}</svg>`;
  };

  W.binding = function (h, o) {
    o = o || {};
    const step = o.step || 22;
    const start = o.start || 14;
    const parts = [];
    for (let y = start; y < h - 8; y += step) {
      parts.push(`<circle cx="30" cy="${y}" r="4" fill="var(--surface)"/>`);
      parts.push(`<circle cx="30" cy="${y}" r="4" fill="rgba(0,0,0,0.22)"/>`);
      const d = `M30 ${y + 1} C 24 ${y - 7}, 9 ${y - 9}, 3 ${y - 2}`;
      parts.push(`<path d="${d}" stroke="rgba(0,0,0,0.22)" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(1 2)"/>`);
      parts.push(`<path d="${d}" stroke="var(--coil-dark)" stroke-width="3.8" fill="none" stroke-linecap="round"/>`);
      parts.push(`<path d="${d}" stroke="var(--coil)" stroke-width="1.8" fill="none" stroke-linecap="round" transform="translate(0 -0.6)"/>`);
    }
    return `<svg class="binding" width="60" height="${h}" viewBox="0 0 60 ${h}">${parts.join("")}</svg>`;
  };

  W.tape = function (parent, x, y, angle, w, seed) {
    const r = W.rng(seed);
    const el = document.createElement("div");
    el.className = "tape";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = (w || 92) + "px";
    el.style.transform = `rotate(${angle}deg)`;
    const pts = [];
    const teeth = 7;
    for (let i = 0; i <= teeth; i++) pts.push(`${(i % 2 ? 4 : 0) + r() * 2}% ${(i / teeth) * 100}%`);
    for (let i = teeth; i >= 0; i--) pts.push(`${100 - (i % 2 ? 4 : 0) - r() * 2}% ${(i / teeth) * 100}%`);
    el.style.clipPath = `polygon(${pts.join(",")})`;
    parent.appendChild(el);
    return el;
  };

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function inline(s) {
    s = esc(s);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?=[^*\w]|$)/g, "$1<em>$2</em>");
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
    return s;
  }

  W.markdownBlocks = function (md) {
    const lines = md.replace(/\r/g, "").split("\n");
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (/^```/.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        blocks.push(`<pre>${esc(buf.join("\n"))}</pre>`);
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { blocks.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
          items.push({ depth: Math.floor(m[1].length / 2), mk: m[2], text: m[3] });
          i++;
        }
        blocks.push(renderList(items));
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{1,3}\s/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++]);
      blocks.push(`<p>${inline(buf.join(" "))}</p>`);
    }
    return blocks;
  };

  function renderList(items) {
    let html = "";
    const stack = [];
    for (const it of items) {
      const tag = /\d/.test(it.mk) ? "ol" : "ul";
      while (stack.length > it.depth + 1) { html += `</li></${stack.pop()}>`; }
      if (stack.length === it.depth + 1) html += "</li>";
      while (stack.length < it.depth + 1) { html += `<${tag}>`; stack.push(tag); }
      const mk = /\d/.test(it.mk) ? it.mk + " " : "- ";
      html += `<li><span class="mk">${mk}</span>${inline(it.text)}`;
    }
    while (stack.length) html += `</li></${stack.pop()}>`;
    return html;
  }

  W.findText = function (root, needle) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const idx = n.nodeValue.indexOf(needle);
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(n, idx);
        range.setEnd(n, idx + needle.length);
        const span = document.createElement("span");
        span.className = "hit";
        range.surroundContents(span);
        return span;
      }
    }
    return null;
  };

  W.boxIn = function (el, frame) {
    const a = el.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const rects = Array.from(el.getClientRects());
    return { x: a.left - f.left, y: a.top - f.top, w: a.width, h: a.height, lines: rects.length };
  };

  function smooth(pts, closed) {
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  W.circle = function (b, seed, pad) {
    const r = W.rng(seed);
    pad = pad || [9, 7];
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const rx = b.w / 2 + pad[0], ry = b.h / 2 + pad[1];
    const tilt = (-3 + r() * 4) * Math.PI / 180;
    const a0 = Math.PI * (0.9 + r() * 0.2);
    const sweep = Math.PI * 2 * (1.1 + r() * 0.06);
    const pts = [];
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a0 + sweep * t;
      const k = 1 + 0.05 * Math.sin(t * 5 + r()) + (t > 0.85 ? (t - 0.85) * 0.5 : 0);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    return smooth(pts);
  };

  W.underline = function (b, seed, double) {
    const r = W.rng(seed);
    const y = b.y + b.h + 1;
    const x1 = b.x - 4, x2 = b.x + b.w + 6;
    let d = `M${x1} ${y + r() * 2} Q ${(x1 + x2) / 2} ${y + 3 + r() * 2} ${x2} ${y - 1 + r() * 2}`;
    if (double) d += ` M${x1 + 10} ${y + 5 + r() * 2} Q ${(x1 + x2) / 2} ${y + 8 + r() * 2} ${x2 - 14} ${y + 5 + r() * 2}`;
    return d;
  };

  W.arrow = function (from, to, seed, bend) {
    const r = W.rng(seed);
    bend = bend == null ? 0.25 : bend;
    const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const cx = mx - dy * bend, cy = my + dx * bend;
    const ang = Math.atan2(to[1] - cy, to[0] - cx);
    const L = 11 + r() * 2;
    const h1 = [to[0] - L * Math.cos(ang - 0.45), to[1] - L * Math.sin(ang - 0.45)];
    const h2 = [to[0] - L * Math.cos(ang + 0.5), to[1] - L * Math.sin(ang + 0.5)];
    return [
      `M${from[0].toFixed(1)} ${from[1].toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to[0].toFixed(1)} ${to[1].toFixed(1)}`,
      `M${h1[0].toFixed(1)} ${h1[1].toFixed(1)} L ${to[0].toFixed(1)} ${to[1].toFixed(1)} L ${h2[0].toFixed(1)} ${h2[1].toFixed(1)}`,
    ];
  };

  W.ink = function (svg, d, width) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("stroke-width", width || 3.2);
    svg.appendChild(p);
    return p;
  };

  W.drawOn = function (path, delay, dur) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len} ${len + 2}`;
    path.style.strokeDashoffset = len;
    return path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, delay, fill: "both", easing: "cubic-bezier(.45,.05,.35,1)" });
  };

  W.writeOn = function (el, delay, dur) {
    return el.animate([{ clipPath: "inset(-20% 100% -20% 0)" }, { clipPath: "inset(-20% -2% -20% 0)" }], { duration: dur, delay, fill: "both", easing: "linear" });
  };

  W.ready = async function () {
    await document.fonts.ready;
    const fams = ['400 16px "Kalam"', '300 16px "Kalam"', '600 16px "Shantell Sans"', '900 16px "Big Shoulders Display"', '600 16px "Big Shoulders Text"', '400 16px "JetBrains Mono"', '700 16px "JetBrains Mono"', '400 16px "Hanken Grotesk"'];
    await Promise.all(fams.map((f) => document.fonts.load(f, "Aa0×→")));
  };

  window.World = W;
})();
