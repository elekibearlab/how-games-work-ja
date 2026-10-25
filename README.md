# ゲームのしくみ 基礎編 サンプル

「ゲームのしくみ 基礎編」シリーズのサンプルコードです。<br>
ゲームループ・デルタタイム・入力・ゲームの状態・乱数といった、ゲームを動かす基本の仕組みを、実際に動くゲームで確かめられます。

| 回    | 内容                                                  | フォルダ                                   |
| ----- | ----------------------------------------------------- | ------------------------------------------ |
| 第6回 | 第1回〜第5回の仕組みで作る、CLI ゲーム 3 本           | [06_cli_games](06_cli_games/README.md)     |
| 第7回 | 第6回の 3 本を、AI に同じ仕様のまま 3D 化してもらった | [07_ai_3d_games](07_ai_3d_games/README.md) |

## CLI ゲーム (第6回)

ターミナルで遊ぶ 3 本のゲームです。どのゲームも Python 版と JavaScript（Node.js）版があり、内容は同じです。

| [ホーンテッド・テキストアドベンチャー](06_cli_games/01_text_adventure/README.md)        | [バーガー・タイピング](06_cli_games/02_burger_typing/README.md)        | [エレキシューティング](06_cli_games/03_eleki_shooting/README.md)        |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ![ホーンテッド・テキストアドベンチャー](06_cli_games/01_text_adventure/images/play.gif) | ![バーガー・タイピング](06_cli_games/02_burger_typing/images/play.gif) | ![エレキシューティング](06_cli_games/03_eleki_shooting/images/play.gif) |

### 動かし方

```sh
# Python版（Python 3.10 以降）
python 06_cli_games/01_text_adventure/python/main.py

# JavaScript版（Node.js 18 以降）
node 06_cli_games/01_text_adventure/javascript/main.js
```

遊び方・動作環境・しくみの説明は [06_cli_games/README.md](06_cli_games/README.md) にまとめています。

## AI で 3D 化したゲーム (第7回)

CLI ゲーム 3 本を、Three.js でブラウザで遊べる 3D ゲームにしたものです。<br>
見た目は大きく変わりますが、ゲームループ・入力・ゲームの状態といった中身の流れは CLI 版とほとんど同じなので、見比べてみてください。

- **ブラウザで触る**: [lab.elekibear.com/demos/how-games-work-ai-3d-games/](https://lab.elekibear.com/demos/how-games-work-ai-3d-games/)

| [ホーンテッド・テキストアドベンチャー](07_ai_3d_games/01_text_adventure/)                          | [バーガー・タイピング](07_ai_3d_games/02_burger_typing/)                          | [エレキシューティング](07_ai_3d_games/03_eleki_shooting/)                          |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ![3D版ホーンテッド・テキストアドベンチャー](07_ai_3d_games/screenshots/01_text_adventure/play.gif) | ![3D版バーガー・タイピング](07_ai_3d_games/screenshots/02_burger_typing/play.gif) | ![3D版エレキシューティング](07_ai_3d_games/screenshots/03_eleki_shooting/play.gif) |

### 動かし方

手元で動かすときは Node.js が必要です（Three.js をネットから読み込むため、インターネット接続も必要です）。<br>
表示された URL（http://localhost:3000 など）をブラウザで開くと、ゲームを選ぶメニューが出ます。

```sh
npm run play-3d
```

AI に頼んだプロンプトや操作は [07_ai_3d_games/README.md](07_ai_3d_games/README.md) にまとめています。

## フォルダ構成

回ごとにフォルダを分けています。

```text
how-games-work-ja/
├─ 06_cli_games/    # 第6回: CLI ゲーム 3 本（Python 版・JavaScript 版）
├─ 07_ai_3d_games/  # 第7回: 3 本を AI で 3D 化したもの（Three.js）
└─ package.json     # JavaScript 版を ES モジュールで動かす設定と、3D 版の起動コマンド
```
