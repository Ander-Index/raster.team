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

  // ---- Paragraph gaps inside passages / 段落内部的段距 ----
  // One .inkshell-passage holds a whole turn's text; the author's
  // "paragraphs" are the \n-separated ink lines INSIDE it. Margins on
  // .inkshell-passage therefore can't space them. Instead, every
  // interior \n is replaced with a block-level .ks-pgap span whose
  // height is --para-gap: paragraph gap = 1lh + --para-gap, while
  // wrapped lines still break at 1lh.
  // 一个 .inkshell-passage 装着整回合文本；作者的"段"是其中
  // 以 \n 分隔的 ink 行——外边距够不着它们。改为把段落内部的
  // 每个 \n 换成高 --para-gap 的块级 .ks-pgap：
  // 段距 = 1lh + --para-gap，折叠行仍只有 1lh。
  // Trailing \n is kept as-is (it provides the 1lh after the passage).
  // 结尾 \n 原样保留（提供段落后方的 1lh 空隙）。
  player.on("dom:passage", function (data) {
    var passage = data && data.element;
    if (!passage) return;

    // Collect text nodes first (never mutate while walking).
    var walker = document.createTreeWalker(passage, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);

    // hasAfter[i] = any visible text exists in nodes AFTER nodes[i].
    // 反向预扫描：nodes[i] 之后是否还有可见文字。
    var hasAfter = new Array(nodes.length);
    var after = false;
    for (var i = nodes.length - 1; i >= 0; i--) {
      hasAfter[i] = after;
      if (/\S/.test(nodes[i].nodeValue)) after = true;
    }

    for (var j = 0; j < nodes.length; j++) {
      var t = nodes[j];
      if (t.nodeValue.indexOf("\n") === -1) continue;
      // Respect preformatted semantics (code) and list structure (ul/ol/dl):
      // line breaks inside those are structural, not paragraph breaks —
      // injecting .ks-pgap between <li>s would blow the list apart.
      // 尊重预排版语义（代码）与列表结构（ul/ol/dl）：其中的换行是
      // 结构而非段间隔——在 <li> 之间注入 .ks-pgap 会把列表撑散。
      var pe = t.parentElement;
      if (pe && pe.closest("pre, code, samp, ul, ol, dl")) continue;
      var parts = t.nodeValue.split("\n");
      if (parts.length < 2) continue;

      var frag = document.createDocumentFragment();
      for (var k = 0; k < parts.length; k++) {
        if (k > 0) {
          // Interior break → gap span; trailing break → keep the \n.
          // 中间换行 → 间隔元素；结尾换行 → 保留 \n。
          var restHasText = /\S/.test(parts.slice(k).join("")) || hasAfter[j];
          if (restHasText) {
            var gap = document.createElement("span");
            gap.className = "ks-pgap";
            gap.setAttribute("aria-hidden", "true");
            frag.appendChild(gap);
          } else {
            frag.appendChild(document.createTextNode("\n"));
          }
        }
        if (parts[k]) frag.appendChild(document.createTextNode(parts[k]));
      }
      t.parentNode.replaceChild(frag, t);
    }

    // ---- wrap each paragraph in a .ks-pline block / 把每个段包进 .ks-pline ----
    // .ks-pgap spans are the paragraph separators; everything between two
    // of them forms one paragraph. Wrapping gives the fade system a
    // per-paragraph handle ("一段接一段") without changing rendering —
    // the paragraphs were already anonymous blocks between the pgap spans.
    // .ks-pgap 是段间分隔；两个 pgap 之间即一个段。包裹后淡入淡出
    // 系统就能以段为单位调度（"一段接一段"），渲染不变——
    // 这些段本来就是 pgap 之间的匿名块。
    var out = document.createDocumentFragment();
    var current = [];
    var flush = function () {
      if (!current.length) return;
      var hasContent = false;
      for (var i = 0; i < current.length; i++) {
        var n = current[i];
        if (n.nodeType === 1 || /\S/.test(n.nodeValue || "")) { hasContent = true; break; }
      }
      if (!hasContent) {
        // Whitespace-only run: keep it unwrapped (harmless as-is).
        // 纯空白片段：原样放回，不包。
        for (var k = 0; k < current.length; k++) out.appendChild(current[k]);
        current = [];
        return;
      }
      var span = document.createElement("span");
      span.className = "ks-pline";
      for (var m = 0; m < current.length; m++) span.appendChild(current[m]);
      out.appendChild(span);
      current = [];
    };
    var kids = passage.childNodes;
    while (kids.length) {
      var kid = kids[0];
      if (kid.nodeType === 1 && kid.classList.contains("ks-pgap")) {
        flush();
        out.appendChild(kid); // pgap stays between plines / pgap 留在段之间
      } else {
        // Detach into the current group (childNodes is live — must remove).
        // 移入当前分组（childNodes 是活集合，必须显式移除）。
        passage.removeChild(kid);
        current.push(kid);
      }
    }
    flush();
    passage.appendChild(out);
  });

  // ---- Segment fade in/out / 段落淡入淡出 ----
  // One "segment" = a passage div, a standalone #IMAGE image, or the
  // choices block — top-level children of the story container, so plain
  // iteration over container.children gives document order for free.
  // 一个"段" = 一个段落 div / 一张独立 #IMAGE 图片 / 选项块——都是
  // 故事容器的顶层子元素，直接遍历 container.children 即得文档顺序。
  //
  // All four timings are CSS variables on body (see style.css), read here:
  // 四个时间参数都是 body 上的 CSS 变量（见 style.css），在此读取：
  //   --fade-in-duration   段落淡入时间
  //   --fade-in-stagger    段落开始淡入间隔
  //   --fade-out-duration  # CLEAR 时段落淡出时间
  //   --fade-out-stagger   段落开始淡出间隔
  function cssSec(name, fallback) {
    var raw = window.getComputedStyle(document.body).getPropertyValue(name).trim();
    if (!raw) return fallback;
    var n = parseFloat(raw);
    if (!isFinite(n)) return fallback;
    return raw.slice(-2) === "ms" ? n / 1000 : n;
  }

  var reducedMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Milliseconds the next fade-in must wait for an in-progress fade-out
  // (0 = crossfade immediately). Set by the dom:clear handler when
  // --fade-wait-exit is on, consumed by the story:turnComplete handler.
  // 下一次淡入需要等待进行中的淡出结束的毫秒数（0 = 立即交叉淡变）。
  // --fade-wait-exit 开启时由 dom:clear 处理器设置，
  // 由 story:turnComplete 处理器消费。
  var pendingExitMs = 0;

  // ---- fade-in: release new paragraphs one stagger apart / 淡入：逐段释放 ----
  // Segment model: a passage with .ks-pline children fades PER PARAGRAPH
  // ("一段接一段"); a passage without plines, a standalone image, or the
  // choices block each count as one segment.
  // 段模型：含 .ks-pline 的回合段按"段"逐个淡入（"一段接一段"）；
  // 无 pline 的回合段、独立图片、选项块各算一个段。
  player.on("story:turnComplete", function () {
    var container = player.container;
    if (!container) return;
    var fresh = [];
    for (var i = 0; i < container.children.length; i++) {
      var el = container.children[i];
      if (el.hasAttribute("data-new")) {
        el.removeAttribute("data-new");
        if (el.classList.contains("inkshell-passage")) {
          var plines = el.querySelectorAll(":scope > .ks-pline");
          if (plines.length) {
            for (var p = 0; p < plines.length; p++) fresh.push(plines[p]);
          } else {
            fresh.push(el);
          }
        } else {
          fresh.push(el); // choices block / 选项块
        }
      } else if (
        el.classList.contains("inkshell-image") &&
        !el.hasAttribute("data-ks-seen")
      ) {
        fresh.push(el);
      }
    }
    // Consume any pending fade-out wait even when nothing fades in, so a
    // stale value never leaks into a later turn.
    // 即使本回合没有新段也消费掉等待值，避免滞留到后面的回合。
    var wait = pendingExitMs / 1000;
    pendingExitMs = 0;
    if (!fresh.length) return;

    // Exit running → reposition INSTANTLY to the new content before any
    // culling. The old segments keep fading as viewport-fixed clones
    // above; underneath, the player is already at the destination, so the
    // culling below is evaluated at the DESTINATION viewport. Without
    // this, the smooth auto-scroll would yank the view mid-exit and the
    // fresh segments (still off-screen at this moment) would all be
    // culled — no fade-in at all.
    // 有淡出在进行 → 先瞬时重定位到新内容，再做裁剪。旧段以视口固定
    // 克隆在上方继续淡出；底下玩家已到目的地，下方裁剪按"目的地视口"
    // 评估。否则平滑自动滚动会在淡出途中生拉视口，而新段（此刻仍在
    // 屏外）会被全部裁掉——连淡入都没有。
    // (Smooth scrolling can't work here: it never updates rects
    // synchronously, so culling would always read stale positions.)
    // （平滑滚动在此无效：它不会同步更新 rect，裁剪永远读到旧位置。）
    if (wait > 0) {
      var passages = container.querySelectorAll(".inkshell-passage");
      var target = passages.length
        ? passages[passages.length - 1]
        : fresh[0];
      if (target) {
        var y = window.pageYOffset +
          target.getBoundingClientRect().top - barOffset();
        window.scrollTo(0, Math.max(0, y));
      }
    }

    // Viewport culling: fresh segments OFF-screen skip the choreography
    // and appear fully formed — the staggered "一段接一段" sequence is
    // only spent on what the player can actually see. Otherwise a long
    // turn's tail would still be queueing while the player has already
    // scrolled past the unfinished animation.
    // 视口裁剪：屏外新段跳过编排直接成型——"一段接一段"的 stagger
    // 序列只花在玩家真正看得见的内容上。否则长回合的尾部还在排队，
    // 玩家早已滑过尚未播到的动画。
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var onscreen = [];
    for (var v = 0; v < fresh.length; v++) {
      var r = fresh[v].getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) onscreen.push(fresh[v]);
    }
    if (!onscreen.length) return;

    var stagger = cssSec("--fade-in-stagger", 0.2);
    var dur = cssSec("--fade-in-duration", 0.6);
    for (var j = 0; j < onscreen.length; j++) {
      var seg = onscreen[j];
      seg.classList.add("ks-enter"); // opacity 0, no transition
      // Round to ms — 0.3s-style values produce FP noise like 0.8999…s.
      // 毫秒取整——0.3s 这类值会产生 0.8999…s 的浮点噪声。
      seg.style.transitionDelay =
        Math.round((wait + j * stagger) * 1000) / 1000 + "s";
      if (seg.classList.contains("inkshell-image")) {
        seg.setAttribute("data-ks-seen", "");
      }
    }
    // Force reflow: the browser must register opacity:0 before release,
    // otherwise the transition has nothing to animate from.
    // 强制回流：浏览器必须先登记 opacity:0，否则过渡没有起点可播。
    void container.offsetWidth;
    for (var k = 0; k < onscreen.length; k++) {
      (function (el, idx) {
        el.classList.remove("ks-enter");
        // Hygiene: drop the inline delay once the fade has completed, so it
        // can't leak into any future opacity change of this element.
        // 卫生：淡入结束后清掉内联 delay，避免渗入该元素未来的透明度变化。
        var done = false;
        var clear = function () {
          if (!done) { done = true; el.style.transitionDelay = ""; }
        };
        el.addEventListener("transitionend", clear, { once: true });
        setTimeout(clear, (wait + idx * stagger + dur) * 1000 + 200);
      })(onscreen[k], k);
    }
  });

  // Restored images from a save snapshot must not be mistaken for new
  // segments on the next turn — mark them seen, never fade them.
  // 读档快照还原的图片不能在下一回合被误认为新段——标记为已见，永不淡入。
  player.on("save:loaded", function () {
    var container = player.container;
    if (!container) return;
    var imgs = container.querySelectorAll(".inkshell-image");
    for (var i = 0; i < imgs.length; i++) imgs[i].setAttribute("data-ks-seen", "");
  });

  // ---- fade-out on clear / CLEAR 时淡出 ----
  // The Clear plugin removes old segments synchronously — we can't (and
  // shouldn't) delay that. Instead we clone the doomed segments into a
  // viewport-fixed overlay at their exact on-screen positions and fade
  // the clones, while the real nodes vanish and new segments fade in
  // underneath: a crossfade with zero layout/scroll side effects.
  // Clear 插件同步移除旧段——我们不能（也不该）拖延它。改为把将死的段
  // 克隆到视口固定覆盖层的原屏幕位置上淡出；真实节点消失、新段在
  // 下方淡入：零布局/滚动副作用的交叉淡变。
  // Priority 75: MUST run before the Image plugin's dom:clear cleanup
  // (priority 50), which removes tracked images — otherwise the doomed
  // images are already gone when we collect segments for the exit clones.
  // 优先级 75：必须先于 Image 插件的 dom:clear 清理（优先级 50）运行——
  // 它会移除受追踪的图片，否则收集淡出段时图片已被抢先删掉。
  player.on("dom:clear", function () {
    if (reducedMotion) return;
    var container = player.container;
    if (!container) return;
    // Same segment model as fade-in: pline-level when available, so the
    // exit sweeps paragraph by paragraph ("从一端到一端").
    // 与淡入同一套段模型：有 pline 按段逐个消失（"从一端到一端"）。
    var segments = [];
    for (var i = 0; i < container.children.length; i++) {
      var el = container.children[i];
      if (el.classList.contains("inkshell-passage")) {
        var plines = el.querySelectorAll(":scope > .ks-pline");
        if (plines.length) {
          for (var p = 0; p < plines.length; p++) segments.push(plines[p]);
        } else {
          segments.push(el);
        }
      } else if (el.matches(".inkshell-image, .inkshell-choices")) {
        segments.push(el);
      }
    }
    if (!segments.length) return;
    var dur = cssSec("--fade-out-duration", 0.2);
    var stagger = cssSec("--fade-out-stagger", 0.05);
    if (dur <= 0) return;

    // Viewport culling: only segments intersecting the viewport get exit
    // clones. Off-screen backlog vanishes with the DOM removal (nobody can
    // see it anyway) and never inflates the wait — exit time now scales
    // with ONE SCREEN of content, not the whole reading history.
    // 视口裁剪：只有与视口相交的段才生成淡出克隆。屏外堆叠随 DOM 移除
    // 直接消失（反正没人看得见），绝不撑大等待——淡出时长随"一屏"
    // 而非全部阅读历史。
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var visible = [];
    var rects = [];
    for (var v = 0; v < segments.length; v++) {
      var r = segments[v].getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        visible.push(segments[v]);
        rects.push(r);
      }
    }
    if (!visible.length) return;

    // --fade-wait-exit: tell the upcoming fade-in to hold until this
    // fade-out finishes. Computed from VISIBLE segments only.
    // --fade-wait-exit：让随后的淡入等到本次淡出结束再开始。
    // 只按视口内的段数计算。
    if (cssSec("--fade-wait-exit", 1) > 0) {
      pendingExitMs = Math.round((dur + stagger * (visible.length - 1)) * 1000);
    }

    var overlay = document.createElement("div");
    overlay.className = "ks-exit-layer";
    for (var j = 0; j < visible.length; j++) {
      var rect = rects[j];
      var clone = visible[j].cloneNode(true);
      clone.removeAttribute("data-new");
      clone.classList.remove("ks-enter");
      clone.classList.add("ks-exit");
      clone.style.position = "fixed";
      clone.style.left = rect.left + "px";
      clone.style.top = rect.top + "px";
      clone.style.width = rect.width + "px";
      clone.style.margin = "0";
      clone.style.transitionDelay = Math.round(j * stagger * 1000) / 1000 + "s";
      overlay.appendChild(clone);
    }
    document.body.appendChild(overlay);
    void overlay.offsetWidth; // register initial state / 登记初始状态
    var exits = overlay.querySelectorAll(".ks-exit");
    for (var k = 0; k < exits.length; k++) exits[k].classList.add("go");
    var total = (dur + stagger * (visible.length - 1)) * 1000 + 100;
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, total);
  }, 75);

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
    var passages = container.querySelectorAll(".inkshell-passage");
    if (passages.length) scrollToNew(passages[passages.length - 1]);
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
  //  Built on the window.InkShellSave / window.InkShellReset APIs
  //  exposed by the Save / Load / Reset plugins. Core renders no UI —
  //  the dialogs below are entirely theme-owned.
  //  基于 Save / Load / Reset 插件暴露的 window.InkShellSave /
  //  window.InkShellReset API。core 不渲染任何 UI ——
  //  下方对话框完全由主题搭建。
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
  // The row is a div[role=button], not a <button> — nested <button> ops
  // (导出/导入) inside a <button> row would be invalid HTML.
  // forSave=true: empty slots clickable (save into them).
  // forSave=false: empty slots become import targets (import a .json into them).
  // 行元素用 div[role=button] 而非 <button> —— <button> 行里嵌套
  // 操作钮（导出/导入）是非法 HTML。
  // forSave=true：空槽可点（存入）；false：空槽作为导入目标（导入 .json 到该槽）。
  function slotRow(num, info, forSave) {
    var btn = el("div", "ks-slot");
    btn.setAttribute("role", "button");
    btn.tabIndex = 0;
    btn.appendChild(el("span", "ks-slot-num", String(num)));
    var main = el("div", "ks-slot-main");
    if (info) {
      main.appendChild(el("div", "ks-slot-time", fmtTime(info.timestamp)));
      main.appendChild(el("div", "ks-slot-preview", info.preview || "（无预览）"));
    } else {
      main.appendChild(el("div", "ks-slot-time", forSave ? "空槽位" : "空槽位（可导入存档）"));
      if (!forSave) btn.classList.add("ks-slot--empty");
    }
    btn.appendChild(main);
    return btn;
  }

  // Enter / Space activate div[role=button] rows (real <button> gets this free).
  // Enter / Space 激活 div[role=button] 行（真 <button> 自带此行为）。
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = e.target;
    if (t && t.classList && t.classList.contains("ks-slot")) {
      e.preventDefault();
      t.click();
    }
  });

  // ---- small per-row op button (export / import) / 槽行小操作钮（导出/导入） ----
  // stopPropagation so the row's own click (save/load) never fires.
  // stopPropagation 防止触发整行自身的点击（存档/读档）。
  function addOp(row, label, title, onClick) {
    var ops = row.querySelector(".ks-slot-ops");
    if (!ops) {
      ops = el("div", "ks-slot-ops");
      row.classList.add("ks-slot--has-ops");
      row.appendChild(ops);
    }
    var b = el("button", "ks-op", label);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      onClick();
    });
    ops.appendChild(b);
    return b;
  }

  // ---- auto-save slot row (numbered "自" / 自动存档行（标记"自"）） ----
  function autoRow(info) {
    var btn = el("div", "ks-slot");
    btn.setAttribute("role", "button");
    btn.tabIndex = 0;
    btn.appendChild(el("span", "ks-slot-num", "自"));
    var main = el("div", "ks-slot-main");
    if (info) {
      main.appendChild(el("div", "ks-slot-time", "自动存档 · " + fmtTime(info.timestamp)));
      main.appendChild(el("div", "ks-slot-preview", info.preview || "（无预览）"));
    } else {
      main.appendChild(el("div", "ks-slot-time", "自动存档（空）"));
      btn.classList.add("ks-slot--empty");
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
        // Occupied slots can be exported to a .json backup right from here.
        // 已占用的槽位可以直接从这里导出为 .json 备份。
        if (info) {
          addOp(row, "导出", "导出为 .json 文件", function () {
            saveApi.exportSave(n);
          });
        }
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
  // Occupied rows get an 导出 op; empty rows get an 导入 op (file picker).
  // After an import completes the dialog refreshes so the new save shows up.
  // 占用行带「导出」；空行带「导入」（弹文件选择器）。
  // 导入完成后对话框自动刷新，让新存档出现。
  var loadModal = null; // currently open load dialog / 当前打开的读档对话框

  player.on("save:imported", function () {
    if (loadModal) {
      loadModal.close();
      openLoad(window.InkShellSave);
    }
  });

  function openLoad(saveApi) {
    var slots = saveApi.getSlots();
    var m = openModal("读取存档");
    // Track the open dialog so save:imported can refresh it; unwrap on close.
    // 跟踪打开的对话框以便 save:imported 刷新；关闭时解除跟踪。
    loadModal = m;
    var origClose = m.close;
    m.close = function () {
      if (loadModal === m) loadModal = null;
      origClose();
    };

    var aRow = autoRow(slots[0]);
    aRow.addEventListener("click", function () {
      if (!slots[0]) return;
      saveApi.load(0);
      m.close();
      scrollToEnd();
    });
    if (slots[0]) {
      addOp(aRow, "导出", "导出为 .json 文件", function () {
        saveApi.exportSave(0);
      });
    }
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
          addOp(row, "导出", "导出为 .json 文件", function () {
            saveApi.exportSave(n);
          });
        } else {
          // Empty slot → import target. importSave() pops a file picker;
          // the save:imported listener above refreshes this dialog.
          // 空槽 → 导入目标。importSave() 弹文件选择器；
          // 上方 save:imported 监听器负责刷新本对话框。
          addOp(row, "导入", "从 .json 文件导入到此槽", function () {
            saveApi.importSave(n);
          });
        }
        m.body.appendChild(row);
      })(i, slots[i]);
    }

    // Persistence warning / 持久性提示
    m.body.appendChild(el(
      "div",
      "ks-hint",
      "存档保存在浏览器中：清理浏览器的「Cookie 和网站数据」会将其删除。重要进度请用「导出」备份为文件。"
    ));
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
