// -----------------------------------

// always attempt to break to a new line in a way that
// preserves a minimum number of words per line
import "./patches/minwordsperline.js";

// click and drag to scroll the page
import "./patches/dragtoscroll.js";

// convert markdown to HTML tags
// import "./patches/markdowntohtml.js"

// -----------------------------------

// // import helper patch for binding shortcuts to choices
// import choices from "./patches/shortcuts/choices.js";

// // bind the number keys to choices
// for (var i = 0; i < 9; i++)
// {
// 	choices.add((i+1).toString(), i, true);
// }

// // bind z, x, and c to the first three shortcuts respectively
// ["z", "x", "c"].forEach((key, index) => { choices.add(key, index, true) })

// // bind spacebar to progress the story,
// // provided there's only one choice available
// choices.add(" ", 0, true, true);

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

var story = new Story("自然之神的伪冒祭祀.json");


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
        window.location.reload();	//	直接刷新网页
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






// 添加一个名为 #input_text 的自定义标签
Tags.add("input_text", function(story, property) {
    // property 就是标签冒号后面的内容，即你想替换的 Ink 变量名
    var varName = property ? property.trim() : null;
    if (!varName) return;

    // 1. 创建一个外层容器 (段落)
    var container = document.createElement("p");
    container.className = "custom-input-container";

    // 2. 创建输入框
    var inputField = document.createElement("input");
    inputField.type = "text"; 
    inputField.placeholder = "请输入...";
    inputField.className = "custom-input-field";

    // 3. 创建确认按钮
    var confirmBtn = document.createElement("button");
    confirmBtn.innerText = "确认";
    confirmBtn.className = "custom-input-btn";

    // 将输入框和按钮加入容器
    container.appendChild(inputField);
    container.appendChild(confirmBtn);

    // [关键点] 给游戏容器加一个 class，用于在 CSS 里暂时隐藏默认的 Ink 选项
    // 这样玩家必须通过输入框来推进流程
    story.innerdiv.classList.add("hide-choices-for-input");

    // 4. 绑定按钮的点击事件
    confirmBtn.addEventListener("click", function(event) {
        event.preventDefault(); // 阻止默认行为
        
        var val = inputField.value.trim();
        if (val !== "") {
            // 将玩家输入的值赋给 Ink 中的变量
            story.ink.variablesState[varName] = val;
            
            // 改变外观，给玩家已确认的视觉反馈
            inputField.disabled = true;
            confirmBtn.disabled = true;
            confirmBtn.innerText = "已确认 ✔";

            // 稍微延迟一下，然后自动推进故事
            setTimeout(function() {
                // 移除隐藏选项的 class
                story.innerdiv.classList.remove("hide-choices-for-input");
                
                // 找到当前的所有选项，并自动点击第一个未被点过的选项
                var choices = story.innerdiv.querySelectorAll(".choice a");
                for (var i = 0; i < choices.length; i++) {
                    if (!choices[i].classList.contains("chosen")) {
                        choices[i].click();
                        break;
                    }
                }
            }, 400); // 400 毫秒的延迟让玩家能看清“已确认”的提示
        } else {
            // 如果玩家没填内容，给一点提示
            inputField.placeholder = "内容不能为空哦！";
            inputField.style.borderColor = "red";
        }
    });

    // 小优化：允许玩家按键盘的回车键（Enter）直接提交
    inputField.addEventListener("keydown", function(event) {
        event.stopPropagation();    // 【新增这一行】：阻止按键事件“冒泡”到网页外层，这样 Calico 就听不到你的按键了
        if (event.key === "Enter") {
            confirmBtn.click();
        }
    });

    // 5. 将这组创建好的 UI 元素推入 Calico 的渲染队列中，让它显示在文字流里
    story.queue.push(container);
});










// 添加一个名为 #input_num 的自定义标签（专门用于输入数字）
Tags.add("input_num", function(story, property) {
    var varName = property ? property.trim() : null;
    if (!varName) return;

    // 1. 创建外层容器
    var container = document.createElement("p");
    container.className = "custom-input-container";

    // 2. 创建数字输入框（核心区别：type 改为了 "number"）
    var inputField = document.createElement("input");
    inputField.type = "number"; 
    inputField.placeholder = "请输入数字...";
    inputField.className = "custom-input-field";

    // 3. 创建确认按钮
    var confirmBtn = document.createElement("button");
    confirmBtn.innerText = "确认";
    confirmBtn.className = "custom-input-btn";

    container.appendChild(inputField);
    container.appendChild(confirmBtn);

    // 隐藏默认的选项
    story.innerdiv.classList.add("hide-choices-for-input");

    // 4. 绑定点击事件
    confirmBtn.addEventListener("click", function(event) {
        event.preventDefault();
        
        var val = inputField.value.trim();
        if (val !== "") {
            // 【核心区别】将玩家填写的文字强制转换为纯数字 (Float)
            var numVal = parseFloat(val);
            
            // 确保转换后确实是一个有效的数字
            if (!isNaN(numVal)) {
                // 将数字存入 Ink 变量
                story.ink.variablesState[varName] = numVal;
                
                // 禁用输入框，修改按钮状态
                inputField.disabled = true;
                confirmBtn.disabled = true;
                confirmBtn.innerText = "已确认 ✔";

                // 延迟 400 毫秒后自动推进剧情
                setTimeout(function() {
                    story.innerdiv.classList.remove("hide-choices-for-input");
                    var choices = story.innerdiv.querySelectorAll(".choice a");
                    for (var i = 0; i < choices.length; i++) {
                        if (!choices[i].classList.contains("chosen")) {
                            choices[i].click();
                            break;
                        }
                    }
                }, 400);
            } else {
                inputField.value = "";
                inputField.placeholder = "只能输入数字哦！";
                inputField.style.borderColor = "red";
            }
        } else {
            inputField.placeholder = "内容不能为空哦！";
            inputField.style.borderColor = "red";
        }
    });

    // 支持回车键提交
    inputField.addEventListener("keydown", function(event) {
        event.stopPropagation();    // 【新增这一行】：阻止按键事件“冒泡”到网页外层，这样 Calico 就听不到你的按键了
        if (event.key === "Enter") {
        confirmBtn.click();
        }
    });

    // 推入渲染队列
    story.queue.push(container);
});








// ==========================================
// 处理带有 # unclickable 标签的不可点击选项
// ==========================================
document.getElementById("container").addEventListener("passage choice element", function(event) {
    var choice = event.detail.choice;
    var element = event.detail.element; // 这是包裹选项的 <p class="choice">
    
    // 检查 Ink 脚本中该选项是否带有 unclickable 标签
    if (choice.tags && choice.tags.includes("unclickable")) {
        // 给外层 <p> 加上特定的类名，方便 CSS 调整外观
        element.classList.add("unclickable");
        
        // 获取实际承担点击功能的 <a> 标签
        var link = element.querySelector("a");
        
        // 1. 彻底斩断鼠标交互，真正实现“无法点击”
        link.style.pointerEvents = "none";
        
        // 2. 延迟覆盖引擎默认的悬停小手 (因为 Calico 会在动画结束后重置鼠标样式)
        setTimeout(function() {
            link.style.cursor = "not-allowed";
        }, story.options.suppresschoice + 10);
    }
});