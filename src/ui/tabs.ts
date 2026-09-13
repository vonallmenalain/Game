export type Tab = 'zug' | 'lager' | 'forschung' | 'strecke' | 'mehr';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'zug', label: 'Zug' },
  { id: 'lager', label: 'Lager' },
  { id: 'forschung', label: 'Forschung' },
  { id: 'strecke', label: 'Strecke' },
  { id: 'mehr', label: 'Mehr' },
];
