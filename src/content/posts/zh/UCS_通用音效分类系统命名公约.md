---
title: 【UCS】通用音效分类系统命名公约
description: UCS 强烈推荐采用一种特殊的文件名结构。遵循这一结构后，各类程序中的自动化脚本可直接从文件名中提取信息，并自动填充到最终用户的元数据字段中。
pubDate: 2025-05-16T13:08:56.000Z
tags: [Tutorials]
categories: []
draft: false
heroImage: "https://cntracker.net/img/0eaf028040ab9cfc2d3d03062099a955.png"
toc: true
pinned: false
math: false
lang: zh
unlisted: true
---
UCS 强烈推荐采用一种特殊的文件名结构。遵循这一结构后，各类程序中的自动化脚本可直接从文件名中提取信息，并自动填充到最终用户的元数据字段中。

<!-- more -->

同时，UCS 建议在文件名中至少包含以下基础信息，以回答以下关键问题：

<center>该声音属于哪个类别和子类别？</center>
<center>这段音频属于哪个类别和子类别？</center>
<center>音频的具体内容是什么？</center>
<center>音频的创作者是谁？</center>
<center>它是为哪个项目或音效库制作的？</center>


# 写在前面
这份文件翻译自 UCS 官方文档：UNIVERSAL CATEGORY SYSTEM FILENAMING CONVENTION
原文档更新时间为：2021 年 07 月 30 日
翻译时间：2025 年 05 月 16 日
如有更新请以英语为准。

此外，这份翻译是 王洛木 做的，还请不要盗搬这篇翻译，谢谢。

## 此外
- 如果你已经知道 UCS 的命名规范，只是想知道如何使用，那么请看这一篇：（下次再写，今天先把这篇发出来……）

@[toc]
# 必要数据块

UCS 基础文件名结构要求至少包含四个信息块，每个信息块之间必须用\_（半角下划线）分隔。\_只能用于分隔这些信息块，不能在其他位置使用。

文件名中四个基本信息块的定义和结构如下：

<center>CatID_FXName_CreatorID_SourceID</center>
<center>合类别_音效名称_创造者_来源</center>

| 数据块       | 翻译     | 说明                                 |
| --------- | ------ | ---------------------------------- |
| CatID     | 合类别的缩写 | 被缩写的合类别（类别加子类别，这部分由 UCS 的一张公约表来定义） |
| FXName    | 音效名称   | 简短描述或标题（建议少于25个半角字符）               |
| CreatorID | 创作者识别码 | 音效师、录音师或者供应商等实际制造这个音效的作者（或其缩写）     |
| SourceID  | 来源识别码  | 这个音效的来源项目、节目或者音效库的名称（或其缩写）         |

## CatID（合类别缩写）
代表按照 Tim Nielsen 和 Justin Drury 创立的通用音频分类系统 (UCS) 的一张列表来定义这个“详细类别”的缩写。

此外 CatID 是整个系统的核心所在。也是使用该系统的唯一强制性要求，必须严格遵循列表规定不得修改。我们要求字母大小写也必须严格遵守。正是这一规定确保了任何发布“木门”音效的人都会统一使用 "DOORWood" 作为该音效合类别的缩写形式。

这将使该系统的任何使用者都能准确判断该音效的所属分类。通过使用已开发和正在开发的多种脚本，大多数常见数据库程序都能轻松将其解析为 Category（类别）和 SubCategory（子类别）字段，在某些情况下还能通过查找 CatID，在匹配列表后用连字符连接匹配字段来构建 CategoryFull 字段。那之后程序就会将 DOORWood 显示为 DOORS-WOOD。

举个例子，以下是 UCS 列表中的一部分：

