#!/usr/bin/env bash
# Получаем бинарные артефакты только из успешной сборки того же snapshot.
# Никаких source/eval для данных артефакта и никаких rebuild на TEST.
set -Eeuo pipefail
dir=${1:-incoming}
export LC_ALL=C
fail() { echo "$*" >&2; exit 1; }
# Восстанавливаем в отдельном временном каталоге; incoming остаётся неизменным.
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
archive="$dir/ci-images.tar.gz"
shopt -s nullglob
parts=("$dir"/ci-images.tar.gz.part-*)
if [[ -f "$dir/ci-images.parts.sha256" ]]; then
  [[ ! -e "$archive" ]] || fail 'Смешаны цельный архив и фрагменты'
  count=0
  while read -r hash name extra; do
    name=${name#\*}
    printf -v required 'ci-images.tar.gz.part-%06d' "$count"
    [[ "$hash" =~ ^[a-f0-9]{64}$ && "$name" == "$required" && -z "$extra" ]] || fail 'Некорректный manifest фрагментов'
    [[ -f "$dir/$name" && ! -L "$dir/$name" ]] || fail "Отсутствует фрагмент: $name"
    actual=$(sha256sum "$dir/$name" | cut -d' ' -f1)
    [[ "$actual" == "$hash" ]] || fail "Повреждён фрагмент: $name"
    count=$((count + 1))
  done < "$dir/ci-images.parts.sha256"
  [[ "$count" -gt 0 && "${#parts[@]}" -eq "$count" ]] || fail 'Неверное количество фрагментов'
  archive="$work/ci-images.tar.gz"
  cat -- "${parts[@]}" > "$archive"
else
  [[ "${#parts[@]}" -eq 0 ]] || fail 'Отсутствует manifest фрагментов'
fi
# Имя checksum-файла фиксировано; не исполняем произвольные пути из manifest.
expected=$(awk '$2=="ci-images.tar.gz" || $2=="*ci-images.tar.gz" {print $1}' "$dir/ci-images.sha256")
[[ "$expected" =~ ^[a-f0-9]{64}$ ]] || exit 1
actual=$(sha256sum "$archive" | cut -d' ' -f1)
[[ "$actual" == "$expected" ]] || { echo 'Повреждён архив образов' >&2; exit 1; }
# pipefail сам по себе не предотвращает частичный docker load при битом gzip.
gzip -t -- "$archive"
tar --force-local -tzf "$archive" > /dev/null
gzip -dc -- "$archive" | docker load
sha=$(git rev-parse HEAD)
for target in runner migrator; do
  revision=$(docker image inspect "stockflow-ci-$target:$sha" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ "$revision" == "$sha" ]] || exit 1
done
