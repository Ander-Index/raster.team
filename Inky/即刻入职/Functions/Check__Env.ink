=== Check__Env
/*
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
【DEV】INDEX = {INDEX}
【DEV】SAN：{Check__SAN(INDEX)}
————————————————
【DEV】健身房 = {Flag__Work__Gym}
【DEV】下班 = {Flag__Work__Off_Work}
【DEV】出差 = {Flag__Work__Business_Trip}
【DEV】小憩 = {Flag__Work__Napping}
【DEV】办公室 = {Flag__Work__Shutdown}
————————————————
【DEV】面试 = {Flag__Break__Interview}
【DEV】电影院 = {Flag__Break__Cinema}
【DEV】快递 = {Flag__Break__Home}
【DEV】家 = {Flag__Break__Shutdown}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
【DEV】启动检查，如果出现了提前被标记上的终结事件则直接进入乱码页，反之进入正常主界面。
【DEV】Check__Aboard_Status()：{Check__Aboard_Status()}
【DEV】Flag__Work__Shutdown = {Flag__Work__Shutdown}
*/
{
-   Check__Aboard_Status() == "DRONE":
    ->  Page__Drone
-   else:
    ->  Page__Title
}