| Category（类别） | SubCategory（子类别） | CatID（合类别缩写） | CatShort（短类别） | Explanations（说明）                                                                                                                                                                    | Synonyms - Comma Separated（同义词 - 使用逗号分隔）                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | ---------------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AIR          | BLOW             | AIRBlow      | AIR           | Steady air blows, like from a compressed can of air.                                                                                                                                | Aerate, Aerosol, Air, Airhose, Balloon, Beat, Bellows, Blast, Blow, Blower, Blowgun, Blown, Blowpipe, Blows, Blowtube, Bluff, Carbon, CO2, Compressed, Depressurize, Dioxide, Duster, Exhaust, Flutter, Gust, Helium, Huff, Inflate, Nitrogen, Oxygen, Puff, Puffed, Purge, Release, Sputter, Vent, Waft, Whiff                                                                                                                                      |
| AIR          | BURST            | AIRBrst      | AIR           | Sharp air releases, pressure releases, a tennis call can popping open, a fire extinguisher                                                                                          | Air, Airbed, Airblast, Airgun, Airhose, Blast, Blowhole, Blowout, Burst, Carbon, Chuff, CO2, Dioxide, Discharge, Explosion, Flash, Gas, Helium, Jet, Kerboom, Nitrogen, Outburst, Oxygen, Poof, Pop, Rush, Seal, Spurt, Surge, Torrent                                                                                                                                                                                                               |
| AIR          | HISS             | AIRHiss      | AIR           | Slow air releases, a flat tire, leak in an air pipe.                                                                                                                                | Carbon, CO2, Dioxide, Discharge, Exhaust, Expel, Helium, Hissing, Leak, Nitrogen, Oxygen, Purr, Release, Shush, Sibilate, Whistling                                                                                                                                                                                                                                                                                                                  |
| AIR          | MISC             | AIRMisc      | AIR           | Air sounds not fitting another category in this list.                                                                                                                               | Airtight, Airway, Carbon, CO2, Dioxide, Gas, Helium, Inflatable, Intake, Miscellaneous, Nitrogen, Oxygen, Sky, Ventilation                                                                                                                                                                                                                                                                                                                           |
| AIR          | SUCTION          | AIRSuck      | AIR           | Air being sucked in, a vacuum sucking in air, the rush of air in a shopvac.                                                                                                         | Air, Aspirate, Aspiration, Carbon, CO2, Consume, Dental, Dioxide, Draw, Helium, Hoover, Ingest, Inspiration, Inspire, Intake, Nitrogen, Oxygen, Pull, Pump, Pumps, Siphon, Suck, Suction, Syphon, Syringe, Vac, Vacuity, Vacuum                                                                                                                                                                                                                      |
| AIRCRAFT     | DOOR             | AERODoor     | AERO          | Aircraft doors, some possible overlap with other DOOR categories, or VEHICLES-DOOR.                                                                                                 | Airplane, Aviation, Boarding, Cabin, Cargo, Cockpit, Emergency, Entrance, Entryway, Exit, Fuselage, Hatch, Helicopter, Jet, Panel, Passenger, Ports, Trapdoor, Wing                                                                                                                                                                                                                                                                                  |
| AIRCRAFT     | HELICOPTER       | AEROHeli     | AERO          | For all manner of helicopters, gyrocopters.                                                                                                                                         | Aerochopper, Aircraft, Apache, Autogiro, Autogyro, Bird, Blackhawk, Chopper, Choppers, Copter, Copters, Ghetto, Gyrocopter, Gyroplane, Heli, Helichopper, Helicopter, Helicopteron, Helicoptor, Helijet, Helipad, Helipilot, Heliport, Helo, Helos, Huey, Jetcopter, Lift, Medevac, Medivac, Multirotor, Ornithopter, Police, Rotary-Wing, Rotodyne, Rotorcraft, Sar, Sikorsky, Skyhook, Tailwheel, Tiltrotor, Tricopter, Vertical, VTOL, Whirlybird |
| AIRCRAFT     | INTERIOR         | AEROInt      | AERO          | Interior recordings (mainly complex ambiences) of aircraft, from cockpit interiors, to passenger jet interiors.                                                                     | 737, 747, 777, A310, A330, A350, A380, Aboard, Aeroplane, Airbus, Aircraft, Airliner, Airplane, Aisle, Avionics, Bay, Belly, Bins, Boeing, Bombardier, Bowels, Cabin, Cargo, Cockpit, Compartment, Crew, DC-10, Deck, Fighter, Flight, Fuselage, Galley, Glider, Hold, Inside, Interior, Jet, Jetliner, Jumbo, Lavatory, Learjet, Midflight, Flight, Overhead, Passenger, Zeppelin                                                                   |
| AIRCRAFT     | JET              | AEROJet      | AERO          | All commercial and private jet powered aircraft, military jets would go under AIRCRAFT-MILITARY.                                                                                    | 737, 747, 777, A310, A330, A350, A380, Aeroplane, Afterburner, Airbus, Aircraft, Airliner, Airplane, Boeing, Bombardier, Cargo, Commercial, DC-10, Jet, Jetliner, Jumbo, Learjet, Passenger, Plane, Private, Ramjet, Regional, Scramjet, Supersonic, Turbojet, Twinjet, Unducted                                                                                                                                                                     |
| AIRCRAFT     | MECHANISM        | AEROMech     | AERO          | Mechanical components of aircraft, for example landing gear, or levers and switches.                                                                                                | Actuators, Aerofoil, Aeroplane, Aileron, Ailerons, Airbrake, Aircraft, Airplane, Apron, Arrester, Autopilot, Avionics, Bombsight, Brakes, Cockpit, Column, Control, Cowl, Cowling, Devices, Doors, Elevator, Elevators, Fin, Flap, Flaps, Flight, Gear, Gimbals, Gyroscope, Hook, Hydraulic, Instrument, Landing, Lever, Pedal, Propellers, Reversers, Rudder, Slats, Spoilers, Surfaces, Systems, Throttle, Thrust, Turbines, Yoke                  |
| AIRCRAFT     | MILITARY         | AEROMil      | AERO          | Military aircraft, military fighter jets, stealth bombers, but any military aircraft goes here. Also military drones. Military helicopters could go here or in AIRCRAFT-HELICOPTER. | A10, Aeroplane, Air, Aircraft, Airplane, Angels, Army, Attack, Blue, Bogey, Bomber, Combat, Drone, F16, F18, F22, F35, Fighter, Force, Gunship, Interceptor, Jet, Lockheed, Mig, Military, Mustang, Navy, P51, P52, Plane, Reconnaissance, Sortie, Spy, Squadron, Stealth, Strike, Surveillance, Thunderbirds, Trainer, Transport, Warbird, Warplane                                                                                                 |
| AIRCRAFT     | MISC             | AEROMisc     | AERO          | Aircraft not fitting another category in this list.                                                                                                                                 | Aeroplane, Air, Aircraft, Airplane, Balloon, Blimp, Dirigible, Flyer, Flyover, Glider, Hang, Hang-Glider, Hot, Land, Liftoff, Parachute, Piloting, Runway, Ultralight, Zeppelin                                                                                                                                                                                                                                                                      |
| AIRCRAFT     | PROP             | AEROProp     | AERO          | Aircraft using props as means of propulsion. A propeller airplane.                                                                                                                  | Aeroplane, Aircraft, Airplane, Airscrew, Amphibious, Antique, Beechcraft, Biplane, Bombardier, Bushplane, Cesna, Cherokee, Crop, Cub, Duster, Floatplane, Piper, Plane, Prop, Propeller, Propjet, Seaplane, STOL, Stunt, Triplane, Turboprop, Twin-Prop, Vintage                                                                                                                                                                                     |
| AIRCRAFT     | RADIO CONTROLLED | AERORadio    | AERO          | Toy hobby radio controlled, UAV, quadcopters, RC jets and RC helicopters.                                                                                                           | Aerial, Airplane, Control, Controlled, Drone, Helicopter, Jet, Model, Quadcopters, Radio, RC, Remote, RPA, RPV, Scale, UAS, UAV, Unmanned                                                                                                                                                                                                                                                                                                            |
| AIRCRAFT     | ROCKET           | AERORckt     | AERO          | Jet powered rockets and rocket engines., missiles.                                                                                                                                  | Blastoff, Booster, Hypersonic, ICBM, Jet, Jetpack, Launch, Launchers, Launching, Launchpad, Missile, Missiles, Missle, NASA, Nuclear, Nuke, Orbit, Payload, Propellant, Propelled, Propellent, Ramjet, Ramjets, Retrorocket, Retrorockets, Rocketeer, Rocketeers, Rocketman, Rocketplane, Rocketry, Rocketship, Shuttle, Skyrocket, Soyuz, Space, Spacelab, Spaceman, Spaceplane, Spaceplanes, Spacex, Sputniks, Suborbital, Thruster, Warhead       |

