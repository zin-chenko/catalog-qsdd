export type DocumentStatus =
  'На согласовании' | 'Зарегистрирован' | 'На подписании' | 'Отклонён' | 'Черновик';
export type DocumentTab = 'list' | 'card' | 'preview' | 'route' | 'versions';
export interface Folder {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
}
export interface DocumentFile {
  id: string;
  name: string;
  kind: 'DOCX' | 'PDF' | 'IMG';
  size: string;
  main?: boolean;
  automatic?: boolean;
  dataUrl?: string;
  text?: string;
}
export interface DocumentVersion {
  number: number;
  date: string;
  author: string;
  stage: string;
  description: string;
  title: string;
  paragraphs: string[];
}
export interface RouteParticipant {
  name: string;
  decision: string;
  date?: string;
  comment?: string;
}
export interface RouteStep {
  id: string;
  title: string;
  state: 'done' | 'current' | 'waiting';
  parallel?: boolean;
  participants: RouteParticipant[];
}
export interface EdmsDocument {
  id: string;
  folderId: string;
  number: string;
  date: string;
  title: string;
  author: string;
  department: string;
  status: DocumentStatus;
  deadline: string | null;
  type: string;
  signer: string;
  legalEntity: string;
  access: string;
  caseNumber: string;
  retention: string;
  controller: string;
  relatedId?: string;
  tags: string[];
  files: DocumentFile[];
  versions: DocumentVersion[];
  route: RouteStep[];
  assignee: string;
  paragraphs: string[];
}
export interface Task {
  id: string;
  documentId: string;
  title: string;
  assignee: string;
  deadline: string;
  done: boolean;
}
export interface Notification {
  id: string;
  documentId: string;
  title: string;
  detail: string;
  read: boolean;
}
export interface User {
  name: string;
  initials: string;
  role: 'reviewer' | 'admin';
  substitute: string;
}
export interface Snapshot {
  folders: Folder[];
  documents: EdmsDocument[];
  tasks: Task[];
  notifications: Notification[];
  user: User;
}
export interface NewDocument {
  folderId: string;
  title: string;
  type: string;
  author: string;
  department: string;
}
export interface AssistantReference {
  label: string;
  documentId: string;
  paragraph?: number;
}
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  references?: AssistantReference[];
  canCreateTask?: boolean;
}
export interface AssistantContext {
  folderId: string;
  documentId?: string;
}
export const STATUSES: DocumentStatus[] = [
  'На согласовании',
  'Зарегистрирован',
  'На подписании',
  'Отклонён',
  'Черновик',
];
export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU').format(new Date(value.length === 10 ? value + 'T12:00:00' : value));
}
export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
}
