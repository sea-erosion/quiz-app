// 文字数(length)ぶん、intervalMsごとに1文字ずつ「表示済み文字数」を増やしていく。
// isCancelled()がtrueを返した時点で即座に打ち切る(問題が切り替わった場合など)。
// 演出が最後まで終わる(またはキャンセルされる)まで待つPromiseを返す。
export function revealTextGradually(
  length: number,
  intervalMs: number,
  isCancelled: () => boolean,
  onTick: (revealedCount: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;

    const intervalId = setInterval(() => {
      if (isCancelled()) {
        clearInterval(intervalId);
        resolve();
        return;
      }

      count += 1;
      onTick(count);

      if (count >= length) {
        clearInterval(intervalId);
        resolve();
      }
    }, intervalMs);
  });
}
