//  好感度
VAR Rate_LeiHu = 0 


//  倾向
VAR Choose_YeHen = 0
VAR Choose_CenYe = 0
VAR Choose_LeiHu = 0

//  结局计数
VAR FinaleCount = 0

=== CleanData
~   Rate_LeiHu = 0
//————————————————
~   Choose_YeHen = 0
~   Choose_CenYe = 0
~   Choose_LeiHu = 0
->->

=== ShowData
雷琥好感度：{Rate_LeiHu}
三三三三三三三三
夜痕：{Choose_YeHen}
岑烨：{Choose_CenYe}
雷琥：{Choose_LeiHu}
->->

=== CountFinale
~ FinaleCount = 0

{Finale.F1:
    ~   FinaleCount++
}
{Finale.F2:
    ~   FinaleCount++
}
{Finale.F3:
    ~   FinaleCount++
}
{Finale.F4:
    ~   FinaleCount++
}
{Finale.F5:
    ~   FinaleCount++
}
{Finale.F6:
    ~   FinaleCount++
}
{Finale.F7:
    ~   FinaleCount++
}
{Finale.F8:
    ~   FinaleCount++
}
{Finale.F9:
    ~   FinaleCount++
}
{Finale.F10:
    ~   FinaleCount++
}
{Finale.F11:
    ~   FinaleCount++
}
您已经尝试攻略雷琥 {START} 次，达成了 {FinaleCount} 个结局，共计 11 个结局。
{FinaleCount > START:
    #   IMAGE: https:\/\/cntracker.net/file/AgACAgUAAyEGAASG8mT0AAMeZ2t6Va7lOcCvYERXKq1LWKOvXUsAAvG_MRu62FlX4mAjhwTdXD8BAAMCAANtAAM2BA.jpg
    这下你满意了吧！！！
}
{FinaleCount == 0:别再观望了，快来玩玩看吧～}
{FinaleCount == 11:
    #   IMAGE:  https:\/\/cntracker.net/file/AgACAgUAAyEGAASG8mT0AAMgZ2t7Gbkt9NHx03ZLNS34ptk7tBkAAvW_MRu62FlXnJB-6wN9pvUBAAMCAANtAAM2BA.gif
    哇哦！您已经看完了所有的内容了，再次感谢您的游玩～！
}
{FinaleCount > 11:
    #   IMAGE: https:\/\/cntracker.net/file/AgACAgUAAyEGAASG8mT0AAMfZ2t6zllfsecOxwk7NtMXk3_P93kAAvO_MRu62FlXDvXZiQHe_R4BAAMCAANtAAM2BA.gif
    ……您是怎么做到的……？我这瓜有问题啊？请您反馈给黑川物流市场部，谢谢您。
}
-   ->->


=== FinaleList
+   {Finale.F1}1.普通结局《臭味》
        ->Finale.F1
+   {Finale.F2}2.最佳结局《“为什么告诉我这些”》
        ->Finale.F2
+   {Finale.F3}3.好结局《“我知道了”》
        ->Finale.F3
+   {Finale.F4}4.普通结局《唉……体育生》
        ->Finale.F4
+   {Finale.F5}5.普通结局《服从》
        ->Finale.F5
+   {Finale.F6}6.普通结局《“求主人……”》
        ->Finale.F6
+   {Finale.F7}7.坏结局《失踪》
        ->Finale.F7
+   {Finale.F8}8.一般结局《担心身体》
        ->Finale.F8
+   {Finale.F9}9.好结局《好好吃饭》
        ->Finale.F9
+   {Finale.F10}10.真正结局《袒露心声》
        ->Finale.F10
+   {Finale.F11}11.最坏结局《圣诞快乐》
        ->Finale.F11
+   (Dev_Unlock)————————————————
        {Dev_Unlock < 5:
            {你戳我干什么神魔！！！我就是个分隔符！！！|你再戳我就要闹了！|啊啊啊！！！别烦我！！！|正在启动自毁装置……3……2…}
        -   else:
            ->  Unlock_All  ->
            {stopping:
                -   好吧，被你发现了，但是我们仍然建议您自行体验内容，而不是直接看结局。
                    如果要清除，点击上方的 RESTART 就可以全部清除了。
                -   我发誓这里没有什么别的内容了。
            }
        }
            ->  FinaleList
+   {Unlock_All}[查看所有结局]
        ->  All_Finale  ->
        ->->
+   [返回上一级]
->->



=== Unlock_All
->->

=== All_Finale
+   1.普通结局《臭味》
        ->Finale.F1
+   2.最佳结局《“为什么告诉我这些”》
        ->Finale.F2
+   3.好结局《“我知道了”》
        ->Finale.F3
+   4.普通结局《唉……体育生》
        ->Finale.F4
+   5.普通结局《服从》
        ->Finale.F5
+   6.普通结局《“求主人……”》
        ->Finale.F6
+   7.坏结局《失踪》
        ->Finale.F7
+   8.一般结局《担心身体》
        ->Finale.F8
+   9.好结局《好好吃饭》
        ->Finale.F9
+   10.真正结局《袒露心声》
        ->Finale.F10
+   11.最坏结局《圣诞快乐》
        ->Finale.F11
+   [返回上一级]
->->