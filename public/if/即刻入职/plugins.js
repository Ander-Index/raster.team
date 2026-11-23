"use strict";
var __inkshell_plugins__ = (() => {
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

  // src/plugins.ts
  var plugins_exports = {};
  __export(plugins_exports, {
    Audio: () => Audio,
    Background: () => Background,
    Class: () => Class,
    Clear: () => Clear,
    DomInput: () => DomInput,
    DomRenderer: () => DomRenderer,
    Image: () => Image,
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
    cloneWithContext: () => cloneWithContext,
    installDefaultPlugins: () => installDefaultPlugins
  });

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
    const v = value.replace(/[\t\n\r]/g, "").replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "").toLowerCase();
    if (v.startsWith("javascript:")) return false;
    if (v.startsWith("data:")) return false;
    if (v.startsWith("vbscript:")) return false;
    return true;
  }
  function isAttrAllowed(tag, attr, value, allowDataAttributes) {
    if (attr.startsWith("on")) return false;
    if (allowDataAttributes && /^(?:data|aria)-[a-z0-9_.:-]+$/.test(attr)) return true;
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
  function sanitizeHtml(html, options = {}) {
    if (!html) return "";
    const stripped = options.preserveWhitespace ? html : html.replace(/(?:[ \t]*\n[ \t]*)?(<\/?(?:hr|h[1-6]|p|div|blockquote|pre|ul|ol|dl|li|dt|dd)\b[^>]*>)(?:[ \t]*\n[ \t]*)?/gi, "$1");
    const doc = new DOMParser().parseFromString(stripped, "text/html");
    walkAndClean(doc.body, options.allowDataAttributes === true);
    return doc.body.innerHTML;
  }
  function walkAndClean(root, allowDataAttributes) {
    const children = Array.from(root.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        cleanElement(child, allowDataAttributes);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        const parent = child.parentNode;
        if (parent) parent.removeChild(child);
      }
    }
  }
  function cleanElement(el, allowDataAttributes) {
    const tag = el.tagName.toLowerCase();
    if (el.namespaceURI !== "http://www.w3.org/1999/xhtml") {
      el.remove();
      return;
    }
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
          cleanElement(c, allowDataAttributes);
        } else if (c.nodeType === Node.COMMENT_NODE) {
          const p = c.parentNode;
          if (p) p.removeChild(c);
        }
      }
      return;
    }
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (!isAttrAllowed(tag, attr.name, attr.value, allowDataAttributes)) {
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
    walkAndClean(el, allowDataAttributes);
  }

  // src/dom-renderer.ts
  var DomRenderer = class {
    constructor(config = {}) {
      this.id = "dom-renderer";
      this.version = "2.0.0";
      // Present text before feature/theme listeners consume dom:passage.
      // 先生成文本，再让功能插件和主题处理 dom:passage。
      this.priority = 100;
      this._container = null;
      this._player = null;
      this._initialBackground = "";
      this._config = config;
    }
    install(player) {
      const container = this._config.container !== void 0 ? this._config.container : player.container;
      if (!container) {
        console.error("DomRenderer: no container element found");
        return;
      }
      this._container = container;
      this._player = player;
      this._initialBackground = container.style.backgroundImage;
      player.provide("presentation", this);
      player.on("story:destroy", () => this.clear());
      player.on("story:restart", () => this.clear());
      player.on("story:load", () => this.clear());
      player.on("background:changed", (data) => {
        const src = data.src;
        if (typeof src === "string" && isSafeUrl(src)) {
          container.style.backgroundImage = src ? "url(" + JSON.stringify(src) + ")" : "";
        }
      });
      player.on("story:content", (data) => {
        container.querySelector(".inkshell-choices")?.remove();
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
            btn.addEventListener("click", () => player.choose(choice.index));
            choiceDiv.appendChild(btn);
            player.emit("dom:choice", { element: btn, choice, index: choice.index });
          }
          container.appendChild(choiceDiv);
        }
      });
    }
    capture() {
      const container = this._container;
      if (!container) return { html: "" };
      const clone = container.cloneNode(true);
      clone.querySelectorAll(".inkshell-choices, .inkshell-input-wrapper").forEach((element) => element.remove());
      this._player?.emit("save:snapshot", { element: clone });
      return { html: clone.innerHTML };
    }
    prepare(snapshot) {
      const html = typeof snapshot === "string" ? snapshot : snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot.html : void 0;
      if (typeof html !== "string") throw new Error("DomRenderer: invalid presentation snapshot");
      const tmp = document.createElement("div");
      tmp.innerHTML = sanitizeHtml(html, { preserveWhitespace: true, allowDataAttributes: true });
      tmp.querySelectorAll(".inkshell-choices, .inkshell-input-wrapper").forEach((element) => element.remove());
      return { html: tmp.innerHTML };
    }
    restore(snapshot) {
      const container = this._container;
      if (!container) return;
      const prepared = this.prepare(snapshot);
      const tmp = document.createElement("div");
      tmp.innerHTML = prepared.html;
      const fragment = document.createDocumentFragment();
      while (tmp.firstChild) {
        const node = tmp.firstChild;
        if (node instanceof Element) node.removeAttribute("data-new");
        fragment.appendChild(node);
      }
      container.insertBefore(fragment, container.firstChild);
    }
    clear() {
      this._player?.emit("dom:clear", {});
      this._container?.replaceChildren();
    }
    uninstall() {
      this.clear();
      if (this._container) this._container.style.backgroundImage = this._initialBackground;
      this._player?.removeService("presentation", this);
      this._player = null;
      this._container = null;
    }
  };

  // src/dom-utils.ts
  function cloneWithContext(segment, container) {
    const clone = segment.cloneNode(true);
    const cs = window.getComputedStyle(segment);
    clone.style.fontSize = cs.fontSize;
    clone.style.fontFamily = cs.fontFamily;
    let inner = clone;
    let root = clone;
    let node = segment.parentElement;
    while (node && node !== container && node !== document.body) {
      const replica = node.cloneNode(false);
      replica.removeAttribute("data-new");
      replica.appendChild(inner);
      inner = replica;
      root = replica;
      node = node.parentElement;
    }
    return { root, clone };
  }

  // src/plugins/dom-input.ts
  var DomInput = class {
    constructor(config = {}) {
      this.id = "dom-input";
      this.version = "1.0.0";
      this._player = null;
      this._container = null;
      this._views = /* @__PURE__ */ new Map();
      this._clearing = false;
      this._config = config;
    }
    install(player) {
      this._player = player;
      this._container = this._config.container !== void 0 ? this._config.container : player.container;
      player.on("input:request", (request) => this._render(request));
      player.on("input:cleared", (data) => this._remove(data.id));
      player.on("story:content", () => this._syncRequests());
      player.on("dom:clear", () => this._clear());
      player.on("story:load", () => this._clear());
      player.on("story:restart", () => this._clear());
      player.on("story:destroy", () => this._clear());
      player.on("presentation:beforeCapture", () => this._flushDrafts());
      player.on("save:snapshot", () => this._flushDrafts());
      this._syncRequests();
    }
    _requests() {
      const requests = [];
      for (const id of ["input-text", "input-number"]) {
        const plugin = this._player?.getPlugin(id);
        if (plugin && typeof plugin.getRequest === "function") {
          const request = plugin.getRequest();
          if (request) requests.push(request);
        }
      }
      return requests;
    }
    _syncRequests() {
      const requests = this._requests();
      const currentIds = new Set(requests.map((request) => request.id));
      for (const id of this._views.keys()) if (!currentIds.has(id)) this._remove(id);
      for (const request of requests) this._render(request);
    }
    _render(request) {
      const player = this._player;
      const container = this._container;
      if (!player || !container || this._clearing || this._views.has(request.id)) return;
      if (!this._requests().some((current) => current.id === request.id)) return;
      const context = {
        player,
        container,
        prompt: request.prompt || (request.type === "text" ? this._config.textPrompt : this._config.numberPrompt) || "",
        submitLabel: this._config.submitLabel || "",
        submit: (value) => request.submit(value),
        setDraft: (value) => request.setDraft(value)
      };
      const view = this._config.render ? this._config.render(request, context) : this._defaultView(request, context);
      if (!view) return;
      if (this._player !== player || !this._requests().some((current) => current.id === request.id)) {
        view.destroy?.();
        view.element.remove();
        return;
      }
      this._views.set(request.id, { request, view });
      view.element.classList.add("inkshell-input-wrapper");
      view.element.setAttribute("data-input-id", request.id);
      const placement = this._config.placement || "before-choices";
      try {
        if (typeof placement === "function") placement(container, view.element, request);
        else {
          const choices = placement === "before-choices" ? container.querySelector(".inkshell-choices") : null;
          if (choices?.parentNode) choices.parentNode.insertBefore(view.element, choices);
          else container.appendChild(view.element);
        }
        if (this._views.get(request.id)?.view !== view) {
          view.element.remove();
          return;
        }
        if (this._config.focus) view.focus?.();
      } catch (error) {
        if (this._views.get(request.id)?.view === view) this._remove(request.id);
        throw error;
      }
    }
    _defaultView(request, context) {
      const wrapper = document.createElement("div");
      const prompt = document.createElement("span");
      prompt.className = "inkshell-input-prompt";
      prompt.textContent = context.prompt;
      wrapper.appendChild(prompt);
      const input = document.createElement("input");
      input.type = request.type;
      input.className = "inkshell-input-field";
      input.setAttribute("aria-label", context.prompt || request.name);
      input.value = request.draft;
      if (request.type === "number") {
        input.step = "any";
        if (request.min !== void 0) input.min = String(request.min);
        if (request.max !== void 0) input.max = String(request.max);
      }
      wrapper.appendChild(input);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inkshell-input-submit";
      button.textContent = context.submitLabel;
      button.setAttribute("aria-label", context.submitLabel || request.name);
      wrapper.appendChild(button);
      const updateDraft = () => context.setDraft(input.value);
      const submit = () => {
        updateDraft();
        context.submit(input.value);
      };
      const keydown = (event) => {
        if (event.key === "Enter" && !event.isComposing) {
          event.preventDefault();
          submit();
        }
      };
      input.addEventListener("input", updateDraft);
      input.addEventListener("keydown", keydown);
      button.addEventListener("click", submit);
      return {
        element: wrapper,
        focus: () => input.focus(),
        getDraft: () => input.value,
        destroy: () => {
          input.removeEventListener("input", updateDraft);
          input.removeEventListener("keydown", keydown);
          button.removeEventListener("click", submit);
          wrapper.remove();
        }
      };
    }
    _flushDrafts() {
      for (const { request, view } of [...this._views.values()]) {
        if (view.getDraft) request.setDraft(view.getDraft());
      }
    }
    _remove(id) {
      const active = this._views.get(id);
      if (!active) return;
      this._views.delete(id);
      if (active.view.getDraft) active.request.setDraft(active.view.getDraft());
      active.view.destroy?.();
      active.view.element.remove();
    }
    _clear() {
      if (this._clearing) return;
      this._clearing = true;
      try {
        for (const id of [...this._views.keys()]) this._remove(id);
      } finally {
        this._clearing = false;
      }
    }
    uninstall() {
      this._clear();
      this._player = null;
      this._container = null;
    }
  };

  // src/plugins/__clear.ts
  var Clear = class {
    constructor() {
      this.id = "clear";
      this.version = "2.0.0";
      this.priority = 50;
    }
    install(player) {
      player.on("tag:clear", () => {
        player.clearHistory();
        player.getService("presentation")?.clear();
      });
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
    constructor(config = {}) {
      this.id = "image";
      this.version = "1.1.0";
      this.priority = 50;
      /** All images currently in the DOM (for cleanup). / 当前 DOM 中所有图片（用于清理）。 */
      this._allImages = [];
      /** Images queued during tag processing, flushed after passage is created. / 标签处理期间排队的图片，段落创建后批量插入。 */
      this._pending = [];
      /** Cached natural dimensions, keyed by src. / 按来源缓存的原始尺寸。 */
      this._sizes = /* @__PURE__ */ Object.create(null);
      this._active = false;
      this._generation = 0;
      this._preloadFrame = null;
      this._preloadTimer = null;
      this._sizingCallbacks = /* @__PURE__ */ new Map();
      this._config = config;
    }
    install(player) {
      const container = this._config.container !== void 0 ? this._config.container : player.container;
      if (!container) return;
      this._active = true;
      this._generation++;
      this._sizes = this._loadCache();
      player.on("tag:image", (tag) => {
        if (!this._active) return;
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
        if (!this._active || !data.element) return;
        const imgs = data.element.querySelectorAll("img");
        imgs.forEach((img) => {
          if (img.hasAttribute("data-ks-sized")) return;
          img.setAttribute("data-ks-sized", "");
          this._sizeImg(img, img.currentSrc || img.getAttribute("src") || "");
        });
      });
      player.on("story:content", (data) => {
        if (!this._active || this._pending.length === 0) return;
        const passages = container.querySelectorAll(".inkshell-passage");
        const lastPassage = passages.length ? passages[passages.length - 1] : null;
        const choices = container.querySelector(".inkshell-choices");
        let anchor = data.delta ? lastPassage : null;
        for (const img of this._pending) {
          if (anchor) {
            anchor.after(img);
            anchor = img;
          } else if (choices) {
            container.insertBefore(img, choices);
          } else {
            container.appendChild(img);
          }
          this._allImages.push(img);
        }
        this._pending = [];
      });
      player.on("dom:clear", () => this._clearDisplayed());
      this._schedulePreload();
    }
    /**
     * Reserve cached dimensions on an <img> (so layout is stable before load)
     * and remember the real dimensions once it loads.
     * 给 <img> 预占缓存尺寸（使加载前布局稳定），并在加载完成后记下真实尺寸。
     */
    _sizeImg(img, src, probe = false) {
      if (!this._active) return;
      this._releaseSizing(img);
      const generation = this._generation;
      const cached = this._sizes[src];
      if (cached && cached.w && cached.h) {
        img.setAttribute("width", String(cached.w));
        img.setAttribute("height", String(cached.h));
      }
      const capture = () => {
        if (!this._active || this._generation !== generation) return;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;
        const cur = this._sizes[src];
        if (!cur || cur.w !== w || cur.h !== h) {
          this._sizes[src] = { w, h };
          this._saveCache();
        }
      };
      if (img.complete && img.naturalWidth) {
        capture();
        return;
      }
      const loaded = () => {
        if (this._sizingCallbacks.get(img)?.load !== loaded) return;
        this._releaseSizing(img);
        capture();
      };
      const failed = () => {
        if (this._sizingCallbacks.get(img)?.error === failed) this._releaseSizing(img);
      };
      this._sizingCallbacks.set(img, { load: loaded, error: failed, probe });
      img.addEventListener("load", loaded);
      img.addEventListener("error", failed);
    }
    _releaseSizing(img) {
      const callbacks = this._sizingCallbacks.get(img);
      if (!callbacks) return;
      img.removeEventListener("load", callbacks.load);
      img.removeEventListener("error", callbacks.error);
      this._sizingCallbacks.delete(img);
    }
    _clearDisplayed() {
      for (const img of this._allImages) img.remove();
      for (const [img, callbacks] of this._sizingCallbacks) {
        if (!callbacks.probe) this._releaseSizing(img);
      }
      this._allImages = [];
      this._pending = [];
    }
    // ---- dimension cache (localStorage) / 尺寸缓存 ----
    _loadCache() {
      const sizes = /* @__PURE__ */ Object.create(null);
      try {
        const raw = localStorage.getItem(SIZE_CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return sizes;
        for (const [src, value] of Object.entries(parsed)) {
          if (!value || typeof value !== "object") continue;
          const { w, h } = value;
          if (Number.isInteger(w) && w > 0 && Number.isInteger(h) && h > 0) {
            sizes[src] = { w, h };
          }
        }
      } catch {
      }
      return sizes;
    }
    _saveCache() {
      if (!this._active) return;
      try {
        localStorage.setItem(SIZE_CACHE_KEY, JSON.stringify(this._sizes));
      } catch {
      }
    }
    // ---- background preload / 后台预加载 ----
    _schedulePreload() {
      if (!this._active || typeof window === "undefined") return;
      const generation = this._generation;
      const scheduleTimer = () => {
        this._preloadFrame = null;
        if (!this._active || this._generation !== generation) return;
        this._preloadTimer = setTimeout(() => {
          this._preloadTimer = null;
          if (this._active && this._generation === generation) this._preloadAll();
        }, 0);
      };
      if (typeof requestAnimationFrame === "function") {
        this._preloadFrame = requestAnimationFrame(scheduleTimer);
      } else {
        scheduleTimer();
      }
    }
    _preloadAll() {
      if (!this._active || typeof window === "undefined") return;
      const data = window.storyContent;
      if (!data) return;
      const urls = /* @__PURE__ */ new Set();
      this._collectUrls(data, urls);
      for (const src of urls) {
        if (!this._active) return;
        if (this._sizes[src]) continue;
        const probe = document.createElement("img");
        this._sizeImg(probe, src, true);
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
      this._active = false;
      this._generation++;
      if (this._preloadFrame !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(this._preloadFrame);
      }
      if (this._preloadTimer !== null) clearTimeout(this._preloadTimer);
      this._preloadFrame = null;
      this._preloadTimer = null;
      this._clearDisplayed();
      for (const img of this._sizingCallbacks.keys()) {
        this._releaseSizing(img);
        img.removeAttribute("src");
      }
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
        if (!url) return;
        if (!isSafeUrl(url)) {
          console.warn('InkShell Link: blocked unsafe URL "' + url + '"');
          return;
        }
        window.location.href = url;
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
        if (!url) return;
        if (!isSafeUrl(url)) {
          console.warn('InkShell LinkOpen: blocked unsafe URL "' + url + '"');
          return;
        }
        window.open(url, "_blank", "noopener");
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
    while ((match = re.exec(raw)) !== null) result[match[1]] = match[2];
    return result;
  }
  var InputText = class {
    constructor() {
      this.id = "input-text";
      this.version = "2.0.0";
      this._player = null;
      this._queue = [];
      this._nextId = 0;
      this._submissionCount = 0;
    }
    install(player) {
      this._player = player;
      player.on("tag:input-text", (tag) => {
        const params = parseKeyValue(tag.value);
        if (!this._validParams(params)) {
          player.emit("story:error", { message: "InputText: input requires a declared string variable" });
          return;
        }
        this._queue.push(this._entry(params, ""));
        player.pause(this.id);
      });
      player.on("story:content", () => this._publish());
      player.on("story:inputSubmitted", () => {
        this._submissionCount++;
      });
      player.on("story:restart", () => this._reset());
      player.on("story:load", () => this._reset());
      player.on("story:destroy", () => this._reset());
    }
    _entry(params, draft) {
      return { id: this.id + ":" + ++this._nextId, params, draft };
    }
    _validParams(params) {
      const name = params.var || params.variable;
      return !!name && !!this._player && typeof this._player.getVariable(name) === "string";
    }
    /** Current interaction, usable without any renderer. / 当前交互，无需渲染器即可使用。 */
    getRequest() {
      const entry = this._queue[0];
      if (!this._player || !entry) return null;
      return {
        id: entry.id,
        type: "text",
        name: entry.params.var || entry.params.variable,
        prompt: entry.params.prompt || "",
        get draft() {
          return entry.draft;
        },
        submit: (value) => this._submit(entry, value),
        setDraft: (value) => this._setDraft(entry, value)
      };
    }
    setDraft(value) {
      const entry = this._queue[0];
      if (entry) this._setDraft(entry, value);
    }
    _setDraft(entry, value) {
      if (this._player && this._queue[0] === entry && typeof value === "string") entry.draft = value;
    }
    submit(value) {
      const entry = this._queue[0];
      return entry ? this._submit(entry, value) : false;
    }
    _submit(entry, raw) {
      const player = this._player;
      const queue = this._queue;
      if (!player || queue[0] !== entry || entry.submitting || typeof raw !== "string" || !this._validParams(entry.params)) return false;
      entry.draft = raw;
      const value = raw.trim();
      if (!value) return false;
      const submissionCount = this._submissionCount;
      entry.submitting = true;
      try {
        player.setVariable(entry.params.var || entry.params.variable, value);
        if (this._player !== player || this._queue !== queue || queue[0] !== entry) return false;
        queue.shift();
        if (queue.length === 0) player.resume(this.id);
        player.emit("input:cleared", { id: entry.id, type: "text" });
        if (this._player !== player || this._queue !== queue) return true;
        player.emit("story:inputSubmitted", { name: entry.params.var || entry.params.variable, value, type: "text" });
        if (this._player !== player || this._queue !== queue) return true;
        if (queue.length > 0) this._publish();
        if (this._player === player && this._queue === queue && this._submissionCount === submissionCount + 1) player.continue();
        return true;
      } finally {
        entry.submitting = false;
      }
    }
    _publish() {
      const request = this.getRequest();
      if (request) this._player?.emit("input:request", request);
    }
    _reset() {
      const previous = this._queue;
      this._queue = [];
      const player = this._player;
      player?.resume(this.id);
      for (const entry of previous) player?.emit("input:cleared", { id: entry.id, type: "text" });
    }
    saveState() {
      return { queue: this._queue.map((entry) => ({ params: { ...entry.params }, draft: entry.draft })) };
    }
    loadState(state) {
      this._reset();
      if (!state || typeof state !== "object" || !("queue" in state)) return;
      const queue = state.queue;
      if (!Array.isArray(queue)) return;
      for (const candidate of queue) {
        if (!candidate || typeof candidate !== "object" || !candidate.params || typeof candidate.params !== "object") continue;
        const params = {};
        for (const key2 of ["var", "variable", "prompt"]) {
          if (Object.prototype.hasOwnProperty.call(candidate.params, key2) && typeof candidate.params[key2] === "string") params[key2] = candidate.params[key2];
        }
        if (!this._validParams(params)) continue;
        this._queue.push(this._entry(params, typeof candidate.draft === "string" ? candidate.draft : ""));
      }
      if (this._queue.length > 0) this._player?.pause(this.id);
    }
    uninstall() {
      this._reset();
      this._player = null;
    }
  };

  // src/plugins/input-number.ts
  function parseKeyValue2(raw) {
    const result = {};
    const re = /(\w+)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = re.exec(raw)) !== null) result[match[1]] = match[2];
    return result;
  }
  var InputNumber = class {
    constructor() {
      this.id = "input-number";
      this.version = "2.0.0";
      this._player = null;
      this._queue = [];
      this._nextId = 0;
      this._submissionCount = 0;
    }
    install(player) {
      this._player = player;
      player.on("tag:input-number", (tag) => {
        const params = parseKeyValue2(tag.value);
        if (!this._validParams(params)) {
          player.emit("story:error", { message: "InputNumber: input requires a declared number variable and valid bounds" });
          return;
        }
        this._queue.push(this._entry(params, ""));
        player.pause(this.id);
      });
      player.on("story:content", () => this._publish());
      player.on("story:inputSubmitted", () => {
        this._submissionCount++;
      });
      player.on("story:restart", () => this._reset());
      player.on("story:load", () => this._reset());
      player.on("story:destroy", () => this._reset());
    }
    _entry(params, draft) {
      return { id: this.id + ":" + ++this._nextId, params, draft };
    }
    _validParams(params) {
      const name = params.var || params.variable;
      if (!name || !this._player || typeof this._player.getVariable(name) !== "number") return false;
      for (const key2 of ["min", "max"]) {
        if (params[key2] && !Number.isFinite(Number(params[key2]))) return false;
      }
      return !(params.min && params.max && Number(params.min) > Number(params.max));
    }
    /** Current interaction, usable without any renderer. / 当前交互，无需渲染器即可使用。 */
    getRequest() {
      const entry = this._queue[0];
      if (!this._player || !entry) return null;
      const params = entry.params;
      return {
        id: entry.id,
        type: "number",
        name: params.var || params.variable,
        prompt: params.prompt || "",
        get draft() {
          return entry.draft;
        },
        min: params.min ? Number(params.min) : void 0,
        max: params.max ? Number(params.max) : void 0,
        submit: (value) => this._submit(entry, value),
        setDraft: (value) => this._setDraft(entry, value)
      };
    }
    setDraft(value) {
      const entry = this._queue[0];
      if (entry) this._setDraft(entry, value);
    }
    _setDraft(entry, value) {
      if (this._player && this._queue[0] === entry && typeof value === "string") entry.draft = value;
    }
    submit(value) {
      const entry = this._queue[0];
      return entry ? this._submit(entry, value) : false;
    }
    _submit(entry, raw) {
      const player = this._player;
      const queue = this._queue;
      if (!player || queue[0] !== entry || entry.submitting || typeof raw !== "string" || !this._validParams(entry.params)) return false;
      entry.draft = raw;
      if (!raw.trim()) return false;
      const value = Number(raw);
      const params = entry.params;
      if (!Number.isFinite(value)) return false;
      if (params.min && value < Number(params.min)) return false;
      if (params.max && value > Number(params.max)) return false;
      const submissionCount = this._submissionCount;
      entry.submitting = true;
      try {
        player.setVariable(params.var || params.variable, value);
        if (this._player !== player || this._queue !== queue || queue[0] !== entry) return false;
        queue.shift();
        if (queue.length === 0) player.resume(this.id);
        player.emit("input:cleared", { id: entry.id, type: "number" });
        if (this._player !== player || this._queue !== queue) return true;
        player.emit("story:inputSubmitted", { name: params.var || params.variable, value, type: "number" });
        if (this._player !== player || this._queue !== queue) return true;
        if (queue.length > 0) this._publish();
        if (this._player === player && this._queue === queue && this._submissionCount === submissionCount + 1) player.continue();
        return true;
      } finally {
        entry.submitting = false;
      }
    }
    _publish() {
      const request = this.getRequest();
      if (request) this._player?.emit("input:request", request);
    }
    _reset() {
      const previous = this._queue;
      this._queue = [];
      const player = this._player;
      player?.resume(this.id);
      for (const entry of previous) player?.emit("input:cleared", { id: entry.id, type: "number" });
    }
    saveState() {
      return { queue: this._queue.map((entry) => ({ params: { ...entry.params }, draft: entry.draft })) };
    }
    loadState(state) {
      this._reset();
      if (!state || typeof state !== "object" || !("queue" in state)) return;
      const queue = state.queue;
      if (!Array.isArray(queue)) return;
      for (const candidate of queue) {
        if (!candidate || typeof candidate !== "object" || !candidate.params || typeof candidate.params !== "object") continue;
        const params = {};
        for (const key2 of ["var", "variable", "prompt", "min", "max"]) {
          if (Object.prototype.hasOwnProperty.call(candidate.params, key2) && typeof candidate.params[key2] === "string") params[key2] = candidate.params[key2];
        }
        if (!this._validParams(params)) continue;
        this._queue.push(this._entry(params, typeof candidate.draft === "string" ? candidate.draft : ""));
      }
      if (this._queue.length > 0) this._player?.pause(this.id);
    }
    uninstall() {
      this._reset();
      this._player = null;
    }
  };

  // src/plugins/background.ts
  var Background = class {
    constructor() {
      this.id = "background";
      this.version = "1.0.0";
      this._player = null;
      this._src = "";
    }
    install(player) {
      this._player = player;
      player.on("tag:background", (tag) => {
        let src = (tag.value || "").trim();
        if (!src) {
          this._apply("");
          return;
        }
        if (src.startsWith('"') && src.endsWith('"')) src = src.slice(1, -1);
        src = src.replace(/\\/g, "/");
        if (!isSafeUrl(src)) return;
        this._apply(src);
      });
      const clear = () => {
        this._apply("");
      };
      player.on("story:restart", clear);
      player.on("story:load", clear);
    }
    _apply(src) {
      this._src = src;
      this._player?.emit("background:changed", { src });
    }
    saveState() {
      return { src: this._src };
    }
    loadState(state) {
      if (!state || typeof state !== "object" || Array.isArray(state)) return;
      const src = state.src;
      if (typeof src === "string" && isSafeUrl(src)) this._apply(src);
    }
    uninstall() {
      this._player = null;
      this._src = "";
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
      this._src = "";
      this._trackGeneration = 0;
      this._loadedMetadata = null;
    }
    _ensure() {
      if (typeof document === "undefined") return null;
      if (!this._el) this._el = document.createElement("audio");
      return this._el;
    }
    install(player) {
      player.on("tag:audio", (tag) => this._start(tag.value, false));
      player.on(
        "tag:audioloop",
        (tag) => this._start(tag.value, true)
      );
      player.on("story:restart", () => this._stop());
      player.on("story:load", () => this._stop());
    }
    _start(rawSrc, loop, time = 0, playing = true) {
      const src = normalize(rawSrc);
      if (!src || !isSafeUrl(src)) return;
      const el = this._ensure();
      if (!el) return;
      this._stop();
      const generation = this._trackGeneration;
      this._src = src;
      el.loop = loop;
      el.src = src;
      if (time > 0) {
        const seek = () => {
          if (generation !== this._trackGeneration) return;
          try {
            const target = Number.isFinite(el.duration) ? Math.min(time, el.duration) : time;
            el.currentTime = target;
          } catch {
          }
        };
        this._loadedMetadata = () => {
          seek();
          this._loadedMetadata = null;
        };
        el.addEventListener("loadedmetadata", this._loadedMetadata, { once: true });
        el.load();
        seek();
      } else {
        el.load();
      }
      if (playing) {
        try {
          const p = el.play();
          if (p && typeof p.catch === "function") p.catch(() => {
          });
        } catch {
        }
      }
    }
    saveState() {
      const el = this._el;
      return {
        src: this._src,
        loop: !!(el && el.loop),
        time: el && Number.isFinite(el.currentTime) ? Math.max(0, el.currentTime) : 0,
        playing: !!(el && !el.paused && !el.ended)
      };
    }
    loadState(state) {
      if (!state || typeof state !== "object" || Array.isArray(state)) return;
      const value = state;
      if (typeof value.src !== "string" || !isSafeUrl(value.src) || typeof value.loop !== "boolean" || typeof value.playing !== "boolean" || typeof value.time !== "number" || !Number.isFinite(value.time) || value.time < 0) return;
      if (value.src) this._start(value.src, value.loop, value.time, value.playing);
    }
    _stop() {
      this._trackGeneration++;
      this._src = "";
      if (this._el) {
        if (this._loadedMetadata) {
          this._el.removeEventListener("loadedmetadata", this._loadedMetadata);
          this._loadedMetadata = null;
        }
        this._el.pause();
        try {
          this._el.currentTime = 0;
        } catch {
        }
      }
    }
    uninstall() {
      this._stop();
      this._el = null;
    }
  };

  // src/storage.ts
  var MAX_SLOT = 9;
  var PREFIX = "inkshell_save";
  var _storyId = "";
  function setStoryId(id) {
    _storyId = (id || "").trim();
  }
  function getStoryId() {
    return _storyId;
  }
  function isValidSlot(slot, max = MAX_SLOT) {
    return Number.isInteger(slot) && slot >= 0 && slot <= max && slot <= MAX_SLOT;
  }
  function isSlotInfo(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const info = value;
    return typeof info.state === "string" && info.state.length > 0 && typeof info.timestamp === "number" && Number.isFinite(info.timestamp) && info.timestamp >= 0 && typeof info.turnCount === "number" && Number.isInteger(info.turnCount) && info.turnCount >= -1 && typeof info.preview === "string" && (info.html === void 0 || typeof info.html === "string") && (info.view === void 0 || !!info.view && typeof info.view === "object" && !Array.isArray(info.view) && typeof info.view.renderer === "string" && info.view.renderer !== "" && Object.prototype.hasOwnProperty.call(info.view, "state") && info.view.state !== void 0) && (info.plugins === void 0 || !!info.plugins && typeof info.plugins === "object" && !Array.isArray(info.plugins));
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
  function warnStorage(action) {
    console.warn("InkShellStorage: " + action + " failed (storage unavailable or full)");
  }
  function get(name) {
    try {
      return localStorage.getItem(PREFIX + "_" + name);
    } catch {
      return null;
    }
  }
  function set(name, value) {
    try {
      localStorage.setItem(PREFIX + "_" + name, value);
      return true;
    } catch {
      warnStorage("set " + name);
      return false;
    }
  }
  function remove(name) {
    try {
      localStorage.removeItem(PREFIX + "_" + name);
      return true;
    } catch {
      warnStorage("remove " + name);
      return false;
    }
  }
  function getSlot(slot) {
    if (!isValidSlot(slot)) return null;
    try {
      const raw = localStorage.getItem(key(slot));
      const info = raw ? JSON.parse(raw) : null;
      return isSlotInfo(info) ? info : null;
    } catch {
      return null;
    }
  }
  function setSlot(slot, info) {
    if (!isValidSlot(slot) || !isSlotInfo(info)) return false;
    try {
      const serialized = JSON.stringify(info);
      if (!isSlotInfo(JSON.parse(serialized))) return false;
      localStorage.setItem(key(slot), serialized);
      return true;
    } catch {
      warnStorage("setSlot " + slot);
      return false;
    }
  }
  function removeSlot(slot) {
    if (!isValidSlot(slot)) return false;
    try {
      localStorage.removeItem(key(slot));
      return true;
    } catch {
      warnStorage("removeSlot " + slot);
      return false;
    }
  }
  function getSlots(count = MAX_SLOT) {
    const n = Number.isFinite(count) ? Math.max(0, Math.min(MAX_SLOT, Math.floor(count))) : MAX_SLOT;
    const slots = [];
    for (let i = 0; i <= n; i++) slots.push(getSlot(i));
    return slots;
  }
  function clearAllSlots() {
    let success = true;
    for (let i = 0; i <= MAX_SLOT; i++) {
      if (!removeSlot(i)) success = false;
    }
    return success;
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
      getStoryId,
      extractStoryId,
      MAX_SLOT
    };
  }

  // src/plugins/load.ts
  var Load = class {
    constructor() {
      this.id = "load";
      this.version = "2.0.0";
      this.priority = 50;
      this._player = null;
      /** Slot being restored, consumed by the story:content listener. / 正在还原的槽位，由 story:content 监听器消费。 */
      this._pending = null;
      this._lifecycle = 0;
    }
    install(player) {
      this._player = player;
      this._lifecycle++;
      const api = getSaveAPI();
      if (api) {
        api.load = (slot = 0) => this.load(slot);
        api.importSave = (slot, file) => this.importSave(slot, file);
      }
      player.on("story:content", () => {
        const pending = this._pending;
        if (!pending) return;
        this._pending = null;
        try {
          pending.presentation?.restore(pending.snapshot);
          player.emit("save:loaded", { slot: pending.slot, info: pending.info });
        } catch {
          this._error("load", pending.slot, "presentation", "The presentation snapshot could not be restored.");
        }
      });
      player.on("story:restart", () => {
        this._pending = null;
        this._lifecycle++;
      });
      player.on("story:load", () => {
        this._lifecycle++;
      });
      player.on("story:destroy", () => {
        this._pending = null;
        this._lifecycle++;
      });
    }
    /** Validate the view before loading live state, then restore it on content. */
    load(slot = 0) {
      const player = this._player;
      if (!player || !isValidSlot(slot, this._maxSlot())) return false;
      const rawInfo = getSlot(slot);
      if (!rawInfo) return false;
      let prepared;
      try {
        prepared = this._prepareInfo(rawInfo);
        if (!prepared) return false;
      } catch (error) {
        this._error("load", slot, "presentation", error.message);
        return false;
      }
      this._pending = { slot, ...prepared };
      if (player.load(prepared.info.state, prepared.info.plugins) === false) {
        this._pending = null;
        this._error("load", slot, "invalid-state", "The save is corrupt or incompatible with this story.");
        return false;
      }
      return true;
    }
    _maxSlot() {
      const api = getSaveAPI();
      return api && Number.isInteger(api.slotCount) && api.slotCount >= 1 && api.slotCount <= MAX_SLOT ? api.slotCount : MAX_SLOT;
    }
    _error(operation, slot, reason, message) {
      if (this._player) this._player.emit("save:error", { operation, slot, reason, message });
    }
    _prepareInfo(value) {
      if (!isSlotInfo(value)) return null;
      const info = {
        state: value.state,
        timestamp: value.timestamp,
        turnCount: value.turnCount,
        preview: value.preview
      };
      if (value.plugins !== void 0) info.plugins = value.plugins;
      const view = value.view || (value.html ? { renderer: "dom-renderer", state: { html: value.html } } : void 0);
      if (!view) return { info, presentation: null };
      const presentation = this._player?.getService("presentation") || null;
      if (!presentation || presentation.id !== view.renderer) {
        throw new Error('The save requires presentation "' + view.renderer + '". Install a matching renderer before loading or importing it.');
      }
      const snapshot = presentation.prepare(view.state);
      info.view = { renderer: presentation.id, state: snapshot };
      return { info, presentation, snapshot };
    }
    /**
     * Read a .json file into a slot. If no file is given, open a file picker.
     * Fires save:imported on success.
     * 把 .json 文件读入一个槽。未给文件则打开文件选择器。成功时发 save:imported。
     */
    importSave(slot, file) {
      const player = this._player;
      if (!player || !isValidSlot(slot, this._maxSlot())) return;
      const lifecycle = this._lifecycle;
      const storyId = getStoryId();
      const isCurrent = () => this._player === player && this._lifecycle === lifecycle && getStoryId() === storyId;
      const doImport = (f) => {
        if (!isCurrent()) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (!isCurrent() || !isValidSlot(slot, this._maxSlot())) return;
          try {
            const prepared = this._prepareInfo(JSON.parse(String(reader.result)));
            if (!prepared) {
              this._error("import", slot, "invalid-save", "The file does not contain valid save metadata.");
              return;
            }
            const info = prepared.info;
            if (!player.validateState(info.state)) {
              this._error("import", slot, "invalid-state", "The save is corrupt or incompatible with this story.");
              return;
            }
            if (!setSlot(slot, info)) {
              this._error("import", slot, "storage", "The imported save could not be written. Storage may be unavailable or full.");
              return;
            }
            player.emit("save:imported", { slot, info });
          } catch (error) {
            this._error("import", slot, "invalid-save", error.message || "The save file could not be parsed.");
          }
        };
        reader.onerror = () => {
          if (isCurrent()) this._error("import", slot, "file-read", "The save file could not be read.");
        };
        try {
          reader.readAsText(f);
        } catch {
          if (isCurrent()) this._error("import", slot, "file-read", "The save file could not be read.");
        }
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
      this._pending = null;
      this._lifecycle++;
      this._player = null;
      const api = getSaveAPI();
      if (api) {
        delete api.load;
        delete api.importSave;
      }
    }
  };

  // src/plugins/save.ts
  var Save = class {
    constructor(config = {}) {
      this.id = "save";
      this.version = "2.0.0";
      this.priority = 50;
      this._player = null;
      this._autoSaveGeneration = 0;
      this._autoSave = config.autoSave !== false;
      const sc = config.slotCount ?? MAX_SLOT;
      this._slotCount = Number.isFinite(sc) ? Math.max(1, Math.min(MAX_SLOT, Math.floor(sc))) : MAX_SLOT;
    }
    install(player) {
      this._player = player;
      const api = getSaveAPI();
      if (api) {
        api.save = (slot = 0) => this.save(slot);
        api.remove = (slot) => this.remove(slot);
        api.get = (slot) => this.get(slot);
        api.getSlots = () => getSlots(this._slotCount);
        api.exportSave = (slot) => this.exportSave(slot);
        api.slotCount = this._slotCount;
      }
      if (this._autoSave) {
        const scheduleAutoSave = () => {
          const generation = this._autoSaveGeneration;
          const storyId = getStoryId();
          queueMicrotask(() => {
            if (this._player === player && generation === this._autoSaveGeneration && storyId === getStoryId()) this.save(0);
          });
        };
        player.on("story:choice", scheduleAutoSave);
        player.on("story:inputSubmitted", scheduleAutoSave);
      }
      player.on("story:restart", () => this.cancelPendingAutoSave());
      player.on("story:load", () => this.cancelPendingAutoSave());
      player.on("story:destroy", () => this.cancelPendingAutoSave());
    }
    /** Invalidate queued auto-saves before a reset changes storage/state. */
    cancelPendingAutoSave() {
      this._autoSaveGeneration++;
    }
    get(slot) {
      return isValidSlot(slot, this._slotCount) ? getSlot(slot) : null;
    }
    _error(operation, slot, reason, message) {
      if (this._player) this._player.emit("save:error", { operation, slot, reason, message });
    }
    /** Capture through the selected renderer before serializing plugin state. */
    _snapshot() {
      const player = this._player;
      if (!player) return null;
      player.emit("presentation:beforeCapture", {});
      const state = player.save();
      if (!state) return null;
      const presentation = player.getService("presentation");
      const view = presentation ? { renderer: presentation.id, state: presentation.capture() } : void 0;
      if (view && view.state === void 0) throw new Error("The presentation returned a non-serializable snapshot.");
      const info = {
        state,
        timestamp: Date.now(),
        turnCount: player.getTurnCount(),
        preview: (player.currentText || "").slice(-80),
        plugins: player.capturePluginState()
      };
      if (view) info.view = view;
      return info;
    }
    /** Save current state to a slot (0 = auto). Returns the SlotInfo or null. */
    /** 将当前状态存到槽（0 = 自动）。返回 SlotInfo 或 null。 */
    save(slot = 0) {
      const player = this._player;
      if (!player) return null;
      if (!isValidSlot(slot, this._slotCount)) return null;
      let info;
      try {
        info = this._snapshot();
      } catch {
        this._error("save", slot, "presentation", "The presentation snapshot could not be captured.");
        return null;
      }
      if (!info) return null;
      if (!setSlot(slot, info)) {
        this._error("save", slot, "storage", "The save could not be written. Storage may be unavailable or full.");
        return null;
      }
      player.emit("save:saved", { slot, info });
      return info;
    }
    /** Clear a slot. Returns true if there was a save to remove. */
    /** 清除一个槽。若原本有存档返回 true。 */
    remove(slot) {
      if (!isValidSlot(slot, this._slotCount)) return false;
      const existed = getSlot(slot) !== null;
      if (!removeSlot(slot)) {
        this._error("remove", slot, "storage", "The save could not be removed. Storage may be unavailable.");
        return false;
      }
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
        if (!isValidSlot(slot, this._slotCount)) return;
        info = getSlot(slot);
        name = "inkshell-save-slot" + slot;
      } else if (player) {
        try {
          info = this._snapshot();
        } catch {
          this._error("export", slot, "presentation", "The presentation snapshot could not be captured.");
          return;
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
      this.cancelPendingAutoSave();
      this._player = null;
      const api = getSaveAPI();
      if (api) {
        delete api.save;
        delete api.remove;
        delete api.get;
        delete api.getSlots;
        delete api.exportSave;
        delete api.slotCount;
      }
    }
  };

  // src/plugins/title.ts
  var Title = class {
    constructor() {
      this.id = "title";
      this.version = "2.0.0";
      this._player = null;
      this._title = "";
    }
    get current() {
      return this._title;
    }
    install(player) {
      this._player = player;
      player.on("tag:title", (tag) => {
        if (tag && tag.value) this._apply(tag.value);
      });
      player.on("story:restart", () => this._apply(""));
      player.on("story:load", () => this._apply(""));
    }
    _apply(title) {
      this._title = title;
      this._player?.emit("title:changed", { title });
    }
    saveState() {
      return { title: this._title };
    }
    loadState(state) {
      if (!state || typeof state !== "object" || Array.isArray(state)) return;
      const title = state.title;
      if (typeof title === "string") this._apply(title);
    }
    uninstall() {
      this._player = null;
      this._title = "";
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
    /** Wipe every slot and restart only on success; keep live progress on failure. */
    /** 全部槽删除成功才重开；失败时保留当前故事进度并返回 false。 */
    clearAll() {
      const save = this._player && this._player.getPlugin("save");
      if (save && typeof save.cancelPendingAutoSave === "function") save.cancelPendingAutoSave();
      const success = clearAllSlots();
      if (!success && this._player) {
        this._player.emit("save:error", {
          operation: "clearAll",
          reason: "storage",
          message: "Some save slots could not be removed. Storage may be unavailable."
        });
      }
      if (success && this._player) this._player.restart();
      return success;
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
    constructor(_config = {}) {
      this._config = _config;
      this.id = "theme";
      this.version = "2.0.0";
      this._player = null;
      this._current = "";
      this._themes = [...new Set((_config.themes || []).filter((name) => typeof name === "string" && name.length > 0))];
    }
    get current() {
      return this._current;
    }
    get palettes() {
      return [...this._themes];
    }
    install(player) {
      this._player = player;
      let selected = this._config.initial || "";
      if (this._config.storageKey) {
        try {
          const saved = localStorage.getItem(this._config.storageKey);
          if (saved && this._themes.includes(saved)) selected = saved;
        } catch {
        }
      }
      if (!this._themes.includes(selected)) selected = this._themes[0] || "";
      this._current = selected;
      if (selected) player.emit("theme:changed", { name: selected });
    }
    set(name) {
      if (!this._themes.includes(name)) return false;
      if (name === this._current) return true;
      this._current = name;
      if (this._config.storageKey) {
        try {
          localStorage.setItem(this._config.storageKey, name);
        } catch {
        }
      }
      this._player?.emit("theme:changed", { name });
      return true;
    }
    cycle() {
      if (!this._themes.length) return "";
      const index = this._themes.indexOf(this._current);
      this.set(this._themes[(index + 1) % this._themes.length]);
      return this._current;
    }
    uninstall() {
      this._player = null;
    }
  };

  // src/theme-defaults.ts
  var defaultCompositions = /* @__PURE__ */ new WeakMap();
  function installDefaultPlugins(player, config = {}) {
    defaultCompositions.get(player)?.();
    const installed = [];
    let active = true;
    const teardown = () => {
      if (!active) return;
      active = false;
      if (defaultCompositions.get(player) === teardown) defaultCompositions.delete(player);
      for (let i = installed.length - 1; i >= 0; i--) {
        const plugin = installed[i];
        if (player.getPlugin(plugin.id) === plugin) player.uninstall(plugin.id);
      }
    };
    const install = (plugin) => {
      if (player.getPlugin(plugin.id)) player.uninstall(plugin.id);
      installed.push(plugin);
      player.install(plugin);
    };
    try {
      install(new DomRenderer(config.renderer));
      install(new DomInput({ container: config.renderer?.container, ...config.input }));
      install(new Clear());
      install(new Class());
      install(new Image({ container: config.renderer?.container }));
      install(new Restart());
      install(new Link());
      install(new LinkOpen());
      install(new InputText());
      install(new InputNumber());
      install(new Background());
      install(new Audio());
      install(new Load());
      install(new Save());
      install(new Reset());
      const titleConfig = config.title === false ? null : config.title || {};
      const paletteConfig = config.palette === false ? null : config.palette || {};
      const target = paletteConfig?.target || document.body;
      const themes = paletteConfig?.themes || (paletteConfig ? window.getComputedStyle(target).getPropertyValue("--themes").split(",").map((name) => name.trim()).filter(Boolean) : []);
      const palette = paletteConfig ? new Theme({
        themes,
        initial: paletteConfig.initial,
        storageKey: paletteConfig.storageKey
      }) : null;
      const button = paletteConfig?.button || null;
      const originalHidden = button?.hidden;
      const originalDocumentTitle = document.title;
      const originalTargetTitle = titleConfig?.target?.textContent || "";
      const originalPalette = target.getAttribute("data-theme");
      let lastDocumentTitle;
      let lastTargetTitle;
      let lastPalette;
      const onPaletteClick = () => {
        if (palette && player.getPlugin("theme") === palette) palette.cycle();
      };
      install({
        id: "default-theme-presentation",
        version: "1.0.0",
        install: () => {
          player.on("story:destroy", () => {
            active = false;
            if (defaultCompositions.get(player) === teardown) defaultCompositions.delete(player);
          });
          if (titleConfig) player.on("title:changed", (data) => {
            const title = data.title;
            if (titleConfig.target) {
              lastTargetTitle = title || originalTargetTitle;
              titleConfig.target.textContent = lastTargetTitle;
            }
            lastDocumentTitle = title ? titleConfig.format ? titleConfig.format(title) : title + (titleConfig.suffix || "") : originalDocumentTitle;
            document.title = lastDocumentTitle;
          });
          if (palette) player.on("theme:changed", (data) => {
            lastPalette = data.name;
            target.setAttribute("data-theme", data.name);
          });
          if (button) {
            button.hidden = themes.length < 2;
            if (themes.length >= 2) button.addEventListener("click", onPaletteClick);
          }
        },
        uninstall: () => {
          if (button) {
            button.removeEventListener("click", onPaletteClick);
            button.hidden = originalHidden;
          }
          if (lastDocumentTitle !== void 0 && document.title === lastDocumentTitle) document.title = originalDocumentTitle;
          if (titleConfig?.target && lastTargetTitle !== void 0 && titleConfig.target.textContent === lastTargetTitle) {
            titleConfig.target.textContent = originalTargetTitle;
          }
          if (lastPalette !== void 0 && target.getAttribute("data-theme") === lastPalette) {
            if (originalPalette === null) target.removeAttribute("data-theme");
            else target.setAttribute("data-theme", originalPalette);
          }
        }
      });
      if (titleConfig) install(new Title());
      if (palette) install(palette);
      defaultCompositions.set(player, teardown);
      return teardown;
    } catch (error) {
      teardown();
      throw error;
    }
  }

  // src/plugins.ts
  if (typeof window !== "undefined") {
    const globals = window;
    globals.InkShellUtils = { cloneWithContext, installDefaultPlugins };
    globals.InkShellPlugins = {
      DomRenderer,
      Clear,
      Class,
      Image,
      Restart,
      Link,
      LinkOpen,
      InputText,
      InputNumber,
      DomInput,
      Save,
      Load,
      Background,
      Audio,
      Title,
      Reset,
      Theme
    };
  }
  return __toCommonJS(plugins_exports);
})();
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
 * InkShell — Default DOM Presentation Plugin / 默认 DOM 呈现插件
 *
 * Themes choose whether to install this renderer or provide their own.
 * It owns story markup, choices, background presentation and DOM snapshots.
 * CSS, shell structure and animations remain in the selected theme.
 * 主题可选用此渲染器，也可提供自己的实现。本插件负责故事 DOM、选项、
 * 背景呈现及 DOM 快照；样式、页面外壳和动画由主题决定。
 *
 * Service / 服务: "presentation" (InkPresentation)
 * Emits / 发出: dom:passage, dom:choice, dom:clear, save:snapshot
 */
/*!
 * InkShell — DOM Utils / DOM 工具
 *
 * Shared DOM helpers for themes and plugins. Exposed as
 * window.InkShellUtils so plain-JS themes (theme.js) can use them
 * without importing the TS bundle.
 * 主题与插件共用的 DOM 助手。以 window.InkShellUtils 暴露，
 * 方便纯 JS 主题（theme.js）无需引用 TS 包即可使用。
 */
/*!
 * InkShell — DOM Input Presentation / DOM 输入呈现
 *
 * A reusable view that themes may configure or replace. Removing this
 * view leaves the functional input requests and pause reasons intact.
 * 主题可配置或替换的通用视图。移除此视图会保留输入请求和暂停原因。
 */
/*!
 * InkShell — Clear Plugin / 清屏插件
 *
 * #CLEAR discards text history and asks the selected presentation to clear.
 * No renderer or DOM structure is assumed. Lifecycle clearing is owned by
 * the presentation itself. Without this plugin, CLEAR is just an unknown tag.
 * #CLEAR 清除文本历史，并通知主题所选的呈现服务清屏，不假定 DOM 结构。
 * 生命周期清理由呈现服务负责；未安装本插件时 CLEAR 没有清除语义。
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
 * # INPUT-TEXT: var="player_name" prompt="Enter text:"
 * Declare a string VAR first. Inputs pause story progression until submitted.
 * This plugin owns the interaction; the theme chooses its presentation.
 * 先声明字符串 VAR。提交输入前暂停故事推进。插件管理交互，主题选择呈现。
 */
/*!
 * InkShell — InputNumber Plugin / 数字输入插件
 *
 * # INPUT-NUMBER: var="age" prompt="Enter a number:"
 * Declare a number VAR first. Inputs pause story progression until submitted.
 * This plugin owns the interaction; the theme chooses its presentation.
 * 先声明数字 VAR。提交输入前暂停故事推进。插件管理交互，主题选择呈现。
 */
/*!
 * InkShell — Background Plugin / 背景插件
 *
 * Tracks the background source requested by the #BACKGROUND tag.
 * Compatible with Inky's official web export convention.
 * 通过 #BACKGROUND 标签记录背景图片来源。
 * 兼容 Inky 官方 Web 导出约定。
 *
 * Plugin id: "background"
 *
 * Ink tag / Ink 标签:
 *   #BACKGROUND: sky.png            → set background image / 设置背景图
 *   #BACKGROUND: images/sky.png     → subfolder / 子文件夹
 *   #BACKGROUND:                    → clear background / 清除背景（空值）
 *
 * Emits background:changed { src }; renderers decide how to present it.
 * 发出 background:changed { src }；呈现方式由主题选择的渲染器决定。
 * Saves restore the active background via the plugin-state protocol.
 * 存档通过插件状态协议恢复活动背景。
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
 * Saves restore the track, loop mode, playback position and playing state;
 * playback/seeking still depends on browser policy and media availability.
 * 存档恢复曲目、循环、进度和播放状态；播放/定位仍取决于浏览器策略和媒体可用性。
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
 * InkShell — Load Plugin / 读档插件（读侧）
 *
 * Restores story/plugin state and delegates visible history to the selected
 * presentation. No DOM structure or snapshot format is assumed.
 * 恢复故事与插件状态，可见历史交给主题所选的呈现服务处理，
 * 不依赖任何 DOM 结构或快照格式。
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
 *   save:error    { operation, slot, reason, message } on failure
 *
 * Restore timing / 还原时序:
 * The renderer validates the view before live state changes. After the
 * current choices/content have rendered, Load restores the prepared view
 * during story:content and before story:turnComplete.
 * 呈现服务先验证快照，再提交故事状态。当前回合呈现之后，Load 在
 * story:content 内恢复快照，早于 story:turnComplete。
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
 * Saves include inkjs state, plugin state and an opaque presentation snapshot.
 * The selected renderer owns its snapshot format; no renderer means state-only.
 * 存档包含故事、插件状态及不透明的呈现快照。快照格式由主题选用的
 * 渲染器负责；未安装渲染器时保存纯状态存档。
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
 *   save:error    { operation, slot?, reason, message } on failure
 *
 * Auto-save is deferred via queueMicrotask so we snapshot state AFTER
 * inkjs finishes the current continue() turn — otherwise we'd capture a
 * half-step state that doesn't restore cleanly.
 * 自动存档的写操作通过 queueMicrotask 延迟，确保在 inkjs 完成本次 continue()
 * 回合之后再快照状态——否则会捕获到无法干净恢复的"半步"状态。
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
 *   InkShellReset.clearAll()   → wipe every save slot, restart; boolean success
 *
 * Events / 事件:
 *   save:error on storage failure; restart reuses `story:restart`
 */
/*!
 * Optional browser theme composition. A theme opts in to this helper;
 * the engine and common HTML boot never install presentation or features.
 * 可选的浏览器主题组合：由主题显式选用，核心与公共启动模板不自动安装功能。
 */
/*!
 * InkShell — Optional feature and presentation bundle / 插件与呈现集合
 * Loading this bundle exposes constructors; the theme chooses what to install.
 * 加载本文件只导出构造器；安装哪些插件由主题决定。
 */
