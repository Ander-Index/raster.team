=== function Check__Aboard_Status
TODO    这里要记得补全全事件判定。
{
////////////////////////////////
////////////////////////////////
////////////////////////////////
////////////////////////////////
////////////////////////////////
//  全收集
-   Flag__Work__Gym != 0 and Flag__Work__Off_Work != 0 and Flag__Work__Business_Trip != 0 and Flag__Work__Napping != 0 and Flag__Work__Shutdown != 0 and Flag__Break__Interview != 0 and Flag__Break__Cinema != 0 and Flag__Break__Home != 0 and Flag__Break__Shutdown != 0:
    ~   return "No.8"
////////////////////////////////
////////////////////////////////
////////////////////////////////
////////////////////////////////
////////////////////////////////
//  状态很差但是之前没下过班
-   Check__SAN(INDEX) == "BAD" and (Flag__Work__Off_Work == 0 or Flag__Work__Business_Trip == 0) and Flag__Work__Shutdown != 0:
    ~   return "DRONE"
////////////////////////////////
//  状态很差但是之前没去面试
-   Check__SAN(INDEX) == "BAD" and Flag__Break__Interview == 0 and Flag__Break__Shutdown != 0:
    ~   return "DRONE"
////////////////////////////////
////////////////////////////////
////////////////////////////////
////////////////////////////////
//  状态 OK 了，但是没去健身房，上终
-   Check__SAN(INDEX) != "FINE" and Flag__Work__Gym == 0 and Flag__Work__Shutdown != 0:
    ~   return "DRONE"
////////////////////////////////
//  正常启动
-   else:
    ~   return  "Prototype"
}
