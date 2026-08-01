"use strict";
var __inkshell_entry__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    Audio: () => Audio,
    Background: () => Background,
    Class: () => Class,
    Clear: () => Clear,
    DomRenderer: () => DomRenderer,
    Image: () => Image,
    InkShell: () => InkShell,
    InputNumber: () => InputNumber,
    InputText: () => InputText,
    Link: () => Link,
    LinkOpen: () => LinkOpen,
    Load: () => Load,
    Reset: () => Reset,
    Restart: () => Restart,
    Save: () => Save,
    Theme: () => Theme,
    Title: () => Title,
    parseTag: () => parseTag
  });

  // src/tags.ts
  function parseTag(raw) {
    let s = raw.trim();
    if (s.startsWith("#")) s = s.slice(1).trim();
    const colonIdx = s.indexOf(":");
    let name;
    let value;
    if (colonIdx !== -1) {
      name = s.slice(0, colonIdx);
      value = s.slice(colonIdx + 1).trim();
    } else {
      name = s;
      value = "";
    }
    name = name.trim().replace(/:+$/, "").toLowerCase();
    if (/\s/.test(name)) {
      console.warn(
        'InkShell: malformed tag "' + raw + '" \u2014 name resolved to "' + name + '". A colon is required before any value, e.g. "# TAGNAME: value". Without the colon the whole string becomes the tag name and no listener will match, so the tag silently does nothing.'
      );
    }
    return { name, raw, value };
  }

  // src/engine.ts
  var InkShell = class {
    constructor(config) {
      if (!config || !config.inkJson) {
        throw new Error("InkShell: config.inkJson is required");
      }
      if (typeof window === "undefined" || !window.inkjs || !window.inkjs.Story) {
        throw new Error(
          "InkShell: inkjs is required. Load ink.js before inkshell.js"
        );
      }
      this._container = config.container || null;
      this._content = null;
      this._events = {};
      this._plugins = {};
      this._externals = {};
      this._cumulativeText = "";
      this._listenerOrder = 0;
      this._currentInstallPriority = 0;
      this._epoch = 0;
      this._endedFired = false;
      this._lastVarValues = {};
      const inkjs = window.inkjs;
      this._story = new inkjs.Story(config.inkJson);
      this._installVariableObserver();
    }
    // ---- events / 事件 ----
    /**
     * Register a listener. Inherits the priority of the plugin currently
     * being installed (or 0 if called outside install()).
     * 注册监听器。继承当前正在安装的插件的优先级
     * （在 install() 外调用则使用 0）。
     */
    on(event, callback, priority) {
      if (!this._events[event]) this._events[event] = [];
      const p = priority !== void 0 ? priority : this._currentInstallPriority;
      this._events[event].push({
        fn: callback,
        priority: p,
        order: this._listenerOrder++
      });
      this._events[event].sort(
        (a, b) => b.priority - a.priority || a.order - b.order
      );
      return this;
    }
    off(event, callback) {
      const list = this._events[event];
      if (!list) return this;
      const i = list.findIndex((h) => h.fn === callback);
      if (i !== -1) list.splice(i, 1);
      if (list.length === 0) delete this._events[event];
      return this;
    }
    emit(event, data) {
      const list = this._events[event];
      if (!list) return;
      const snapshot = list.slice();
      for (let i = 0; i < snapshot.length; i++) {
        try {
          snapshot[i].fn(data);
        } catch (e) {
          console.error('InkShell: error in "' + event + '" handler:', e);
        }
      }
    }
    // ---- lifecycle / 生命周期 ----
    start() {
      if (!this._story) return;
      this._cumulativeText = "";
      this.emit("story:loaded", {});
      this.continue();
    }
    restart() {
      if (!this._story) return;
      try {
        this._story.ResetState();
        this._installVariableObserver();
      } catch (e) {
        console.error("InkShell: error restarting story:", e);
        return;
      }
      this._epoch++;
      this._endedFired = false;
      this._lastVarValues = {};
      this._content = null;
      this._cumulativeText = "";
      this.emit("story:restart", {});
      this.continue();
    }
    destroy() {
      for (const id of Object.keys(this._plugins)) {
        const p = this._plugins[id];
        try {
          if (typeof p.uninstall === "function") p.uninstall();
        } catch (e) {
          console.error('InkShell: error uninstalling "' + id + '":', e);
        }
      }
      this._plugins = {};
      this._events = {};
      this._externals = {};
      this._story = null;
      this._container = null;
      this._content = null;
      this._cumulativeText = "";
      this._epoch++;
    }
    // ---- story progression / 故事推进 ----
    continue() {
      if (!this._story) return;
      try {
        const story = this._story;
        const parsedTags = [];
        const turnText = [];
        const epoch = this._epoch;
        while (story.canContinue) {
          turnText.push(story.Continue());
          const rawTags = story.currentTags || [];
          let cleared = false;
          for (let i = 0; i < rawTags.length; i++) {
            const tag = parseTag(rawTags[i]);
            parsedTags.push(tag);
            this.emit("tag:" + tag.name, tag);
            if (tag.name === "clear") cleared = true;
          }
          if (this._epoch !== epoch) return;
          if (cleared) {
            turnText.splice(0, turnText.length - 1);
            this._cumulativeText = "";
          }
        }
        const delta = turnText.join("");
        this._cumulativeText += delta;
        this._content = {
          text: this._cumulativeText,
          delta,
          tags: parsedTags,
          choices: story.currentChoices ? story.currentChoices.map(
            (c) => ({
              index: c.index,
              text: c.text,
              tags: c.tags || []
            })
          ) : [],
          path: story.state && story.state.currentPathString || null
        };
        if (!story.canContinue && story.currentChoices && story.currentChoices.length === 0) {
          if (!this._endedFired) {
            this._endedFired = true;
            this.emit("story:ended", {});
          }
        } else {
          this._endedFired = false;
        }
        this.emit("story:content", this._content);
        this.emit("story:turnComplete", this._content);
      } catch (e) {
        this.emit("story:error", {
          message: e.message,
          error: e
        });
      }
    }
    // ---- choices / 选项 ----
    choose(index) {
      if (!this._story) return;
      const story = this._story;
      const choices = story.currentChoices;
      if (!choices || index < 0 || index >= choices.length) return;
      story.ChooseChoiceIndex(index);
      this.emit("story:choice", {
        index,
        text: choices[index].text
      });
      this.continue();
    }
    // ---- save/load / 存档/读档 ----
    save() {
      if (!this._story) return null;
      const story = this._story;
      if (!story.state) return null;
      return story.state.ToJson();
    }
    /**
     * Restore a saved state. Returns true on success; false (and a
     * story:error event) when the JSON is corrupt or from an incompatible
     * story version — in that case the current story keeps running and the
     * DOM is left untouched.
     * 恢复存档状态。成功返回 true；JSON 损坏或来自不兼容的故事版本时
     * 返回 false（并发出 story:error）——此时当前故事继续运行，DOM 不变。
     */
    load(jsonStr) {
      if (!this._story) return false;
      const story = this._story;
      if (!story.state) return false;
      try {
        story.state.LoadJson(jsonStr);
      } catch (e) {
        this.emit("story:error", {
          message: e.message,
          error: e
        });
        return false;
      }
      this._epoch++;
      this._endedFired = false;
      this._lastVarValues = {};
      this._content = null;
      this._cumulativeText = "";
      this.emit("story:load", {});
      this.continue();
      return true;
    }
    // ---- read-only state / 只读状态 ----
    get canContinue() {
      return this._story ? this._story.canContinue : false;
    }
    get currentText() {
      return this._content ? this._content.text : "";
    }
    get currentTags() {
      return this._content ? this._content.tags : [];
    }
    get currentChoices() {
      return this._content ? this._content.choices : [];
    }
    get currentPath() {
      return this._content ? this._content.path : null;
    }
    get currentDelta() {
      return this._content ? this._content.delta : "";
    }
    /** The root DOM element where plugins render content. / 插件渲染内容的根 DOM 元素。 */
    get container() {
      return this._container;
    }
    /** The inkjs story current turn index, or 0 if unavailable. / inkjs 故事的当前回合数，不可用时返回 0。 */
    getTurnCount() {
      if (!this._story) return 0;
      try {
        return Math.max(
          0,
          this._story.state?.currentTurnIndex ?? 0
        );
      } catch {
        return 0;
      }
    }
    // ---- variables / 变量 ----
    getVariable(name) {
      if (!this._story) return void 0;
      const story = this._story;
      if (!story.variablesState) return void 0;
      return story.variablesState[name];
    }
    setVariable(name, value) {
      if (!this._story) return;
      const story = this._story;
      if (!story.variablesState) return;
      story.variablesState[name] = value;
    }
    /**
     * Subscribe to inkjs global variable changes so that assignments
     * inside the ink source (`~ x = 5`) emit story:variableChanged.
     * Re-installed on restart() because ResetState rebuilds variablesState.
     * 订阅 inkjs 全局变量变更，让 ink 源码内部的赋值
     * （`~ x = 5`）也能发出 story:variableChanged。
     * restart() 后需要重新订阅，因为 ResetState 会重建 variablesState。
     */
    _installVariableObserver() {
      const story = this._story;
      if (!story || !story.state || !story.state.variablesState) return;
      if (typeof story.state.variablesState.ObserveVariableChange !== "function") {
        return;
      }
      try {
        story.state.variablesState.ObserveVariableChange(
          (name, value) => {
            let v = value;
            if (v && typeof v === "object" && "valueObject" in v) {
              v = v.valueObject;
            }
            if (this._lastVarValues[name] === v) return;
            this._lastVarValues[name] = v;
            this.emit("story:variableChanged", { name, value: v });
          }
        );
      } catch (e) {
        console.error("InkShell: failed to install variable observer:", e);
      }
    }
    // ---- plugin system / 插件系统 ----
    install(plugin) {
      if (!plugin || !plugin.id) {
        console.error('InkShell: plugin requires an "id" property');
        return this;
      }
      if (this._plugins[plugin.id]) {
        console.warn('InkShell: plugin "' + plugin.id + '" already installed');
        return this;
      }
      this._plugins[plugin.id] = plugin;
      if (typeof plugin.install === "function") {
        const prev = this._currentInstallPriority;
        this._currentInstallPriority = plugin.priority ?? 0;
        try {
          plugin.install(this);
        } finally {
          this._currentInstallPriority = prev;
        }
      }
      this.emit("plugin:installed", {
        id: plugin.id,
        version: plugin.version || "0.0.0"
      });
      return this;
    }
    uninstall(id) {
      const plugin = this._plugins[id];
      if (!plugin) return this;
      if (typeof plugin.uninstall === "function") {
        plugin.uninstall();
      }
      delete this._plugins[id];
      this.emit("plugin:uninstalled", { id });
      return this;
    }
    getPlugin(id) {
      return this._plugins[id] || null;
    }
    // ---- external function binding / 外部函数绑定 ----
    bindExternal(name, fn) {
      if (!this._story) return this;
      const wrapped = (...args) => {
        try {
          return fn.apply(this, args);
        } catch (e) {
          console.error(
            'InkShell: error in external function "' + name + '":',
            e
          );
          return "";
        }
      };
      this._externals[name] = wrapped;
      this._story.BindExternalFunction(name, wrapped);
      return this;
    }
  };

  // src/sanitizer.ts
  var ALLOWED_TAGS = /* @__PURE__ */ new Set([
    // headings / 标题
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    // text formatting / 文本格式
    "b",
    "i",
    "em",
    "strong",
    "u",
    "s",
    "del",
    "ins",
    "sub",
    "sup",
    "small",
    "mark",
    "kbd",
    // code / 代码
    "code",
    "pre",
    "samp",
    "var",
    // block layout / 块级布局
    "p",
    "div",
    "span",
    "br",
    "hr",
    "blockquote",
    "q",
    "cite",
    // lists / 列表
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    // links & media / 链接与媒体
    "a",
    "img",
    "figure",
    "figcaption"
  ]);
  var ALLOWED_ATTRS_GLOBAL = /* @__PURE__ */ new Set([
    "class",
    "title",
    "alt",
    "dir",
    "lang",
    "style"
  ]);
  var ALLOWED_ATTRS_BY_TAG = {
    a: /* @__PURE__ */ new Set(["href", "target", "rel"]),
    img: /* @__PURE__ */ new Set(["src", "width", "height"])
  };
  var DROP_TAGS = /* @__PURE__ */ new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "applet",
    "frame",
    "frameset",
    "noscript",
    "template"
  ]);
  function isSafeUrl(value) {
    const v = value.trim().toLowerCase();
    if (v.startsWith("javascript:")) return false;
    if (v.startsWith("data:")) return false;
    if (v.startsWith("vbscript:")) return false;
    return true;
  }
  function isAttrAllowed(tag, attr, value) {
    if (attr.startsWith("on")) return false;
    if (ALLOWED_ATTRS_GLOBAL.has(attr)) return true;
    const tagAttrs = ALLOWED_ATTRS_BY_TAG[tag];
    if (tagAttrs && tagAttrs.has(attr)) {
      if ((attr === "href" || attr === "src") && !isSafeUrl(value)) {
        return false;
      }
      return true;
    }
    return false;
  }
  function sanitizeHtml(html) {
    if (!html) return "";
    const stripped = html.replace(/(?:[ \t]*\n[ \t]*)?(<\/?(?:hr|h[1-6]|p|div|blockquote|pre|ul|ol|dl|li|dt|dd)\b[^>]*>)(?:[ \t]*\n[ \t]*)?/gi, "$1");
    const doc = new DOMParser().parseFromString(stripped, "text/html");
    walkAndClean(doc.body);
    return doc.body.innerHTML;
  }
  function walkAndClean(root) {
    const children = Array.from(root.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        cleanElement(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        const parent = child.parentNode;
        if (parent) parent.removeChild(child);
      }
    }
  }
  function cleanElement(el) {
    const tag = el.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (parent) parent.removeChild(el);
      return;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (!parent) return;
      const inner = Array.from(el.childNodes);
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      for (const c of inner) {
        if (c.nodeType === Node.ELEMENT_NODE) {
          cleanElement(c);
        } else if (c.nodeType === Node.COMMENT_NODE) {
          const p = c.parentNode;
          if (p) p.removeChild(c);
        }
      }
      return;
    }
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (!isAttrAllowed(tag, attr.name, attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
    if (tag === "a" && el.target === "_blank") {
      const rel = el.getAttribute("rel") || "";
      if (!rel.split(/\s+/).includes("noopener")) {
        el.setAttribute(
          "rel",
          rel ? rel + " noopener noreferrer" : "noopener noreferrer"
        );
      }
    }
    walkAndClean(el);
  }

  // src/dom-renderer.ts
  var DomRenderer = class {
    constructor() {
      this.id = "dom-renderer";
      this.version = "1.0.0";
      // Core renderer must run before any other story:content listener so that
      // .inkshell-passage exists by the time they emit/flush (Image, Class…).
      // 核心渲染器必须在其他 story:content 监听器之前运行，
      // 这样它们 emit/flush 时 .inkshell-passage 已经存在（Image、Class 等）。
      this.priority = 100;
    }
    install(player) {
      const container = player.container;
      if (!container) {
        console.error("DomRenderer: no container element found");
        return;
      }
      player.on("story:content", (data) => {
        const oldChoices = container.querySelector(".inkshell-choices");
        if (oldChoices) oldChoices.remove();
        const delta = data.delta || "";
        if (delta) {
          const passageDiv = document.createElement("div");
          passageDiv.className = "inkshell-passage";
          passageDiv.setAttribute("data-new", "");
          passageDiv.innerHTML = sanitizeHtml(delta);
          container.appendChild(passageDiv);
          player.emit("dom:passage", {
            element: passageDiv,
            text: data.text,
            delta: data.delta,
            tags: data.tags,
            choices: data.choices
          });
        }
        const choices = data.choices;
        if (choices && choices.length > 0) {
          const choiceDiv = document.createElement("div");
          choiceDiv.className = "inkshell-choices";
          choiceDiv.setAttribute("data-new", "");
          for (const choice of choices) {
            const btn = document.createElement("button");
            btn.className = "inkshell-choice";
            btn.innerHTML = sanitizeHtml(choice.text);
            btn.addEventListener("click", () => {
              player.choose(choice.index);
            });
            choiceDiv.appendChild(btn);
            player.emit("dom:choice", {
              element: btn,
              choice,
              index: choice.index
            });
          }
          container.appendChild(choiceDiv);
        }
      });
    }
    uninstall() {
    }
  };

  // src/plugins/__clear.ts
  var Clear = class {
    constructor() {
      this.id = "clear";
      this.version = "1.0.0";
      this.priority = 50;
    }
    install(player) {
      player.on("tag:clear", () => {
        this._fullClear(player);
      });
      player.on("story:restart", () => {
        this._fullClear(player);
      });
      player.on("story:load", () => {
        this._fullClear(player);
      });
      player.on("story:ended", () => {
        this._clearChoices(player);
      });
    }
    /**
     * Wipe everything: notify other plugins first (so they can pull their
     * own DOM down), then remove passages and choices.
     * 清掉一切：先通知其他插件（让它们自行移除各自的 DOM），
     * 再删除所有段落和选项。
     */
    _fullClear(player) {
      player.emit("dom:clear", {});
      this._clearAllPassages(player);
      this._clearImages(player);
      this._clearChoices(player);
    }
    _clearAllPassages(player) {
      const container = player.container;
      if (!container) return;
      const passages = container.querySelectorAll(".inkshell-passage");
      for (let i = 0; i < passages.length; i++) {
        passages[i].remove();
      }
    }
    /**
     * Remove every story image. The Image plugin removes the ones it tracks on
     * `dom:clear`, but images restored from a save snapshot are untracked — so
     * Clear sweeps all of them itself to guarantee nothing lingers.
     * 移除所有故事图片。Image 插件在 `dom:clear` 时移除它追踪的图片，但从存档
     * 快照还原的图片未被追踪——因此 Clear 自己扫一遍，确保无残留。
     */
    _clearImages(player) {
      const container = player.container;
      if (!container) return;
      const imgs = container.querySelectorAll(".inkshell-image");
      for (let i = 0; i < imgs.length; i++) {
        imgs[i].remove();
      }
    }
    _clearChoices(player) {
      const container = player.container;
      if (!container) return;
      const choices = container.querySelector(".inkshell-choices");
      if (choices) choices.remove();
    }
    uninstall() {
    }
  };

  // src/plugins/__class.ts
  var Class = class {
    constructor() {
      this.id = "class";
      this.version = "1.0.0";
      this.priority = 50;
      this._pendingClasses = [];
    }
    install(player) {
      player.on("story:content", () => {
        this._pendingClasses = [];
      });
      player.on("tag:class", (tag) => {
        if (tag.value) {
          this._pendingClasses = tag.value.split(/\s+/).filter(Boolean);
        }
      });
      player.on("dom:passage", (data) => {
        if (this._pendingClasses.length > 0) {
          const el = data.element;
          if (el) {
            for (const cls of this._pendingClasses) {
              el.classList.add(cls);
            }
          }
        }
      });
    }
    uninstall() {
      this._pendingClasses = [];
    }
  };

  // src/plugins/__image.ts
  var SIZE_CACHE_KEY = "inkshell_imgsize";
  var Image = class {
    constructor() {
      this.id = "image";
      this.version = "1.1.0";
      this.priority = 50;
      /** All images currently in the DOM (for cleanup). / 当前 DOM 中所有图片（用于清理）。 */
      this._allImages = [];
      /** Images queued during tag processing, flushed after passage is created. / 标签处理期间排队的图片，段落创建后批量插入。 */
      this._pending = [];
      /** Cached natural dimensions, keyed by src. / 按来源缓存的原始尺寸。 */
      this._sizes = {};
    }
    install(player) {
      const container = player.container;
      if (!container) return;
      this._sizes = this._loadCache();
      player.on("tag:image", (tag) => {
        const src = this._cleanSrc(tag.value);
        if (!src) return;
        const img = document.createElement("img");
        img.src = src;
        img.className = "inkshell-image";
        img.alt = "";
        this._sizeImg(img, src);
        this._pending.push(img);
      });
      player.on("dom:passage", (data) => {
        if (!data.element) return;
        const imgs = data.element.querySelectorAll("img");
        imgs.forEach((img) => {
          if (img.hasAttribute("data-ks-sized")) return;
          img.setAttribute("data-ks-sized", "");
          this._sizeImg(img, img.currentSrc || img.getAttribute("src") || "");
        });
      });
      player.on("story:content", () => {
        if (this._pending.length === 0) return;
        const passages = container.querySelectorAll(".inkshell-passage");
        const lastPassage = passages.length ? passages[passages.length - 1] : null;
        const choices = container.querySelector(".inkshell-choices");
        for (const img of this._pending) {
          if (lastPassage) {
            lastPassage.after(img);
          } else if (choices) {
            container.insertBefore(img, choices);
          } else {
            container.appendChild(img);
          }
          this._allImages.push(img);
        }
        this._pending = [];
      });
      player.on("dom:clear", () => {
        for (const img of this._allImages) {
          img.remove();
        }
        this._allImages = [];
        this._pending = [];
      });
      this._schedulePreload();
    }
    /**
     * Reserve cached dimensions on an <img> (so layout is stable before load)
     * and remember the real dimensions once it loads.
     * 给 <img> 预占缓存尺寸（使加载前布局稳定），并在加载完成后记下真实尺寸。
     */
    _sizeImg(img, src) {
      const cached = this._sizes[src];
      if (cached && cached.w && cached.h) {
        img.setAttribute("width", String(cached.w));
        img.setAttribute("height", String(cached.h));
      }
      const capture = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;
        const cur = this._sizes[src];
        if (!cur || cur.w !== w || cur.h !== h) {
          this._sizes[src] = { w, h };
          this._saveCache();
        }
      };
      if (img.complete && img.naturalWidth) capture();
      img.addEventListener("load", capture);
    }
    // ---- dimension cache (localStorage) / 尺寸缓存 ----
    _loadCache() {
      try {
        const raw = localStorage.getItem(SIZE_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
    _saveCache() {
      try {
        localStorage.setItem(SIZE_CACHE_KEY, JSON.stringify(this._sizes));
      } catch {
      }
    }
    // ---- background preload / 后台预加载 ----
    _schedulePreload() {
      if (typeof window === "undefined") return;
      requestAnimationFrame(() => setTimeout(() => this._preloadAll(), 0));
    }
    _preloadAll() {
      const data = window.storyContent;
      if (!data) return;
      const urls = /* @__PURE__ */ new Set();
      this._collectUrls(data, urls);
      for (const src of urls) {
        if (this._sizes[src]) continue;
        const probe = document.createElement("img");
        this._sizeImg(probe, src);
        probe.src = src;
      }
    }
    /** Recursively walk the ink JSON, collecting image srcs from #IMAGE tags and inline <img>. / 递归遍历 ink JSON，从 #IMAGE 标签和内联 <img> 收集图片源。 */
    _collectUrls(node, out) {
      if (typeof node === "string") {
        const m1 = node.match(/IMAGE:\s+"?([^\s",]+)"?/);
        if (m1) out.add(this._cleanSrc(m1[1]));
        const m2 = node.match(/<img\b[^>]*?\bsrc\s*=\s*"([^"]+)"/i);
        if (m2) out.add(this._cleanSrc(m2[1]));
      } else if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          this._collectUrls(node[i], out);
        }
      } else if (node && typeof node === "object") {
        for (const k in node) {
          this._collectUrls(node[k], out);
        }
      }
    }
    /** Normalize a raw src like the tag handler does (strip quotes, flip backslashes). / 像标签处理器一样规范化原始 src（去引号、反斜杠转正斜杠）。 */
    _cleanSrc(raw) {
      let s = (raw || "").trim();
      if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
      return s.replace(/\\/g, "/");
    }
    uninstall() {
      for (const img of this._allImages) {
        img.remove();
      }
      this._allImages = [];
      this._pending = [];
    }
  };

  // src/plugins/__restart.ts
  var Restart = class {
    constructor() {
      this.id = "restart";
      this.version = "1.0.0";
      this.priority = 50;
    }
    install(player) {
      player.on("tag:restart", () => {
        player.restart();
      });
    }
    uninstall() {
    }
  };

  // src/plugins/__link.ts
  var Link = class {
    constructor() {
      this.id = "link";
      this.version = "1.0.0";
      this.priority = 50;
    }
    install(player) {
      player.on("tag:link", (tag) => {
        const url = tag.value.replace(/^"|"$/g, "").trim();
        if (url) {
          window.location.href = url;
        }
      });
    }
    uninstall() {
    }
  };

  // src/plugins/__linkopen.ts
  var LinkOpen = class {
    constructor() {
      this.id = "linkopen";
      this.version = "1.0.0";
      this.priority = 50;
    }
    install(player) {
      player.on("tag:linkopen", (tag) => {
        const url = tag.value.replace(/^"|"$/g, "").trim();
        if (url) {
          window.open(url, "_blank");
        }
      });
    }
    uninstall() {
    }
  };

  // src/plugins/input-text.ts
  function parseKeyValue(raw) {
    const result = {};
    const re = /(\w+)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = re.exec(raw)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  }
  var InputText = class {
    constructor() {
      this.id = "input-text";
      this.version = "1.0.0";
      /** Active input wrapper, if any. / 当前活动的输入包装元素（如果有）。 */
      this._wrapper = null;
    }
    install(player) {
      const container = player.container;
      if (!container) return;
      player.on("tag:input-text", (tag) => {
        const params = parseKeyValue(tag.value);
        const varName = params.var || params.variable;
        const prompt = params.prompt || "Enter text:";
        if (!varName) {
          console.error('InputText: #INPUT-TEXT tag missing var="variableName"');
          player.continue();
          return;
        }
        const wrapper = document.createElement("div");
        wrapper.className = "inkshell-input-wrapper";
        const label = document.createElement("span");
        label.className = "inkshell-input-prompt";
        label.textContent = prompt;
        wrapper.appendChild(label);
        const input = document.createElement("input");
        input.type = "text";
        input.className = "inkshell-input-field";
        wrapper.appendChild(input);
        const btn = document.createElement("button");
        btn.className = "inkshell-input-submit";
        btn.textContent = "OK";
        wrapper.appendChild(btn);
        this._wrapper = wrapper;
        const submit = () => {
          const value = input.value.trim();
          if (!value) return;
          player.setVariable(varName, value);
          wrapper.remove();
          this._wrapper = null;
          player.continue();
        };
        btn.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
        container.appendChild(wrapper);
        input.focus();
      });
      player.on("dom:clear", () => {
        if (this._wrapper) {
          this._wrapper.remove();
          this._wrapper = null;
        }
      });
    }
    uninstall() {
      if (this._wrapper) {
        this._wrapper.remove();
        this._wrapper = null;
      }
    }
  };

  // src/plugins/input-number.ts
  function parseKeyValue2(raw) {
    const result = {};
    const re = /(\w+)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = re.exec(raw)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  }
  var InputNumber = class {
    constructor() {
      this.id = "input-number";
      this.version = "1.0.0";
      this._wrapper = null;
    }
    install(player) {
      const container = player.container;
      if (!container) return;
      player.on("tag:input-number", (tag) => {
        const params = parseKeyValue2(tag.value);
        const varName = params.var || params.variable;
        const prompt = params.prompt || "Enter a number:";
        const hasMin = params.min !== void 0 && params.min !== "";
        const hasMax = params.max !== void 0 && params.max !== "";
        const min = hasMin ? parseFloat(params.min) : NaN;
        const max = hasMax ? parseFloat(params.max) : NaN;
        if (!varName) {
          console.error('InputNumber: #INPUT-NUMBER tag missing var="variableName"');
          player.continue();
          return;
        }
        const wrapper = document.createElement("div");
        wrapper.className = "inkshell-input-wrapper";
        const label = document.createElement("span");
        label.className = "inkshell-input-prompt";
        label.textContent = prompt;
        wrapper.appendChild(label);
        const input = document.createElement("input");
        input.type = "number";
        input.className = "inkshell-input-field";
        if (hasMin && !Number.isNaN(min)) input.min = params.min;
        if (hasMax && !Number.isNaN(max)) input.max = params.max;
        wrapper.appendChild(input);
        const btn = document.createElement("button");
        btn.className = "inkshell-input-submit";
        btn.textContent = "OK";
        wrapper.appendChild(btn);
        this._wrapper = wrapper;
        const submit = () => {
          const raw = input.value;
          if (raw === "") return;
          const num = Number(raw);
          if (!isFinite(num)) return;
          if (hasMin && !Number.isNaN(min) && num < min) return;
          if (hasMax && !Number.isNaN(max) && num > max) return;
          player.setVariable(varName, num);
          wrapper.remove();
          this._wrapper = null;
          player.continue();
        };
        btn.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
        container.appendChild(wrapper);
        input.focus();
      });
      player.on("dom:clear", () => {
        if (this._wrapper) {
          this._wrapper.remove();
          this._wrapper = null;
        }
      });
    }
    uninstall() {
      if (this._wrapper) {
        this._wrapper.remove();
        this._wrapper = null;
      }
    }
  };

  // src/storage.ts
  var MAX_SLOT = 9;
  var PREFIX = "inkshell_save";
  var _storyId = "";
  function setStoryId(id) {
    _storyId = (id || "").trim();
  }
  function extractStoryId(json) {
    try {
      const root = json.root;
      if (Array.isArray(root) && Array.isArray(root[0])) {
        const items = root[0];
        let id = "";
        let title = "";
        for (let i = 0; i < items.length; i++) {
          if (items[i] === "#" && typeof items[i + 1] === "string" && items[i + 2] === "/#") {
            const tagVal = String(items[i + 1]).replace(/^\^/, "");
            if (!id) {
              const m = tagVal.match(/^id:\s*(.+)$/i);
              if (m) id = m[1].trim();
            }
            if (!title) {
              const m = tagVal.match(/^title:\s*(.+)$/i);
              if (m) title = m[1].trim();
            }
            i += 2;
          }
        }
        if (id) return id;
        if (title) return title;
      }
    } catch {
    }
    let s;
    try {
      s = JSON.stringify(json);
    } catch {
      s = String(json);
    }
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "h" + (h >>> 0).toString(16);
  }
  function key(slot) {
    return _storyId ? PREFIX + "_" + _storyId + "_" + slot : PREFIX + "_" + slot;
  }
  function get(name) {
    return localStorage.getItem(PREFIX + "_" + name);
  }
  function set(name, value) {
    localStorage.setItem(PREFIX + "_" + name, value);
  }
  function remove(name) {
    localStorage.removeItem(PREFIX + "_" + name);
  }
  function getSlot(slot) {
    try {
      const raw = localStorage.getItem(key(slot));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function setSlot(slot, info) {
    localStorage.setItem(key(slot), JSON.stringify(info));
  }
  function removeSlot(slot) {
    localStorage.removeItem(key(slot));
  }
  function getSlots(count = MAX_SLOT) {
    const n = Math.max(0, Math.min(MAX_SLOT, count));
    const slots = [];
    for (let i = 0; i <= n; i++) slots.push(getSlot(i));
    return slots;
  }
  function clearAllSlots() {
    for (let i = 0; i <= MAX_SLOT; i++) removeSlot(i);
  }
  function getSaveAPI() {
    if (typeof window === "undefined") return null;
    const w = window;
    if (!w.InkShellSave) w.InkShellSave = {};
    return w.InkShellSave;
  }
  if (typeof window !== "undefined") {
    window.InkShellStorage = {
      get,
      set,
      remove,
      getSlot,
      setSlot,
      removeSlot,
      getSlots,
      clearAllSlots,
      setStoryId,
      extractStoryId,
      MAX_SLOT
    };
  }

  // src/plugins/save.ts
  var Save = class {
    constructor(config = {}) {
      this.id = "save";
      this.version = "2.0.0";
      this.priority = 50;
      this._autoSave = config.autoSave !== false;
      const sc = config.slotCount ?? MAX_SLOT;
      this._slotCount = Math.max(1, Math.min(MAX_SLOT, sc));
    }
    install(player) {
      this._player = player;
      const api = getSaveAPI();
      if (api) {
        api.save = (slot = 0) => this.save(slot);
        api.remove = (slot) => this.remove(slot);
        api.get = (slot) => getSlot(slot);
        api.getSlots = () => getSlots(this._slotCount);
        api.exportSave = (slot) => this.exportSave(slot);
      }
      if (this._autoSave) {
        player.on("story:choice", () => {
          queueMicrotask(() => this.save(0));
        });
      }
    }
    /**
     * Snapshot the on-screen passages (excluding the choices block) so a load
     * can replay the full reading history. Returns "" if unavailable.
     * 快照屏幕上的段落（不含选项块），读档时可还原完整阅读历史。不可用时返回 ""。
     */
    _snapshotHtml() {
      const player = this._player;
      if (!player) return "";
      const container = player.container;
      if (!container) return "";
      const clone = container.cloneNode(true);
      clone.querySelectorAll(".inkshell-choices").forEach((c) => c.remove());
      return clone.innerHTML;
    }
    /** Save current state to a slot (0 = auto). Returns the SlotInfo or null. */
    /** 将当前状态存到槽（0 = 自动）。返回 SlotInfo 或 null。 */
    save(slot = 0) {
      const player = this._player;
      if (!player) return null;
      if (!Number.isInteger(slot) || slot < 0 || slot > this._slotCount) return null;
      const state = player.save();
      if (!state) return null;
      const info = {
        state,
        timestamp: Date.now(),
        turnCount: player.getTurnCount(),
        preview: (player.currentText || "").slice(-80),
        html: this._snapshotHtml()
      };
      setSlot(slot, info);
      player.emit("save:saved", { slot, info });
      return info;
    }
    /** Clear a slot. Returns true if there was a save to remove. */
    /** 清除一个槽。若原本有存档返回 true。 */
    remove(slot) {
      if (!Number.isInteger(slot) || slot < 0 || slot > this._slotCount) return false;
      const existed = getSlot(slot) !== null;
      removeSlot(slot);
      if (this._player) this._player.emit("save:removed", { slot });
      return existed;
    }
    /**
     * Download a slot (or the current live state) as a .json file.
     * 把一个槽（或当前实时状态）导出为 .json 文件下载。
     */
    exportSave(slot) {
      const player = this._player;
      let info = null;
      let name;
      if (slot !== void 0 && slot !== null) {
        info = getSlot(slot);
        name = "inkshell-save-slot" + slot;
      } else if (player) {
        const state = player.save();
        if (state) {
          info = {
            state,
            timestamp: Date.now(),
            turnCount: player.getTurnCount(),
            preview: (player.currentText || "").slice(-80),
            html: this._snapshotHtml()
          };
        }
        name = "inkshell-save-current";
      } else {
        return;
      }
      if (!info) return;
      const blob = new Blob([JSON.stringify(info)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (player) player.emit("save:exported", { slot });
    }
    uninstall() {
      this._player = null;
      const api = getSaveAPI();
      if (api) {
        delete api.save;
        delete api.remove;
        delete api.get;
        delete api.getSlots;
        delete api.exportSave;
      }
    }
  };

  // src/plugins/load.ts
  var Load = class {
    constructor() {
      this.id = "load";
      this.version = "2.0.0";
      this.priority = 50;
    }
    install(player) {
      this._player = player;
      const api = getSaveAPI();
      if (api) {
        api.load = (slot = 0) => this.load(slot);
        api.importSave = (slot, file) => this.importSave(slot, file);
      }
    }
    /**
     * Restore a slot. Returns true on success, false if the slot is empty.
     * After the engine restores state + continue() renders the current
     * choices, we re-inject the saved passage HTML ahead of them.
     * 读档。成功返回 true；槽为空返回 false。引擎恢复状态并由 continue()
     * 渲染当前选项后，我们把保存的段落 HTML 插到选项之前。
     */
    load(slot = 0) {
      const player = this._player;
      if (!player) return false;
      const info = getSlot(slot);
      if (!info) return false;
      if (player.load(info.state) === false) return false;
      this._restoreHtml(info.html);
      player.emit("save:loaded", { slot, info });
      return true;
    }
    /**
     * Re-inject saved passage HTML at the top of the container, ahead of the
     * freshly rendered choices. No-op when html is absent (older saves).
     * 把保存的段落 HTML 插到容器顶部、新渲染的选项之前。html 缺失时
     * （旧存档）直接跳过。
     */
    _restoreHtml(html) {
      if (!html) return;
      const player = this._player;
      if (!player) return;
      const container = player.container;
      if (!container) return;
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      if (!tmp.children.length) return;
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) {
        const node = tmp.firstChild;
        if (node instanceof Element) node.removeAttribute("data-new");
        frag.appendChild(node);
      }
      container.insertBefore(frag, container.firstChild);
    }
    /**
     * Read a .json file into a slot. If no file is given, open a file picker.
     * Fires save:imported on success.
     * 把 .json 文件读入一个槽。未给文件则打开文件选择器。成功时发 save:imported。
     */
    importSave(slot, file) {
      const player = this._player;
      if (!Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT) return;
      const doImport = (f) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const info = JSON.parse(String(reader.result));
            if (!info || typeof info.state !== "string") return;
            setSlot(slot, info);
            if (player) player.emit("save:imported", { slot, info });
          } catch {
          }
        };
        reader.readAsText(f);
      };
      if (file) {
        doImport(file);
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        if (input.files && input.files[0]) doImport(input.files[0]);
      };
      input.click();
    }
    uninstall() {
      this._player = null;
      const api = getSaveAPI();
      if (api) {
        delete api.load;
        delete api.importSave;
      }
    }
  };

  // src/plugins/background.ts
  var Background = class {
    constructor() {
      this.id = "background";
      this.version = "1.0.0";
    }
    install(player) {
      player.on("tag:background", (tag) => {
        const container = player.container;
        if (!container) return;
        let src = (tag.value || "").trim();
        if (!src) {
          container.style.backgroundImage = "";
          return;
        }
        if (src.startsWith('"') && src.endsWith('"')) src = src.slice(1, -1);
        src = src.replace(/\\/g, "/");
        container.style.backgroundImage = "url(" + JSON.stringify(src) + ")";
      });
    }
    uninstall() {
    }
  };

  // src/plugins/audio.ts
  function normalize(src) {
    let s = (src || "").trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
    return s.replace(/\\/g, "/");
  }
  var Audio = class {
    constructor() {
      this.id = "audio";
      this.version = "1.0.0";
      /** Single music channel, created lazily. / 单条音乐通道，惰性创建。 */
      this._el = null;
    }
    _ensure() {
      if (typeof document === "undefined") return null;
      if (!this._el) this._el = document.createElement("audio");
      return this._el;
    }
    install(player) {
      const start = (rawSrc, loop) => {
        const el = this._ensure();
        if (!el) return;
        const src = normalize(rawSrc);
        if (!src) return;
        el.loop = loop;
        el.src = src;
        el.load();
        const p = el.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
          });
        }
      };
      player.on("tag:audio", (tag) => start(tag.value, false));
      player.on(
        "tag:audioloop",
        (tag) => start(tag.value, true)
      );
      player.on("story:restart", () => this._stop());
      player.on("story:load", () => this._stop());
    }
    _stop() {
      if (this._el) {
        this._el.pause();
        this._el.currentTime = 0;
      }
    }
    uninstall() {
      this._stop();
      this._el = null;
    }
  };

  // src/plugins/title.ts
  var Title = class {
    constructor() {
      this.id = "title";
      this.version = "1.0.0";
    }
    install(player) {
      const titleEl = document.getElementById("inkshell-title");
      player.on("tag:title", (tag) => {
        if (tag && tag.value) {
          if (titleEl) titleEl.textContent = tag.value;
          document.title = tag.value + " | InkShell";
        }
      });
    }
    uninstall() {
    }
  };

  // src/plugins/reset.ts
  var Reset = class {
    constructor() {
      this.id = "reset";
      this.version = "2.0.0";
    }
    install(player) {
      this._player = player;
      if (typeof window !== "undefined") {
        window.InkShellReset = {
          restart: () => this.restart(),
          clearAll: () => this.clearAll()
        };
      }
    }
    /** Restart the story from the beginning; all saves are kept. */
    /** 从头重新开始故事；所有存档保留。 */
    restart() {
      if (this._player) this._player.restart();
    }
    /** Wipe every save slot (0–9), then restart the story. */
    /** 清除所有存档槽（0–9），然后重新开始故事。 */
    clearAll() {
      clearAllSlots();
      if (this._player) this._player.restart();
    }
    uninstall() {
      this._player = null;
      if (typeof window !== "undefined") {
        delete window.InkShellReset;
      }
    }
  };

  // src/plugins/theme.ts
  var Theme = class {
    constructor() {
      this.id = "theme";
      this.version = "1.0.0";
    }
    install(_player) {
      const btn = document.getElementById("inkshell-theme");
      if (!btn) return;
      const raw = window.getComputedStyle(document.body).getPropertyValue("--themes").trim();
      const themes = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
      if (themes.length < 2) return;
      btn.hidden = false;
      const KEY = "inkshell_theme";
      let saved = "";
      try {
        saved = localStorage.getItem(KEY) || "";
      } catch {
      }
      if (!themes.includes(saved)) saved = themes[0];
      document.body.setAttribute("data-theme", saved);
      btn.addEventListener("click", () => {
        const cur = document.body.getAttribute("data-theme") || themes[0];
        const idx = themes.indexOf(cur);
        const next = themes[(idx + 1) % themes.length];
        document.body.setAttribute("data-theme", next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
        }
      });
    }
    uninstall() {
    }
  };

  // src/index.ts
  if (typeof window !== "undefined") {
    window.InkShell = InkShell;
    window.InkShellPlugins = {
      DomRenderer,
      Clear,
      Class,
      Image,
      Restart,
      Link,
      LinkOpen,
      Background,
      Audio,
      InputText,
      InputNumber,
      Save,
      Load,
      Title,
      Reset,
      Theme
    };
  }
  return __toCommonJS(index_exports);
})();
/*!
 * InkShell — Tag Parser / 标签解析器
 *
 * Parses raw Ink tags into { name, raw, value }.
 * Does no semantic processing — plugins handle their own parameters.
 * 将原始 Ink 标签解析为 { name, raw, value }。
 * 不做语义处理 —— 插件自行处理参数。
 *
 * Examples / 示例:
 *   "# IMAGE: dog.jpg"        → name="image", value="dog.jpg"
 *   "# CLEAR"                 → name="clear", value=""
 *   "# CLASS: red big"        → name="class", value="red big"
 *   "# INPUT-TEXT: var=\"x\"" → name="input-text", value="var=\"x\""
 *
 * Note: the colon is REQUIRED to split name from value. Without it the
 * whole string becomes the name. "# IMAGE dog.jpg" (no colon) → name="image dog.jpg",
 * which does NOT match an "image" listener.
 * 注意：冒号是切分 name 和 value 的关键，缺失则整串变成 name。
 * "# IMAGE dog.jpg"（无冒号）→ name="image dog.jpg"，不匹配 "image" 监听器。
 */
