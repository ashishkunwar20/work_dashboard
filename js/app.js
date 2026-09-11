(function () {
  "use strict";

  var STORAGE_KEY = "shafts-package-dashboard-v1";

  var TASK_STATUSES = ["Not Started", "In Progress", "Waiting on Others", "Blocked", "Complete"];
  var PACKAGE_STATUSES = ["On Track", "At Risk", "Delayed", "Complete"];

  // ---------- seed data (example only — edit via the UI or Import) ----------
  function seedData() {
    var today = new Date();
    function offset(days) {
      var d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }
    return {
      packages: [
        {
          id: uid(),
          name: "Shaft 1 – South Portal",
          code: "SH-01",
          description: "Example package – replace with your real scope.",
          status: "At Risk",
          tasks: [
            t("Chase design RFI response on shaft lining", "T. Ahmed (Designer)", "Waiting on Others", "High", offset(-2), "Sent second reminder by email."),
            t("Review temporary works design for propping", "Site Engineer", "In Progress", "Medium", offset(3), ""),
            t("Confirm piling rig delivery date with subcontractor", "ABC Piling Ltd", "Waiting on Others", "Critical", offset(-1), "Rig needed before slip form starts."),
            t("Close out ITP for base slab pour", "QA Team", "Not Started", "Low", offset(10), "")
          ]
        },
        {
          id: uid(),
          name: "Shaft 2 – Ventilation",
          code: "SH-02",
          description: "Example package – replace with your real scope.",
          status: "On Track",
          tasks: [
            t("Obtain updated ground movement monitoring report", "Instrumentation & Monitoring team", "In Progress", "Medium", offset(5), ""),
            t("Agree access track reinstatement with landowner", "Land & Property", "Not Started", "Medium", offset(14), "")
          ]
        },
        {
          id: uid(),
          name: "Shaft 3 – Intervention",
          code: "SH-03",
          description: "Example package – replace with your real scope.",
          status: "Delayed",
          tasks: [
            t("Chase approval of method statement for excavation", "Principal Contractor Approvals", "Waiting on Others", "Critical", offset(-5), "Overdue - escalate at next progress meeting."),
            t("Resolve utility diversion clash with services team", "Utilities Team", "Blocked", "High", offset(-3), "Waiting on updated survey drawing."),
            t("Sign off temporary works permit", "TW Coordinator", "Complete", "Medium", offset(-10), "")
          ]
        }
      ]
    };

    function t(title, owner, status, priority, due, notes) {
      return {
        id: uid(),
        title: title,
        notes: notes || "",
        owner: owner || "",
        priority: priority || "Medium",
        status: status || "Not Started",
        due: due || ""
      };
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  // ---------- persistence ----------
  var state = {
    data: loadData(),
    search: "",
    filterStatus: "",
    filterPriority: "",
    view: "packages", // packages | chasing | overdue
    openPackages: {} // id -> bool
  };

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Could not read saved data, starting fresh.", e);
    }
    var seeded = seedData();
    persist(seeded);
    return seeded;
  }

  function persist(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data || state.data));
    } catch (e) {
      console.error("Could not save data", e);
    }
  }

  // ---------- date helpers ----------
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr + "T00:00:00");
    var t0 = new Date(todayStr() + "T00:00:00");
    return Math.round((d - t0) / 86400000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  function isOverdue(task) {
    return task.status !== "Complete" && task.due && daysUntil(task.due) < 0;
  }

  function isSoon(task) {
    if (task.status === "Complete" || !task.due) return false;
    var d = daysUntil(task.due);
    return d >= 0 && d <= 3;
  }

  function slug(s) {
    return String(s).replace(/\s+/g, "-");
  }

  // ---------- derived data ----------
  function allTasksFlat() {
    var out = [];
    state.data.packages.forEach(function (pkg) {
      pkg.tasks.forEach(function (task) {
        out.push({ task: task, pkg: pkg });
      });
    });
    return out;
  }

  function matchesFilters(task, pkg) {
    var q = state.search.trim().toLowerCase();
    if (q) {
      var hay = [task.title, task.notes, task.owner, pkg.name, pkg.code].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (state.filterStatus && task.status !== state.filterStatus) return false;
    if (state.filterPriority && task.priority !== state.filterPriority) return false;
    return true;
  }

  function packageStats(pkg) {
    var total = pkg.tasks.length;
    var complete = pkg.tasks.filter(function (t) { return t.status === "Complete"; }).length;
    var overdue = pkg.tasks.filter(isOverdue).length;
    var chasing = pkg.tasks.filter(function (t) { return t.status === "Waiting on Others"; }).length;
    var blocked = pkg.tasks.filter(function (t) { return t.status === "Blocked"; }).length;
    return { total: total, complete: complete, overdue: overdue, chasing: chasing, blocked: blocked };
  }

  // ---------- rendering ----------
  var el = {
    summary: document.getElementById("summary-strip"),
    main: document.getElementById("main-content"),
    search: document.getElementById("search-input"),
    filterStatus: document.getElementById("filter-status"),
    filterPriority: document.getElementById("filter-priority"),
    viewToggle: document.getElementById("view-toggle")
  };

  function render() {
    renderSummary();
    if (state.view === "packages") renderPackagesView();
    else renderFlatView(state.view);
  }

  function renderSummary() {
    var flat = allTasksFlat().map(function (x) { return x.task; });
    var open = flat.filter(function (t) { return t.status !== "Complete"; });
    var overdue = flat.filter(isOverdue);
    var chasing = flat.filter(function (t) { return t.status === "Waiting on Others"; });
    var blocked = flat.filter(function (t) { return t.status === "Blocked"; });

    var tiles = [
      { label: "Packages", num: state.data.packages.length, cls: "" },
      { label: "Open Actions", num: open.length, cls: "" },
      { label: "Overdue", num: overdue.length, cls: "overdue" },
      { label: "Waiting on Others", num: chasing.length, cls: "chasing" },
      { label: "Blocked", num: blocked.length, cls: "overdue" }
    ];

    el.summary.innerHTML = tiles.map(function (t) {
      return '<div class="summary-tile ' + t.cls + '"><div class="num">' + t.num + '</div><div class="label">' + t.label + '</div></div>';
    }).join("");
  }

  function renderPackagesView() {
    var packages = state.data.packages;
    if (!packages.length) {
      el.main.innerHTML = emptyState("No packages yet", "Add your first package to start tracking actions.", true);
      return;
    }

    el.main.innerHTML = packages.map(function (pkg) {
      var stats = packageStats(pkg);
      var visibleTasks = pkg.tasks.filter(function (t) { return matchesFilters(t, pkg); });
      var isOpen = !!state.openPackages[pkg.id] || state.search || state.filterStatus || state.filterPriority;
      var pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;

      var chips = [];
      if (stats.overdue) chips.push(chip(stats.overdue + " overdue", "danger"));
      if (stats.chasing) chips.push(chip(stats.chasing + " waiting on others", "warn"));
      if (stats.blocked) chips.push(chip(stats.blocked + " blocked", "danger"));
      if (!stats.overdue && !stats.chasing && !stats.blocked && stats.total) chips.push(chip("on track", "success"));

      var tableHtml = "";
      if (isOpen) {
        tableHtml = '<div class="task-table-wrap">' +
          (visibleTasks.length ? renderTaskTable(visibleTasks, pkg) : emptyState("No matching tasks", "Try clearing filters, or add a new task.", false)) +
          '<div class="add-task-row"><button class="link-btn" data-add-task="' + pkg.id + '">+ Add task to this package</button></div>' +
          '</div>';
      }

      return (
        '<div class="package-card" data-package-card="' + pkg.id + '">' +
          '<div class="package-card-header" data-toggle="' + pkg.id + '">' +
            '<span class="chevron ' + (isOpen ? "open" : "") + '">&#9656;</span>' +
            '<div class="package-title-block">' +
              '<div class="package-title-row"><h3>' + escapeHtml(pkg.name) + '</h3>' +
                (pkg.code ? '<span class="package-code">' + escapeHtml(pkg.code) + '</span>' : "") +
                '<span class="badge badge-status-' + slug(pkg.status) + '">' + pkg.status + '</span>' +
              '</div>' +
              (pkg.description ? '<p class="package-desc">' + escapeHtml(pkg.description) + '</p>' : "") +
            '</div>' +
            '<div class="progress-wrap">' +
              '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
              '<div class="progress-label">' + stats.complete + ' / ' + stats.total + ' actions complete</div>' +
            '</div>' +
            '<div class="stat-chips">' + chips.join("") + '</div>' +
            '<div class="package-card-actions">' +
              '<button class="icon-btn" data-edit-package="' + pkg.id + '">Edit</button>' +
            '</div>' +
          '</div>' +
          tableHtml +
        '</div>'
      );
    }).join("");
  }

  function renderFlatView(view) {
    var items = allTasksFlat().filter(function (x) { return matchesFilters(x.task, x.pkg); });
    if (view === "chasing") {
      items = items.filter(function (x) { return x.task.status === "Waiting on Others"; });
    } else if (view === "overdue") {
      items = items.filter(function (x) { return isOverdue(x.task); });
    }
    items.sort(function (a, b) {
      var da = a.task.due || "9999-99-99";
      var db = b.task.due || "9999-99-99";
      return da < db ? -1 : da > db ? 1 : 0;
    });

    if (!items.length) {
      el.main.innerHTML = emptyState(
        view === "chasing" ? "Nothing you're chasing right now" : "No overdue actions",
        "Nice and clear — check back later or adjust filters.",
        false
      );
      return;
    }

    var rowsHtml = items.map(function (x) { return taskRowHtml(x.task, x.pkg, true); }).join("");

    el.main.innerHTML =
      '<div class="package-card">' +
        '<div class="task-table-wrap">' +
          '<table class="task-table"><thead><tr>' +
            '<th>Task</th><th>Package</th><th>Chasing</th><th>Priority</th><th>Status</th><th>Due</th><th></th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
        '</div>' +
      '</div>';
  }

  function renderTaskTable(tasks, pkg) {
    var rows = tasks.map(function (t) { return taskRowHtml(t, pkg, false); }).join("");
    return '<table class="task-table"><thead><tr>' +
      '<th>Task</th><th>Chasing</th><th>Priority</th><th>Status</th><th>Due</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function taskRowHtml(t, pkg, showPackageCol) {
    var dueClass = isOverdue(t) ? "overdue" : isSoon(t) ? "soon" : "";
    var dueLabel = formatDate(t.due);
    if (isOverdue(t)) dueLabel += " (overdue)";
    return (
      '<tr>' +
        '<td class="task-title-cell"><strong>' + escapeHtml(t.title) + '</strong>' +
          (t.notes ? '<div class="task-notes">' + escapeHtml(t.notes) + '</div>' : "") +
        '</td>' +
        (showPackageCol ? '<td>' + escapeHtml(pkg.name) + '</td>' : "") +
        '<td>' + escapeHtml(t.owner || "—") + '</td>' +
        '<td><span class="badge badge-priority-' + slug(t.priority) + '">' + t.priority + '</span></td>' +
        '<td><span class="badge badge-task-' + slug(t.status) + '">' + t.status + '</span></td>' +
        '<td class="due-cell ' + dueClass + '">' + dueLabel + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-btn" data-edit-task="' + t.id + '" data-pkg="' + pkg.id + '">Edit</button>' +
          (t.status !== "Complete" ? '<button class="icon-btn" data-complete-task="' + t.id + '" data-pkg="' + pkg.id + '">Done</button>' : "") +
        '</div></td>' +
      '</tr>'
    );
  }

  function chip(label, kind) {
    var cls = kind === "danger" ? "badge-status-Delayed" : kind === "warn" ? "badge-status-At-Risk" : "badge-status-On-Track";
    return '<span class="badge ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function emptyState(title, subtitle, showAddPackage) {
    return '<div class="empty-state"><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(subtitle) + '</p>' +
      (showAddPackage ? '<button class="btn btn-primary" id="empty-add-package">+ Add Package</button>' : "") +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- events: toolbar ----------
  el.search.addEventListener("input", function () {
    state.search = el.search.value;
    render();
  });
  el.filterStatus.addEventListener("change", function () {
    state.filterStatus = el.filterStatus.value;
    render();
  });
  el.filterPriority.addEventListener("change", function () {
    state.filterPriority = el.filterPriority.value;
    render();
  });
  el.viewToggle.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view]");
    if (!btn) return;
    state.view = btn.getAttribute("data-view");
    Array.prototype.forEach.call(el.viewToggle.querySelectorAll(".toggle-btn"), function (b) {
      b.classList.toggle("active", b === btn);
    });
    render();
  });

  // ---------- events: main (delegated) ----------
  el.main.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-toggle]"))) {
      var id = t.getAttribute("data-toggle");
      state.openPackages[id] = !state.openPackages[id];
      render();
      return;
    }
    if ((t = e.target.closest("[data-edit-package]"))) {
      openPackageModal(t.getAttribute("data-edit-package"));
      return;
    }
    if ((t = e.target.closest("[data-add-task]"))) {
      openTaskModal(t.getAttribute("data-add-task"), null);
      return;
    }
    if ((t = e.target.closest("[data-edit-task]"))) {
      openTaskModal(t.getAttribute("data-pkg"), t.getAttribute("data-edit-task"));
      return;
    }
    if ((t = e.target.closest("[data-complete-task]"))) {
      var pkg = findPackage(t.getAttribute("data-pkg"));
      var task = pkg && findTask(pkg, t.getAttribute("data-complete-task"));
      if (task) {
        task.status = "Complete";
        persist();
        render();
      }
      return;
    }
    if ((t = e.target.closest("#empty-add-package"))) {
      openPackageModal(null);
      return;
    }
  });

  // ---------- package modal ----------
  var pkgModal = document.getElementById("package-modal");
  var pkgForm = document.getElementById("package-form");
  var pkgIdField = document.getElementById("package-id");
  var pkgNameField = document.getElementById("package-name");
  var pkgCodeField = document.getElementById("package-code");
  var pkgDescField = document.getElementById("package-description");
  var pkgStatusField = document.getElementById("package-status");
  var pkgDeleteBtn = document.getElementById("package-delete");

  document.getElementById("btn-add-package").addEventListener("click", function () { openPackageModal(null); });
  document.getElementById("package-cancel").addEventListener("click", function () { closeModal(pkgModal); });
  pkgModal.addEventListener("click", function (e) { if (e.target === pkgModal) closeModal(pkgModal); });

  function openPackageModal(id) {
    var pkg = id ? findPackage(id) : null;
    document.getElementById("package-modal-title").textContent = pkg ? "Edit Package" : "Add Package";
    pkgIdField.value = pkg ? pkg.id : "";
    pkgNameField.value = pkg ? pkg.name : "";
    pkgCodeField.value = pkg ? pkg.code : "";
    pkgDescField.value = pkg ? pkg.description : "";
    pkgStatusField.value = pkg ? pkg.status : "On Track";
    pkgDeleteBtn.hidden = !pkg;
    openModal(pkgModal);
    pkgNameField.focus();
  }

  pkgForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var id = pkgIdField.value;
    var pkg = id ? findPackage(id) : null;
    if (!pkg) {
      pkg = { id: uid(), tasks: [] };
      state.data.packages.push(pkg);
    }
    pkg.name = pkgNameField.value.trim() || "Untitled Package";
    pkg.code = pkgCodeField.value.trim();
    pkg.description = pkgDescField.value.trim();
    pkg.status = pkgStatusField.value;
    persist();
    closeModal(pkgModal);
    render();
  });

  pkgDeleteBtn.addEventListener("click", function () {
    var id = pkgIdField.value;
    if (!id) return;
    if (!confirm("Delete this package and all its tasks? This cannot be undone.")) return;
    state.data.packages = state.data.packages.filter(function (p) { return p.id !== id; });
    persist();
    closeModal(pkgModal);
    render();
  });

  // ---------- task modal ----------
  var taskModal = document.getElementById("task-modal");
  var taskForm = document.getElementById("task-form");
  var taskIdField = document.getElementById("task-id");
  var taskPkgField = document.getElementById("task-package-id");
  var taskTitleField = document.getElementById("task-title");
  var taskNotesField = document.getElementById("task-notes");
  var taskOwnerField = document.getElementById("task-owner");
  var taskPriorityField = document.getElementById("task-priority");
  var taskStatusField = document.getElementById("task-status");
  var taskDueField = document.getElementById("task-due");
  var taskDeleteBtn = document.getElementById("task-delete");

  document.getElementById("task-cancel").addEventListener("click", function () { closeModal(taskModal); });
  taskModal.addEventListener("click", function (e) { if (e.target === taskModal) closeModal(taskModal); });

  function openTaskModal(pkgId, taskId) {
    var pkg = findPackage(pkgId);
    if (!pkg) return;
    var task = taskId ? findTask(pkg, taskId) : null;
    document.getElementById("task-modal-title").textContent = task ? "Edit Task" : "Add Task";
    taskIdField.value = task ? task.id : "";
    taskPkgField.value = pkg.id;
    taskTitleField.value = task ? task.title : "";
    taskNotesField.value = task ? task.notes : "";
    taskOwnerField.value = task ? task.owner : "";
    taskPriorityField.value = task ? task.priority : "Medium";
    taskStatusField.value = task ? task.status : "Not Started";
    taskDueField.value = task ? task.due : "";
    taskDeleteBtn.hidden = !task;
    state.openPackages[pkg.id] = true;
    openModal(taskModal);
    taskTitleField.focus();
  }

  taskForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var pkg = findPackage(taskPkgField.value);
    if (!pkg) return;
    var id = taskIdField.value;
    var task = id ? findTask(pkg, id) : null;
    if (!task) {
      task = { id: uid() };
      pkg.tasks.push(task);
    }
    task.title = taskTitleField.value.trim() || "Untitled task";
    task.notes = taskNotesField.value.trim();
    task.owner = taskOwnerField.value.trim();
    task.priority = taskPriorityField.value;
    task.status = taskStatusField.value;
    task.due = taskDueField.value;
    persist();
    closeModal(taskModal);
    render();
  });

  taskDeleteBtn.addEventListener("click", function () {
    var pkg = findPackage(taskPkgField.value);
    var id = taskIdField.value;
    if (!pkg || !id) return;
    if (!confirm("Delete this task?")) return;
    pkg.tasks = pkg.tasks.filter(function (t) { return t.id !== id; });
    persist();
    closeModal(taskModal);
    render();
  });

  // ---------- modal helpers ----------
  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal(pkgModal);
      closeModal(taskModal);
    }
  });

  function findPackage(id) {
    return state.data.packages.find(function (p) { return p.id === id; });
  }
  function findTask(pkg, id) {
    return pkg.tasks.find(function (t) { return t.id === id; });
  }

  // ---------- export / import ----------
  document.getElementById("btn-export").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "shafts-dashboard-backup-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("input-import").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.packages)) throw new Error("Invalid file format");
        if (!confirm("Import will replace all current data. Continue?")) return;
        state.data = parsed;
        persist();
        state.openPackages = {};
        render();
      } catch (err) {
        alert("Could not import file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------- init ----------
  render();
})();
