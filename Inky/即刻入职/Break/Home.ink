=== Break__Home
~   Flag__Break__Home ++
于是在家里收了快递。
->  Game_Over
=   Game_Over
~   Count__Game_Over ++
打开门被 AZ 入职了。
{
-   Flag__Break__Home == 1:
    ~   INDEX = INDEX + 10
-   else:
    ~   INDEX = INDEX + 5
}
<-  Page__Endings.Ending__Break__Home
->  Menu__Game_Over