/*!
 * InkShell — Engine Core / 引擎核心
 *
 * The core InkShell runtime. Manages story lifecycle, events,
 * plugin system, variables, save/load, and external function binding.
 * InkShell 核心运行时。管理故事生命周期、事件、插件系统、
 * 变量、存档/读档以及外部函数绑定。
 *
 * Does NOT touch the DOM — rendering is handled by plugins.
 * 不接触 DOM —— 渲染由插件处理。
 */
/*!
 * InkShell — HTML Sanitizer / HTML 净化器
 *
 * Whitelist-based sanitizer for passage content.
 * Stories are author-controlled, but a malicious story.js could still
 * reach end users — this keeps the blast radius small.
 * 基于白名单的段落内容净化器。
 * 故事由作者控制，但恶意的 story.js 仍可能影响终端用户 ——
 * 此净化器将影响范围控制在最小。
 *
 * Allows / 允许: formatting tags (h1-h6, b, i, em, strong, u, s, del,
 *   ins, sub, sup, small, mark, kbd, code, pre, br, hr, span, div, p,
 *   blockquote, q, cite, ul, ol, li, dl, dt, dd, a, img, figure,
 *   figcaption).
 * Strips / 剥除: <script>, <style>, <iframe>, <object>, <embed>, on*
 *   attributes, javascript: / data: URLs on href/src.
 */
