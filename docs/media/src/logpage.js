(function () {
  const W = window.World;

  W.logPage = function (parent, data, L) {
    const page = document.createElement("div");
    page.className = "page";
    page.style.left = L.x + "px";
    page.style.top = L.y + "px";
    page.style.width = L.w + "px";
    page.style.height = L.h + "px";
    parent.appendChild(page);

    const headTop = L.top;
    const headBottom = L.top + L.headH;
    const cols = L.cols;
    page.innerHTML = W.grid(L.w, L.h, { cell: L.rowH / 2, row: L.rowH, left: cols[0], top: headBottom, cols: cols.slice(1), headerTop: headTop }) + W.binding(L.h, { step: L.bindStep || 22, start: 12 });

    const put = (cls, text, x, y, size, extra) => {
      const el = document.createElement("div");
      el.className = cls;
      el.textContent = text;
      el.style.position = "absolute";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = size + "px";
      el.style.lineHeight = "1";
      el.style.whiteSpace = "nowrap";
      if (extra) Object.assign(el.style, extra);
      page.appendChild(el);
      return el;
    };

    const labelY = headTop - L.rowH * 0.95;
    const ui = { name: "Name", weekOf: "Week of", demo: "demo data", cols: ["Date", "Exercise", "Sets", "Notes"], ...data.ui };
    const nameLabel = put("printed", ui.name, cols[0], labelY + 6, L.printSize);
    const nm = put("pencil", data.name, cols[0] + Math.max(L.printSize * 3.4, nameLabel.offsetWidth + 6), labelY - 2, L.font * 1.05);
    const weekLabel = put("printed", ui.weekOf, cols[2] - 40, labelY + 6, L.printSize);
    const wk = put("pencil", data.weekOf, cols[2] - 40 + Math.max(L.printSize * 5, weekLabel.offsetWidth + 6), labelY - 2, L.font * 1.05);
    const demo = put("pencil soft", ui.demo, L.w - L.font * 5.6, labelY - 2, L.font * 0.82);

    ui.cols.forEach((t, i) => {
      put("printed", t, cols[i] + 6, headTop + (L.headH - L.printSize) / 2 + 1, L.printSize);
    });

    const rows = [];
    let ri = 0;
    const rowY = (i) => headBottom + i * L.rowH;
    const textY = (i, size) => rowY(i) + L.rowH - size * 1.08 - 2;
    data.sessions.forEach((s) => {
      s.rows.forEach((r, k) => {
        const els = [];
        if (k === 0) els.push(put("pencil", s.date, cols[0] + 6, textY(ri, L.font), L.font));
        if (k === 1) els.push(put("pencil soft", s.title, cols[0] + 6, textY(ri, L.font * 0.9), L.font * 0.9));
        els.push(put("pencil", r.ex, cols[1] + 7, textY(ri, L.font), L.font));
        const sets = put("pencil", r.sets, cols[2] + 7, textY(ri, L.font), L.font);
        els.push(sets);
        rows.push({ key: r.key, els, sets, y: rowY(ri) });
        ri++;
      });
    });
    ri += L.gapRows == null ? 1 : L.gapRows;
    (data.extra || []).forEach((r) => {
      const els = [put("pencil soft", r.label, cols[0] + 6, textY(ri, L.font * 0.9), L.font * 0.9)];
      const v = put("pencil", r.value, cols[1] + 7, textY(ri, L.font), L.font);
      els.push(v);
      rows.push({ key: r.key, els, sets: v, y: rowY(ri) });
      ri++;
    });

    return { page, rows, header: [nm, wk, demo] };
  };

  W.annotate = function (frame, root, svg, notesEl, specs, o) {
    const placed = [];
    let floor = -1e9;
    specs.forEach((s, i) => {
      const hit = W.findText(root, s.text);
      if (!hit) { placed.push({ text: s.text, found: false }); return; }
      const f = frame.getBoundingClientRect();
      const rects = Array.from(hit.getClientRects()).filter((r) => r.width > 2).map((r) => ({ x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height }));
      const seed = (o.seed || 1) + i * 23;
      if (rects.length > 1 || s.mark === "underline") rects.forEach((b, k) => W.ink(svg, W.underline(b, seed + k, s.double), o.ink));
      else W.ink(svg, W.circle(rects[0], seed, o.pad || [9, 4]), o.ink);
      const tail = rects[rects.length - 1];
      if (s.note) {
        const note = document.createElement("div");
        note.className = "marker";
        note.style.fontSize = o.noteSize + "px";
        note.innerHTML = s.note.map((l) => `<div>${l}</div>`).join("");
        notesEl.appendChild(note);
        let y = tail.y + tail.h / 2 - note.offsetHeight / 2 + (s.dy || 0);
        if (y < floor + 10) y = floor + 10;
        floor = y + note.offsetHeight;
        note.style.left = o.notesX + "px";
        note.style.top = y + "px";
        note.style.transform = `rotate(${s.rot || -4}deg)`;
        const from = [o.notesX - 6, y + note.offsetHeight / 2];
        const tip = o.tipX != null ? [o.tipX, tail.y + tail.h / 2] : [tail.x + tail.w + (rects.length > 1 || s.mark === "underline" ? 8 : 18), tail.y + tail.h / 2];
        const ar = W.arrow(from, tip, seed + 7, s.bend == null ? -0.18 : s.bend);
        W.ink(svg, ar[0], o.ink);
        W.ink(svg, ar[1], o.ink);
      }
      placed.push({ text: s.text, found: true, y: tail.y });
    });
    return placed;
  };

  W.correct = function (log, svg, notesEl, corrections, L, seed) {
    const out = [];
    corrections.forEach((c, i) => {
      const row = log.rows.find((r) => r.key === c.key);
      if (!row) return;
      const target = row.sets;
      const b = { x: target.offsetLeft, y: target.offsetTop, w: target.offsetWidth, h: target.offsetHeight };
      const paths = [];
      if (c.mark === "underline") paths.push(W.ink(svg, W.underline(b, seed + i * 17, true), L.ink));
      else paths.push(W.ink(svg, W.circle({ x: b.x, y: b.y + b.h * 0.05, w: b.w, h: b.h * 0.9 }, seed + i * 17, [16, 7]), L.ink));
      const note = document.createElement("div");
      note.className = "marker";
      note.style.fontSize = L.noteSize + "px";
      note.style.left = L.cols[3] + (c.dx || 14) + "px";
      note.style.top = row.y + (c.dy || 0) + "px";
      note.style.transform = `rotate(${c.rot || -4}deg)`;
      note.innerHTML = c.note.map((l) => `<div>${l}</div>`).join("");
      notesEl.appendChild(note);
      const nx = note.offsetLeft - 4;
      const ny = note.offsetTop + note.offsetHeight * 0.45;
      const tip = [b.x + b.w + (c.mark === "underline" ? 10 : 16), b.y + b.h * 0.5];
      const ar = W.arrow([nx, ny], tip, seed + i * 31, c.bend == null ? -0.22 : c.bend);
      paths.push(W.ink(svg, ar[0], L.ink));
      paths.push(W.ink(svg, ar[1], L.ink));
      out.push({ paths, note });
    });
    return out;
  };
})();
