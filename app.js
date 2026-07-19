(() => {
  "use strict";

  const STORAGE_KEY = "weightDinnerGuide.v1.records";
  const DRAFT_KEY = "weightDinnerGuide.v1.todayDraft";

  const rules = [
    {
      id: "protein",
      match: (difference) => difference < 0,
      title: "吃高蛋白",
      detail: "蛋、鱼虾、瘦肉或豆制品任选一类，配蔬菜即可。",
      icon: "蛋",
      safety: ""
    },
    {
      id: "normal",
      match: (difference) => difference >= 0 && difference < 0.6,
      title: "吃正常晚饭",
      detail: "按平时的正常份量吃，不需要额外补偿。",
      icon: "饭",
      safety: ""
    },
    {
      id: "light",
      match: (difference) => difference >= 0.6 && difference < 1,
      title: "少吃 / 轻量晚餐",
      detail: "优先蛋白质和蔬菜，减少主食、油盐和零食。",
      icon: "轻",
      safety: "如已明显饥饿或不舒服，不要硬扛，少量进食更安全。"
    },
    {
      id: "skip",
      match: (difference) => difference >= 1 && difference < 2,
      title: "不吃晚饭",
      detail: "这是你设定的查表规则；身体不适时改为少量高蛋白。",
      icon: "停",
      safety: "出现头晕、心慌、低血糖或明显不适时，应及时进食。"
    },
    {
      id: "cardio",
      match: (difference) => difference >= 2,
      title: "不吃晚饭 + 爬坡有氧",
      detail: "仅在身体状态允许时量力进行，不追求高强度。",
      icon: "坡",
      safety: "不建议空腹进行高强度运动；身体不适时停止并及时进食。"
    }
  ];

  const elements = {
    morning: document.querySelector("#morning-weight"),
    evening: document.querySelector("#evening-weight"),
    error: document.querySelector("#field-error"),
    resultCard: document.querySelector("#result-card"),
    resultEmpty: document.querySelector("#result-empty"),
    resultContent: document.querySelector("#result-content"),
    difference: document.querySelector("#difference-value"),
    recommendationIcon: document.querySelector("#recommendation-icon"),
    recommendationTitle: document.querySelector("#recommendation-title"),
    recommendationDetail: document.querySelector("#recommendation-detail"),
    safety: document.querySelector("#safety-inline"),
    save: document.querySelector("#save-record"),
    savedMessage: document.querySelector("#saved-message"),
    todayLabel: document.querySelector("#today-label"),
    reset: document.querySelector("#reset-today"),
    views: [...document.querySelectorAll(".view")],
    navItems: [...document.querySelectorAll(".nav-item")],
    historyList: document.querySelector("#history-list"),
    emptyHistory: document.querySelector("#empty-history"),
    historySummary: document.querySelector("#history-summary"),
    recordCount: document.querySelector("#record-count"),
    latestDiff: document.querySelector("#latest-diff"),
    installModal: document.querySelector("#install-modal")
  };

  const localDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const readJSON = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const getRecords = () => {
    const records = readJSON(STORAGE_KEY, []);
    return Array.isArray(records) ? records : [];
  };

  const getRule = (difference) => rules.find((rule) => rule.match(difference)) || rules[1];

  const parseWeight = (input) => {
    if (input.value.trim() === "") return null;
    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  };

  const formatDifference = (value) => {
    const normalized = Math.abs(value) < 0.05 ? 0 : value;
    return `${normalized > 0 ? "+" : ""}${normalized.toFixed(1)} kg`;
  };

  const validateWeights = (morning, evening) => {
    if (morning !== null && (morning < 20 || morning > 300)) return "早体重请输入 20–300 kg 之间的数字。";
    if (evening !== null && (evening < 20 || evening > 300)) return "晚体重请输入 20–300 kg 之间的数字。";
    if (morning !== null && evening !== null && Math.abs(evening - morning) > 10) return "早晚差值超过 10 kg，请检查是否输错。";
    return "";
  };

  const saveDraft = () => {
    const draft = {
      date: localDateKey(),
      morning: elements.morning.value,
      evening: elements.evening.value
    };
    writeJSON(DRAFT_KEY, draft);
  };

  const renderResult = () => {
    const morning = parseWeight(elements.morning);
    const evening = parseWeight(elements.evening);
    const error = validateWeights(morning, evening);
    elements.error.textContent = error;
    elements.savedMessage.textContent = "";
    saveDraft();

    const isComplete = morning !== null && evening !== null && !error;
    elements.resultEmpty.hidden = isComplete;
    elements.resultContent.hidden = !isComplete;
    elements.resultEmpty.classList.toggle("is-hidden", isComplete);
    elements.resultContent.classList.toggle("is-hidden", !isComplete);
    elements.resultCard.classList.toggle("is-empty", !isComplete);
    elements.resultCard.classList.remove("tone-protein", "tone-normal", "tone-light", "tone-skip", "tone-cardio");

    if (!isComplete) return;

    const difference = Math.round((evening - morning) * 10) / 10;
    const rule = getRule(difference);
    elements.resultCard.classList.add(`tone-${rule.id}`);
    elements.difference.textContent = formatDifference(difference);
    elements.recommendationIcon.textContent = rule.icon;
    elements.recommendationTitle.textContent = rule.title;
    elements.recommendationDetail.textContent = rule.detail;
    elements.safety.textContent = rule.safety;
    elements.safety.hidden = !rule.safety;

    const existing = getRecords().some((record) => record.date === localDateKey());
    elements.save.textContent = existing ? "更新今天的记录" : "保存今天的记录";
  };

  const loadToday = () => {
    const dateKey = localDateKey();
    const draft = readJSON(DRAFT_KEY, null);
    const record = getRecords().find((item) => item.date === dateKey);

    if (draft?.date === dateKey) {
      elements.morning.value = draft.morning || "";
      elements.evening.value = draft.evening || "";
    } else if (record) {
      elements.morning.value = record.morning;
      elements.evening.value = record.evening;
    }

    const formatter = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" });
    elements.todayLabel.textContent = `今天 · ${formatter.format(new Date())}`;
    renderResult();
  };

  const saveRecord = () => {
    const morning = parseWeight(elements.morning);
    const evening = parseWeight(elements.evening);
    const error = validateWeights(morning, evening);
    if (morning === null || evening === null || error) {
      elements.error.textContent = error || "请先填完整早体重和晚体重。";
      return;
    }

    const difference = Math.round((evening - morning) * 10) / 10;
    const rule = getRule(difference);
    const record = {
      date: localDateKey(),
      morning: Number(morning.toFixed(1)),
      evening: Number(evening.toFixed(1)),
      difference,
      ruleId: rule.id,
      recommendation: rule.title,
      updatedAt: new Date().toISOString()
    };

    const records = getRecords().filter((item) => item.date !== record.date);
    records.push(record);
    records.sort((a, b) => b.date.localeCompare(a.date));

    if (writeJSON(STORAGE_KEY, records)) {
      elements.savedMessage.textContent = "已保存，只在这台设备里。";
      elements.save.textContent = "已保存 · 点此更新";
      renderHistory();
    } else {
      elements.savedMessage.textContent = "保存失败，请检查 Safari 是否允许网站存储。";
    }
  };

  const renderHistory = () => {
    const records = getRecords().sort((a, b) => b.date.localeCompare(a.date));
    elements.historyList.replaceChildren();
    elements.emptyHistory.hidden = records.length > 0;
    elements.historySummary.hidden = records.length === 0;

    if (!records.length) return;

    elements.recordCount.textContent = String(records.length);
    elements.latestDiff.textContent = formatDifference(Number(records[0].difference));

    records.forEach((record) => {
      const [year, month, day] = record.date.split("-");
      const item = document.createElement("article");
      item.className = "history-item";
      item.innerHTML = `
        <div class="history-date"><strong>${day}</strong><small>${Number(month)}月</small></div>
        <div class="history-body"><strong>${record.recommendation}</strong><small>${Number(record.morning).toFixed(1)} → ${Number(record.evening).toFixed(1)} kg · ${year}</small></div>
        <div class="history-diff"><strong>${formatDifference(Number(record.difference))}</strong><small>早晚差</small></div>
        <button class="delete-record" type="button" aria-label="删除 ${month}月${day}日记录" data-delete-date="${record.date}">×</button>`;
      elements.historyList.append(item);
    });
  };

  const deleteRecord = (date) => {
    const records = getRecords().filter((record) => record.date !== date);
    writeJSON(STORAGE_KEY, records);
    renderHistory();
    if (date === localDateKey()) renderResult();
  };

  const resetToday = () => {
    elements.morning.value = "";
    elements.evening.value = "";
    localStorage.removeItem(DRAFT_KEY);
    renderResult();
    elements.morning.focus();
  };

  const navigate = (target) => {
    elements.views.forEach((view) => {
      const active = view.dataset.view === target;
      view.hidden = !active;
      view.classList.toggle("active", active);
    });
    elements.navItems.forEach((item) => {
      const active = item.dataset.navTarget === target;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (target === "history") renderHistory();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openInstall = () => {
    elements.installModal.hidden = false;
    document.body.style.overflow = "hidden";
    document.querySelector("#install-close").focus();
  };

  const closeInstall = () => {
    elements.installModal.hidden = true;
    document.body.style.overflow = "";
  };

  elements.morning.addEventListener("input", renderResult);
  elements.evening.addEventListener("input", renderResult);
  elements.save.addEventListener("click", saveRecord);
  elements.reset.addEventListener("click", resetToday);
  document.addEventListener("click", (event) => {
    const navTarget = event.target.closest("[data-nav-target]")?.dataset.navTarget;
    if (navTarget) navigate(navTarget);

    const deleteDate = event.target.closest("[data-delete-date]")?.dataset.deleteDate;
    if (deleteDate && window.confirm("删除这天的记录？")) deleteRecord(deleteDate);
  });

  document.querySelector("#install-open").addEventListener("click", openInstall);
  document.querySelector("#install-open-rules").addEventListener("click", openInstall);
  document.querySelector("#install-close").addEventListener("click", closeInstall);
  document.querySelector("#install-done").addEventListener("click", closeInstall);
  elements.installModal.addEventListener("click", (event) => {
    if (event.target === elements.installModal) closeInstall();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.installModal.hidden) closeInstall();
  });

  loadToday();
  renderHistory();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
