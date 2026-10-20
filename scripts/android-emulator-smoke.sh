#!/usr/bin/env bash
set -Eeuo pipefail

APK="android/app/build/outputs/apk/debug/app-debug.apk"
LOG="android-emulator-log.txt"
PACKAGE="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('capacitor.config.json','utf8')).appId)")"
ACTIVITY="$PACKAGE/.MainActivity"
DB_NAME="padnakashtSQLite.db"
ERROR_PATTERN='FATAL EXCEPTION|SQLite initialization failed|No such plugin|Uncaught (ReferenceError|TypeError|SyntaxError)|Uncaught Error'

test -s "$APK"
if ! grep -Fq "applicationId \"$PACKAGE\"" android/app/build.gradle; then
  echo "QA failure: APK Gradle applicationId does not match Capacitor appId ($PACKAGE)."
  exit 1
fi

adb install -r "$APK"
adb logcat -c
adb shell am start -n "$ACTIVITY"
sleep 10
adb logcat -d > "$LOG"

if ! adb shell pidof "$PACKAGE" >/dev/null; then
  echo "QA failure: application process exited after launch. Relevant logcat follows."
  grep -E -i "$ERROR_PATTERN|AndroidRuntime|chromium|Capacitor" "$LOG" | tail -n 160 || true
  exit 1
fi

assert_database_present() {
  if ! adb shell run-as "$PACKAGE" ls databases | tr -d '\r' | grep -Fxq "$DB_NAME"; then
    echo "QA failure: expected SQLite database file ($DB_NAME) is missing."
    adb shell run-as "$PACKAGE" ls -la databases || true
    grep -E -i 'SQLite|Capacitor|FATAL EXCEPTION|AndroidRuntime' "$LOG" | tail -n 160 || true
    exit 1
  fi
}

assert_database_present

# Use Android's connectivity shell service rather than a restricted protected broadcast.
# Fail closed: never claim an offline test passed unless Android confirms airplane mode.
if ! adb shell cmd connectivity airplane-mode enable; then
  echo "QA failure: Android connectivity service could not enable airplane mode."
  exit 1
fi
AIRPLANE_MODE="$(adb shell settings get global airplane_mode_on | tr -d '\r')"
if [ "$AIRPLANE_MODE" != "1" ]; then
  echo "QA failure: airplane mode was not enabled (observed setting: $AIRPLANE_MODE)."
  exit 1
fi

adb shell am force-stop "$PACKAGE"
adb shell am start -n "$ACTIVITY"
sleep 5
adb logcat -d > "$LOG"

if ! adb shell pidof "$PACKAGE" >/dev/null; then
  echo "QA failure: app did not survive airplane-mode relaunch. Relevant logcat follows."
  grep -E -i "$ERROR_PATTERN|AndroidRuntime|chromium|Capacitor" "$LOG" | tail -n 160 || true
  exit 1
fi

assert_database_present

if grep -E -i "$ERROR_PATTERN" "$LOG"; then
  echo "QA failure: runtime error signature detected after airplane-mode relaunch."
  exit 1
fi

echo "QA smoke checks passed: matching appId, install, launch, SQLite database persistence, verified airplane mode, and offline relaunch."
