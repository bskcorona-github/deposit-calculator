import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          法令根拠とガイドラインについて
        </h1>

        {/* 免責事項 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>重要な注意事項：</strong>
                この計算ツールは国土交通省のガイドラインに基づく参考値を提供するものです。
                最終的な費用負担の決定は、当事者間の合意と専門家（弁護士・不動産専門家）の助言に基づいて行ってください。
              </p>
            </div>
          </div>
        </div>

        {/* 民法621条 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
            1. 民法621条（賃借人の原状回復義務）
          </h2>
          
          <div className="bg-blue-50 p-6 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">条文</h3>
            <p className="text-gray-700 leading-relaxed">
              賃借人は、賃借物を受け取った後にこれに生じた損傷（通常の使用及び収益によって生じた賃借物の損耗並びに賃借物の経年変化を除く。以下この条において同じ。）がある場合において、賃貸借が終了したときは、その損傷を原状に復する義務を負う。ただし、その損傷が賃借人の責めに帰することができない事由によるものであるときは、この限りでない。
            </p>
          </div>

          <div className="ml-4 space-y-3">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">要旨</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>
                  <strong>通常損耗</strong>：通常の使用によって生じた損耗（家具の設置跡、日焼けなど）は
                  <span className="text-red-600 font-semibold">借主の負担対象外</span>
                </li>
                <li>
                  <strong>経年変化</strong>：時間の経過によって自然に生じる変化（壁紙の変色、フローリングの色褪せなど）は
                  <span className="text-red-600 font-semibold">借主の負担対象外</span>
                </li>
                <li>
                  <strong>故意・過失による損傷</strong>：借主の責めに帰すべき事由による損傷（ペット傷、喫煙汚れ、穴あけなど）は
                  <span className="text-blue-600 font-semibold">借主の負担対象</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 p-4 rounded">
              <p className="text-sm text-gray-700">
                <strong>このツールでの適用：</strong>
                「日焼け」「色あせ」「家具跡」などのキーワードを検出した場合、自動的に
                <strong>貸主負担（借主負担0%）</strong>と判定します。
              </p>
            </div>
          </div>
        </section>

        {/* ガイドラインの位置付け */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
            2. 原状回復をめぐるトラブルとガイドライン（再改訂版）
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ガイドラインとは
              </h3>
              <p className="text-gray-700 leading-relaxed">
                国土交通省が公表している
                <strong>「原状回復をめぐるトラブルとガイドライン（再改訂版）」</strong>は、
                賃貸住宅の退去時における原状回復費用の負担区分について、
                <strong className="text-blue-600">実務上の指針</strong>を示したものです。
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">
                ⚠️ 重要：ガイドラインの法的位置付け
              </h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>
                  ガイドラインは<strong>法律ではありません</strong>
                </li>
                <li>
                  あくまで<strong>実務上の参考指針</strong>であり、必ず従わなければならないものではありません
                </li>
                <li>
                  ただし、裁判においては<strong>有力な判断材料</strong>として扱われています
                </li>
                <li>
                  民法621条が<strong>基本的な法的根拠</strong>となります
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ガイドラインの主な内容
              </h3>
              <div className="space-y-3 ml-4">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    (1) 負担区分の原則（第2章）
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>通常損耗・経年変化：貸主負担</li>
                    <li>故意・過失・善管注意義務違反：借主負担</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800">
                    (2) 減価償却の考え方（第3章）
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>
                      <strong>耐用年数</strong>：各設備・部材には定められた耐用年数があります
                      <ul className="list-circle list-inside ml-6 text-sm">
                        <li>壁紙（クロス）：6年</li>
                        <li>フローリング・カーペット：6年</li>
                        <li>エアコン：6年</li>
                        <li>給湯器：10年</li>
                        <li>襖・障子：4年</li>
                      </ul>
                    </li>
                    <li>
                      <strong>経過年数による負担軽減</strong>：
                      居住年数が長いほど借主負担割合は減少します
                    </li>
                    <li>
                      <strong>残存価値1円</strong>：
                      耐用年数を超過した設備でも、最低1円の価値を残します
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-100 p-4 rounded">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>計算例（壁紙の落書き・入居4年）：</strong>
                  </p>
                  <code className="text-xs bg-white p-2 block rounded">
                    借主負担割合 = (耐用年数 - 経過年数) ÷ 耐用年数<br />
                    = (6年 - 4年) ÷ 6年 = 2/6 = <strong>33.3%</strong><br />
                    <br />
                    工事費用 60,000円 × 33.3% = <strong>約20,000円が借主負担</strong>
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800">
                    (3) 施工単位の考え方（参考資料）
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>
                      <strong>壁紙（クロス）</strong>：
                      原則として<strong>「一面」単位</strong>で補修
                      （部屋全体の張替は過剰）
                    </li>
                    <li>
                      <strong>フローリング</strong>：
                      可能な限り<strong>部分補修</strong>
                    </li>
                    <li>
                      <strong>畳・襖</strong>：
                      損傷のある<strong>枚数分のみ</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 特約の有効性 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
            3. 特約条項の有効性
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              契約書に記載された特約（クリーニング特約、修繕特約など）は、
              以下の要件を満たす場合に有効とされています（ガイドライン Q&A Q16など）。
            </p>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                特約が有効となる3要件
              </h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>
                  <strong>必要性</strong>：
                  その特約を設ける必要性・合理性があること
                </li>
                <li>
                  <strong>明確性</strong>：
                  負担内容が具体的・明確に記載されていること（金額や範囲が明示）
                </li>
                <li>
                  <strong>相互理解</strong>：
                  借主が特約の内容を十分に理解し、合意していること
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                判例の傾向
              </h3>
              <div className="space-y-3 ml-4">
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-semibold text-green-900 mb-1">
                    ✓ 有効と判断されやすい特約
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>金額が具体的に明示されている（例：「25,000円」）</li>
                    <li>相場と比較して著しく高額でない</li>
                    <li>範囲が明確（例：「ルームクリーニング」）</li>
                  </ul>
                </div>

                <div className="bg-red-50 p-4 rounded">
                  <h4 className="font-semibold text-red-900 mb-1">
                    ✗ 無効と判断されやすい特約
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>金額が不明確（「実費」「相当額」のみ）</li>
                    <li>著しく高額（相場の2倍以上など）</li>
                    <li>通常損耗まで含む包括的な文言</li>
                    <li>消費者契約法に抵触する一方的不利益</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded">
              <p className="text-sm text-gray-700">
                <strong>このツールでの適用：</strong>
                契約書から特約を抽出し、金額の相当性をチェックします。
                高額な特約には自動的に警告を表示します。
              </p>
            </div>
          </div>
        </section>

        {/* 公式資料へのリンク */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
            4. 公式資料
          </h2>

          <div className="space-y-3">
            <div className="border rounded-lg p-4 hover:bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-1">
                原状回復をめぐるトラブルとガイドライン（再改訂版）
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                国土交通省 住宅局
              </p>
              <a
                href="https://www.mlit.go.jp/jutakukentiku/house/torikumi/honbun2.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                PDFダウンロード（本文）
              </a>
            </div>

            <div className="border rounded-lg p-4 hover:bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-1">
                原状回復ガイドライン 参考資料
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                負担区分表、減価償却計算例など
              </p>
              <a
                href="https://www.mlit.go.jp/jutakukentiku/house/content/001611293.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                PDFダウンロード（参考資料）
              </a>
            </div>

            <div className="border rounded-lg p-4 hover:bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-1">
                原状回復ガイドライン Q&A
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                よくある質問と回答（特約、クリーニング費用など）
              </p>
              <a
                href="https://www.mlit.go.jp/common/001005064.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                PDFダウンロード（Q&A）
              </a>
            </div>

            <div className="border rounded-lg p-4 hover:bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-1">
                民法（賃貸借）
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                e-Gov 法令検索
              </p>
              <a
                href="https://laws.e-gov.go.jp/law/129AC0000000089"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                民法第621条（原状回復義務）
              </a>
            </div>
          </div>
        </section>

        {/* ツールの使い方 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
            5. このツールの使い方
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                計算根拠の確認
              </h3>
              <p className="text-gray-700 leading-relaxed">
                計算結果の各明細には、以下の情報が含まれています：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mt-2">
                <li>
                  <strong>分類</strong>：通常損耗/経年劣化/借主過失/特約対象
                </li>
                <li>
                  <strong>根拠コード</strong>：
                  適用したルール（民法621条、ガイドライン該当箇所など）
                </li>
                <li>
                  <strong>減価償却の詳細</strong>：
                  耐用年数、経過年数、残存割合
                </li>
                <li>
                  <strong>計算ステップ</strong>：
                  按分→減価償却→築年数調整の順序
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">
                💡 管理会社との交渉に活用
              </h4>
              <p className="text-sm text-gray-700">
                監査トレース機能により、「なぜこの金額になったのか」を
                ガイドラインと法令を根拠に説明できます。
                過大請求を発見した場合、具体的な根拠を示して交渉することが可能です。
              </p>
            </div>
          </div>
        </section>

        {/* 戻るボタン */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            ← トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
