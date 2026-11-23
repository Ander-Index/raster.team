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
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    InkShell: () => InkShell,
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
      this._pauseReasons = /* @__PURE__ */ new Set();
      this._services = /* @__PURE__ */ Object.create(null);
      this._serviceOwners = /* @__PURE__ */ Object.create(null);
      this._activeTurnText = null;
      this._progressQueue = [];
      this._progressing = false;
      this._progressPhase = null;
      this._activeProgressEpoch = -1;
      this._choiceRevision = 0;
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
      this._events = /* @__PURE__ */ Object.create(null);
      this._plugins = /* @__PURE__ */ Object.create(null);
      this._externals = /* @__PURE__ */ Object.create(null);
      this._cumulativeText = "";
      this._listenerOrder = 0;
      this._currentInstallPriority = 0;
      this._currentInstallId = null;
      this._epoch = 0;
      this._endedFired = false;
      this._lastVarValues = /* @__PURE__ */ Object.create(null);
      this._inkJson = config.inkJson;
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
        order: this._listenerOrder++,
        plugin: this._currentInstallId
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
      const epoch = this._epoch;
      for (let i = 0; i < snapshot.length; i++) {
        try {
          snapshot[i].fn(data);
        } catch (e) {
          console.error('InkShell: error in "' + event + '" handler:', e);
        }
        if (this._epoch !== epoch) return;
      }
    }
    // ---- lifecycle / 生命周期 ----
    start() {
      if (!this._story) return;
      this._cumulativeText = "";
      const epoch = this._epoch;
      this.emit("story:loaded", {});
      if (this._epoch !== epoch) return;
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
      this._pauseReasons.clear();
      this._content = null;
      this._cumulativeText = "";
      const epoch = this._epoch;
      this.emit("story:restart", {});
      if (this._epoch !== epoch) return;
      this.continue();
    }
    destroy() {
      this.emit("story:destroy", {});
      for (const id of Object.keys(this._plugins)) {
        const p = this._plugins[id];
        if (!p) continue;
        try {
          if (typeof p.uninstall === "function") p.uninstall();
        } catch (e) {
          console.error('InkShell: error uninstalling "' + id + '":', e);
        }
      }
      this._plugins = /* @__PURE__ */ Object.create(null);
      this._events = /* @__PURE__ */ Object.create(null);
      this._externals = /* @__PURE__ */ Object.create(null);
      this._services = /* @__PURE__ */ Object.create(null);
      this._serviceOwners = /* @__PURE__ */ Object.create(null);
      this._activeTurnText = null;
      this._progressQueue = [];
      this._story = null;
      this._container = null;
      this._content = null;
      this._cumulativeText = "";
      this._pauseReasons.clear();
      this._epoch++;
    }
    // ---- story progression / 故事推进 ----
    /** Block progression until all independent pause reasons are released. / 所有暂停原因解除后才可继续推进。 */
    pause(reason = "manual") {
      this._pauseReasons.add(reason);
    }
    /** Release one reason. Call continue() explicitly to render/advance. / 解除一个原因，显式调用 continue() 渲染或推进。 */
    resume(reason = "manual") {
      this._pauseReasons.delete(reason);
    }
    get isPaused() {
      return this._pauseReasons.size > 0;
    }
    /** Clear accumulated text; during a turn preserve the current line. / 清除文本历史，回合中保留当前行。 */
    clearHistory() {
      this._cumulativeText = "";
      if (this._activeTurnText) {
        this._activeTurnText.splice(0, Math.max(0, this._activeTurnText.length - 1));
      }
      if (this._content) this._content = { ...this._content, text: "", delta: "" };
    }
    continue() {
      if (!this._story) return;
      if (this._progressing && this._epoch === this._activeProgressEpoch) {
        if (this._progressPhase === "ink") return;
        if (this.isPaused || !this._story.canContinue) return;
      }
      this._queueContinue();
      this._drainProgress();
    }
    _queueContinue() {
      if (!this._progressQueue.some((action) => action.kind === "continue" && action.epoch === this._epoch)) {
        this._progressQueue.push({ kind: "continue", epoch: this._epoch });
      }
    }
    _drainProgress() {
      if (this._progressing) return;
      this._progressing = true;
      try {
        while (this._progressQueue.length && this._story) {
          const action = this._progressQueue.shift();
          if (action.epoch !== this._epoch) continue;
          this._activeProgressEpoch = action.epoch;
          if (action.kind === "choose") {
            if (action.revision !== this._choiceRevision) continue;
            this._progressPhase = "events";
            this._chooseNow(action.index);
          } else {
            this._progressPhase = "ink";
            this._continueTurn();
          }
        }
      } finally {
        this._progressing = false;
        this._progressPhase = null;
        this._activeProgressEpoch = -1;
      }
    }
    _continueTurn() {
      if (!this._story) return;
      const previousTurnText = this._activeTurnText;
      try {
        const story = this._story;
        const parsedTags = [];
        const turnText = [];
        this._activeTurnText = turnText;
        const epoch = this._epoch;
        while (story.canContinue && !this.isPaused) {
          turnText.push(story.Continue());
          if (this._epoch !== epoch) return;
          const rawTags = story.currentTags || [];
          for (let i = 0; i < rawTags.length; i++) {
            const tag = parseTag(rawTags[i]);
            parsedTags.push(tag);
            this.emit("tag:" + tag.name, tag);
            if (this._epoch !== epoch) return;
          }
          if (this._epoch !== epoch) return;
        }
        const delta = turnText.join("");
        this._cumulativeText += delta;
        const content = {
          text: this._cumulativeText,
          delta,
          tags: parsedTags,
          choices: !this.isPaused && story.currentChoices ? story.currentChoices.map(
            (c) => ({
              index: c.index,
              text: c.text,
              tags: c.tags || []
            })
          ) : [],
          path: story.state && story.state.currentPathString || null
        };
        this._content = content;
        this._progressPhase = "events";
        if (!this.isPaused && !story.canContinue && story.currentChoices && story.currentChoices.length === 0) {
          if (!this._endedFired) {
            this._endedFired = true;
            this.emit("story:ended", {});
          }
        } else {
          this._endedFired = false;
        }
        if (this._epoch !== epoch) return;
        this.emit("story:content", content);
        if (this._epoch !== epoch) return;
        this.emit("story:turnComplete", content);
      } catch (e) {
        this.emit("story:error", {
          message: e.message,
          error: e
        });
      } finally {
        this._activeTurnText = previousTurnText;
      }
    }
    // ---- choices / 选项 ----
    /** Selections made in callbacks run after the current turn finishes. */
    choose(index) {
      if (!this._story || this.isPaused || !Number.isInteger(index)) return;
      const choices = this._story.currentChoices;
      if (!choices || index < 0 || index >= choices.length) return;
      this._progressQueue.push({ kind: "choose", epoch: this._epoch, index, revision: this._choiceRevision });
      this._drainProgress();
    }
    _chooseNow(index) {
      if (!this._story || this.isPaused) return;
      const story = this._story;
      const choices = story.currentChoices;
      if (!choices || index < 0 || index >= choices.length) return;
      const epoch = this._epoch;
      story.ChooseChoiceIndex(index);
      this._choiceRevision++;
      this.emit("story:choice", {
        index,
        text: choices[index].text
      });
      if (this._epoch !== epoch) return;
      this._queueContinue();
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
    load(jsonStr, pluginState) {
      if (!this._story) return false;
      let candidate;
      try {
        candidate = this._prepareState(jsonStr);
      } catch (e) {
        this.emit("story:error", {
          message: e.message,
          error: e
        });
        return false;
      }
      this._story = candidate;
      this._epoch++;
      this._endedFired = false;
      this._pauseReasons.clear();
      this._installVariableObserver();
      this._content = null;
      this._cumulativeText = "";
      const epoch = this._epoch;
      this.emit("story:load", {});
      if (this._epoch !== epoch) return true;
      this.restorePluginState(pluginState);
      if (this._epoch !== epoch) return true;
      this.continue();
      return true;
    }
    /** Validate a save without changing story, plugins or DOM. / 校验存档，不改变故事、插件或 DOM。 */
    validateState(jsonStr) {
      if (!this._story) return false;
      try {
        this._prepareState(jsonStr);
        return true;
      } catch {
        return false;
      }
    }
    _prepareState(jsonStr) {
      if (typeof jsonStr !== "string") throw new Error("InkShell: invalid save state");
      const raw = JSON.parse(jsonStr);
      const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
      if (!isObject(raw) || !isObject(raw.variablesState) || !Array.isArray(raw.evalStack) || !isObject(raw.visitCounts) || !isObject(raw.turnIndices) || ![raw.turnIdx, raw.storySeed, raw.previousRandom].every(Number.isInteger)) {
        throw new Error("InkShell: invalid save state structure");
      }
      const flows = raw.flows;
      if (flows !== void 0) {
        if (!isObject(flows) || Object.keys(flows).length === 0) {
          throw new Error("InkShell: invalid save flows");
        }
        for (const flow of Object.values(flows)) {
          if (!isObject(flow) || !isObject(flow.callstack) || !Array.isArray(flow.outputStream) || !Array.isArray(flow.currentChoices)) throw new Error("InkShell: invalid save flow structure");
        }
      }
      const inkjs = window.inkjs;
      const candidate = new inkjs.Story(this._inkJson);
      for (const name of Object.keys(this._externals)) {
        candidate.BindExternalFunction(name, this._externals[name]);
      }
      candidate.state.LoadJson(jsonStr);
      if (candidate.state.hasError || candidate.state.hasWarning) {
        throw new Error("InkShell: save state is incompatible with this story");
      }
      void candidate.canContinue;
      void candidate.currentChoices;
      const restoredFlows = candidate.state._namedFlows ? Array.from(candidate.state._namedFlows.values()) : [candidate.state._currentFlow];
      for (const flow of restoredFlows) {
        for (const choice of flow.currentChoices) {
          const target = candidate.ContentAtPath(choice.targetPath);
          if (!target.obj || target.approximate) {
            throw new Error("InkShell: saved choice target is missing from this story");
          }
        }
      }
      candidate.state.ToJson();
      return candidate;
    }
    capturePluginState() {
      const state = /* @__PURE__ */ Object.create(null);
      for (const id of Object.keys(this._plugins)) {
        const plugin = this._plugins[id];
        if (typeof plugin.saveState === "function") state[id] = plugin.saveState();
      }
      return state;
    }
    restorePluginState(state) {
      for (const id of Object.keys(this._plugins)) {
        const plugin = this._plugins[id];
        if (typeof plugin.loadState !== "function") continue;
        try {
          plugin.loadState(state && Object.prototype.hasOwnProperty.call(state, id) ? state[id] : void 0);
        } catch (e) {
          this.emit("story:error", {
            message: e.message,
            error: e
          });
        }
      }
    }
    // ---- read-only state / 只读状态 ----
    get canContinue() {
      return this._story ? !this.isPaused && this._story.canContinue : false;
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
      this._lastVarValues = /* @__PURE__ */ Object.create(null);
      const variables = story.state.variablesState;
      const names = /* @__PURE__ */ new Set();
      for (const values of [variables._defaultGlobalVariables, variables._globalVariables]) {
        if (values instanceof Map) {
          for (const name of values.keys()) names.add(name);
        }
      }
      for (const name of names) this._lastVarValues[name] = story.variablesState[name];
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
            const previous = this._lastVarValues[name];
            if (previous === v) return;
            if (v && typeof v === "object" && "Equals" in v && typeof v.Equals === "function" && v.Equals(previous)) return;
            this._lastVarValues[name] = v;
            this.emit("story:variableChanged", { name, value: v });
          }
        );
      } catch (e) {
        console.error("InkShell: failed to install variable observer:", e);
      }
    }
    // ---- services / 服务 ----
    /** Publish a replaceable service. Installed plugins own their registrations. / 发布服务，安装期间注册的服务归插件所有。 */
    provide(name, service) {
      this._services[name] = service;
      this._serviceOwners[name] = this._currentInstallId;
    }
    getService(name) {
      return Object.prototype.hasOwnProperty.call(this._services, name) ? this._services[name] : null;
    }
    /** Remove only the expected instance when supplied. / 传入实例时，仅移除同一实例。 */
    removeService(name, expected) {
      if (expected !== void 0 && this._services[name] !== expected) return;
      delete this._services[name];
      delete this._serviceOwners[name];
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
        const prevId = this._currentInstallId;
        this._currentInstallPriority = plugin.priority ?? 0;
        this._currentInstallId = plugin.id;
        try {
          plugin.install(this);
        } finally {
          this._currentInstallPriority = prev;
          this._currentInstallId = prevId;
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
      for (const name of Object.keys(this._serviceOwners)) {
        if (this._serviceOwners[name] === id) this.removeService(name);
      }
      for (const event of Object.keys(this._events)) {
        this._events[event] = this._events[event].filter(
          (h) => h.plugin !== id
        );
        if (this._events[event].length === 0) delete this._events[event];
      }
      this.emit("plugin:uninstalled", {
        id,
        version: plugin.version || "0.0.0"
      });
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

  // src/index.ts
  if (typeof window !== "undefined") {
    window.InkShell = InkShell;
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
 * InkShell — Engine entry / 核心入口
 * No feature or presentation plugins are installed or bundled here.
 * 此入口只提供核心；功能和呈现插件由主题显式选择。
 */
