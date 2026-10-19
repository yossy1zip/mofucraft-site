// クライアント・サーバー共通で使用できるお金関連のユーティリティ関数

export function formatMoney(amount: number): { integer: string; decimal: string } {
  const formattedAmount = (amount / 100).toFixed(2);
  const [integer, decimal] = formattedAmount.split('.');
  return {
    integer: parseInt(integer).toLocaleString(),
    decimal: decimal
  };
}

// お金の型定義も共有
export type PlayerMoney = {
  uuid: string;
  name: string;
  balance: number;
};

export type MoneyRankingEntry = {
  rank: number;
  uuid: string;
  name: string;
  balance: number;
};