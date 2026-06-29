export interface TimelineEvent {
  id: string;
  status: 'reported' | 'assigned' | 'investigating' | 'resolving' | 'resolved';
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

export interface RootCauseAnalysis {
  identifiedProblem: string;
  systemicIssue: string;
  actionTaken: string;
  preventativeMeasure: string;
  aiConfidence: number; // e.g., 94 for 94%
}

export interface CivicCase {
  id: string;
  title: string;
  description: string;
  category: 'Infrastructure' | 'Sanitation' | 'Traffic' | 'Public Safety' | 'Utilities' | 'Environment';
  location: string;
  wardId: string;
  wardName: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Investigating' | 'In Progress' | 'Resolved';
  reportedAt: string;
  resolvedAt?: string;
  photoUrl: string;
  communityVerifications: number;
  upvotes: number;
  rootCauseAnalysis: RootCauseAnalysis;
  timeline: TimelineEvent[];
}

export interface Ward {
  id: string;
  name: string;
  councilor: string;
  accountabilityScore: number; // 0-100
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  resolutionRate: number; // %
  averageResolutionDays: number;
  ranking: number;
}

export interface ActivityFeedItem {
  id: string;
  caseId: string;
  caseTitle: string;
  type: 'reported' | 'status_change' | 'verified' | 'resolved';
  message: string;
  timestamp: string;
  user: string;
}
