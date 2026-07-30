import type { PlayerAction, ViewModel } from '@psy-sim/core';

type AskBlock = Extract<ViewModel, { kind: 'ADVISOR_DRAW' }>['ask'];

/**
 * 打听区块(GAME_DESIGN 13.3)。挂在抽卡屏和工作台上的一个**次要入口**。
 *
 * ## 排版:引文 + 灰色括注
 *
 * 正文是那个人的原话,括注是那句让人不安的补充。
 * **括注永远不评价可靠性**,只给一个事实(她哪年毕业的、他没说为什么走)——
 * 一旦括注开始提示"这条可能不准",玩家就不用自己判断了,而自己判断就是全部内容。
 *
 * ## 问之前你不知道他会说什么
 *
 * 按钮上只写来源和打听对象("师兄 · 沈遇春"),没有内容摘要。
 * 有摘要的话这一屏就变成了挑答案,而不是打听。
 */
export function AskAround(props: {
  ask: AskBlock;
  act: (action: PlayerAction) => void;
  /** 这一屏在打听什么。"关于这几个导师" / "关于你手上的东西" */
  about: string;
}) {
  const { ask, act, about } = props;
  if (ask.options.length === 0 && ask.heard.length === 0) return null;
  return (
    <div className="ask-block">
      <div className="ask-head">
        <span className="ask-title">打听一下{about}</span>
        <span className="ask-left">
          {ask.asksLeft > 0 ? `今年还能问 ${ask.asksLeft} 次` : '今年问完了'}
        </span>
      </div>

      {ask.heard.map(item => (
        <div key={item.id} className="ask-heard">
          <div className="ask-quote">
            {item.source}谈{item.subject}:{item.text}
          </div>
          {/* 括注只给一个事实,不评价可靠性 */}
          <div className="ask-caveat">——{item.caveat}</div>
        </div>
      ))}

      {ask.asksLeft > 0 && ask.options.length > 0 && (
        <div className="ask-options">
          {ask.options.map(option => (
            <button
              key={option.id}
              className="ask-btn"
              onClick={() => act({ type: 'ASK_AROUND', rumorId: option.id })}
            >
              {option.source} · {option.subject}
            </button>
          ))}
        </div>
      )}
      {ask.options.length === 0 && ask.heard.length > 0 && (
        <div className="ask-exhausted">没有别人可以问了。</div>
      )}
    </div>
  );
}
