# 描画と物理（ゲームロジック）分離のための引継ぎ資料

このドキュメントは、描画（Renderer）と物理／ゲーム状態（Physics/Game）を分離して統合するための手順と API 仕様を示します。

## 目的
- 描画初期化とシーン構築を `renderer.js` に分離し、物理やゲームロジック（RUN/KICK/NONE の判定や速度制御など）は `main.js` に残す。
- 他の描画実装（別の Three.js シーン、2D Canvas、WebGL）やゲームロジックに物理状態・入力を容易に引き継げるようにする。

## 新しいファイル構成（要点）
- `renderer.js` - Three.js によるシーン構築、ライト、フィールド、ボールメッシュ作成。`setupRenderer(canvas)` をエクスポートして、{ scene, camera, renderer, clock, ball, field } を返す。
- `main.js` - 物理（重力・摩擦・衝突）と入力からのインパルス適用などのゲーム状態を管理。`setBall(mesh)` で `renderer.js` が作成した ball メッシュを受け取り、以後 `updatePhysics(dt)` が ball.position を更新する。
- `index.html` - 起動側。`setupRenderer()` で得た ball を `main.setBall()` に渡している。

## API 仕様

### renderer.js
- setupRenderer(canvas: HTMLCanvasElement)
  - 返却: { scene, camera, renderer, clock, ball, field }
  - 説明: canvas を使って Three.js の Renderer を作成し、フィールドとボールをシーンに追加する。ボールメッシュを返すため、物理モジュールはこの参照を受け取って位置更新を行える。

- resizeRendererToDisplaySize(renderer, camera)
  - 説明: ウィンドウリサイズ時に renderer と camera のアスペクト比を更新するユーティリティ。

### main.js
- setBall(mesh: THREE.Mesh)
  - 説明: 描画側が作成したボールメッシュ参照を受け取り、以後 physics が直接位置を更新する。

- updatePhysics(dt: number)
  - 説明: 重力や摩擦等を適用して `ball.position` を更新する。外部のレンダラはこの更新後に `renderer.render(scene, camera)` を呼ぶことで描画が反映される。

- setRunBoost(conf: number), kickImpulse(conf: number)
  - 説明: `hand.js`（入力/ジェスチャ判定）から呼ばれる関数。RUN/KICK の強度を physics に与える。

## 状態引継ぎ（RUN / KICK / NONE）

入力検出は `hand.js` に残ります（HandTracker が `classify()` で状態を返す）。`index.html` の起動スクリプトでは `HandTracker` の `onResult` コールバックで状態を受け取り、以下のように物理モジュールへ伝えます。

- RUN: `setRunBoost(confidence)` を呼ぶ。これにより `velocity` に前進加速が入る。
- KICK: `kickImpulse(confidence)` を呼ぶ。一度だけのインパルスを与える。
- NONE: 何もしない（物理は自然減衰や摩擦で停止する）。

これにより、描画モジュールは一切ジェスチャ判定に依存せず、`ball` の位置更新だけを受け取って表示する。

## 他の描画処理・ゲーム処理への引継ぎ例

1. 別のレンダラ（例: WebGL2 で独自描画）に差し替える場合:
   - `renderer.js` を編集して `setupRenderer()` が返す `ball` を取り除き任意の描画要素へ差し替える。
   - `main.js` の `setBall()` に渡すオブジェクトを、`{ position: { x, y, z } }` のような最小インターフェースに合わせることで互換性を持たせられる。

2. ゲームロジックを別スコープで走らせたい場合:
   - `main.js` の `updatePhysics(dt)` をエクスポートし、外部のゲームループ（例: server-synced tick）から呼ぶ。
   - `setBall()` は物理インテグレーション結果を反映するフックとして使える。

## サンプル呼び出しフロー（index.html）

1. `three = setupRenderer(threeCanvas)` を呼ぶ。
2. `setBall(three.ball)` を呼んで物理に参照を渡す。
3. ループ内で `updatePhysics(three.clock.getDelta())` を呼び、`three.renderer.render(three.scene, three.camera)` で描画する。

## 注意点と拡張案

- ball メッシュへの参照を直接渡す方式は簡単だが、参照整合性に注意。将来的には物理結果を返す関数（例: `getPhysicsState()`）やイベント発火（例: `onBallMoved(cb)`）を作ると疎結合になる。
- POV コントローラ（カメラ操作）を追加する場合は、`hand.js` の joystick 値を `index.html` のループで受け取り `three.camera.position` や `three.camera.lookAt` に適用する。

---

このドキュメントは最低限の使い方を示しています。必要ならサンプルコード（POV 用の camera controller、物理同期用のイベント API 等）を追加します。
