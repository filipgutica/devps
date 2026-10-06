import pick from './captures/pick.html?raw';
import orphan from './captures/orphan.html?raw';
import list from './captures/list.html?raw';
import stop from './captures/stop.html?raw';

export interface Capture {
  id: string;
  label: string;
  command: string;
  html: string;
}

export const captures: readonly Capture[] = [
  { id: 'pick', label: 'Pick', command: 'devps', html: pick },
  { id: 'orphan', label: 'Orphaned', command: 'Down, Down', html: orphan },
  { id: 'list', label: 'List', command: 'devps ls', html: list },
  { id: 'stop', label: 'Stop', command: 'devps kill 5173', html: stop },
];
