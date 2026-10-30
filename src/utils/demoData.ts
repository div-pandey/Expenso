import type { Group, Member, Expense, Settlement, UserProfile, Blend, BlendMember } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_you',
    email: 'divyansh@campus.edu',
    fullName: 'Divyansh',
    initials: 'DI',
    avatarColor: 'bg-emerald-600 text-white',
    inviteCode: 'DIVY24',
    phone: '+91 98765 43210',
    createdAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 'user_rahul',
    email: 'rahul@campus.edu',
    fullName: 'Rahul Sharma',
    initials: 'RA',
    avatarColor: 'bg-amber-600 text-white',
    inviteCode: 'RAHUL9',
    phone: '+91 98111 22334',
    createdAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 'user_aman',
    email: 'aman@campus.edu',
    fullName: 'Aman Verma',
    initials: 'AM',
    avatarColor: 'bg-sky-600 text-white',
    inviteCode: 'AMAN72',
    phone: '+91 98222 33445',
    createdAt: '2026-10-20T08:00:00.000Z',
  },
];

export const INITIAL_BLEND: Blend = {
  id: 'blend_college_crew',
  name: 'College Crew',
  createdBy: 'user_you',
  createdAt: '2026-10-20T08:00:00.000Z',
  memberCount: 3,
};

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'user_you',
    name: 'Divyansh (You)',
    initials: 'DI',
    avatarColor: 'bg-emerald-600 text-white',
    isCurrentUser: true,
    phone: '+91 98765 43210',
    inviteCode: 'DIVY24',
  },
  {
    id: 'user_rahul',
    name: 'Rahul Sharma',
    initials: 'RA',
    avatarColor: 'bg-amber-600 text-white',
    isCurrentUser: false,
    phone: '+91 98111 22334',
    inviteCode: 'RAHUL9',
  },
  {
    id: 'user_aman',
    name: 'Aman Verma',
    initials: 'AM',
    avatarColor: 'bg-sky-600 text-white',
    isCurrentUser: false,
    phone: '+91 98222 33445',
    inviteCode: 'AMAN72',
  },
];

export const INITIAL_BLEND_MEMBERS: BlendMember[] = [
  {
    id: 'bm_you',
    blendId: 'blend_college_crew',
    userId: 'user_you',
    role: 'admin',
    joinedAt: '2026-10-20T08:00:00.000Z',
    profile: INITIAL_USERS[0],
  },
  {
    id: 'bm_rahul',
    blendId: 'blend_college_crew',
    userId: 'user_rahul',
    role: 'member',
    joinedAt: '2026-10-20T08:05:00.000Z',
    profile: INITIAL_USERS[1],
  },
  {
    id: 'bm_aman',
    blendId: 'blend_college_crew',
    userId: 'user_aman',
    role: 'member',
    joinedAt: '2026-10-20T08:10:00.000Z',
    profile: INITIAL_USERS[2],
  },
];

export const INITIAL_GROUP: Group = {
  id: 'group_college_crew',
  name: 'College Crew',
  members: INITIAL_MEMBERS,
  createdAt: '2026-10-20T08:00:00.000Z',
  updatedAt: '2026-10-28T09:00:00.000Z',
};

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_SETTLEMENTS: Settlement[] = [];
