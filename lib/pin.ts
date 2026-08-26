// 6桁の数字のPINコードを生成する(例: "482913")
// 先頭が0になってもOKなので、文字列として組み立てる
export function generatePin(): string {
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}