对应中文（没有“Explanations（说明）”那一栏）：

| Category_zh（类别） | SubCategory_zh（子类别） | Synonyms_zh（同义词）                                                                                                             |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 气体              | 吹                   | 稳定的气流、气压释放、释放、吹气、喷射、颤动                                                                                                       |
| 气体              | 爆发                  | 空气爆炸、空气爆破、噗噗、喷射、气爆                                                                                                           |
| 气体              | 嘶嘶声                 | 放气、排气、 漏气、排出                                                                                                                 |
| 气体              | 其它                  | 各种各样的、 其他空气声音                                                                                                                |
| 气体              | 抽吸                  | 吸气、 吸入、吸尘器                                                                                                                   |
| 航空器             | 门                   | 驾驶舱门、飞机门、舱门、紧急出口                                                                                                             |
| 航空器             | 直升机                 | 旋翼机、 直升机、                                                                                                                    |
| 航空器             | 航空舱                 | 飞机、飞机内部录音、复杂环境音、 客机、驾驶舱内部、 滑翔机、 齐柏林飞艇、 喷气客机、 大型喷气式飞机、 里尔喷气机、 空中客车、 波音、 庞巴迪 737、 747、 777、 A310、 DC-10、 A330、 A350、 A380、 战斗机 |
| 航空器             | 喷气式飞机               | 客机、 喷气客机、 大型喷气式飞机、 里尔喷气机、 空中客车公司、 波音、 庞巴迪、 737、 747、 777、 A310、 DC-10、 A330、 A350、 A380                                      |
| 航空器             | 机械                  | 起落架、驾驶舱操纵杆、方向舵、襟翼、起落架                                                                                                        |
| 航空器             | 军用                  | 战斗机、轰炸机、隐形轰炸机、蓝天使特技飞行队、雷鸟、军用无人机、 洛克希德、米格、F18、F16、F35、F22、A10、P52、 军用飞机                                                       |
| 航空器             | 其它                  | 飞艇、 滑翔机、 热气球、 超轻型、 悬挂式滑翔机、 齐柏林飞艇、 飞船、 其他种类的飞机                                                                                |
| 航空器             | 螺旋桨飞机               | 双翼飞机、三翼飞机、涡轮螺旋桨飞机、特技飞机、作物喷粉器、农用飞机、螺旋桨、双螺旋桨、螺旋桨喷气发动机、螺旋桨                                                                      |
| 航空器             | 塔台                  | 四轴飞行器、 无人机、 无人驾驶飞行器、 遥控直升机                                                                                                   |
| 航空器             | 火箭                  | 火箭、 导弹、 喷气背包、 航天飞机、 SpaceX、 美国航空航天局、 洲际导弹、 核火箭、 推进器                                                                          |

