---
title: 【ReaStream】远程桌面时的 ASIO 音频串流解决方案
pubDate: 2023-09-07T04:03:52.000Z
draft: false
toc: true
pinned: false
math: false
tags:
  - 教程
  - REAPER
  - 音频
  - ReaStream
  - ASIO
categories:
  - 教程
description: 龟软 Windows 的音频部分做的就是一坨……所以斯坦伯格开发了 ASIO 这种音频驱动。 但是由于这个 ASIO 并不经过系统，所以在使用 RDP 进行远程桌面或者使用 OBS 进行直播时，是无法直接接收这些音频的。 仍然有一些方案可以完成 ASIO 串流，比较常见的方案是 ASIO LINK PRO（残废）, 还有那个做的并不怎么样但是是瘸子里面的将军的 VoiceMeeter. 但今...
lang: zh
unlisted: false
---
龟软 Windows 的音频部分做的就是一坨……所以斯坦伯格开发了 ASIO 这种音频驱动。

但是由于这个 ASIO 并不经过系统，所以在使用 RDP 进行远程桌面或者使用 OBS 进行直播时，是无法直接接收这些音频的。

仍然有一些方案可以完成 ASIO 串流，比较常见的方案是 ASIO LINK PRO（残废）, 还有那个做的并不怎么样但是是瘸子里面的将军的 VoiceMeeter.

但今天这篇文章并不讨论这两个卧龙凤雏，而是来介绍 ReaStream.

<!-- more -->

这篇文章不讨论如何把 ASIO 音频串流到 OBS，这部分内容在这篇文章内：[《【ReaRoute ASIO】如何将 DAW 的声音发送到 OBS 以进行直播》](/posts/__raw/tutorial_rearoute-asio-to-obs-with-reaper/)

![](https://raster.team/post-images/1693385680485.png)

没错，就是 Cockos 开发的这么一个小巧的插件，就可以解决要在别的地方设置很久且很繁琐的 ASIO 串流的问题。不愧是开发了 REAPER 的公司，Cockos VERY New Bee!

下面，以“**将 DAW 的音频串流到 OBS**” 为例子，介绍一下如何使用 ReaStream 进行本地串流。
在这之后，会附加有关“**如何将使用 ASIO 驱动的音频串流到远程计算机**”的介绍。

@[toc]

# 配置环境

显然，得先有个 ReaStream 和 OBS, 无论有没有安装 REAPER 都需要下载一份独立的 ReaStream,
因为 REAPER 虽然自带了 ReaStream, 但是自带的那个版本只能给 REAPER 自己用，更何况有些朋友可能用的还不是 REAPER 这款 DAW. 此外 OBS 也需要运行一个 ReaStream 才能接收串流的音频。

## OBS 下载地址

为了防止有真小白被百毒什么的拐跑。这里特地贴上 OBS 下载链接：

<https://obsproject.com/>

点进去之后，直接下载对应平台的然后安装就可以了。最新的 OBS 都支持 VST2, 如果你发现后面 OBS 滤镜中没有 VST 选项，那大概是 OBS 版本过低了。

## ReaStream 下载地址

<https://www.reaper.fm/reaplugs/>

ReaStream 包含在 ReaPlugins 套件中。这套免费插件包含了许多实用插件，就算不使用 ReaStream, 这套插件也是非常推荐的。~~虽然上次这套插件更新是很久之前了，不过正所谓能跑就不用动嘛，更何况这套插件的运行状况还很不错……（2023年8月30日）~~
![](https://raster.team/post-images/1693386930340.png)
已经是2023年了，就没必要再使用 32-bit 的版本了，除非遇到了兼容性问题，比如想串流的某些软件不支持 64-bit 的插件。~~（那可真够老的）~~ 直接下载那个 64-bit 的，然后按照它默认的路径安装[^1]就可以了。

[^1]: 之所以按照默认路径安装，是因为 OBS 它暂时不能自定义 VST 的扫描路径。而这个 ReaPlugins 默认安装的路径就在 OBS 能识别到的地方。参考：<https://obsproject.com/kb/vst-2-x-plugin-filter>（2023年8月30日）

## 此外

如果你想要在接收（播放）音频的终端独立运行这个 ReaStream 而不借助任何 DAW, 那么这里推荐来自 TONE2 的 Nanohost 来运行插件，它是免费的，地址在这里:<https://www.tone2.com/nanohost.html>

# ReaStream 工作理念

这里不说工作原理。因为详细的工作原理并不在这篇文章的讨论范围内，而且也并不适合小白。这里要说的是“**如果想要配置 ReaStream 应该如何思考**”。

ReaStream 串流方案需要把要串流到别处的内容设置为“发送端”，也就是在 ReaStream 插件窗口点选 Send audio/MIDI

要接收串流来的内容设置为“接收端”，也就是在 ReaStream 插件窗口点选 Receive audio/MIDI.

# 设置 DAW

根据 ReaStream 的理念，在这个例子中，DAW 就是你要发送串流音频的发送端，音频将从这里发出去。

所以应当在 DAW 路由的监听或者总线节点处插入 ReaStream.

下面以 REAPER 这款 DAW 举个例子
1. 首先确认 REAPER 识别到了 ReaStream 插件（尽管 REAPER 自带了一个，但是为了使用其他 DAW 的用户也能看明白，这里也是使用 ReaPlugins 中带有的版本）
2. 插件的名字是：ReaStream (ReaPlugs Edition), 这后面的数字 (4, 8, 12, 16, 24, 32) 表示的是通道数，不带数字的就是 2 通道的，也就是立体声，是比较常用的。
3. 将它载入到“监听效果”(Monitor FX) 节点，这样所有流经“监听效果”的声音也都会被 ReaStream 听到。
4. 现在把 ReaSteam 的信号发送出去，选择 "Send audio/MIDI", 从后面的下拉文本框中选择 "*local broadcast". 该选项将会让 ReaSteam 在此计算机上广播。(127.0.0.1)

# 其它选项

## Identifier 字段

这是“配对符”，有没有加密不知道，但是从设置的越复杂音频就越容易爆音卡顿来看……或许有那么点加密的能力（如果有哪位硬核的老哥知道，欢迎评论或者发邮件给我，感谢~）

这个字段需要你的发送端和接收端填入自定义的相同内容，当然也可以什么都不填或者就原本的"default".

主要是用来区分不同的发送和接收的，毕竟 ReaStream 也不是同时只能开一个。

## Enable

可以理解为这个插件自身提供的开关。因为有些宿主可能是非常“简洁”的，比如下面章节会提到的Tone2 开发的 NanoHost 就没有来自宿主的插件开关。

# ENJOY!

现在你可以方便地听到来自另一台计算机上 ASIO 设备的串流了。

# 附加

## 故障排查
