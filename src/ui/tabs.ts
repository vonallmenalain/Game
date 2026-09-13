export type Tab = 'zug' | 'werkstatt' | 'lager' | 'forschung' | 'strecke' | 'mehr';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'zug', label: 'Zug' },
  { id: 'werkstatt', label: 'Werkstatt' },
  { id: 'lager', label: 'Lager' },
  { id: 'forschung', label: 'Forschung' },
  { id: 'strecke', label: 'Strecke' },
  { id: 'mehr', label: 'Mehr' },
];
