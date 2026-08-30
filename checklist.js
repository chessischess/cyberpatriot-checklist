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
  const safe = (text === undefined || text === null) ? '' : String(text);
  const escaped = safe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

// Deep-clones a DATA array of {title, note?, items:[{t,d?}|string]} so edits
// never mutate the page's built-in fallback data in place.
function cpCloneData(DATA) {
  return DATA.map(section => ({
    title: section.title,
    note: section.note || null,
    items: section.items.map(rawItem => {
      const item = cpItem(rawItem);
      return { t: item.t, d: item.d ? item.d.slice() : null };
    }),
  }));
}

function initChecklist(DATA, QUICK_REF, storageKey, pageSlug) {
  let data = cpCloneData(DATA);
  let editMode = false;
  let saveStatusEl = null;

  function updateSectionCount(sIdx) {
    const state = cpLoadState(storageKey);
    const total = data[sIdx].items.length;
    let done = 0;
    for (let i = 0; i < total; i++) if (state[`s${sIdx}-i${i}`]) done++;
    const el = document.getElementById(`count-${sIdx}`);
    if (el) el.textContent = `${done} / ${total}`;
  }

  function updateProgress() {
    const { done, total, pct } = cpProgress(storageKey, data);
    document.getElementById("progressFill").style.width = pct + "%";
    document.getElementById("progressText").textContent = `${done} / ${total} complete (${pct}%)`;
  }

  function setStatus(msg, isError) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = msg;
    saveStatusEl.style.color = isError ? "#dc2626" : "var(--muted)";
  }

  async function loadServerData() {
    if (!pageSlug) return;
    try {
      const res = await fetch(`/api/checklist-get?page=${encodeURIComponent(pageSlug)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length) {
        data = cpCloneData(json.data);
        render();
      }
    } catch (e) {
      // no server data / offline — silently keep the built-in checklist
    }
  }

  function fmtTimestamp(iso) {
    if (!iso) return "Unknown time";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  async function openHistory() {
    if (!pageSlug) return;
    let historyPanel = document.getElementById("cpHistoryPanel");
    if (historyPanel) {
      historyPanel.remove();
      return;
    }

    historyPanel = document.createElement("div");
    historyPanel.id = "cpHistoryPanel";
    historyPanel.className = "cp-history-panel";
    historyPanel.innerHTML = "<p>Loading version history…</p>";
    const toolbar = document.querySelector(".toolbar");
    toolbar.parentNode.insertBefore(historyPanel, toolbar.nextSibling);

    try {
      const res = await fetch(`/api/checklist-history?page=${encodeURIComponent(pageSlug)}`);
      const json = await res.json().catch(() => ({}));
      const history = (json && Array.isArray(json.history)) ? json.history : [];

      historyPanel.innerHTML = "";
      const title = document.createElement("h3");
      title.textContent = "Version History";
      title.style.margin = "0 0 8px 0";
      historyPanel.appendChild(title);

      if (!history.length) {
        const empty = document.createElement("p");
        empty.textContent = "No previous versions saved yet. A version is recorded every time someone saves changes.";
        empty.style.color = "var(--muted)";
        historyPanel.appendChild(empty);
      } else {
        const list = document.createElement("ul");
        list.className = "cp-history-list";
        history.forEach((entry, idx) => {
          const li = document.createElement("li");
          li.className = "cp-history-item";

          const label = document.createElement("span");
          label.textContent = `${fmtTimestamp(entry.updatedAt)}`;
          li.appendChild(label);

          const restoreBtn = document.createElement("button");
          restoreBtn.textContent = "Restore this version";
          restoreBtn.onclick = async () => {
            if (!confirm(`Restore the version from ${fmtTimestamp(entry.updatedAt)}? This will overwrite the current checklist for everyone (the current version will itself be saved to history first).`)) return;
            data = cpCloneData(entry.data);
            render();
            historyPanel.remove();
            await saveToServer();
          };
          li.appendChild(restoreBtn);

          list.appendChild(li);
        });
        historyPanel.appendChild(list);
      }

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.style.marginTop = "10px";
      closeBtn.onclick = () => historyPanel.remove();
      historyPanel.appendChild(closeBtn);
    } catch (e) {
      historyPanel.innerHTML = "<p>Failed to load version history.</p>";
    }
  }

  async function saveToServer() {
    if (!pageSlug) return;
    setStatus("Saving…");
    try {
      const res = await fetch("/api/checklist-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageSlug, data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(json.error || "Failed to save changes.", true);
        return;
      }
      setStatus("Saved — visible to everyone.");
    } catch (e) {
      setStatus("Failed to save changes (network error).", true);
    }
  }

  function addSection() {
    data.push({ title: "New Section", note: null, items: [{ t: "New item", d: null }] });
    render();
  }

  function deleteSection(sIdx) {
    if (!confirm("Delete this entire section?")) return;
    data.splice(sIdx, 1);
    render();
  }

  function addItem(sIdx) {
    data[sIdx].items.push({ t: "New item", d: null });
    render();
  }

  function deleteItem(sIdx, iIdx) {
    data[sIdx].items.splice(iIdx, 1);
    render();
  }

  function render() {
    const state = cpLoadState(storageKey);
    const container = document.getElementById("sections");
    container.innerHTML = "";

    data.forEach((section, sIdx) => {
      const secEl = document.createElement("div");
      secEl.className = "section";

      const header = document.createElement("div");
      header.className = "section-header";

      if (editMode) {
        const left = document.createElement("span");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "6px";
        left.style.flex = "1";

        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.id = `arrow-${sIdx}`;
        arrow.textContent = "▾";
        left.appendChild(arrow);

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.value = section.title;
        titleInput.style.flex = "1";
        titleInput.style.font = "inherit";
        titleInput.style.fontWeight = "600";
        titleInput.onclick = (e) => e.stopPropagation();
        titleInput.oninput = () => { section.title = titleInput.value; };
        left.appendChild(titleInput);

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete section";
        delBtn.onclick = (e) => { e.stopPropagation(); deleteSection(sIdx); };
        header.appendChild(left);
        header.appendChild(delBtn);
      } else {
        header.innerHTML = `<span><span class="arrow" id="arrow-${sIdx}">▾</span> ${cpInline(section.title)}</span><span class="count" id="count-${sIdx}"></span>`;
      }

      header.onclick = () => {
        const body = document.getElementById(`body-${sIdx}`);
        const arrow = document.getElementById(`arrow-${sIdx}`);
        body.classList.toggle("collapsed");
        arrow.classList.toggle("collapsed-arrow");
      };

      const body = document.createElement("div");
      body.className = "section-body";
      body.id = `body-${sIdx}`;

      if (editMode) {
        const noteLabel = document.createElement("div");
        noteLabel.className = "note";
        noteLabel.style.background = "transparent";
        noteLabel.style.border = "none";
        noteLabel.style.padding = "4px 0";
        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.placeholder = "Optional section note...";
        noteInput.value = section.note || "";
        noteInput.style.width = "100%";
        noteInput.oninput = () => { section.note = noteInput.value || null; };
        noteLabel.appendChild(noteInput);
        body.appendChild(noteLabel);
      } else if (section.note) {
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

        if (editMode) {
          const textArea = document.createElement("textarea");
          textArea.value = item.t;
          textArea.rows = 2;
          textArea.style.flex = "1";
          textArea.style.font = "inherit";
          textArea.oninput = () => { section.items[iIdx].t = item.t = textArea.value; };
          row.appendChild(textArea);

          const delItemBtn = document.createElement("button");
          delItemBtn.textContent = "✕";
          delItemBtn.title = "Delete item";
          delItemBtn.onclick = (e) => { e.stopPropagation(); deleteItem(sIdx, iIdx); };
          row.appendChild(delItemBtn);
          li.appendChild(row);

          const stepsWrap = document.createElement("div");
          stepsWrap.className = "item-detail";
          stepsWrap.style.marginLeft = "0";
          const stepsLabel = document.createElement("div");
          stepsLabel.style.fontSize = "0.78rem";
          stepsLabel.style.color = "var(--muted)";
          stepsLabel.style.marginBottom = "4px";
          stepsLabel.textContent = "Steps (one per line, optional):";
          const stepsArea = document.createElement("textarea");
          stepsArea.rows = Math.max(2, (item.d || []).length + 1);
          stepsArea.style.width = "100%";
          stepsArea.style.font = "inherit";
          stepsArea.value = (item.d || []).join("\n");
          stepsArea.oninput = () => {
            const lines = stepsArea.value.split("\n").map(s => s.trim()).filter(Boolean);
            section.items[iIdx].d = lines.length ? lines : null;
          };
          stepsWrap.appendChild(stepsLabel);
          stepsWrap.appendChild(stepsArea);
          li.appendChild(stepsWrap);
        } else {
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
        }

        ul.appendChild(li);
      });

      body.appendChild(ul);

      if (editMode) {
        const addItemBtn = document.createElement("button");
        addItemBtn.textContent = "+ Add item";
        addItemBtn.style.marginTop = "8px";
        addItemBtn.onclick = (e) => { e.stopPropagation(); addItem(sIdx); };
        body.appendChild(addItemBtn);
      }

      if (sIdx === data.length - 1 && QUICK_REF && QUICK_REF.length) {
        const refTitle = document.createElement("p");
        refTitle.innerHTML = "<strong>Quick Reference</strong>";
        const table = document.createElement("table");
        table.innerHTML = "<tr><th>Item</th><th>Command / Path</th></tr>" +
          QUICK_REF.map(r => `<tr><td>${cpInline(r[0])}</td><td><code>${cpInline(r[1])}</code></td></tr>`).join("");
        body.appendChild(refTitle);
        body.appendChild(table);
      }

      secEl.appendChild(header);
      secEl.appendChild(body);
      container.appendChild(secEl);
      if (!editMode) updateSectionCount(sIdx);
    });

    if (editMode) {
      const addSectionBtn = document.createElement("button");
      addSectionBtn.textContent = "+ Add section";
      addSectionBtn.onclick = () => addSection();
      container.appendChild(addSectionBtn);
    }

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
  window.cpToggleEdit = () => {
    editMode = !editMode;
    const editBtn = document.getElementById("cpEditBtn");
    const saveBtn = document.getElementById("cpSaveBtn");
    if (editBtn) editBtn.textContent = editMode ? "Exit Edit Mode" : "Edit Checklist";
    if (saveBtn) saveBtn.style.display = editMode ? "" : "none";
    setStatus(editMode ? "Editing — changes are only visible to everyone after you click Save." : "");
    render();
  };
  window.cpSaveChecklist = () => saveToServer();
  window.cpOpenHistory = () => openHistory();

  // Insert an editing toolbar (Edit/Save + status) next to the existing toolbar buttons.
  const toolbar = document.querySelector(".toolbar");
  if (toolbar && pageSlug) {
    const editBtn = document.createElement("button");
    editBtn.id = "cpEditBtn";
    editBtn.textContent = "Edit Checklist";
    editBtn.onclick = () => window.cpToggleEdit();
    toolbar.appendChild(editBtn);

    const saveBtn = document.createElement("button");
    saveBtn.id = "cpSaveBtn";
    saveBtn.textContent = "Save Changes";
    saveBtn.className = "btn-primary";
    saveBtn.style.display = "none";
    saveBtn.onclick = () => window.cpSaveChecklist();
    toolbar.appendChild(saveBtn);

    const historyBtn = document.createElement("button");
    historyBtn.id = "cpHistoryBtn";
    historyBtn.textContent = "Version History";
    historyBtn.onclick = () => window.cpOpenHistory();
    toolbar.appendChild(historyBtn);

    saveStatusEl = document.createElement("div");
    saveStatusEl.id = "cpSaveStatus";
    saveStatusEl.style.fontSize = "0.85rem";
    saveStatusEl.style.color = "var(--muted)";
    saveStatusEl.style.width = "100%";
    toolbar.parentNode.insertBefore(saveStatusEl, toolbar.nextSibling);
  }

  render();
  loadServerData();
}
