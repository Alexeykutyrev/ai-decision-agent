export type Role = 'user' | 'assistant'

export interface Attachment {
  name: string
  url: string
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  attachment?: Attachment
  error?: boolean
}

export interface MonitoringContext {
  crop: string
  stage: string
  area: string
  flowers: string
  fruits: string
  temperature: string
  humidity: string
  notes: string
}

export const emptyContext: MonitoringContext = {
  crop: 'Яблоня',
  stage: 'Плодоношение',
  area: '',
  flowers: '',
  fruits: '',
  temperature: '',
  humidity: '',
  notes: '',
}
