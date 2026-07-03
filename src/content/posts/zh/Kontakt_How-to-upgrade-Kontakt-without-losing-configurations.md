---
title: 【REAPER】如何将工程中的 Kontakt 批量无损跨版本升级？
pubDate: "2023-10-11T10:16:25.000Z"
draft: false
heroImage: "https://us.v-cdn.net/6034896/uploads/YGOD1WXOXP2D/screenshot-2022-10-07-at-11-27-14.png"
toc: true
pinned: false
math: false
tags: [教程, REAPER, Kontakt]
categories: [教程]
description: 我的意思是，如果你使 REAPER, 那么你就不需要一个一个的替换成最新的 Kontakt, 再重新把音色加载一遍…… 也就是说，这篇文章想要告诉你如何把 REAPER 里所有用到的 Kontakt 在不丢失配置的情况下升级到最新的 Kontakt 大版本，比如从 Kontakt 6 升级到 Kontakt 7 而不丢失之前的配置。
lang: zh
unlisted: false
---
我的意思是，如果你使 REAPER, 那么你就不需要一个一个的替换成最新的 Kontakt, 再重新把音色加载一遍……
也就是说，这篇文章想要告诉你如何把 REAPER 里所有用到的 Kontakt 在不丢失配置的情况下升级到最新的 Kontakt 大版本，比如从 Kontakt 6 升级到 Kontakt 7 而不丢失之前的配置。

<!-- more -->

注意，该操作 **<font color=red>仅限 REAPER</font>**, 原因是只有 REAPER 的工程是以纯文本的方式存储的。

# 写在前面
发现一个很有意思的事情，Kontakt 5 的插件是 Kontakt 5.dll, 而 Kontakt 6 则是 Kontakt.dll, 现在 Kontakt 7 来了，竟然插件名又变成了 Kontakt 7.vst3……

我猜这大概就和当年宣布“Windows 10 是最后一个版本的 Windows”一样……

@[toc]

那么废话少说：
# 步骤
## 0. 准备步骤
虽然说用 REAPER 很多都会写个一两句代码的，电脑里面常备 Visual Code 也不是什么稀奇的事情，但这是一片面向小白的文章，所以就使用系统自带的记事本吧……
这里为了做示例，建立了一个名叫 Kontakt Upgrade 的工程：
1. First    插入了一个 Kontakt 6 并将此内容重命名为“康泰克 6”，象征性的加载一个音色。
2. Second   插入了一个 Kontakt 6 并不重命名，象征性的加载一个音色。
3. Third    插入了一个 Kontakt 7，可以象征性的加载一个音色。
![](https://raster.team/post-images/1697014831868.png)

在您的实际操作中，请触类旁通，因为你电脑里的插件指纹可能与我的不一样，所以您大概不能直接从我这里复制我的 ID 号。

 **<font color=red>这是一个危险操作。您应当备份您的工程，如果出现了任何工程损坏，笔者不负任何泽任。👓</font>**
## 1. 找到工程中想要替换的 Kontakt 插件指纹
1. 使用记事本打开 <你的工程>.rpp
2. 从`编辑`菜单中使用`查找`功能，
3. 查找有关“Kontakt”这个关键字，假如你“恰好给这个插件命名过”，你就可以尝试直接查找那个名称。比如我“恰好”给替换的 Kontakt 6 插件改名交了“康泰克 6”，那么我立即就搜索到了：
```<VST "VST3i: Kontakt (Native Instruments) (64 out)" Kontakt.vst3 0 "康泰克 6" 821777587{5653544E6924446B6F6E74616B740000} ""```

去查找另一个没有改过名字的 Kontakt 6，得到这行：
```<VST "VST3i: Kontakt (Native Instruments) (64 out)" Kontakt.vst3 0 "" 821777587{5653544E6924446B6F6E74616B740000} ""```

这行的格式是：
```<插件格式 "插件在插件库的名称" "插件在磁盘上存储的名称.后缀" "你对这个插件的命名" 插件指纹 ""```

~~插件指纹是我起的名字，实际上叫什么不知道，姑且先这样叫吧。~~

经过校验也发现，“插件指纹”这个字段不论你有没有在工程中对插件更名都是一致的。
那么，在我的示例中，我想要替换的 Kontakt 6 的指纹便是这个：
```821777587{5653544E6924446B6F6E74616B740000}```

## 2. 获取目标 Kontakt 插件指纹
同样的，用上一步的方法去找 Kontakt 7 的插件指纹，我的是：
```1219583956{5653544E694B376B6F6E74616B742037}```

## 3. 批量替换
1. 使用记事本中的`编辑 > 替换`
2. 把所有的 Kontakt 6 插件指纹 替换为 Kontakt 7 的插件指纹
3. 保存。无需担心插件在插件库的名称和插件在磁盘上存储的名称。
4. 使用 REAPER 打开工程，等待工程完全加载，并检查是否有遗漏。此时 REAPER 其实已经应用了工程自动修复，会根据插件指纹把插件所有的其它指向重新定向。
5. 保存工程。**<font color=red>注意，一旦你保存工程，那么便无法降级回低版本 Kontakt</font>**

# 最后
* 我不确定这个方法什么时候会失效……因为不知道哪个版本的 Kontakt 就会发疯。
* 没有测试过能不能用这个方法把 VST2 插件无缝升级为 VST3，但我认为大概率是可行的。
* 但是对于别家的插件，这个方法不一定适用，比如我测试了 Ozone 从 9 到 10，这样做虽然升级了插件，但是也丢掉了所有的参数……