## CatShort（短类别） 
仅代表（大）类别的缩写形式。目前它尚未作为元数据字段使用，但仍然在列表中提供以备将来或用户使用。它并未用于文件名中，所以文件开头必须使用 CatID（合类别）。

## FXName（音效名称）
是 UCS 文件名中的下一个数据块。可以将其视为标题。其目的是对声音进行简要描述；该字段长度通常以 25 个左右的半角字符为佳。但这并非要取代更详细的"Description（描述）"元数据字段，而是让用户无需试听就能一目了然地理解音频文件内容。

## CreatorID（创作者识别码）
显示录制或设计该声音的人员。供应商会在此处标注其名称……或者您可以填写自己的姓名或缩写。大多数人可能会选择使用缩写形式。这完全由每个供应商或创作者自行决定。UCS 提供供应商列表，允许供应商指定用于文件名的官方缩写。关于定义此信息的更多文档将在 "Vendors" 文件夹中提供。（🌐 如果你想提交自己的厂牌名：）

用户第一眼就应该能清楚识别声音来源，甚至无需查看元数据。您可以在此填写全名或公司完整名称。我们只要求您在所有产品中保持统一。如果名称较长，可以考虑采用合理的缩写形式。

## SourceID（来源识别码）
包含节目、项目或音效库的名称或缩写形式。同样，作为供应商和创作者，您可以自由决定如何最佳利用这个文本块，但它应该以某种形式包含该声音所属的音效库名称，或是为其设计或录制的节目名称。如果音效库名称很长，我们同样建议采用某种缩写形式。

