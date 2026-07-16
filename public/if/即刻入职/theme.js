/*!
 * Kurokawa Logistics — Theme JS / 黑川物流主题脚本
 *
 * Registered as window.beforeStart by core/index.html, called BEFORE
 * player.start() so listeners are in place for the first passage.
 * 由 core/index.html 注册为 window.beforeStart，在 player.start()
 * 之前调用，确保监听器在第一段内容出现前就位。
 */
window.beforeStart = function (player) {
  "use strict";

  // ---- Click logo to open site / 点击 logo 打开网站 ----
  var logo = document.querySelector(".inkshell-logo");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.title = "黑川物流";
    logo.addEventListener("click", function () {
      window.open("https://kurokawa-logistics.com/", "_blank");
    });
  }

  // ---- Hamburger menu (small screens) / 汉堡菜单（小屏） ----
  var burger = document.getElementById("inkshell-burger");
  var actions = document.getElementById("inkshell-actions");
  function closeMenu() {
    if (actions) actions.classList.remove("inkshell-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger && actions) {
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = actions.classList.toggle("inkshell-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Click outside to close / 点击外部关闭
    document.addEventListener("click", function (e) {
      if (!actions.contains(e.target) && !burger.contains(e.target)) {
        closeMenu();
      }
    });
  }

  var justRestarted = false;
  player.on("story:restart", function () { justRestarted = true; });

  // ---- Auto-scroll: new passage scrolls into view / 自动滚动 ----
  // story:turnComplete fires AFTER all synchronous story:content handlers
  // have run (DomRenderer creates passages, Image inserts #IMAGE images),
  // so the DOM is fully rendered when we scroll — no setTimeout deferral
  // needed. If any of this turn's images are still loading we wait for them
  // (capped) so we scroll on the final layout.
  // story:turnComplete 在所有同步 story:content 处理器执行完毕后触发
  // （DomRenderer 创建段落、Image 插入 #IMAGE 图片），因此滚动时 DOM 已完整
  // 渲染——无需 setTimeout 延迟。若本回合图片仍在加载，则等它（有上限）再滚动，
  // 确保在最终布局上滚动。
  player.on("story:turnComplete", function () {
    var container = player.container;
    if (!container) return;
    var passage = container.querySelector(".inkshell-passage:last-of-type");
    if (passage) scrollToNew(passage);
  });

  // This turn's images: inline <img> inside the passage, plus #IMAGE sibling
  // images after it (up to the next passage / choices).
  // 本回合的图片：段落内的内联 <img>，以及其后方的 #IMAGE 兄弟图片（直到下一个段落 / 选项）。
  function turnImages(passage) {
    var out = [];
    passage.querySelectorAll("img").forEach(function (i) { out.push(i); });
    var node = passage.nextElementSibling;
    while (node && !node.classList.contains("inkshell-passage") && !node.classList.contains("inkshell-choices")) {
      if (node.tagName === "IMG") out.push(node);
      node = node.nextElementSibling;
    }
    return out;
  }

  // Gap below the fixed top bar. Read dynamically so it stays correct if the
  // bar height ever changes (e.g. responsive).
  // 顶部固定栏下方的间距。动态读取，栏高变化（如响应式）时仍然正确。
  function barOffset() {
    var bar = document.querySelector(".inkshell-bar");
    return bar ? bar.offsetHeight + 16 : 72;
  }

  // Scroll so that the passage's top edge lands at barOffset() from the
  // viewport top. Works correctly regardless of prior resize because we
  // recompute getBoundingClientRect at call time.
  // 滚动使段落顶部落在距视口顶部 barOffset() 处。无论之前是否缩放窗口都正确，
  // 因为 getBoundingClientRect 在调用时重新计算。
  function scrollPassageToTop(passage) {
    var rect = passage.getBoundingClientRect();
    var y = window.pageYOffset + rect.top - barOffset();
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  function scrollToNew(passage) {
    if (justRestarted) {
      justRestarted = false;
      window.scrollTo(0, 0);
      return;
    }
    var pending = turnImages(passage).filter(function (i) { return !i.complete; });
    function go() { scrollPassageToTop(passage); }
    // All images already loaded (e.g. preloaded → cached) → scroll now, no wait.
    // 图片均已加载（如预加载命中缓存）→ 立即滚动，无需等待。
    if (!pending.length) { go(); return; }
    // Wait for every still-loading image (or the timeout) before scrolling.
    // 等待所有仍在加载的图片（或超时）再滚动。
    var remaining = pending.length;
    var done = false;
    function settle() {
      if (done) return;
      remaining--;
      if (remaining <= 0) { done = true; go(); }
    }
    pending.forEach(function (i) {
      i.addEventListener("load", settle, { once: true });
      i.addEventListener("error", settle, { once: true });
    });
    setTimeout(function () { if (!done) { done = true; go(); } }, 1000);
  }

  // ============================================================
  //  Save / Load / Reset UI / 存档 · 读档 · 重置
  //  Built on the window.InkShellSave API exposed by the Save & Load
  //  plugins. The Reset button is cloned to drop the built-in Reset
  //  plugin's window.confirm handler so we can use our own dialog.
  //  基于 Save / Load 插件暴露的 window.InkShellSave API。
  //  重置按钮用克隆替换，丢弃内建 Reset 插件的 window.confirm，
  //  改用我们自己的对话框。
  // ============================================================

  var OVERWRITE_KEY = "inkshell_overwrite_noconfirm";

  // ---- tiny DOM helper / 小型 DOM 助手 ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- modal stack: ESC closes only the topmost / 模态栈：ESC 只关最顶层 ----
  var stack = [];
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && stack.length) {
      stack[stack.length - 1]();
    }
  });

  /**
   * Open a titled modal. Returns { body, close }.
   * 点击遮罩或 × 或 ESC 关闭。
   */
  function openModal(titleText) {
    var overlay = el("div", "ks-overlay");
    var modal = el("div", "ks-modal");
    var head = el("div", "ks-modal-head");
    head.appendChild(el("span", null, titleText));
    var closeBtn = el("button", "ks-modal-close", "×");
    closeBtn.setAttribute("aria-label", "关闭");
    head.appendChild(closeBtn);
    var body = el("div", "ks-modal-body");
    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() {
      var i = stack.indexOf(close);
      if (i >= 0) stack.splice(i, 1);
      if (overlay.parentNode) document.body.removeChild(overlay);
    }
    stack.push(close);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    return { body: body, close: close };
  }

  /**
   * Blocking confirm with an optional checkbox.
   * 带可选复选框的确认对话框，通过回调返回结果。
   *   opts: { message, confirmText, cancelText, danger, checkboxLabel,
   *           onResult(confirmed, checkboxChecked) }
   */
  function confirmBox(opts) {
    var overlay = el("div", "ks-overlay");
    var modal = el("div", "ks-modal");
    var body = el("div", "ks-modal-body");
    body.appendChild(el("div", "ks-msg", opts.message));

    var checkbox = null;
    if (opts.checkboxLabel) {
      var label = el("label", "ks-check");
      checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(opts.checkboxLabel));
      body.appendChild(label);
    }

    var actionsRow = el("div", "ks-actions");
    var cancelBtn = el("button", "ks-btn", opts.cancelText || "取消");
    var primaryCls = "ks-btn " + (opts.danger ? "ks-btn--danger" : "ks-btn--primary");
    var confirmBtn = el("button", primaryCls, opts.confirmText || "确认");
    actionsRow.appendChild(cancelBtn);
    actionsRow.appendChild(confirmBtn);
    body.appendChild(actionsRow);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() {
      var i = stack.indexOf(close);
      if (i >= 0) stack.splice(i, 1);
      if (overlay.parentNode) document.body.removeChild(overlay);
    }
    stack.push(close);
    function done(ok) {
      close();
      if (opts.onResult) opts.onResult(ok, checkbox ? checkbox.checked : false);
    }
    cancelBtn.addEventListener("click", function () { done(false); });
    confirmBtn.addEventListener("click", function () { done(true); });
    // Force a choice: no backdrop/× close. / 强制选择：不点遮罩关闭。
  }

  // ---- timestamp formatter / 时间格式化 ----
  function fmtTime(ts) {
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    var d = new Date(ts);
    return d.getFullYear() + "/" + p(d.getMonth() + 1) + "/" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  // ---- one slot row / 单个存档槽行 ----
  // forSave=true: empty slots clickable (save into them).
  // forSave=false: empty slots disabled (can't load nothing).
  // forSave=true：空槽可点（存入）；false：空槽禁用（无法读取）。
  function slotRow(num, info, forSave) {
    var btn = el("button", "ks-slot");
    btn.appendChild(el("span", "ks-slot-num", String(num)));
    var main = el("div", "ks-slot-main");
    if (info) {
      main.appendChild(el("div", "ks-slot-time", fmtTime(info.timestamp)));
      main.appendChild(el("div", "ks-slot-preview", info.preview || "（无预览）"));
    } else {
      main.appendChild(el("div", "ks-slot-time", forSave ? "空槽位" : "（无存档）"));
      if (!forSave) btn.disabled = true;
    }
    btn.appendChild(main);
    return btn;
  }

  // ---- auto-save slot row (numbered "自" / 自动存档行（标记"自"）） ----
  function autoRow(info) {
    var btn = el("button", "ks-slot");
    btn.appendChild(el("span", "ks-slot-num", "自"));
    var main = el("div", "ks-slot-main");
    if (info) {
      main.appendChild(el("div", "ks-slot-time", "自动存档 · " + fmtTime(info.timestamp)));
      main.appendChild(el("div", "ks-slot-preview", info.preview || "（无预览）"));
    } else {
      main.appendChild(el("div", "ks-slot-time", "自动存档（空）"));
      btn.disabled = true;
    }
    btn.appendChild(main);
    return btn;
  }

  // ---- Save dialog / 存档对话框（槽 1–9，无 0） ----
  function openSave(saveApi) {
    var slots = saveApi.getSlots();
    var m = openModal("保存到存档槽");
    for (var i = 1; i <= 9; i++) {
      (function (n, info) {
        var row = slotRow(n, info, true);
        row.addEventListener("click", function () {
          if (!info) {
            saveApi.save(n);
            m.close();
            return;
          }
          // Slot occupied — confirm unless "不再提示" is set.
          // 槽已占用——若未设"不再提示"则确认覆盖。
          if (localStorage.getItem(OVERWRITE_KEY)) {
            saveApi.save(n);
            m.close();
          } else {
            confirmBox({
              message: "存档槽 " + n + " 已有存档，是否覆盖？",
              checkboxLabel: "不再提示",
              confirmText: "覆盖",
              onResult: function (ok, chk) {
                if (chk) localStorage.setItem(OVERWRITE_KEY, "1");
                if (ok) { saveApi.save(n); m.close(); }
              },
            });
          }
        });
        m.body.appendChild(row);
      })(i, slots[i]);
    }
  }

  // ---- scroll to the very bottom after a load / 读档后滚到页面最底 ----
  function scrollToEnd() {
    // Scroll as far down as possible — the container's bottom padding
    // (120px) keeps the choices from hugging the viewport edge.
    // 拉到最底——容器的底部 padding（120px）让选项不紧贴窗口边缘。
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  // ---- Load dialog / 读档对话框（槽 0 + 分割线 + 1–9） ----
  function openLoad(saveApi) {
    var slots = saveApi.getSlots();
    var m = openModal("读取存档");

    var aRow = autoRow(slots[0]);
    aRow.addEventListener("click", function () {
      saveApi.load(0);
      m.close();
      scrollToEnd();
    });
    m.body.appendChild(aRow);

    m.body.appendChild(el("div", "ks-divider"));

    for (var i = 1; i <= 9; i++) {
      (function (n, info) {
        var row = slotRow(n, info, false);
        if (info) {
          row.addEventListener("click", function () {
            saveApi.load(n);
            m.close();
            scrollToEnd();
          });
        }
        m.body.appendChild(row);
      })(i, slots[i]);
    }
  }

  // ---- Reset dialog / 重置对话框（两选项） ----
  function openReset() {
    var resetApi = window.InkShellReset;
    var m = openModal("重置");

    // 1. Restart, keep saves / 重新开始，保留存档
    var opt1 = el("button", "ks-reset-opt");
    opt1.appendChild(el("div", "ks-reset-opt-title", "重新开始"));
    opt1.appendChild(el("div", "ks-reset-opt-desc", "回到故事开头（存档保留）"));
    opt1.addEventListener("click", function () {
      if (resetApi) resetApi.restart();
      m.close();
    });

    // 2. Wipe all saves + restart / 清除所有存档并重启
    var opt2 = el("button", "ks-reset-opt");
    opt2.appendChild(el("div", "ks-reset-opt-title", "清除所有存档"));
    opt2.appendChild(el("div", "ks-reset-opt-desc", "删除全部存档并重新开始（不可恢复）"));
    opt2.addEventListener("click", function () {
      confirmBox({
        message: "确定要删除全部存档吗？\n此操作无法撤销。",
        confirmText: "全部删除",
        danger: true,
        onResult: function (ok) {
          if (!ok) return;
          if (resetApi) resetApi.clearAll();
          m.close();
        },
      });
    });

    m.body.appendChild(opt1);
    m.body.appendChild(opt2);
  }

  // ---- Wire up the three buttons / 接线 ----
  var saveApi = window.InkShellSave;

  var saveBtn = document.getElementById("inkshell-save");
  if (saveBtn && saveApi) {
    saveBtn.disabled = false;
    saveBtn.removeAttribute("title");
    saveBtn.addEventListener("click", function () {
      closeMenu();
      openSave(saveApi);
    });
  }

  var loadBtn = document.getElementById("inkshell-load");
  if (loadBtn && saveApi) {
    loadBtn.disabled = false;
    loadBtn.removeAttribute("title");
    loadBtn.addEventListener("click", function () {
      closeMenu();
      openLoad(saveApi);
    });
  }

  // Reset button: core exposes InkShellReset.restart() / .clearAll(); the
  // theme owns the button + dialog. / 重置按钮：core 提供 InkShellReset.
  // restart() / .clearAll()；按钮与对话框由主题负责。
  var resetBtn = document.getElementById("inkshell-reset");
  if (resetBtn) {
    resetBtn.disabled = false;
    resetBtn.removeAttribute("title");
    resetBtn.addEventListener("click", function () {
      closeMenu();
      openReset();
    });
  }
};
