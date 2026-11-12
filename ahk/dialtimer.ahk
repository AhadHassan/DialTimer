#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; DialTimer input bridge for the Epomaker RT100 knob.
;   Volume_Up        -> F13 (clockwise)
;   Volume_Down      -> F14 (counterclockwise)
;   Media_Play_Pause -> F15 (short click) / F16 (hold of 600 ms or more, reset)
; Active only while the DialTimer window is focused; elsewhere the keys behave normally.

HoldMs := 600

; Electron passes its own PID so this script exits if the app is killed without cleanup.
ParentPid := A_Args.Length ? Integer(A_Args[1]) : 0
if ParentPid
    SetTimer(CheckParent, 2000)

CheckParent() {
    if !ProcessExist(ParentPid)
        ExitApp
}

; The keyboard sends a real key up when the click is released (the delay tracks how long it is held),
; so a hold is detected by arming a timer on key down and cancelling it on key up.
; (KeyWait inside a #HotIf hotkey sees the key as already released, so it cannot tell a hold from a tap.)
ClickDown := false
ClickDownTick := 0
HoldFired := false

HoldReached() {
    global HoldFired
    HoldFired := true
    Send("{F16}")
}

#HotIf WinActive("DialTimer ahk_exe DialTimer.exe")

Volume_Up::Send("{F13}")
Volume_Down::Send("{F14}")

Media_Play_Pause:: {
    global ClickDown, ClickDownTick, HoldFired
    ; Ignore auto-repeat while held; the tick check recovers if a key up was missed (focus left mid-press).
    if ClickDown && A_TickCount - ClickDownTick < 5000
        return
    ClickDown := true
    ClickDownTick := A_TickCount
    HoldFired := false
    SetTimer(HoldReached, -HoldMs)
}

Media_Play_Pause up:: {
    global ClickDown
    ClickDown := false
    SetTimer(HoldReached, 0)
    if !HoldFired
        Send("{F15}")
}

#HotIf
