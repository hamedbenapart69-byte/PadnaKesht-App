#!/usr/bin/env bash
set -Eeuo pipefail

APK="android/app/build/outputs/apk/debug/app-debug.apk"
LOG="android-emulator-log.txt"
PACKAGE="com.padnakasht.kimi"
ACTIVITY="$PACKAGE/.MainActivity"

test -s "$APK"
adb install -r "$APK"
adb logcat -c
adb shell am start -n "$ACTIVITY"
sleep 10
adb logcat -d > "$LOG"

if ! adb shell pidof "$PACKAGE" >/dev/null; then
  echo "QA failure: application process exited after launch. Relevant logcat follows."
  grep -E -i 'FATAL EXCEPTION|AndroidRuntime|SQLite initialization failed|No such plugin|Uncaught (ReferenceError|TypeError|SyntaxError)|Uncaught Error|chromium|Capacitor' "$LOG" | tail -n 160 || true
  exit 1
fi

adb shell run-as "$PACKAGE" ls databases | grep -q 'padnakashtSQLite.db'

adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true || true
adb shell am force-stop "$PACKAGE"
adb shell am start -n "$ACTIVITY"
sleep 5
adb logcat -d > "$LOG"

if ! adb shell pidof "$PACKAGE" >/dev/null; then
  echo "QA failure: app did not survive offline relaunch. Relevant logcat follows."
  grep -E -i 'FATAL EXCEPTION|AndroidRuntime|SQLite initialization failed|No such plugin|Uncaught (ReferenceError|TypeError|SyntaxError)|Uncaught Error|chromium|Capacitor' "$LOG" | tail -n 160 || true
  exit 1
fi

if grep -E 'FATAL EXCEPTION|SQLite initialization failed|No such plugin|Uncaught (ReferenceError|TypeError|SyntaxError)|Uncaught Error' "$LOG"; then
  echo "QA failure: runtime error signature detected."
  exit 1
fi

echo "QA smoke checks passed: install, launch, SQLite database presence, and offline relaunch."
