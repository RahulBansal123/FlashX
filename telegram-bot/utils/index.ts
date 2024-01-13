export const formatOrderType = (orderType: string): string => {
  switch (orderType) {
    case 'l-m':
      return 'Long (Market)';
    case 's-m':
      return 'Short (Market)';
    case 'l-l':
      return 'Long (Limit)';
    case 's-l':
      return 'Short (Limit)';
    default:
      return 'Unknown';
  }
};