# 可选数据块

文件名中还可以包含三个可选信息块以满足特定需求，分别为 UserCategory（用户定义的分类）、VendorCategory（供应商推荐分类）和 UserData（用户数据）。

在带有了上述内容后，完整的UCS文件名结构如下：

<center>CatID(-UserCategory)_(VendorCategory-)FXName_CreatorID_SourceID_UserData</center>
<center>合类别(-用户定义的类别)_(供应商推荐类别)音效名称_创作者识别码_来源识别码_用户数据</center>


| 数据块            | 翻译      | 说明                                                                                           |
| -------------- | ------- | -------------------------------------------------------------------------------------------- |
| UserCategory   | 用户自定义分类 | 作为CatID块的可选尾部扩展，可用于用户自定义分类、麦克风类型、视角等                                                         |
| VendorCategory | 供应商推荐分类 | 作为 FXName 块的可选头部扩展，是供应商定义的特定音效库的分类。例如特定枪支名称、车辆型号、地点等                                         |
| UserData       | 用户数据    | 用户自定义空间，通常用于唯一 ID 或编号以确保文件名100%唯一……也可以或存储麦克风类型、地点、视角等信息。该空间当前未映射到用户元数据，但用户可根据使用需求将其映射到数据库字段。 |

## UserCategory（用户自定义分类）
是 CatID 的可选尾部扩展，只需在CatID后添加"-"和用户自定义术语或缩写即可。供应商应避免使用该文件名区域。

该设计允许用户创建自己的子子分类（第三级分类）。用户也可将其定义为一组缩写和对照表。常见用法如用INT和EXT表示室内/室外。

译者注：在使用的时候，只需要添加短杠 "-" 就可以使用这个用户自定义分类了，不需要添加半角括号。

## VendorCategory（供应商推荐分类）
是 FXName（音效名称）块的可选头部扩展，定义为第一个 "\_"之后、下一个 "-" 之前的文本块。作为供应商可选的音效库特定分类，用于内部组织音效库。由于许多音效库已有逻辑分类系统，该区块旨在帮助供应商在适配 UCS 标准时保留这些信息。

译者注：你可以简单将这部分理解为，这部分是给供应商自己看的，因为在 UCS 出来之前，供应商可能有自己的分类系统，这部分就可以记录下这个分类历史。

## UserData（用户数据）
是文件名结构的最后部分，完全自由格式。由于未分配标准元数据字段，每个用户或供应商都可以自行决定其用途。可存储麦克风型号、视角、唯一文件名编号或者任何需要分发给最终用户的信息。
虽然不鼓励，但该区块允许使用额外的"\_"。

译者注：也就是说，在写完来源识别码并在来源识别码之后写个下划线，那个下划线之后的所有内容都是用户数据，写什么都可以，再写个下划线也没问题，但是不推荐。

# 来看几个文件命名示例

## GUNAuto_Uzi 9mm Rapid Fire Close Up Short Bursts_TN_DORY

该文件名有效，因其包含所有四个必需部分并以 "\_" 分隔，其中：

<font color="red">CatID</font> 被定义为 <font color="blue">GUNAuto</font>，因此 Category（类别）为 GUNS（枪炮），SubCategory（子类别）为 AUTOMATIC（自动化武器）。仅通过文件名开头的 CatID 即可定义 CategoryFull（完整类别）为 GUNS-AUTOMATIC（枪炮-自动化武器）。

<font color="red">FXName</font> 被定义为 "<font color="blue">Uzi 9mm Rapid Fire Close Up Short Bursts</font>"（乌兹冲锋枪 9mm 快速 近距离 短促 射击）。 

<font color="#ff0000">CreatorID</font> 被标注为 "<font color="blue">TN</font>"，通过查询公共表可解析为"Tim Nielsen"。  

