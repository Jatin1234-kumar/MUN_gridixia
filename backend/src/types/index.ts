export type EventType   = 'MUN' | 'YOUTH_PARLIAMENT';
export type EventStatus = 'active' | 'pending' | 'inactive';

export interface Event {
  id:             string;
  name:           string;
  date:           string;
  type:           EventType;
  status:         EventStatus;
  location:       string;
  description:    string;
  delegateCount:  number;
  createdAt:      Date;
  updatedAt:      Date;
}

export interface Committee {
  id:        string;
  name:      string;
  abbr:      string;
  topic:     string;
  type:      EventType;
  delegates: number;
  capacity:  number;
  eventId:   string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Delegate {
  id:           string;
  name:         string;
  country:      string;
  committee:    string;
  status:       'confirmed' | 'pending' | 'waitlisted';
  registeredAt: string;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface PaginatedResult<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}
