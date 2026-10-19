import { Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

function getOperationYear(): number {
  const start = new Date(2014, 7, 21); // August 21, 2014
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const anniversary = new Date(now.getFullYear(), 7, 21);
  if (now < anniversary) years--;
  return years + 1; // "X年目" means currently in the Xth year
}
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faFlag,
  faGem,
  faHandPeace,
  faSmile,
  faTree,
  faTrain,
  faCheckSquare
} from "@fortawesome/free-solid-svg-icons";

export const meta: MetaFunction = () => [
  { title: "サーバー紹介 - MOFUCRAFT!!!" }
];

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Hero Banner */}
      <section className="relative w-full h-96 sm:h-[500px] md:h-[600px] overflow-hidden rounded-lg shadow-2xl mb-8">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/about/images/banner.jpg')"
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-raleway mb-4 text-center">
            MOFUCRAFT!!!
          </h1>
          <p className="text-white text-xl sm:text-2xl md:text-3xl mb-8 text-center">
            超アットホームな<br className="sm:hidden" />生活サーバー！
          </p>
          {/*
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/guide/first-time"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-center"
            >
              参加する！
            </Link>
          </div>
          */}
        </div>

        {/* Scroll Down Indicator */}
        <a
          href="#intro"
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white opacity-70 hover:opacity-100 transition-opacity"
        >
          <div className="text-center">
            <span className="block mb-2">詳しくみる</span>
            <svg className="w-6 h-6 mx-auto animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </a>
      </section>

      {/* Intro Section */}
      <section id="intro" className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-raleway mb-6 text-gray-800">
            もふくらです！
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-8">
            運営{getOperationYear()}年目✨<br />
            マインクラフト本来の楽しさを味わえるようにしながらも様々な要素があり、<br />
            長い間多くの住民に親しまれています！<br />
            このページではそんなもふくらふとの特徴をご覧いただけます！
          </p>
          <div className="flex justify-center gap-8 md:gap-16">
            <div className="text-center">
              <FontAwesomeIcon icon={faHeart} className="w-12 h-12 md:w-16 md:h-16 text-pink-500 mb-2" />
            </div>
            <div className="text-center">
              <FontAwesomeIcon icon={faFlag} className="w-12 h-12 md:w-16 md:h-16 text-blue-500 mb-2" />
            </div>
            <div className="text-center">
              <FontAwesomeIcon icon={faGem} className="w-12 h-12 md:w-16 md:h-16 text-cyan-500 mb-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-6 mb-8">
        {/* Feature 1 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="order-2 md:order-1 p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-raleway mb-4 text-gray-800">
                馴染みやすく、暮らしやすい環境
              </h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                マルチプレイがはじめての方からベテランの方まで楽しめます。<br />
                充実したガイドやチュートリアル、家を建てやすい環境、万全のセキュリティはもちろん、
                アットホームなプレイヤーやスタッフにも囲まれています！
              </p>
            </div>
            <div className="order-1 md:order-2">
              <img
                src="/about/images/pic01.jpg"
                alt="馴染みやすい環境"
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="order-2 p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-raleway mb-4 text-gray-800">
                コミュニティ制度
              </h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                各プレイヤーがコミュニティに参加でき、可視化することでよりプレイヤー同士の繋がりを強化できる制度です。<br />
                また、コミュニティ単位での町開発を支援する仕組みも新たに導入することで、町開発を圧倒的にしやすくします！
              </p>
            </div>
            <div className="order-1">
              <img
                src="/about/images/pic02.jpg"
                alt="コミュニティ制度"
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="order-2 md:order-1 p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-raleway mb-4 text-gray-800">
                様々な追加要素、やりこみ要素
              </h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                建築などももちろん楽しめますが、他にも様々なやりこみ要素やバニラよりも楽しくなるような要素が高頻度で追加されてます。<br />
                以下はそのほんの一例です。<br />
                かわいいペット、スキルのmcMMO、強化武器・Mob、面白い銃、強敵を倒すなどの高難易度イベント
              </p>
            </div>
            <div className="order-1 md:order-2">
              <img
                src="/about/images/pic03.jpg"
                alt="やりこみ要素"
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Other Features Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-8 md:p-12 mb-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-raleway mb-4 text-gray-800">
            その他
          </h2>
          <p className="text-base sm:text-lg text-gray-700">
            以下、住民からお聞きしたもふくらふとの良いところです！
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature Cards */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <FontAwesomeIcon icon={faHandPeace} className="w-12 h-12 text-blue-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-800">住民が主体</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              住民各自による村の形成、私鉄などの開発が行われています！それらに参加することができ、そして発展を楽しむことができます。
              コミュニティ制度なども整っているので、自分がリーダーになって自分の街を作ることもできちゃいます。
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <FontAwesomeIcon icon={faSmile} className="w-12 h-12 text-yellow-500 mb-3" />
              <h3 className="text-xl font-bold text-gray-800">スタッフ</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              臨機応変で丁寧かつ迅速に対応するスタッフ陣が皆さまのもふ生活をお助けします。
              住民からも気軽に要望などを発信できるようになっています。困ったことがあればいつでもご連絡ください！
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <FontAwesomeIcon icon={faTree} className="w-12 h-12 text-green-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-800">広大かつ親切な資源</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              このサーバーは珍しく「採取資源」という整備された資源ワールドを別で用意しています！
              広大な植林場、畑、羊毛、Mobを狩る場所などが整備されており、建材に困ることはありません。
              また、通常の資源ワールドも毎月再生成してるため、資源が尽きることはありません。
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <FontAwesomeIcon icon={faTrain} className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-xl font-bold text-gray-800">鉄道</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              信じられないほど鉄道が発展しています。経路が長い場合は自動で速度が上がるので、退屈することなく景色を楽しみながら移動できます。
              また、住民による私鉄も申請をすれば作成可能で、そちらもかなりの発展を遂げています。
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <FontAwesomeIcon icon={faHeart} className="w-12 h-12 text-pink-500 mb-3" />
              <h3 className="text-xl font-bold text-gray-800">自由</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              基本なんでも作れる上に、広大すぎる土地や開発支援制度によって更に自由に建築できます。
              また、必要最低限のゆるめなルール、自由なDiscord(?)など、気疲れとは無縁な楽しい生活が待っています。
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <FontAwesomeIcon icon={faCheckSquare} className="w-12 h-12 text-purple-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-800">治安</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              運がいいのか、そもそも荒らしがいません。
              万一被害にあったとしても、スタッフによる監視やチェスト等の自動保護、地形保護などの機能で守られており安心です。
              民度も高く、高水準でもふもふな生活を楽しめます。
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-2xl p-8 md:p-12 mb-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-raleway mb-4">
            参加しよう！
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-8 leading-relaxed">
            もふくらふとを覗いてみよう！<br />
            参加に迷っている方は是非一度見学しに来てください！<br />
            <span className="font-bold">ログインアドレス : mofucraft.net</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/tutorial"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              チュートリアル
            </Link>
            <Link
              to="/map"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Dynmap
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
