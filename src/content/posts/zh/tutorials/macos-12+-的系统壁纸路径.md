---
title: 【macOS】macOS 12+ 的系统壁纸路径
pubDate: "2024-01-07T12:21:40.000Z"
draft: false
heroImage: "https://cntracker.net/img/f7bd65aa13bfff708d6c6983dc572fbe.jpg"
toc: true
pinned: false
math: false
tags: [教程, macOS]
categories: [教程]
description: 要说系统自带的壁纸，那 macOS 的指定排得上号。
lang: zh
unlisted: false
---
要说系统自带的壁纸，那 macOS 的指定排得上号。

<!-- more -->

# 先上结论

- 安装时已经存在的部分仍然在传统地址：/System/Library/Desktop Pictures
- 在偏好设置中下载的部分在：/Users/<你的用户名>/Library/Application Support/com.apple.mobileAssetDesktop

# 此外

- Sonoma 最新的航拍桌面位置在：/Library/Application Support/com.apple.idleassetsd/Customer/4KSDR240FPS

# 随手附上下载地址

## macOS 12 Monterey:

- ~~Lay了，下次一定。（尽快补上）~~

# 如何发现的？

查了大量的资料，最后找到了这里：
[《Mac如何查看当前壁纸图片所在的路径》](https://www.jianshu.com/p/6276684bd00b)：<https://www.jianshu.com/p/6276684bd00b>
> Mac设置了漂亮的壁纸，却发现找不到壁纸的原位置的解决方法
> <p align="right">——LuckyPan</p>

为防止网页失效，这里备份一下命令行……（均在终端输入）

显示壁纸所在路径（路径显示在屏幕对应壁纸上）：

    defaults write com.apple.dock desktop-picture-show-debug-text -bool TRUE;killall Dock

要隐藏该路径：

    defaults delete com.apple.dock desktop-picture-show-debug-text;killall Dock

# 但是……

得到的 .heic 文件一张就是一份壁纸，很显然 Apple 把他们一份一份的封装起来了。
想给这方面做的确实不行的 Windows 用就需要解散它们，并转换成 .jpg。
要怎么解开这些 .heic，并导出其中的内容呢？
请移步这篇：[《【教程】如何不写代码就提取或转换含有多张图片的 .heic》](posts/zh/tutorials/macos-12+-的系统壁纸路径)