/*!
 * InkShell — DomRenderer / DOM 渲染器
 *
 * Renders story text and choices into the DOM.
 * This is core infrastructure, not a plugin — without it, nothing appears on screen.
 * 将故事文本和选项渲染到 DOM 中。
 * 这是核心基础设施而非插件 —— 没有它，屏幕上不会有任何东西。
 *
 * Listens to / 监听:
 *   - "story:content"  → appends passage + choices
 *
 * Emits / 发出:
 *   - "dom:passage"   { element, text, delta, tags, choices }
 *   - "dom:choice"    { element, choice, index }
 */
/*!
 * InkShell — Clear Plugin / 清屏插件
 *
 * Handles #clear tags by removing all passages and choices from the DOM.
 * Also clears on story restart / load so stale content never lingers.
 * 处理 #clear 标签，从 DOM 中移除所有文本和选项。
 * 故事重启 / 读档时也会清屏，避免残留内容。

 *
 * Plugin id: "clear"
 *
 * Ink tag / Ink 标签:
 *   #clear   (case-insensitive / 大小写不敏感)
 *
 * Listens to / 监听:
 *   - "tag:clear"     → clear the screen
 *   - "story:ended"   → remove choices only
 *   - "story:restart" → full clear before new content arrives
 *   - "story:load"    → full clear before loaded content arrives
 */
