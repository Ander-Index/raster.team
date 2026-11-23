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
  var themeId = "theme-kurokawa-logistics";
  player.uninstall(themeId);
  var cleanup = function () {};
  var cleanupDefaults = function () {};
  var theme = {
    id: themeId,
    version: "1.0.0",
    install: function () {
      var disposed = false;
      var nativeListeners = new Set();
      var timers = new Set();
      var ownedOverlays = new Set();
      var shell = null;

      function listen(target, type, handler, options) {
        var record;
        function wrapped(event) {
          if (options && typeof options === "object" && options.once) record.remove();
          if (!disposed) handler.call(this, event);
        }
        record = {
          target: target,
          remove: function () {
            target.removeEventListener(type, wrapped, options);
            nativeListeners.delete(record);
          }
        };
        target.addEventListener(type, wrapped, options);
        nativeListeners.add(record);
        return record.remove;
      }
      function schedule(callback, delay) {
        var timer = window.setTimeout(function () {
          timers.delete(timer);
          if (!disposed) callback();
        }, delay);
        timers.add(timer);
        return timer;
      }
      function removeListenersWithin(root) {
        Array.from(nativeListeners).forEach(function (record) {
          if (record.target === root || root.contains(record.target)) record.remove();
        });
      }
      function removeOverlay(overlay) {
        removeListenersWithin(overlay);
        ownedOverlays.delete(overlay);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }

      cleanup = function () {
        if (disposed) return;
        disposed = true;
        if (armed) unarmAll();
        if (io) io.disconnect();
        io = null;
        if (modalObserver) modalObserver.disconnect();
        modalObserver = null;
        Array.from(nativeListeners).forEach(function (record) { record.remove(); });
        timers.forEach(function (timer) { window.clearTimeout(timer); });
        timers.clear();
        Array.from(ownedOverlays).forEach(removeOverlay);
        if (stack) stack.length = 0;
        (inertRoots || []).forEach(function (saved) {
          if (saved.value === null) saved.node.removeAttribute("inert");
          else saved.node.setAttribute("inert", saved.value);
        });
        inertRoots = [];
        if (firstModalFocus && firstModalFocus.isConnected && firstModalFocus.focus) firstModalFocus.focus();
        firstModalFocus = null;
        var root = player.container;
        if (root) root.querySelectorAll(".ks-enter, [style]").forEach(function (node) {
          node.classList.remove("ks-enter");
          node.style.transitionDelay = "";
        });
        if (shell && shell.parentNode) shell.parentNode.removeChild(shell);
      };

      // This theme owns its shell structure, labels and feature selection.
      // 本主题持有外壳结构、文案与功能选择。
      var container = player.container;
      if (container && !document.getElementById("inkshell-bar")) {
        shell = document.createElement("header");
        shell.className = "inkshell-bar";
        shell.id = "inkshell-bar";
        shell.innerHTML =
          '<div class="inkshell-logo" aria-hidden="true"></div>' +
          '<div class="inkshell-title" id="inkshell-title">InkShell</div>' +
          '<div class="inkshell-spacer"></div>' +
          '<button type="button" class="inkshell-btn inkshell-burger" id="inkshell-burger" aria-label="菜单" aria-expanded="false">≡</button>' +
          '<nav class="inkshell-actions" id="inkshell-actions" aria-label="功能">' +
          '<button type="button" class="inkshell-btn" id="inkshell-save" disabled>保存</button>' +
          '<button type="button" class="inkshell-btn" id="inkshell-load" disabled>读取</button>' +
          '<button type="button" class="inkshell-btn" id="inkshell-reset" disabled>重置</button>' +
          '<button type="button" class="inkshell-btn" id="inkshell-theme" hidden>主题</button>' +
          '</nav>';
        container.parentNode.insertBefore(shell, container);
      }
      cleanupDefaults = window.InkShellUtils.installDefaultPlugins(player, {
        input: {
          textPrompt: "Enter text:",
          numberPrompt: "Enter a number:",
          submitLabel: "OK",
          focus: true,
          placement: "before-choices"
        },
        title: {
          target: document.getElementById("inkshell-title"),
          suffix: " | InkShell"
        },
        palette: {
          button: document.getElementById("inkshell-theme"),
          target: document.body,
          storageKey: "inkshell_theme"
        }
      });

      // ---- Click logo to open site / 点击 logo 打开网站 ----
      var logo = document.querySelector(".inkshell-logo");
      if (logo) {
        logo.style.cursor = "pointer";
        logo.title = "黑川物流";
        // The shell ships the logo as aria-hidden decoration; since this theme
        // makes it clickable, expose it to AT and keyboards too.
        // 外壳里 logo 是 aria-hidden 装饰；本主题让它可点击，
        // 因此对辅助技术与键盘也要可见、可聚焦。
        logo.removeAttribute("aria-hidden");
        logo.setAttribute("role", "button");
        logo.tabIndex = 0;
        listen(logo, "click", function () {
          window.open("https://kurokawa-logistics.com/", "_blank", "noopener");
        });
        listen(logo, "keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            logo.click();
          }
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
        listen(burger, "click", function (e) {
          e.stopPropagation();
          var open = actions.classList.toggle("inkshell-open");
          burger.setAttribute("aria-expanded", open ? "true" : "false");
        });
        // Click outside to close / 点击外部关闭
        listen(document, "click", function (e) {
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
      // Trailing \n is kept as-is; it has no layout height at passage end.
      // 结尾 \n 原样保留；它在段落末尾不会产生布局高度。
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

        // A trailing newline has no layout height at the end of a passage.
        // Supply the same gap across turn boundaries when Ink did not emit a
        // leading newline, without doubling an existing leading gap.
        // 段尾换行不会产生布局高度。Ink 未输出前导换行时，在回合边界
        // 补上相同的段距；已有前导段距则不重复添加。
        var previous = passage.previousElementSibling;
        var first = passage.firstElementChild;
        if (previous && previous.classList.contains("inkshell-passage") &&
            !(first && first.classList.contains("ks-pgap"))) {
          var boundaryGap = document.createElement("span");
          boundaryGap.className = "ks-pgap";
          boundaryGap.setAttribute("aria-hidden", "true");
          passage.insertBefore(boundaryGap, passage.firstChild);
        }
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

      // Release one entering segment: remove .ks-enter so opacity transitions
      // to 1, then drop the inline delay once the fade completed, so it can't
      // leak into any future opacity change of this element.
      // 释放一个入场段：移除 .ks-enter 让透明度过渡到 1；淡入结束后清掉
      // 内联 delay，避免渗入该元素未来的透明度变化。
      function releaseSegment(el) {
        el.classList.remove("ks-enter");
        var done = false;
        var stop = function () {};
        var timer = null;
        var clear = function () {
          if (done) return;
          done = true;
          stop();
          if (timer !== null) { window.clearTimeout(timer); timers.delete(timer); }
          el.style.transitionDelay = "";
        };
        stop = listen(el, "transitionend", clear, { once: true });
        var dur = cssSec("--fade-in-duration", 0.6);
        var delay = parseFloat(el.style.transitionDelay) || 0;
        timer = schedule(clear, (delay + dur) * 1000 + 200);
      }

      // Segments beyond the destination viewport are ARMED on an
      // IntersectionObserver instead of being dropped: they stay hidden and
      // fade in when the reader scrolls them into view. Without this, any
      // content past one screen (tall images especially) popped in fully
      // formed — its entrance animation lost.
      // 超出目标视口的段布防到 IntersectionObserver 而非丢弃：先保持隐藏，
      // 读者滚动到它们时才淡入。否则超出一屏的内容（尤其是高图片）会
      // 直接成型弹出——出现动画丢失。
      var io = null;
      var armed = []; // currently armed segments / 当前已布防的段
      function armSegment(seg) {
        // reduced motion / no IO → old culling behavior: leave fully formed.
        // 减少动态 / 无 IO → 旧的裁剪行为：保持直接成型。
        if (reducedMotion || !("IntersectionObserver" in window)) return false;
        if (!io) {
          io = new IntersectionObserver(function (entries) {
            var batch = [];
            for (var i = 0; i < entries.length; i++) {
              if (!entries[i].isIntersecting) continue;
              io.unobserve(entries[i].target);
              batch.push(entries[i].target);
            }
            if (!batch.length) return;
            var stagger = cssSec("--fade-in-stagger", 0.2);
            for (var j = 0; j < batch.length; j++) {
              var el = batch[j];
              var ai = armed.indexOf(el);
              if (ai >= 0) armed.splice(ai, 1);
              // Round to ms — 0.3s-style values produce FP noise like 0.8999…s.
              // 毫秒取整——0.3s 这类值会产生 0.8999…s 的浮点噪声。
              el.style.transitionDelay = Math.round(j * stagger * 1000) / 1000 + "s";
              releaseSegment(el);
            }
          });
        }
        seg.classList.add("ks-enter"); // opacity 0, no transition
        armed.push(seg);
        io.observe(seg);
        return true;
      }
      // Cleared/restarted content leaves the DOM — stop observing it.
      // 被清屏/重启移除的内容——停止观察。
      function unarmAll() {
        if (io) for (var i = 0; i < armed.length; i++) io.unobserve(armed[i]);
        armed.length = 0;
      }

      player.on("story:turnComplete", function () {
        var container = player.container;
        if (!container) return;
        // Prune armed segments whose nodes left the DOM without a dom:clear
        // (e.g. DomRenderer replacing the choices block) — otherwise the
        // observer accumulates detached nodes over a long append-only session.
        // 修剪：节点在没有 dom:clear 的情况下被移出 DOM（如 DomRenderer
        // 替换选项块）时解除观察——否则长 append-only 会话中观察器会
        // 缓慢累积游离节点。
        for (var a = armed.length - 1; a >= 0; a--) {
          if (!armed[a].isConnected) {
            if (io) io.unobserve(armed[a]);
            armed.splice(a, 1);
          }
        }
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
            // Mark seen at collection time: every fresh image is handled this
            // turn — either animated now or armed for scroll-into-view.
            // 收集时即标记已见：每张新图本回合都会被处理——要么立即淡入，
            // 要么布防待滚入视口淡入。
            el.setAttribute("data-ks-seen", "");
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

        var vh = window.innerHeight || document.documentElement.clientHeight;

        // Viewport culling, evaluated at the DESTINATION viewport. Append-mode
        // turns (no # CLEAR) are smooth-scrolled AFTER this handler by the
        // auto-scroll listener — culling at the pre-scroll position would drop
        // the entrance animation for everything below the current fold, which
        // is most of an appended turn (the new content starts where the old
        // choices were: at the bottom edge of the screen).
        // 视口裁剪，按"目标视口"评估。叠加回合（无 # CLEAR）在本处理器之后
        // 才会被自动滚动平滑带到新段落——若按滚动前位置裁剪，当前折叠线
        // 以下的内容全部丢失淡入动画，而叠加回合的新内容恰恰从屏幕底边
        // （旧选项的位置）开始，几乎全军覆没。
        var pageY = window.pageYOffset;
        var destTop = pageY; // wait>0 repositioned instantly above → current = destination
        if (!(wait > 0)) {
          if (justRestarted) {
            destTop = 0; // scrollToNew will jump to the very top / scrollToNew 会跳到顶部
          } else {
            var ps = container.querySelectorAll(".inkshell-passage");
            if (ps.length) {
              // Mirror scrollToNew's target: newest passage top at barOffset,
              // clamped to the scrollable range.
              // 与 scrollToNew 的目标一致：最新段落顶部对齐 barOffset，
              // 并夹取到可滚动范围内。
              var lp = ps[ps.length - 1];
              destTop = Math.max(0,
                pageY + lp.getBoundingClientRect().top - barOffset());
              var maxY = Math.max(0, document.documentElement.scrollHeight - vh);
              if (destTop > maxY) destTop = maxY;
            }
          }
        }
        var onscreen = [];
        var beyond = [];
        for (var v = 0; v < fresh.length; v++) {
          var r = fresh[v].getBoundingClientRect();
          var dTop = r.top + pageY;
          if (dTop + r.height > destTop && dTop < destTop + vh) {
            onscreen.push(fresh[v]);
          } else {
            beyond.push(fresh[v]);
          }
        }

        var stagger = cssSec("--fade-in-stagger", 0.2);
        for (var j = 0; j < onscreen.length; j++) {
          var seg = onscreen[j];
          seg.classList.add("ks-enter"); // opacity 0, no transition
          // Round to ms — 0.3s-style values produce FP noise like 0.8999…s.
          // 毫秒取整——0.3s 这类值会产生 0.8999…s 的浮点噪声。
          seg.style.transitionDelay =
            Math.round((wait + j * stagger) * 1000) / 1000 + "s";
        }
        // Force reflow: the browser must register opacity:0 before release,
        // otherwise the transition has nothing to animate from.
        // 强制回流：浏览器必须先登记 opacity:0，否则过渡没有起点可播。
        void container.offsetWidth;
        for (var k = 0; k < onscreen.length; k++) releaseSegment(onscreen[k]);

        // Beyond the destination viewport: arm for scroll-into-view fade-in.
        // 目标视口之外：布防为滚入视口时淡入。
        for (var m = 0; m < beyond.length; m++) armSegment(beyond[m]);
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

      // Strip transient fade state from save snapshots (save.ts emits
      // save:snapshot with the detached clone before serializing). Armed
      // segments that never entered the viewport carry .ks-enter (opacity 0) —
      // baked into a save, the restored content would stay invisible forever.
      // 从存档快照中剥离瞬态淡入状态（save.ts 在序列化前发出 save:snapshot，
      // 携带脱离文档的克隆）。已布防但从未入视口的段带有 .ks-enter
      // （opacity 0）——若被烤进存档，还原出的内容将永远隐形。
      player.on("save:snapshot", function (data) {
        var root = data && data.element;
        if (!root) return;
        var entering = root.querySelectorAll(".ks-enter");
        for (var i = 0; i < entering.length; i++) {
          entering[i].classList.remove("ks-enter");
        }
        // Also drop any inline transition-delay captured mid-fade.
        // 顺便清掉淡出/淡入中途捕获的内联 transition-delay。
        var all = root.querySelectorAll("*");
        for (var j = 0; j < all.length; j++) all[j].style.transitionDelay = "";
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
        unarmAll(); // doomed segments must not stay observed / 将移除的段不再观察
        // Same segment model as fade-in: pline-level when available, so the
        // exit sweeps paragraph by paragraph ("从一端到一端").
        // 与淡入同一套段模型：有 pline 按段逐个消失（"从一端到一端"）。
        var segments = [];
        for (var i = 0; i < container.children.length; i++) {
          var el = container.children[i];
          // Segments still hidden (armed, never faded in) get no exit clone —
          // you can't fade OUT what never faded IN.
          // 仍隐藏的段（已布防、从未淡入）不生成淡出克隆——
          // 没淡入过的东西无从淡出。
          if (el.classList.contains("inkshell-passage")) {
            var plines = el.querySelectorAll(":scope > .ks-pline");
            if (plines.length) {
              for (var p = 0; p < plines.length; p++) {
                if (!plines[p].classList.contains("ks-enter")) segments.push(plines[p]);
              }
            } else if (!el.classList.contains("ks-enter")) {
              segments.push(el);
            }
          } else if (
            el.matches(".inkshell-image, .inkshell-choices") &&
            !el.classList.contains("ks-enter")
          ) {
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
          // Clone WITH its style context: a bare cloneNode() reparented under
          // <body> loses the ancestor chain (.inkshell-passage's pre-wrap and
          // `.inkshell-passage hr` margins, unitless line-height multiplier)
          // and the container's media-query font-size — the clone visibly
          // grows/shifts the moment the exit starts. cloneWithContext wraps
          // the clone in ancestor replicas and pins the container's font.
          // (Guarded fallback for older inkshell.js without InkShellUtils.)
          // 带上下文克隆：裸 cloneNode() 挂到 <body> 下会丢失祖先链
          // （.inkshell-passage 的 pre-wrap、`.inkshell-passage hr` 边距、
          // 无单位行高的乘数语义）和容器的媒体查询字号——克隆体在淡出
          // 开始的瞬间会明显变大/错位。cloneWithContext 用祖先副本包裹
          // 克隆体并钉住容器字号。（守卫：兼容无 InkShellUtils 的旧版引擎。）
          var clone, cloneRoot;
          if (window.InkShellUtils) {
            var pair = window.InkShellUtils.cloneWithContext(visible[j], container);
            clone = pair.clone;
            cloneRoot = pair.root;
          } else {
            clone = cloneRoot = visible[j].cloneNode(true);
          }
          clone.removeAttribute("data-new");
          clone.classList.remove("ks-enter");
          clone.classList.add("ks-exit");
          clone.style.position = "fixed";
          clone.style.left = rect.left + "px";
          clone.style.top = rect.top + "px";
          clone.style.width = rect.width + "px";
          clone.style.margin = "0";
          clone.style.transitionDelay = Math.round(j * stagger * 1000) / 1000 + "s";
          overlay.appendChild(cloneRoot);
        }
        document.body.appendChild(overlay);
      ownedOverlays.add(overlay);
        void overlay.offsetWidth; // register initial state / 登记初始状态
        var exits = overlay.querySelectorAll(".ks-exit");
        for (var k = 0; k < exits.length; k++) exits[k].classList.add("go");
        var total = (dur + stagger * (visible.length - 1)) * 1000 + 100;
        schedule(function () {
          removeOverlay(overlay);
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

      var scrollRequest = 0;
      function scrollToNew(passage) {
        var request = ++scrollRequest;
        if (justRestarted) {
          justRestarted = false;
          window.scrollTo(0, 0);
          return;
        }
        var pending = turnImages(passage).filter(function (i) { return !i.complete; });
        function go() {
          if (!disposed && request === scrollRequest && passage.isConnected &&
              player.container && player.container.contains(passage)) scrollPassageToTop(passage);
        }
        // All images already loaded (e.g. preloaded → cached) → scroll now, no wait.
        // 图片均已加载（如预加载命中缓存）→ 立即滚动，无需等待。
        if (!pending.length) { go(); return; }
        // Wait for every still-loading image (or the timeout) before scrolling.
        // 等待所有仍在加载的图片（或超时）再滚动。
        var remaining = pending.length;
        var done = false;
        var stops = [];
        var timer = null;
        function finish() {
          if (done) return;
          done = true;
          stops.forEach(function (stop) { stop(); });
          if (timer !== null) { window.clearTimeout(timer); timers.delete(timer); }
          go();
        }
        function settle() {
          if (done) return;
          remaining--;
          if (remaining <= 0) finish();
        }
        pending.forEach(function (i) {
          stops.push(listen(i, "load", settle, { once: true }));
          stops.push(listen(i, "error", settle, { once: true }));
        });
        timer = schedule(finish, 1000);
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
      function readPreference(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
      }
      function writePreference(key, value) {
        try { localStorage.setItem(key, value); } catch (_) { /* optional preference */ }
      }

      // ---- tiny DOM helper / 小型 DOM 助手 ----
      function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
      }

      // ---- modal stack and keyboard focus / 模态栈与键盘焦点 ----
      var stack = [];
      var modalSerial = 0;
      var inertRoots = [];
      var firstModalFocus = null;
      var modalObserver = null;

      function modalTargets(modal) {
        return Array.prototype.filter.call(modal.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]'
        ), function (node) {
          return !node.disabled && node.tabIndex >= 0 &&
            !node.closest('[hidden], [inert], [aria-hidden="true"]');
        });
      }

      function focusModal(entry) {
        var targets = modalTargets(entry.modal);
        (targets[0] || entry.modal).focus();
      }

      // Preserve any inert state that the page had before the first dialog.
      // Nested dialogs also make earlier dialogs inert until they become topmost.
      // 保存原有 inert 属性；嵌套确认框打开时，下层对话框同样暂时不可操作。
      function syncModalInert() {
        if (!stack.length) return;
        var top = stack.length ? stack[stack.length - 1] : null;
        Array.prototype.forEach.call(document.body.children, function (node) {
          var saved = inertRoots.find(function (item) { return item.node === node; });
          if (!saved) {
            saved = { node: node, value: node.getAttribute("inert") };
            inertRoots.push(saved);
          }
          if (top && node !== top.overlay) node.setAttribute("inert", "");
          else if (saved.value === null) node.removeAttribute("inert");
          else node.setAttribute("inert", saved.value);
        });
      }

      function registerModal(overlay, modal, dismiss, onClose) {
        var entry = {
          overlay: overlay, modal: modal, dismiss: dismiss,
          previousFocus: document.activeElement
        };
        var closed = false;
        if (!stack.length) {
          firstModalFocus = document.activeElement;
          inertRoots = [];
          if (window.MutationObserver) {
            modalObserver = new MutationObserver(syncModalInert);
            modalObserver.observe(document.body, { childList: true });
          }
        }
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.tabIndex = -1;
        stack.push(entry);
        syncModalInert();
        focusModal(entry);

        return function close() {
          if (closed) return;
          closed = true;
          var i = stack.indexOf(entry);
          var wasTop = i === stack.length - 1;
          if (i >= 0) stack.splice(i, 1);
          removeOverlay(overlay);
          if (!stack.length) {
            if (modalObserver) modalObserver.disconnect();
            modalObserver = null;
            inertRoots.forEach(function (saved) {
              if (saved.value === null) saved.node.removeAttribute("inert");
              else saved.node.setAttribute("inert", saved.value);
            });
            inertRoots = [];
            var originalFocus = firstModalFocus;
            firstModalFocus = null;
            if (originalFocus && originalFocus.isConnected && originalFocus.focus) {
              originalFocus.focus();
            }
          } else {
            syncModalInert();
            if (wasTop) {
              var top = stack[stack.length - 1];
              if (entry.previousFocus && entry.previousFocus.isConnected &&
                  top.modal.contains(entry.previousFocus)) entry.previousFocus.focus();
              else focusModal(top);
            }
          }
          if (onClose) onClose();
        };
      }

      listen(document, "keydown", function (e) {
        if (!stack.length) return;
        var top = stack[stack.length - 1];
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          top.dismiss();
        } else if (e.key === "Tab") {
          var targets = modalTargets(top.modal);
          var at = targets.indexOf(document.activeElement);
          // Explicitly cycle so the trap also works where inert is unsupported.
          // 显式循环，兼容尚未支持 inert 的环境。
          var next = targets.length
            ? targets[(at + (e.shiftKey ? -1 : 1) + targets.length) % targets.length]
            : top.modal;
          if (at < 0 && targets.length) next = targets[e.shiftKey ? targets.length - 1 : 0];
          e.preventDefault();
          next.focus();
        }
      }, true);

      listen(document, "focusin", function (e) {
        if (!stack.length) return;
        var top = stack[stack.length - 1];
        if (!top.modal.contains(e.target)) focusModal(top);
      });

      // Fallback for browsers that do not implement inert: block background clicks.
      // 无 inert 支持时也阻止点击背景触发故事操作。
      listen(document, "click", function (e) {
        if (stack.length && !stack[stack.length - 1].overlay.contains(e.target)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);

      /** Open a titled modal. Every dismissal passes through the same close hook. */
      function openModal(titleText, onClose) {
        var overlay = el("div", "ks-overlay");
        var modal = el("div", "ks-modal");
        var head = el("div", "ks-modal-head");
        var title = el("span", null, titleText);
        title.id = "ks-modal-title-" + (++modalSerial);
        modal.setAttribute("aria-labelledby", title.id);
        head.appendChild(title);
        var closeBtn = el("button", "ks-modal-close", "×");
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "关闭");
        head.appendChild(closeBtn);
        var body = el("div", "ks-modal-body");
        modal.appendChild(head);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
      ownedOverlays.add(overlay);
        var close = registerModal(overlay, modal, function () { close(); }, onClose);
        listen(closeBtn, "click", close);
        listen(overlay, "click", function (e) {
          if (e.target === overlay) close();
        });
        return { body: body, close: close };
      }

      /** Blocking confirm; Escape is a cancellation and invokes onResult once. */
      function confirmBox(opts) {
        var overlay = el("div", "ks-overlay");
        var modal = el("div", "ks-modal");
        var body = el("div", "ks-modal-body");
        var message = el("div", "ks-msg", opts.message);
        message.id = "ks-modal-message-" + (++modalSerial);
        modal.setAttribute("aria-labelledby", message.id);
        body.appendChild(message);
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
        cancelBtn.type = "button";
        var primaryCls = "ks-btn " + (opts.danger ? "ks-btn--danger" : "ks-btn--primary");
        var confirmBtn = el("button", primaryCls, opts.confirmText || "确认");
        confirmBtn.type = "button";
        actionsRow.appendChild(cancelBtn);
        actionsRow.appendChild(confirmBtn);
        body.appendChild(actionsRow);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
      ownedOverlays.add(overlay);
        var completed = false;
        var close = registerModal(overlay, modal, function () { done(false); });
        function done(ok) {
          if (completed) return;
          completed = true;
          close();
          if (opts.onResult) opts.onResult(ok, checkbox ? checkbox.checked : false);
        }
        listen(cancelBtn, "click", function () { done(false); });
        listen(confirmBtn, "click", function () { done(true); });
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
      listen(document, "keydown", function (e) {
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
        listen(b, "click", function (e) {
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

      // ---- Save failure feedback / 存读档失败反馈 ----
      var saveErrorSerial = 0;
      var errorModal = null;
      function showSaveError(data) {
        saveErrorSerial++;
        var operation = data && data.operation;
        var prefix = operation === "load" ? "读取失败" :
          operation === "import" ? "导入失败" : operation === "export" ? "导出失败" : "存档操作失败";
        var reason = data && data.reason;
        var storageAction = operation === "clearAll" || operation === "remove" ? "清除" : operation === "load" ? "读取" : "写入";
        var detail = reason === "storage" ? "浏览器无法" + storageAction + "存档。请检查存储空间、隐私模式或网站存储权限。" :
          reason === "invalid-state" || reason === "invalid-save" ? "存档已损坏或与当前故事版本不兼容。" :
          reason === "presentation" ? (operation === "load" || operation === "import"
            ? "存档画面无法恢复。请使用保存时的主题，或检查主题版本是否兼容。"
            : "无法保存当前画面。请重试或联系主题作者。") :
          reason === "file-read" ? "无法读取所选文件。" :
          (data && data.message) || "操作未成功，请稍后重试。";
        if (!errorModal) {
          var m = openModal(prefix, function () { if (errorModal === m) errorModal = null; });
          errorModal = m;
          m.body.appendChild(el("div", "ks-msg", detail));
          var api = window.InkShellSave;
          if (api && api.exportSave && operation !== "export") {
            var exportBtn = el("button", "ks-btn", "导出当前进度备份");
            exportBtn.type = "button";
            listen(exportBtn, "click", function () { api.exportSave(); });
            m.body.appendChild(exportBtn);
          }
        } else {
          errorModal.body.querySelector(".ks-msg").textContent = detail;
        }
      }
      player.on("save:error", showSaveError);

      function saveToSlot(saveApi, slot, modal) {
        var before = saveErrorSerial;
        if (saveApi.save(slot)) modal.close();
        else if (saveErrorSerial === before) showSaveError({ operation: "save" });
      }
      function loadFromSlot(saveApi, slot, modal) {
        var before = saveErrorSerial;
        if (saveApi.load(slot) === true) {
          modal.close();
          scrollToEnd();
        } else if (saveErrorSerial === before) {
          showSaveError({ operation: "load", message: "该槽位为空，或存档与当前故事不兼容。" });
        }
      }

      // ---- Save dialog / 存档对话框（按配置显示手动槽位） ----
      function openSave(saveApi) {
        var slots = saveApi.getSlots();
        var m = openModal("保存到存档槽");
        for (var i = 1; i < slots.length; i++) {
          (function (n, info) {
            var row = slotRow(n, info, true);
            listen(row, "click", function () {
              if (!info || readPreference(OVERWRITE_KEY) === "1") {
                saveToSlot(saveApi, n, m);
              } else {
                confirmBox({
                  message: "存档槽 " + n + " 已有存档，是否覆盖？",
                  checkboxLabel: "不再提示",
                  confirmText: "覆盖",
                  onResult: function (ok, chk) {
                    if (!ok) return;
                    if (chk) writePreference(OVERWRITE_KEY, "1");
                    saveToSlot(saveApi, n, m);
                  },
                });
              }
            });
            if (info) {
              addOp(row, "导出", "导出为 .json 文件", function () {
                saveApi.exportSave(n);
              });
            }
            m.body.appendChild(row);
          })(i, slots[i]);
        }
        var exportCurrent = el("button", "ks-btn", "导出当前进度备份");
        exportCurrent.type = "button";
        listen(exportCurrent, "click", function () { saveApi.exportSave(); });
        m.body.appendChild(exportCurrent);
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
        var m = openModal("读取存档", function () {
          if (loadModal === m) loadModal = null;
        });
        loadModal = m;

        var aRow = autoRow(slots[0]);
        listen(aRow, "click", function () {
          if (!slots[0]) return;
          loadFromSlot(saveApi, 0, m);
        });
        if (slots[0]) {
          addOp(aRow, "导出", "导出为 .json 文件", function () {
            saveApi.exportSave(0);
          });
        }
        m.body.appendChild(aRow);

        m.body.appendChild(el("div", "ks-divider"));

        for (var i = 1; i < slots.length; i++) {
          (function (n, info) {
            var row = slotRow(n, info, false);
            if (info) {
              listen(row, "click", function () {
                loadFromSlot(saveApi, n, m);
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
        listen(opt1, "click", function () {
          if (resetApi) resetApi.restart();
          m.close();
        });

        // 2. Wipe all saves + restart / 清除所有存档并重启
        var opt2 = el("button", "ks-reset-opt ks-reset-opt--danger");
        opt2.appendChild(el("div", "ks-reset-opt-title", "清除所有存档"));
        opt2.appendChild(el("div", "ks-reset-opt-desc", "删除全部存档并重新开始（不可恢复）"));
        listen(opt2, "click", function () {
          confirmBox({
            message: "确定要删除全部存档吗？\n此操作无法撤销。",
            confirmText: "全部删除",
            danger: true,
            onResult: function (ok) {
              if (!ok) return;
              var before = saveErrorSerial;
              if (resetApi && resetApi.clearAll() === true) m.close();
              else if (saveErrorSerial === before) showSaveError({ operation: "clearAll" });
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
        listen(saveBtn, "click", function () {
          closeMenu();
          openSave(saveApi);
        });
      }

      var loadBtn = document.getElementById("inkshell-load");
      if (loadBtn && saveApi) {
        loadBtn.disabled = false;
        loadBtn.removeAttribute("title");
        listen(loadBtn, "click", function () {
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
        listen(resetBtn, "click", function () {
          closeMenu();
          openReset();
        });
      }


    },
    uninstall: function () { cleanup(); }
  };
  try {
    player.install(theme);
  } catch (error) {
    player.uninstall(themeId);
    cleanupDefaults();
    throw error;
  }
  return function () {
    if (player.getPlugin(themeId) === theme) player.uninstall(themeId);
    cleanupDefaults();
  };
};
