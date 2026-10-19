import staffProfilesData from "~/data/staff-profiles.json";

export interface ActivityPeriod {
  start: string | null;
  end: string | null;
  role: string;
}

export interface StaffProfile {
  specialty?: string;
  ownerComment?: string | null;
  personalComment?: string | null;
  activityPeriods?: ActivityPeriod[];
}

export interface StaffProfileWithUsername extends StaffProfile {
  originalUsername?: string;
}

export type StaffProfiles = Record<string, StaffProfile>;

export function getStaffProfiles(): StaffProfiles {
  return staffProfilesData as StaffProfiles;
}

export function getStaffProfileByUsername(username: string): StaffProfileWithUsername | null {
  const profiles = getStaffProfiles();
  
  // 完全一致を最初に試す
  if (profiles[username]) {
    return {
      ...profiles[username],
      originalUsername: username
    };
  }
  
  // 大文字小文字を無視して検索
  const lowerUsername = username.toLowerCase();
  for (const [profileKey, profile] of Object.entries(profiles)) {
    if (profileKey.toLowerCase() === lowerUsername) {
      return {
        ...profile,
        originalUsername: profileKey // JSONファイルの元のキー（正しい大文字小文字）を返す
      };
    }
  }
  
  return null;
}

export function formatActivityPeriods(periods?: ActivityPeriod[]): string[] {
  if (!periods || periods.length === 0) {
    return [];
  }
  
  return periods.map(period => {
    try {
      const start = period.start 
        ? new Date(period.start).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit'
          })
        : '不明';
      const end = period.end 
        ? new Date(period.end).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit'
          })
        : '現在';
      
      return `${period.role || '不明'}: ${start} 〜 ${end}`;
    } catch (error) {
      console.warn('Error formatting activity period:', period, error);
      return '期間情報エラー';
    }
  });
}