/*!
 * InkShell — Class Plugin / 样式类插件
 *
 * Adds CSS classes to passage paragraphs via the #class tag.
 * 通过 #class 标签为段落添加 CSS 类名。
 *
 * Plugin id: "class"
 *
 * Ink tag / Ink 标签:
 *   # CLASS: center         → single class
 *   # CLASS: red big        → multiple classes
 */
/*!
 * InkShell — Image Plugin / 图片插件
 *
 * Inserts images into the story via the #IMAGE tag.
 * Compatible with Inky's official web export convention.
 * 通过 #IMAGE 标签将图片插入故事中。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "image"
 *
 * Ink tag / Ink 标签:
 *   # IMAGE: dog.jpg              → relative path / 相对路径
 *   # IMAGE: images/dog.jpg       → subfolder / 子文件夹
 *   # IMAGE: "C:\pics\dog.jpg"  → absolute path (quoted) / 绝对路径（用双引号包裹）
 *   # IMAGE: https://.../dog.jpg  → remote URL / 网络地址
 *
 * The image appears below the current passage text.
 * 图片出现在当前段落文本下方。
 *
 * Layout stability / 布局稳定性:
 *   Images load asynchronously and would normally cause layout shift (and
 *   wrong scroll-to-new-passage positions). To prevent that, this plugin:
 *   图片异步加载，通常会导致布局位移（以及"滚动到新段落"位置错误）。为避免此问题：
 *     1. Caches each image's natural dimensions (localStorage) once loaded.
 *        每张图加载后缓存其原始尺寸（localStorage）。
 *     2. Sets width/height attributes from the cache when an <img> is created,
 *        so the browser reserves the final space up front (no shift).
 *        创建 <img> 时按缓存设 width/height 属性，让浏览器预先占好最终空间（无位移）。
 *     3. Preloads every image referenced in the story shortly after first
 *        paint, warming both the dimension cache and the browser cache.
 *        首屏后不久预加载故事中引用的所有图片，同时焐热尺寸缓存与浏览器缓存。
 *   First-ever view of an unknown image still shifts once; everything after
 *   is stable. Cross-origin dimensions ARE readable (naturalWidth is not
 *   gated by CORS — only canvas readback is).
 *   全新未知图片首次出现仍会位移一次；之后全部稳定。跨域图片尺寸可读
 *   （naturalWidth 不受 CORS 限制——只有 canvas 回读受限）。
 */
