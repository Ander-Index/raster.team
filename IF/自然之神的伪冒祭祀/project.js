// -----------------------------------

// always attempt to break to a new line in a way that
// preserves a minimum number of words per line
import "./patches/minwordsperline.js";

// click and drag to scroll the page
import "./patches/dragtoscroll.js";

// convert markdown to HTML tags
import "./patches/markdowntohtml.js"

// -----------------------------------

// import helper patch for binding shortcuts to choices
import choices from "./patches/shortcuts/choices.js";

// bind the number keys to choices
for (var i = 0; i < 9; i++)
{
	choices.add((i+1).toString(), i, true);
}

// bind z, x, and c to the first three shortcuts respectively
["z", "x", "c"].forEach((key, index) => { choices.add(key, index, true) })

// bind spacebar to progress the story,
// provided there's only one choice available
choices.add(" ", 0, true, true);

//	存档插槽
import memorycard from "./patches/memorycard.js";
	options.memorycard_applymostrecenttag.push("play", "resume", "pause", "stop", "background");	//	配置包括背景在内一并记录状态

//	预加载
import "./patches/preload.js";
    options.preload_tags.audio.push("play", "pause", "resume", "stop", "background");
    options.preload_tags.image.push("frame");

// 历史记录
import "./patches/history.js";

// 自动保存
// import "./patches/autosave.js";


// 直接修改引擎默认的全局选项
options.passagedelay = 0;    // 清理旧段落、展示新段落（包括点击选项后）的延迟。设为 0 就是零等待（默认 200.0）
options.linedelay = 50;       // 每行文字出现的间隔。设为 0 会让整段话瞬间出现（默认 50.0）
options.showlength = 888;    // 元素淡入的动画时间（毫秒）。设为 150 能在极速响应中保留一点柔和感（默认 500.0）
options.hidelength = 300;    // 元素淡出/清屏的动画时间（默认 600.0）







// -----------------------------------

// create our game

var story = new Story("自然之神的伪冒祭祀.ink");


// 1. 获取页面上的保存按钮
var saveBtn = document.getElementById("save-btn");

// 2. 监听按钮的点击事件
saveBtn.addEventListener("click", function(event) {
    // 阻止超链接默认的刷新/跳转行为
    event.preventDefault(); 
    
    // 3. 调用 memorycard 的官方保存接口，把当前的 story 状态存下来
    memorycard.save(story);
    
    // 4. 给玩家一个视觉反馈：把按钮文字变成“已保存”，1.5秒后再变回来
    saveBtn.innerText = "已保存 ✔";
    saveBtn.style.color = "#4caf50"; // 变成绿色显得很安心
    
    setTimeout(function() {
        saveBtn.innerText = "保存";
        saveBtn.style.color = ""; // 恢复原本的颜色
    }, 1500);
});









// 1. 获取页面上的读取按钮
var loadBtn = document.getElementById("load-btn");

// 2. 监听按钮的点击事件
loadBtn.addEventListener("click", function(event) {
    // 阻止超链接默认的刷新/跳转行为
    event.preventDefault(); 
    // ==========================================
    // 新增：在读取存档前，先调用引擎的方法清除当前页面上的所有内容
    // 引擎会自动根据你设置的 hidelength (300ms) 播放淡出动画
    // ==========================================
    story.clear();    
    // 3. 调用 memorycard 的官方读取接口，把当前的 story 状态读出来
    memorycard.load(story);
    
    // 4. 给玩家一个视觉反馈：把按钮文字变成“已读取”，1.5秒后再变回来
    loadBtn.innerText = "已读取 ✔";
    loadBtn.style.color = "#4caf50"; // 变成绿色显得很安心
    
    setTimeout(function() {
        loadBtn.innerText = "读取";
        loadBtn.style.color = ""; // 恢复原本的颜色
    }, 1500);
});







// 1. 获取页面上的重置按钮
var resetBtn = document.getElementById("reset-btn");

// 2. 监听点击事件
resetBtn.addEventListener("click", function(event) {
    event.preventDefault(); 
    
    // 弹出一个系统确认框，防止玩家手滑误触导致进度全失
    var confirmReset = confirm("确定要重新开始游戏吗？所有的进度都将清除，但是不会清除已保存的存档。");
    
    if (confirmReset) {
        // 调用 Calico 官方的重置接口
        story.restart();
    }
});










// 1. 获取页面上的主题按钮
var themeBtn = document.getElementById("theme-btn");

// 2. 准备一个主题列表（空字符串代表默认的黑夜主题）
var themes = ["", "light-theme", "sepia-theme"];
var currentThemeIndex = 0; // 记录当前使用的是第几个主题

// 3. 监听按钮的点击事件
themeBtn.addEventListener("click", function(event) {
    event.preventDefault(); 
    
    // 先把身上的所有主题衣服都脱掉
    document.body.classList.remove("light-theme", "sepia-theme");
    
    // 序号加 1。如果超过了列表长度，就回到 0（实现无限循环轮换）
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    
    // 如果当前选中的不是默认空主题，就给 body 穿上对应的新衣服
    if (themes[currentThemeIndex] !== "") {
        document.body.classList.add(themes[currentThemeIndex]);
    }
    
    // 视觉反馈：按钮点击后稍微变色闪一下
    // themeBtn.style.color = "#4caf50"; 
    // setTimeout(function() {
    //     themeBtn.style.color = ""; 
    // }, 300);
});