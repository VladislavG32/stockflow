#!/usr/bin/env bash
# Проверяем реальную Linux-машину ДО нагрузки. Docker socket не ограничивается
# mem_limit агента: дочерние контейнеры используют Docker Engine самого хоста.
set -Eeuo pipefail
mode=${1:?server, build, test or deploy}
[[ $(uname -s) == Linux ]] || { echo 'Требуется Linux; Windows Docker не используется' >&2; exit 1; }
total=$(awk '/MemTotal:/ {print int($2/1024)}' /proc/meminfo)
available=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
case "$mode" in
  server) min_total=7500; min_available=5500; min_disk=20000 ;;
  build) min_total=7500; min_available=4000; min_disk=12000 ;;
  test) min_total=3500; min_available=1600; min_disk=6000 ;;
  deploy) min_total=3500; min_available=700; min_disk=2500 ;;
  *) exit 1 ;;
esac
disk=$(df -Pm . | awk 'NR==2 {print $4}')
printf 'Проверка %s: RAM=%s MiB, доступно=%s MiB, диск=%s MiB\n' "$mode" "$total" "$available" "$disk"
(( total >= min_total && available >= min_available && disk >= min_disk )) || {
  echo 'Ресурсов недостаточно. Не начинаем нагрузку; освободите ресурсы или выберите отдельный Linux-хост.' >&2; exit 1;
}
docker info --format '{{.OSType}}' | grep -qx linux
docker compose version >/dev/null
if [[ "$mode" == build ]]; then docker buildx version >/dev/null; fi