/*!
 * InkShell — Restart Plugin / 重启插件
 *
 * Restarts the story via the #RESTART tag.
 * Compatible with Inky's official web export convention.
 * 通过 #RESTART 标签重新开始故事。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "restart"
 *
 * Ink tag / Ink 标签:
 *   # RESTART
 */
/*!
 * InkShell — Link Plugin / 链接插件
 *
 * Navigates to a URL via the #LINK tag.
 * Compatible with Inky's official web export convention.
 * 通过 #LINK 标签导航到指定 URL。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "link"
 *
 * Ink tag / Ink 标签:
 *   # LINK: https://example.com
 *   # LINK: "https://example.com"
 */
/*!
 * InkShell — LinkOpen Plugin / 新窗口链接插件
 *
 * Opens a URL in a new tab via the #LINKOPEN tag.
 * Compatible with Inky's official web export convention.
 * 通过 #LINKOPEN 标签在新标签页中打开 URL。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "linkopen"
 *
 * Ink tag / Ink 标签:
 *   # LINKOPEN: https://example.com
 *   # LINKOPEN: "https://example.com"
 */
/*!
 * InkShell — InputText Plugin / 文本输入插件
 *
 * Handles #INPUT-TEXT tags to prompt for player text input.
 * 处理 #INPUT-TEXT 标签，提示玩家输入文本。
 *
 * Plugin id: "input-text"  (tag is case-insensitive; convention is uppercase)
 *
 * Tag usage in ink / Ink 标签用法:
 *   # INPUT-TEXT: var="player_name" prompt="What is your name?"
 */
