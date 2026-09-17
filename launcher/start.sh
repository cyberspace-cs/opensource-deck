#!/usr/bin/env bash
# OpenSourceDeck 启动器桌面入口：确保服务运行并打开页面（已固化账户 cyberspace-cs）
export PATH=/home/user/miniconda3/envs/llm/bin:$PATH
REPO=/data/usershare/project/TxBuddy/opensource-deck
cd "$REPO" || exit 1

# 若 8080 尚未占用，后台启动启动器（避免重复实例）
if ! (exec 3<>/dev/tcp/127.0.0.1/8080) 2>/dev/null; then
  nohup node launcher/server.mjs >/tmp/osdeck_launcher.log 2>&1 &
  for _ in $(seq 1 40); do
    (exec 3<>/dev/tcp/127.0.0.1/8080) 2>/dev/null && break
    sleep 0.5
  done
fi

# 打开浏览器到启动器页面
URL=http://localhost:8080
for opener in xdg-open ukui-open kylin-open; do
  if command -v "$opener" >/dev/null 2>&1; then
    "$opener" "$URL" >/dev/null 2>&1 &
    exit 0
  fi
done
exit 0
