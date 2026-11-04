#!/usr/bin/env bash
# 一键部署：生成本地配置、构建镜像、启动服务并等待健康检查通过。
# 用法：./scripts/deploy.sh [--demo]
#   --demo  首次启动时写入虚构示例数据，便于直接查看界面

set -euo pipefail
cd "$(dirname "$0")/.."

DEMO=0
for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    *) echo "未知参数：$arg（可用：--demo）"; exit 1 ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "未检测到 Docker。请先安装 Docker Desktop 或 Docker Engine 后重试。"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "未检测到 docker compose，请安装 Docker Compose 插件。"
  exit 1
fi

gen_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 16
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

set_env() {
  key="$1"
  val="$2"
  sed -i.bak "s|^${key}=.*|${key}=${val}|" .env
  rm -f .env.bak
}

GENERATED=0
if [ ! -f .env ]; then
  cp .env.example .env
  TOKEN="$(gen_token)"
  set_env RELAY_CONSOLE_TOKEN "$TOKEN"
  GENERATED=1
  echo "已生成 .env"
fi

if [ "$DEMO" = "1" ]; then
  set_env DEMO_MODE 1
fi

echo "构建并启动（首次构建需要几分钟）…"
$DC up -d --build

echo "等待健康检查…"
READY=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT:-3100}/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done

if [ "$READY" != "1" ]; then
  echo "启动超时，查看日志：$DC logs --tail=50 sea-desk"
  exit 1
fi

echo
echo "服务已就绪"
echo "  求助端：  http://localhost:${PORT:-3100}/help"
echo "  家属端：  http://localhost:${PORT:-3100}/family"
echo "  接应端：  http://localhost:${PORT:-3100}/console"
if [ "$GENERATED" = "1" ]; then
  echo "  接应端令牌：${TOKEN}（已写入 .env，妥善保管）"
else
  echo "  接应端令牌：见 .env 中的 RELAY_CONSOLE_TOKEN"
fi
if [ "$DEMO" = "1" ]; then
  echo "  演示模式已开启：接应端列表中是虚构示例记录，用令牌登录即可查看"
fi
