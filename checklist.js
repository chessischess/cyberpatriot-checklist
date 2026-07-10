function cpLoadState(storageKey) {
  try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
  catch (e) { return {}; }
}
function cpSaveState(storageKey, state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

// Returns {done, total, pct} without rendering anything - used by the hub page.
function cpProgress(storageKey, DATA) {
  const state = cpLoadState(storageKey);
  let total = 0, done = 0;
  DATA.forEach((section, sIdx) => {
    section.items.forEach((_, iIdx) => {
      total++;
      if (state[`s${sIdx}-i${iIdx}`]) done++;
    });
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

// Item can be a plain string (legacy) or {t, d}. Normalize to {t, d}.
function cpItem(item) {
  if (typeof item === "string") return { t: item, d: null };
  return { t: item.t, d: item.d || null };
}

// Converts `code` spans in a string to <code>...</code>. Text is otherwise treated as plain (escaped).
function cpInline(text) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function initChecklist(DATA, QUICK_REF, storageKey) {
  function updateSectionCount(sIdx) {
    const state = cpLoadState(storageKey);
    const total = DATA[sIdx].items.length;
    let done = 0;
    for (let i = 0; i < total; i++) if (state[`s${sIdx}-i${i}`]) done++;
    document.getElementById(`count-${sIdx}`).textContent = `${done} / ${total}`;
  }

  function updateProgress() {
    const { done, total, pct } = cpProgress(storageKey, DATA);
    document.getElementById("progressFill").style.width = pct + "%";
    document.getElementById("progressText").textContent = `${done} / ${total} complete (${pct}%)`;
  }

  function render() {
    const state = cpLoadState(storageKey);
    const container = document.getElementById("sections");
    container.innerHTML = "";

    DATA.forEach((section, sIdx) => {
      const secEl = document.createElement("div");
      secEl.className = "section";

      const header = document.createElement("div");
      header.className = "section-header";
      header.innerHTML = `<span><span class="arrow" id="arrow-${sIdx}">▾</span> ${section.title}</span><span class="count" id="count-${sIdx}"></span>`;
      header.onclick = () => {
        const body = document.getElementById(`body-${sIdx}`);
        const arrow = document.getElementById(`arrow-${sIdx}`);
        body.classList.toggle("collapsed");
        arrow.classList.toggle("collapsed-arrow");
      };

      const body = document.createElement("div");
      body.className = "section-body";
      body.id = `body-${sIdx}`;

      if (section.note) {
        const noteEl = document.createElement("div");
        noteEl.className = "note";
        noteEl.textContent = section.note;
        body.appendChild(noteEl);
      }

      const ul = document.createElement("ul");
      ul.className = "items";

      section.items.forEach((rawItem, iIdx) => {
        const item = cpItem(rawItem);
        const id = `s${sIdx}-i${iIdx}`;
        const li = document.createElement("li");
        li.className = "item";
        const checked = !!state[id];
        if (checked) li.classList.add("checked");

        const row = document.createElement("div");
        row.className = "item-row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.checked = checked;
        cb.onchange = (e) => {
          e.stopPropagation();
          const s = cpLoadState(storageKey);
          s[id] = cb.checked;
          cpSaveState(storageKey, s);
          li.classList.toggle("checked", cb.checked);
          updateProgress();
          updateSectionCount(sIdx);
        };

        const text = document.createElement("span");
        text.className = "item-text";
        text.innerHTML = cpInline(item.t);

        row.appendChild(cb);
        row.appendChild(text);
        li.appendChild(row);

        if (item.d && item.d.length) {
          const detailArrow = document.createElement("span");
          detailArrow.className = "detail-arrow";
          detailArrow.textContent = "▸ steps";
          row.appendChild(detailArrow);

          const detail = document.createElement("div");
          detail.className = "item-detail collapsed";
          const ol = document.createElement("ol");
          item.d.forEach(step => {
            const stepLi = document.createElement("li");
            stepLi.innerHTML = cpInline(step);
            ol.appendChild(stepLi);
          });
          detail.appendChild(ol);
          li.appendChild(detail);

          const toggleDetail = (e) => {
            e.stopPropagation();
            detail.classList.toggle("collapsed");
            detailArrow.classList.toggle("open");
            detailArrow.textContent = detail.classList.contains("collapsed") ? "▸ steps" : "▾ steps";
          };
          text.onclick = toggleDetail;
          detailArrow.onclick = toggleDetail;
        } else {
          text.onclick = (e) => { e.stopPropagation(); cb.checked = !cb.checked; cb.onchange(e); };
        }

        ul.appendChild(li);
      });

      body.appendChild(ul);

      if (sIdx === DATA.length - 1 && QUICK_REF && QUICK_REF.length) {
        const refTitle = document.createElement("p");
        refTitle.innerHTML = "<strong>Quick Reference</strong>";
        const table = document.createElement("table");
        table.innerHTML = "<tr><th>Item</th><th>Command / Path</th></tr>" +
          QUICK_REF.map(r => `<tr><td>${r[0]}</td><td><code>${r[1]}</code></td></tr>`).join("");
        body.appendChild(refTitle);
        body.appendChild(table);
      }

      secEl.appendChild(header);
      secEl.appendChild(body);
      container.appendChild(secEl);
      updateSectionCount(sIdx);
    });

    updateProgress();
  }

  window.cpExpandAll = () => {
    document.querySelectorAll(".section-body").forEach(b => b.classList.remove("collapsed"));
    document.querySelectorAll(".arrow").forEach(a => a.classList.remove("collapsed-arrow"));
  };
  window.cpCollapseAll = () => {
    document.querySelectorAll(".section-body").forEach(b => b.classList.add("collapsed"));
    document.querySelectorAll(".arrow").forEach(a => a.classList.add("collapsed-arrow"));
  };
  window.cpResetAll = () => {
    if (confirm("Reset all checked items on this page?")) {
      localStorage.removeItem(storageKey);
      render();
    }
  };

  render();
}
