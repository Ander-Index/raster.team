INCLUDE 0_Main.ink

INCLUDE B_Basement.ink

INCLUDE G_Dormitory.ink
INCLUDE H_Tenement.ink

INCLUDE Z_VAR.ink
INCLUDE Z_Finale.ink
INCLUDE Z_End.ink
INCLUDE Z_Misc.ink



//->  Misc
//->  G_Dormitory
//->  H_Tenement

->  Title
=== Title

//->  ShowData    ->

更新日期：2024 年 12 月 25 日（已完结）
⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠
->  CountFinale    ->
————————————————————————————————
为了您的最佳体验，如非必要，请不要点击上方的 RESTART
以避免因被清除数据而错过一些多周目才能达成的结局。
⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠
这份可互动故事是《源核》系列世界观的圣诞特典。
如果想好好了解攻略玩法中的雷琥等人物，建议先看《源核·蛟灼》以及《源核·欲宴》再体验哦！
可以在更多信息中找到这两篇文章的链接。
————————————————————————————————
①：超过20个选择，不同选择，影响好感和剧情走向！
②：总共11个结局！其中，有1个最佳结局、2个好结局、2个隐藏结局（1好结局，1真正结局）、4个普通结局、1个坏结局、1个额外结局。
③：敢相信有超过7000+的色色文段嘛！喜欢雷琥以及他的章节附属角色的读者有福啦！
->  Menu




=== Menu
+   {START == 0}[开始攻略]
    ->  CleanData ->START
+   {not (START == 0)}[再攻略一次！]
    ->  CleanData ->START
+   [更多信息]
    ->  Misc

->  END