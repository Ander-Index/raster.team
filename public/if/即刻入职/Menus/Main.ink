=== Menu__Main
/*
【DEV】INDEX = {INDEX}
【DEV】Check__SAN(INDEX)：{Check__SAN(INDEX)}
*/
////////////////////////////////
////////////////////////////////
+   {Count__Game_Over == 0}    [初始化]   # CLEAR
    ->  Dreams.Check
////////////////////////////////
////////////////////////////////
+   {Count__Game_Over != 0 and Flag__Base__Wakeup == 0}    重新连接：第 {Count__Game_Over} 次
    ->  Dreams.Check
////////////////////////////////
////////////////////////////////
+   [结局回溯]
    ->  Page__Endings.Index
////////////////////////////////
////////////////////////////////
+   (Separator) ————————
    {   
    -   Separator > 5:
        ~   Flag__Work__Gym = 1
        ~   Flag__Work__Off_Work = 1
        ~   Flag__Work__Business_Trip = 1
        ~   Flag__Work__Napping = 1
        ~   Flag__Work__Shutdown = 1
        ~   Flag__Break__Interview = 1
        ~   Flag__Break__Cinema = 1
        ~   Flag__Break__Home = 1
        ~   Flag__Break__Shutdown = 1
        ~   Flag__Base__Wakeup = 1
        #   CLEAR
        %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
        No.8，欢迎访问黑川物流数据库。
        您想要回溯哪一段内容？
        -> Page__Endings
    -   else:
        {我小分隔符也绝非善类.jpg|你再按我我肯定打死你！|有完没完！|我要哈气啦！！！|难道说你是……}
        -> Menu__Main
    }
    -> Menu__Main
////////////////////////////////
////////////////////////////////
+   更新日志
    # CLEAR
    ->  Page__Log
+   制作人员
    # CLEAR
    ->  Credits