/*!
 * InkShell — InputNumber Plugin / 数字输入插件
 *
 * Handles #INPUT-NUMBER tags to prompt for a numeric value.
 * 处理 #INPUT-NUMBER 标签，提示玩家输入数字。
 *
 * Plugin id: "input-number"  (tag is case-insensitive; convention is uppercase)
 *
 * Tag usage in ink / Ink 标签用法:
 *   # INPUT-NUMBER: var="age" prompt="你的年龄？"
 *   # INPUT-NUMBER: var="age" prompt="..." min="0" max="120"
 *
 * The submitted value is stored as a number (so ink can do math on it,
 * e.g. `~ age + 1`). Empty / non-numeric / out-of-range input is rejected
 * (the prompt stays until a valid number is entered).
 * 提交的值以数字存入变量（这样 ink 能直接运算，如 `~ age + 1`）。
 * 空 / 非数字 / 越界的输入会被拒绝（提示框保留，直到输入合法数字）。
 */
/*!
 * InkShell — Storage / 存储
 *
 * Low-level localStorage wrapper shared by the Save plugin and themes.
 * 底层 localStorage 封装，供存档插件及主题共用。
 *
 * Two layers / 两层:
 *   1. Raw string key-value (get/set/remove) — themes can store anything.
 *      原始字符串键值（get/set/remove）—— 主题可存任意数据。
 *   2. Numbered save slots 0–9 (getSlot/setSlot/getSlots) holding SlotInfo.
 *      编号存档槽 0–9（getSlot/setSlot/getSlots），存 SlotInfo。
 *
 * Slot layout / 槽位布局:
 *   0       → auto-save (system writes here after each choice)
 *   0       → 自动存档（系统在每次选择后写入此处）
 *   1–9     → manual save slots (theme writes via the InkShellSave API)
 *   1–9     → 手动存档槽（主题通过 InkShellSave API 写入）
 */
