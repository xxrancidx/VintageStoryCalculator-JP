# Vintage Story Calculator (日本語版)

[Vintage Story](https://www.vintagestory.at/) 向けの計算ツール集の **日本語化フォーク** です。
合金の配合比率やインゴット鋳造に必要なナゲット数などを正確に計算できます。

🔗 **公開URL: https://xxrancidx.github.io/VintageStoryCalculator-JP/**

---

## このフォークの特徴

### 🇯🇵 完全日本語化
ナビゲーション、計算機UI、設定画面、表示ラベルなどすべてを日本語化しています。

### ⚒️ XSkills「鋳造師（Smelter）スキル」対応
[XSkills Mod](https://mods.vintagestory.at/xskillsandxlib) をプレイしている方向けに、
鋳造計算機に **「鋳造師スキルを適用」** トグルを追加しました。

- Tier 1〜3 のプリセット（デフォルト削減率: 10% / 20% / 30%）
- カスタム削減率の入力欄（サーバー設定を変更している環境向け）
- 削減前 → 削減後のナゲット数を並べて表示
- 端数が発生する場合は警告バナーを表示
- 溶解スタックプランもスキル適用後の値で再計算

> **注記:** 鋳造師（Smelter）スキルは **再溶解できない工具の鋳型のみ** に適用されます。
> インゴット鋳型・プレート鋳型など再溶解可能なアイテムの鋳型には適用されません。

---

## 利用可能なツール

### 合金計算機
目標インゴット数を設定するだけで、各合金成分の正確なナゲット量を計算します。
錫青銅、黒青銅、ビスマス青銅、エレクトラムなど Vintage Story の全合金に対応。
溶解温度の表示、プロセスごとのスタックプラン表示、レシピ共有用URLにも対応しています。

### 鋳造計算機
インゴット鋳造に必要な鉱石ナゲット数を計算します。
鋳造可能な全 8 種の金属に対応し、溶解温度・入手元情報・スタックプランを表示。
**XSkills 鋳造師スキル**にも対応しています。

### 共有URL
両計算機ともサイドバーの「レシピを共有」ボタンで現在の設定を URL にエンコードできます。
URL を開けば計算機の状態がそのまま復元されます。

---

## ライセンスと謝辞

このプロジェクトは [D-Heger/VintageStoryCalculator](https://github.com/D-Heger/VintageStoryCalculator)
（MIT License, © David Heger）のフォークです。素晴らしい元プロジェクトの作者 D-Heger 氏に感謝します。

本フォークも MIT License の下で配布されます。詳細は [LICENSE](LICENSE) を参照してください。

## 関連リンク

- [Vintage Story 公式サイト](https://www.vintagestory.at/)
- [Vintage Story Wiki](https://wiki.vintagestory.at/Main_Page)
- [XSkills Mod (ModDB)](https://mods.vintagestory.at/xskillsandxlib)
- [元リポジトリ (D-Heger/VintageStoryCalculator)](https://github.com/D-Heger/VintageStoryCalculator)
