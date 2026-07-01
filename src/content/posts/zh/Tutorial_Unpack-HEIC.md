---
title: 【教程】如何不写代码就提取或转换含有多张图片的 .heic
description: 很显然，蠢老虎我根本不会编程。
pubDate: 2022-05-07T02:20:39.000Z
tags: [Tutorials]
categories: []
draft: false
toc: true
pinned: false
math: false
lang: zh
unlisted: true
---
# 写在前面
很显然，蠢老虎我根本不会编程。
所以这篇文章不涉及任何代码，纯现成软件，但是都不开源。
如果你在寻找开源的解决方案……或许你可以看看 .heic 的官方文档，
但是如果愿意看官方文档并去写代码的，估计也不会看到我这篇文章……
macOS 与 Windows 的操作方法不一样，原因是它们对 .heic 的支持力不同。
~~（似乎这个格式是需要收取厂商专利费的）~~

以 Monterey Graphic.heic 为例，下称“目标”。

# macOS
macOS 对于 .heic 是系统级的兼容，你在购买 Mac 的时候就已经通过苹果交过了这笔专利费……（所谓羊毛出在羊身上。）
1. 在 预览 中打开目标。
2. 把图片一张一张的拖到桌面就可以了。
3. 但是这样出来的图片式 .tiff 格式，如果不喜欢，那么可以选择导出
4. 在菜单：“文件 > 导出...”中
5. 通过格式等选项，就可以选择自己想要导出的格式和大小。
![外链_预览导出格式选项](https://s3.bmp.ovh/imgs/2022/06/10/81edb038908af330.png)

# Windows
经过测试，目前只有这款叫做 Joyoshare HEIC Converter 的软件可以在 Windows 端转换这种多合一的 .heic 文件。不过，这款软件是收费的……

Joyoshare HEIC Converter 官网：<https://www.joyoshare.com/heic-converter/>

其提供试用，但是没有注册的版本导出的内容会有水印。
但是这款软件的“学习版”你可以搜一搜，不难查到。

1. 首先
2. 然后
3. 注意
4. 这样一来就把 .heic 合集全部解散并转换出来了。

# 碎碎念
.heic 的颜色确实很不错，但这毕竟还是个新技术，相关的工具文档还有软件上的支持都太少了，不知道以后会怎样。（2022年6月10日）