/*!
 * InkShell — Save Plugin / 存档插件（写侧）
 *
 * Provides the write-side of the save API and the auto-save (slot 0).
 * 提供存档系统的"写"侧 API 与自动存档（槽 0）。
 *
 * Plugin id: "save"
 *
 * Auto-save: by default the engine writes slot 0 after every choice, so the
 * player can resume on revisit. Disable with autoSave:false.
 * 自动存档：默认在每次选择后写入槽 0，玩家下次访问可续上。
 * 用 autoSave:false 关闭。
 *
 * Saves snapshot BOTH the inkjs state AND the on-screen passage HTML, so a
 * restore replays the full reading history — not just the engine state.
 * 存档同时快照 inkjs 状态与屏幕段落 HTML，读档时恢复完整阅读历史，
 * 而不仅仅是引擎状态。
 *
 * Mounted API / 挂载的 API (window.InkShellSave):
 *   InkShellSave.save(slot?)        → SlotInfo | null
 *   InkShellSave.remove(slot)       → boolean
 *   InkShellSave.get(slot)          → SlotInfo | null
 *   InkShellSave.getSlots()         → (SlotInfo | null)[]   (slots 0..slotCount)
 *   InkShellSave.exportSave(slot?)  → download .json
 *   (load / importSave are attached by the Load plugin / 由 Load 插件挂载)
 *
 * Events / 事件:
 *   save:saved    { slot, info }    after a successful write
 *   save:removed  { slot }          after a slot is cleared
 *   save:exported { slot? }         after a .json download
 *
 * The actual write is deferred via queueMicrotask so we snapshot state AFTER
 * inkjs finishes the current continue() turn — otherwise we'd capture a
 * half-step state that doesn't restore cleanly.
 * 真正的写操作通过 queueMicrotask 延迟，确保在 inkjs 完成本次 continue()
 * 回合之后再快照状态——否则会捕获到无法干净恢复的"半步"状态。
 */
