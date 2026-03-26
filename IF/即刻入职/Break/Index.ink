=== Break__Index
{
-   Flag__Break__Interview != 0 and Flag__Break__Cinema != 0 and Flag__Break__Home != 0:
    哪里也不想去。
    ->  Break__Shutdown
-   else:
    ->  Base__Going_To.Choice
}