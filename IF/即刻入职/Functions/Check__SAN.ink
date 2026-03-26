=== function Check__SAN(SAN)
{
////////////////////////////////
//  除了请假终结的事情外都做过了。
-   SAN >= 60 and Flag__Work__Gym != 0 and Flag__Work__Off_Work != 0 and Flag__Work__Business_Trip != 0 and Flag__Work__Napping != 0 and Flag__Work__Shutdown != 0 and Flag__Break__Interview != 0 and Flag__Break__Cinema != 0 and Flag__Break__Home != 0:
    ~   return "AWFUL"
-   SAN >= 60:
    ~   return "BAD"
-   SAN >= 30 && SAN < 60:
    ~   return "OK"
-   SAN < 30:
    ~   return "FINE"
}