/*!
 * InkShell — Load Plugin / 读档插件（读侧）
 *
 * Exposes the read-side of the save API and replays the saved on-screen
 * passage history so a restore shows exactly what the player saw.
 * 提供存档系统的"读"侧 API，并还原已保存的屏幕段落历史，
 * 让读档后所见即所存。
 *
 * Plugin id: "load"
 *
 * Mounted API / 挂载的 API (window.InkShellSave):
 *   InkShellSave.load(slot?)        → boolean   (true on success)
 *   InkShellSave.importSave(slot)   → read a .json file into the slot
 *   (save / remove / get / getSlots / exportSave are attached by Save)
 *
 * Events / 事件:
 *   save:loaded   { slot, info }    after a successful restore
 *   save:imported { slot, info }    after a .json import
 *
 * On load the engine restores inkjs state, the Clear plugin wipes the DOM,
 * and continue() renders the current choices fresh. We then re-inject the
 * saved passage HTML ahead of those choices, so the reading history is back.
 * 读档时引擎恢复 inkjs 状态，Clear 插件清空 DOM，continue() 重新渲染当前
 * 选项；随后我们把保存的段落 HTML 插到这些选项之前，还原阅读历史。
 */
/*!
 * InkShell — Background Plugin / 背景插件
 *
 * Changes the story container's background image via the #BACKGROUND tag.
 * Compatible with Inky's official web export convention.
 * 通过 #BACKGROUND 标签更改故事容器的背景图片。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "background"
 *
 * Ink tag / Ink 标签:
 *   #BACKGROUND: sky.png            → set background image / 设置背景图
 *   #BACKGROUND: images/sky.png     → subfolder / 子文件夹
 *   #BACKGROUND:                    → clear background / 清除背景（空值）
 *
 * Only the `background-image` is set here. Themes control size / position /
 * repeat in their own CSS (e.g. `#story-root { background-size: cover; }`),
 * keeping appearance in the theme's hands.
 * 这里只设置 `background-image`。背景图的尺寸 / 位置 / 平铺由主题
 * 在自己的 CSS 里控制（如 `#story-root { background-size: cover; }`），
 * 把外观交给主题。
 */
/*!
 * InkShell — Audio Plugin / 音频插件
 *
 * Plays audio via the #AUDIO and #AUDIOLOOP tags.
 * Compatible with Inky's official web export convention.
 * 通过 #AUDIO 和 #AUDIOLOOP 标签播放音频。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "audio"
 *
 * Ink tags / Ink 标签:
 *   #AUDIO: music.mp3          → play once / 播放一次
 *   #AUDIOLOOP: ambience.mp3   → loop until replaced / 循环播放直到被替换
 *
 * Model: a single music channel. Any #AUDIO / #AUDIOLOOP replaces whatever
 * is currently playing. This covers the common BGM / ambience use case;
 * overlapping sound-effects are out of scope for now.
 * 模型：单条音乐通道。任何 #AUDIO / #AUDIOLOOP 都会替换当前播放的曲目。
 * 这覆盖了常见的 BGM / 环境音场景；多声效叠加暂不在范围内。
 *
 * Autoplay policy: browsers block audio until the user has interacted with
 * the page. By the time a tag fires the user has usually clicked a choice,
 * but audio attached to the very first passage may be blocked — the
 * rejection from play() is caught quietly so it never breaks the story.
 * 自动播放策略：浏览器在用户与页面交互前会阻止音频。标签触发时用户通常已
 * 点过选项，但挂在第一段落的音频可能被拦截——play() 的拒绝会被静默捕获，
 * 绝不会打断故事。
 */
/*!
 * InkShell — Reset Plugin / 重置插件
 *
 * Exposes two reset actions for themes to call. Owns the ACTIONS, not the UI
 * — the theme wires its own button / dialog (confirm prompts are a theme
 * concern). Core imposes no UI and no confirm box.
 * 提供两个重置动作供主题调用。只负责"动作"，不负责 UI——按钮 / 对话框
 * 由主题自行搭建（确认框属于主题层）。core 不强加任何 UI，也不弹确认框。
 *
 * Plugin id: "reset"
 *
 * Mounted API / 挂载的 API (window.InkShellReset):
 *   InkShellReset.restart()    → restart the story; all saves are kept
 *   InkShellReset.clearAll()   → wipe every save slot, then restart
 *
 * Events / 事件:
 *   (none of its own — restart reuses the engine's `story:restart`)
 */
/*!
 * InkShell — Entry Point / 入口
 *
 * Files prefixed with __ are required (official Inky web conventions).
 * 以 __ 为前缀的文件是必备插件（Inky 官方 Web 约定）。
 */
