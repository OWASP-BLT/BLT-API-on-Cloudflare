/**
 * TypeScript type definitions for BLT database models
 * Based on the Django models from the main OWASP BLT project
 */

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: Date;
  last_login?: Date;
}

export interface UserProfile {
  id: number;
  user_id: number;
  user_avatar?: string;
  title: number; // 0=Unrated, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
  role?: string;
  description?: string;
  winnings?: number;
  btc_address?: string;
  bch_address?: string;
  eth_address?: string;
  created: Date;
  modified: Date;
  visit_count: number;
  team_id?: number;
  public_key?: string;
  merged_pr_count: number;
  contribution_rank: number;
  current_streak: number;
  longest_streak: number;
  last_check_in?: Date;
  x_username?: string;
  linkedin_url?: string;
  github_url?: string;
  website_url?: string;
  discounted_hourly_rate: number;
}

export interface Organization {
  id: number;
  admin_id?: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  url: string;
  email?: string;
  twitter?: string;
  matrix_url?: string;
  slack_url?: string;
  discord_url?: string;
  gitter_url?: string;
  zulipchat_url?: string;
  element_url?: string;
  facebook?: string;
  created: Date;
  modified: Date;
  subscription_id?: number;
  is_active: boolean;
  trademark_count: number;
  trademark_check_date?: Date;
  team_points: number;
  tagline?: string;
  license?: string;
  categories: string[];
  contributor_guidance_url?: string;
  tech_tags: string[];
  topic_tags: string[];
  source_code?: string;
  ideas_link?: string;
  repos_updated_at?: Date;
  type: 'organization' | 'individual' | 'team';
  check_ins_enabled: boolean;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface Domain {
  id: number;
  organization_id?: number;
  name: string;
  url: string;
  logo?: string;
  webshot?: string;
  clicks?: number;
  email_event?: string;
  color?: string;
  github?: string;
  email?: string;
  twitter?: string;
  facebook?: string;
  created: Date;
  modified: Date;
  is_active: boolean;
  has_security_txt: boolean;
  security_txt_checked_at?: Date;
}

export interface Issue {
  id: number;
  user_id?: number;
  hunt_id?: number;
  domain_id?: number;
  url: string;
  description: string;
  markdown_description?: string;
  label: number; // 0=General, 1=Number Error, 2=Functional, 3=Performance, 4=Security, 5=Typo, 6=Design, 7=Server Down, 8=Trademark Squatting
  views?: number;
  verified: boolean;
  score?: number;
  status: string; // 'open', 'closed'
  user_agent?: string;
  ocr?: string;
  screenshot?: string;
  closed_by_id?: number;
  closed_date?: Date;
  github_url?: string;
  created: Date;
  modified: Date;
  is_hidden: boolean;
  rewarded: number;
  reporter_ip_address?: string;
  cve_id?: string;
  cve_score?: number;
}

export interface Hunt {
  id: number;
  domain_id: number;
  name: string;
  description?: string;
  url: string;
  prize?: number;
  prize_winner: number;
  prize_runner: number;
  prize_second_runner: number;
  logo?: string;
  banner?: string;
  plan: string;
  txn_id?: string;
  color?: string;
  created: Date;
  starts_on?: Date;
  end_on?: Date;
  is_published: boolean;
  result_published: boolean;
  modified: Date;
}

export interface HuntPrize {
  id: number;
  hunt_id: number;
  name: string;
  value: number;
  no_of_eligible_projects: number;
  valid_submissions_eligible: boolean;
  prize_in_crypto: boolean;
  description?: string;
  created: Date;
}

export interface Points {
  id: number;
  user_id: number;
  issue_id?: number;
  domain_id?: number;
  score: number;
  created: Date;
  modified: Date;
  reason?: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  created: Date;
}

export interface Project {
  id: number;
  organization_id?: number;
  name: string;
  slug: string;
  description: string;
  status: 'flagship' | 'production' | 'incubator' | 'lab' | 'inactive';
  url?: string;
  project_visit_count: number;
  twitter?: string;
  facebook?: string;
  logo?: string;
  created: Date;
  modified: Date;
}

export interface Repo {
  id: number;
  organization_id?: number;
  name: string;
  slug: string;
  github_url?: string;
  description?: string;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  language?: string;
  homepage?: string;
  topics: string[];
  archived: boolean;
  disabled: boolean;
  created: Date;
  modified: Date;
  last_pushed?: Date;
}

export interface Contributor {
  id: number;
  name: string;
  github_id: number;
  github_url: string;
  avatar_url: string;
  contributor_type: string;
  contributions: number;
  created: Date;
}

export interface Comment {
  id: number;
  parent_id?: number;
  content_type_id: number;
  object_id: number;
  author: string;
  author_fk_id?: number;
  author_url: string;
  text: string;
  created_date: Date;
}

export interface TimeLog {
  id: number;
  user_id: number;
  organization_id?: number;
  start_time: Date;
  end_time?: Date;
  duration?: number;
  github_issue_url?: string;
  created: Date;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  window_title: string;
  url?: string;
  recorded_at: Date;
  created: Date;
}

export interface GitHubIssue {
  id: number;
  issue_id: number;
  title: string;
  body?: string;
  state: string;
  type: 'issue' | 'pull_request';
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
  merged_at?: Date;
  is_merged: boolean;
  url: string;
  has_dollar_tag: boolean;
  sponsors_tx_id?: string;
  repo_id?: number;
  user_profile_id?: number;
  contributor_id?: number;
  assignee_id?: number;
  p2p_payment_created_at?: Date;
  p2p_amount_usd?: number;
  p2p_amount_bch?: number;
  sent_by_user_id?: number;
  bch_tx_id?: string;
}

export interface Hackathon {
  id: number;
  name: string;
  slug: string;
  description: string;
  organization_id: number;
  start_time: Date;
  end_time: Date;
  banner_image?: string;
  created: Date;
  modified: Date;
  is_active: boolean;
  rules?: string;
  registration_open: boolean;
  max_participants?: number;
  sponsor_note?: string;
  sponsor_link?: string;
}

export interface Badge {
  id: number;
  title: string;
  description: string;
  icon?: string;
  type: 'automatic' | 'manual';
  criteria?: Record<string, any>;
  created_at: Date;
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  awarded_by_id?: number;
  awarded_at: Date;
  reason?: string;
}

// API Response types
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ApiError {
  error: string;
  details?: any;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
  avatar?: string;
  title: number;
}