<font color="#ff0000">SourceID</font> 被标注为 "<font color="blue">DORY</font>"，同样通过查询公共表可解析为该项目名称为 "Finding Dory"。

请注意，我们在 CatID、CreatorID 和 SourceID 区块中均采用缩写形式，以此在保持文件名长度可控的同时，仍确保其可读性。

## GUNAuto_UZI 9mm Rapid Fire Close Up Short Bursts_TN_DORY_WideStereoMKH8020

在本例中，文件名将 "WideStereoMKH8020" 信息添加至文件的 UserData 区块。默认情况下，该信息不会映射到特定元数据字段，但用户可通过脚本将其分配至自选的元数据字段。UserData 区块可存储创作者认为重要的任何附加信息。

## GUNAuto-INT_UZI 9mm Rapid Fire Close Up Short Bursts_TN_DORY

在此文件名中，通过在 CatID 后直接添加 "-INT" 定义了可选的 UserCategory（用户自定义类别）。数据库工具可提取该术语并存入 UserCategory 元数据字段。该字段可用于定义麦克风视角或用户常用项目的特定节目分类，也可选择定义为缩写及查询表。

## GUNAuto_UZI 9mm-Rapid Fire Close Up Short Bursts_TN_DORY

该文件名并没有定义 UserCategory，但通过在 FXName 区块开头添加 "UZI 9mm-" 文本，将VendorCategory 定义为了 "UZI 9mm"。

虽然第一个 "\_"和第二个 "\_" 之间的整个数据区块在技术上属于音效名称 (UZI 9mm-Rapid Fire Close Up Short Bursts)，但第一个 "\_" 和第一个 "-" 之间的信息片段现被定义为了 VendorCategory。程序可轻松编写脚本提取该信息片段，并将其存入 VendorCategory 元数据字段。

最后一个示例展示了完整的 UCS 文件名，包含所有字段区块：
## GUNAuto-EXT_UZI 9mm-Rapid Fire Close Up Short Bursts_TN_NONE_416-MKH8040-DualMono

该文件名展示了 UCS 格式下完整填写的所有字段区块。通过文件名中的 "\_"和 "-" 的定位，此文件名定义了以下信息：  


| 数据块            | 内容                                       | 注释                                   |
| -------------- | ---------------------------------------- | ------------------------------------ |
| CatID          | GUNAuto                                  | 对应了：GUNS-AUTOMATIC                   |
| UserCategory   | EXT                                      | 此处表示用户指定为室外录音。                       |
| FXName         | UZI 9mm-Rapid Fire Close Up Short Bursts | 注意：文件名是包含了 VendorCategory 部分的。       |
| VendorCategory | UZI 9mm                                  | 换句话说，VendorCategory（供应商推荐分类是文件名的一部分） |
| CreatorID      | TN                                       | 用户自定义缩写，经查询，这里指代 Tim Nielsen         |
| SourceID       | NONE                                     | 表示此录音非特定项目录制                         |
| UserData       | 416-MKH8040-DualMono                     | 这是一款森海塞尔公司出品的麦克风幸好。                  |

# 结论

重申一次，UCS 命名系统的唯一要求是将每个文件指定为列表中某个类别加自类别缩写的组合，并将与之关联的 "CatID_" 置于文件名开头。这其余的文件名结构其实完全可选。  

遵循这一“硬性要求”的即时好处是：您的音效库购买者能立即识别出该音频属于 GUNS-AUTOMATIC（"枪炮"类别 - “自动化武器”子类别）组合，这是因为公约的列表中明确定义了GUNAuto 代表此合分类。  

将 "GUNAuto_" 严格固定在文件名开头，就还能通过各类脚本将该信息解析回用户的元数据字段。

同样的，将 CatID 置于文件名起始位置，可以让所有 GUNS-AUTOMATIC 类文件将在任何列表、DAW 中的区域列表、文件夹层级或其它等场景中自动按归类排序。  

现有多种工具、脚本和辅助程序可帮助按此系统命名文件，包括且适用于 ProTools、REAPER 等各类 DAW 的工具。更多信息及工具下载请访问我们 Google 共享云盘中的 UTILITIES 文件夹（工具将持续更新）。

---
<center>译者：王洛木</center>