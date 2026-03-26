=== Menu__Main
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
+   {Count__Start == 0}新的游戏
    ~   Count__Start ++
    # CLEAR
    ->  Menu__START
////////////////////////////////
+   {Count__Start > 0}  重新连接：第 {Count__Start} 次
    ~   Count__Start ++
    ~   Count__Chapter = 0
    # CLEAR
    ->  Menu__START
////////////////////////////////
+   身份选择
    ~   Count__Chapter = 0
    ->  JumpTo
////////////////////////////////
+   [————————]
    <-  Menu__Common.Divider   
    ->  Menu__Main
////////////////////////////////
+   成就一览
    # CLEAR
    ->  Achievements
////////////////////////////////
+   结局一览
    # CLEAR
    ->  Finales
////////////////////////////////
+   死法一览
    # CLEAR
    ->  Shutdown
////////////////////////////////
+   [————————]
    <-  Menu__Common.Divider   
    ->  Menu__Main
////////////////////////////////
+   [制作人员]
    # CLEAR
    ->  Credits
////////////////////////////////
+   更新日志
    # CLEAR
    ->  Log
