export function getStaffRoleBadgeInfo(staffRole: string | null) {
  if (!staffRole) return null;
  
  switch (staffRole) {
    case 'owner':
      return {
        label: '鯖主',
        bgColor: 'bg-red-600',
        textColor: 'text-white',
        icon: ''
      };
    case 'admin':
      return {
        label: '管理者',
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        icon: ''
      };
    case 'staff':
      return {
        label: 'スタッフ',
        bgColor: 'bg-blue-600',
        textColor: 'text-white',
        icon: ''
      };
    case 'helper':
      return {
        label: 'お手伝いさん',
        bgColor: 'bg-green-600',
        textColor: 'text-white',
        icon: ''
      };
    default:
      return null;
  }
}

export function getDonorRoleBadgeInfo(donorRole: string | null) {
  if (!donorRole) return null;
  
  switch (donorRole) {
    case 'diamond':
      return {
        label: 'DIAMOND',
        bgColor: 'bg-cyan-500',
        textColor: 'text-white',
        icon: '',
        description: '10,000円以上'
      };
    case 'gold':
      return {
        label: 'GOLD',
        bgColor: 'bg-yellow-500',
        textColor: 'text-white',
        icon: '',
        description: '3,000円以上'
      };
    case 'iron':
      return {
        label: 'IRON',
        bgColor: 'bg-gray-500',
        textColor: 'text-white',
        icon: '',
        description: '100円以上'
      };
    default:
      return null;
  }
}