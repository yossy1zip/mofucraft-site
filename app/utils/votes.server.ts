import { poolMain } from './db.server';

export async function fetchPlayerVotes(playerUuid: string) {
  try {
    const query = `
      SELECT 
        PlayerName,
        AllTimeTotal,
        MonthTotal,
        WeeklyTotal,
        DailyTotal,
        Points,
        MileStoneCount,
        HighestDailyTotal,
        HighestWeeklyTotal,
        HighestMonthlyTotal,
        LastDailyTotal,
        LastWeeklyTotal,
        LastMonthTotal,
        DayVoteStreak,
        BestDayVoteStreak,
        WeekVoteStreak,
        BestWeekVoteStreak,
        MonthVoteStreak,
        BestMonthVoteStreak
      FROM VotingPlugin_Users
      WHERE UUID = ?
    `;
    
    const [rows] = await poolMain.execute(query, [playerUuid]) as any;
    
    if (rows.length === 0) {
      return null;
    }
    
    return {
      playerName: rows[0].PlayerName,
      allTimeTotal: rows[0].AllTimeTotal || 0,
      monthTotal: rows[0].MonthTotal || 0,
      weeklyTotal: rows[0].WeeklyTotal || 0,
      dailyTotal: rows[0].DailyTotal || 0,
      points: rows[0].Points || 0,
      mileStoneCount: rows[0].MileStoneCount || 0,
      highestDailyTotal: rows[0].HighestDailyTotal || 0,
      highestWeeklyTotal: rows[0].HighestWeeklyTotal || 0,
      highestMonthlyTotal: rows[0].HighestMonthlyTotal || 0,
      lastDailyTotal: rows[0].LastDailyTotal || 0,
      lastWeeklyTotal: rows[0].LastWeeklyTotal || 0,
      lastMonthTotal: rows[0].LastMonthTotal || 0,
      dayVoteStreak: rows[0].DayVoteStreak || 0,
      bestDayVoteStreak: rows[0].BestDayVoteStreak || 0,
      weekVoteStreak: rows[0].WeekVoteStreak || 0,
      bestWeekVoteStreak: rows[0].BestWeekVoteStreak || 0,
      monthVoteStreak: rows[0].MonthVoteStreak || 0,
      bestMonthVoteStreak: rows[0].BestMonthVoteStreak || 0
    };
  } catch (error) {
    console.error('投票データ取得エラー:', error);
    return null;
  }
}