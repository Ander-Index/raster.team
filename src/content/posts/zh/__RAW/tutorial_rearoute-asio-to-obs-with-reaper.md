---
title: 【ReaRoute ASIO】如何将 DAW 的声音发送到 OBS 以进行直播
pubDate: "2023-09-04T10:06:26.000Z"
draft: false
heroImage: "https://i0.wp.com/streamlabs.kr/wp-content/uploads/2022/10/rearoute.jpg?fit=1920%2C1080&ssl=1"
toc: true
pinned: false
math: false
tags: [教程, REAPER, 音频, OBS]
categories: [教程]
description: ASIO LINK PRO 在我这里就没正常过…… VoiceMeeter 我不喜欢。 那就没有别的解决方案可以把使用了 ASIO 的 DAW 其音频发送到 OBS 了么？ 当然有，很方便，而且适用于所有支持 ASIO 的 DAW.
lang: zh
unlisted: true
---
ASIO LINK PRO 在我这里就没正常过……
VoiceMeeter 我不喜欢。
那就没有别的解决方案可以把使用了 ASIO 的 DAW 其音频发送到 OBS 了么？
当然有，很方便，而且适用于所有支持 ASIO 的 DAW.

<!-- more -->

本文的环境为 Windows, 先以 REAPER 为例子讲解。如果您已经知晓了如何使用 ReaRoute ASIO 来串流 REAPER 的音频到 OBS，只是想看这篇文章来知道如何串流其它 DAW 到 OBS, 那么请直接跳转到“[进阶操作](#进阶操作)”

~~严格来讲，这也算作一篇鸡架教程……~~
                    
@[toc]

# 环境配置
由于都是实时性较强的软件，所以不建议安装在机械硬盘。

## 安装 OBS
OBS 官方页：<https://obsproject.com/>

## 安装 OBS-ASIO
需要这个插件才能让 OBS 使用 ASIO 驱动

Github 发布页：<https://github.com/Andersama/obs-asio/releases>

（如果喜欢这件开源作品，请不要吝啬手里免费的 Star）
## 安装 ReaRoute ASIO
ReaRoute ASIO 是 REAPER 的一部分，所以需要安装 REAPER 才能使用 ReaRoute ASIO.

REAPER 官方下载页：<http://reaper.fm/download.php>

这个有必要说明一下，ReaRoute ASIO 是 REAPER 的一部分，需要安装 REAPER 才可以使用 ReaRoute ASIO.

且在安装的时候，ReaRoute ASIO 是一个可选项，所以安装时要确保已经勾选了ReaRoute ASIO.

![安装截图](https://raster.team/post-images/1693475687780.png)
<center>这个 ReaRoute ASIO 一定要选上</center>

如果已经安装过 REAPER, 但是当时没有安装 ReaRoute ASIO, 那也只需要覆盖安装即可。

# 设置 REAPER
## 1. 设置 DAW 使用的 ASIO 驱动
ReaRoute ASIO 并不是用来驱动声卡的，它是一套虚拟线路。所以在 REAPER 中，音频设备仍然要选择使用当前声卡的 ASIO 驱动。

比如这里我的声卡是 YAMAHA UR242. 那么在 REAPER 偏好设置中，ASIO 驱动就选择 Yamaha Steinberg USB ASIO.
![](https://raster.team/post-images/1693535636273.png)

## 2. 设置 ReaRoute ASIO 路由
先假定要把总线上的音频输出到 OBS，（如果你想输出某个轨道的音频，就把假定的内容替换为那个轨道，毕竟总线其实也是一条轨道。）

按下 Route 按钮来打开路由面板![](https://raster.team/post-images/1693535940516.png)
<center>如果没找到这个按钮，就需要去 选项 > 主题 > 主题调整器 中把这个按钮显示出来</center>

然后，在音频硬件输出中选择 ReaRoute 系列的通道。
![](https://raster.team/post-images/1693536096834.png)
 
 其中，两个一组的 ReaRoute 通道意味着立体声输出。单独的 ReaRoute 通道意味着单声道输出。
 可根据自己的需要同时串流多个通道到多个地方去。

 这里就选择 "ReaRoute 1 / ReaRoute 2" 这个立体声组合。（选哪个真的无所谓，就像是一堆子轨道没有什么优略之分，选了什么记住就行，后面设置 OBS-ASIO 用的到。）

 这之后，该轨道的音频将被立即发送到 ReaRoute 路由系统中对应的通道。

# 设置 OBS
有了发送就需要接收。

## 1. 从 OBS 的 来源 面板中选择 ASIO Input Capture
![](https://raster.team/post-images/1693538190535.png)
<center>如果没有这个选项，滚回去安装 OBS-ASIO</center>

## 2. 从 Device 里选择 ReaRoute ASIO
![](https://raster.team/post-images/1693538750903.png)
注意这里是要选择 ReaRoute ASIO, 而不是声卡 ASIO, 因为信号是从 ReaRoute ASIO 来的。

## 3. 选择 Format 与 Channel
* Format: 默认 Stereo（立体声），如果你有其它的多声道的直播需求，请自行举一反三。
* OBS Channel 1: 立体声有两个通道，选择希望映射到左声道的通道，本次的例子里就选择 ReaRoute REAPER=>CLIENT 1（这与你之前在 REAPER 中发送道德 ReaRoute 通道有关。）
* OBS Channel 2: 选择之前设置的 ReaRoute ASIO 组合中的另一个通道作为右声道。（所以这个例子里就是 ReaRoute REAPER=>CLIENT 2）

## 附加信息
* 如果你找无法选择 OBS Channel, 那大概是个 BUG.关闭这个窗口再重进就可以选择了。
* 无需打开 OBS 高级音频设置中有关 ASIO Input Capture 的监听，因为 REAPER 会将监听到的内容通过声卡 ASIO 从你的设备中播放出来。


## ENJOY.
现在你可以串流 REAPER 的音频到 OBS 了，还没有任何延迟和噪声。

# 进阶操作
那问题很多的小明就说了啊：“我又不是 REAPER 用户，说了这么多还不是为了骗我装上一个 REAPER! 你们 REAPER 邪教你给我去 SPA!”

“啊，怎么会呢~”现在就来说说怎么让其它 DAW 传输到 OBS.

ReaRoute ASIO 它并不驱动声卡设备，且它是 REAPER 的从属，可以简单认为 ReaRoute ASIO 是 REAPER 在 ASIO 生态中的一大包线缆。必须要启动 REAPER 才能使得 ReaRoute ASIO 正常工作。

接下来，以 Ableton Live 举例子，其它 DAW 请举一反三。
## 0. 前面教程的 OBS 不用关, REAPER 也不用关
## 1. 配置 Live
Live 是没有办法把自己的总线输出直接在发送给声卡的同时复制给 ReaRoute ASIO 的，这就导致：
* 如果只使用 Live 调用声卡 ASIO, 那么就无法使得 OBS 接收到来自 Live 的声音。
* 如果只使用 Live 调用 ReaRoute ASIO, 那么就无法监听 Live 中的内容。[^1]

[^1]: 让 Live 调用 ReaRoute ASIO 发送到 OBS, 再打开 OBS 的监听这个方案实际上不可行。因为 ReaRoute ASIO 在没有开启 REAPER 的情况下无法正常使用。可以简单的理解为“REAPER 就是 ReaRoute ASIO 所驱动的设备，采样率还有块大小等信息都需要从 REAPER 中读取”

为了不怎么修改从 REAERP 与 OBS 路由，所以这个例子中，就把 Live 设置到通道 3/4, 这样之前例子中的通道 1/2 就不需要修改。

设置 Live 使用的 ASIO 通道
    1. 打开 Live 的“选项 > 偏好设置 > Audio”
    2. “驱动程序类型”选择：ASIO
    3. 然后，在“音频设备”中选择：ReaRoute ASIO (x64)
    4. 接下来进入“输出配置”，把“单声道输出”中的“3 & 4”或“立体声输出”中的“3/4”按亮，其他的可以全部按灭。（如果你有其它的路由需要，这里请自行调整。）
    5. 现在，Live 的输出就全都在 ReaRoute ASIO 的通道 3/4 里了。
    6. 试着在 Live 中随便加载一些 LOOP 并开始播放，这是方便后续测试声音是否正常传输。

## 2. 配置 REAPER
Live 正在发出信号，那么就需要 REAPER 进行接收并“解码”
    1. 将 REAPER 按照前半部分教程中的路由进行设置，这样一来 ReaRoute ASIO 的 1/2 便和 OBS 连接在了一起。
    2. 在 REAPER 中新建一条轨道，用来接收与 Live 建立的 3/4 中的内容。
    3. 按亮该轨道的录音准备，并选择 ReaRoute 3 / ReaRoute 4, 如果你想要使用其它的路由方案，请自行选择输入设备。![](https://raster.team/post-images/1693821147025.png)
    4. 打开 监听 按钮。此时如果你的 Live 播放正常的话，那么你应当能够听到来自 Live 正在播放的内容。
    5. 检查一下 OBS 的 ASIO Input Capture 的电平是否正在跳动，如果跳动则说明音频顺利的从 Live 通过 ReaRoute ASIO 3/4 到达 REAPER, 并从 REAPER 通过 ReaRoute ASIO 1/2 到达了 OBS.
    6. ENJOY! 你甚至可以试着自己玩出其它 DAW 互相串流的花样，还可以叫上 ReaStream 和 ReaNINJAM 一起玩~ヽ(￣ω￣(￣ω￣〃)ゝ（也可以把当前的配置保存为一个模板，方便下次直接用。）

## 故障排除
### Q: 设置好了 REAPER 的新轨道和接收, 但是什么内容也没有输入进 REAPER
这可能是 Live 的 Master 输出没有还卡在 1/2 上，手动设置为 3/4 就好
![](https://raster.team/post-images/1693820535276.png)

### Q: 听到了声音的重复
那大概是你哪个地方的监听开多了，整个教程中，只需要打开 REAPER 中的监听就可以了。

# 音频输出到 OBS 解决了，但是音频输入到 DAW 怎么解决？
……上面的思路写的很清楚了，这个需求只需要稍微思考一下就可以解决哦~
如果解决不了，欢迎给我发消息~
~~让我看看是哪个聪明的乖乖路由方案写的这么清楚了还搞不定~~

<center>2023 © Ray Lum</center>