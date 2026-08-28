import { pgTable, text, timestamp, boolean, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  role: text('role').notNull().default('member'),
  isApproved: boolean('isApproved').notNull().default(false),
  status: text('status').notNull().default('offline'),
  customStatus: text('customStatus'),
  jobTitle: text('jobTitle'),
  department: text('department'),
  unit: text('unit'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (t) => [
  index('User_name_idx').on(t.name),
  index('User_email_idx').on(t.email),
]);

export const channels = pgTable('Channel', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  isPrivate: boolean('isPrivate').notNull().default(false),
  isGroup: boolean('isGroup').notNull().default(false),
  createdById: text('createdById').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const channelMembers = pgTable('ChannelMember', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  channelId: text('channelId').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joinedAt').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ChannelMember_channelId_userId_key').on(t.channelId, t.userId),
  index('ChannelMember_userId_idx').on(t.userId),
]);

export const messages = pgTable('Message', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  content: text('content').notNull(),
  fileUrl: text('fileUrl'),
  fileName: text('fileName'),
  fileType: text('fileType'),
  senderId: text('senderId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelId: text('channelId').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  parentId: text('parentId'),
  edited: boolean('edited').notNull().default(false),
  isDeleted: boolean('isDeleted').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (t) => [
  index('Message_channelId_createdAt_idx').on(t.channelId, t.createdAt),
  index('Message_senderId_idx').on(t.senderId),
  index('Message_parentId_idx').on(t.parentId),
]);

export const directMessages = pgTable('DirectMessage', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  content: text('content').notNull(),
  fileUrl: text('fileUrl'),
  fileName: text('fileName'),
  fileType: text('fileType'),
  senderId: text('senderId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiverId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: text('parentId'),
  read: boolean('read').notNull().default(false),
  edited: boolean('edited').notNull().default(false),
  isDeleted: boolean('isDeleted').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (t) => [
  index('DirectMessage_senderId_receiverId_createdAt_idx').on(t.senderId, t.receiverId, t.createdAt),
  index('DirectMessage_parentId_idx').on(t.parentId),
]);

export const reactions = pgTable('Reaction', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  emoji: text('emoji').notNull(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: text('messageId').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('Reaction_userId_messageId_emoji_key').on(t.userId, t.messageId, t.emoji),
  index('Reaction_messageId_idx').on(t.messageId),
]);

export const dmReactions = pgTable('DMReaction', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  emoji: text('emoji').notNull(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  directMessageId: text('directMessageId').notNull().references(() => directMessages.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('DMReaction_userId_directMessageId_emoji_key').on(t.userId, t.directMessageId, t.emoji),
  index('DMReaction_directMessageId_idx').on(t.directMessageId),
]);

export const notifications = pgTable('Notification', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  link: text('link'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const meetings = pgTable('Meeting', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('startTime').notNull(),
  endTime: timestamp('endTime').notNull(),
  meetLink: text('meetLink'),
  createdById: text('createdById').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (t) => [
  index('Meeting_startTime_idx').on(t.startTime),
]);

export const meetingParticipants = pgTable('MeetingParticipant', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  meetingId: text('meetingId').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  joinedAt: timestamp('joinedAt').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('MeetingParticipant_meetingId_userId_key').on(t.meetingId, t.userId),
  index('MeetingParticipant_userId_idx').on(t.userId),
]);

export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages),
  sentDMs: many(directMessages, { relationName: 'DMSender' }),
  receivedDMs: many(directMessages, { relationName: 'DMReceiver' }),
  channelMembers: many(channelMembers),
  createdChannels: many(channels),
  reactions: many(reactions),
  dmReactions: many(dmReactions),
  notifications: many(notifications),
  createdMeetings: many(meetings),
  meetingParticipations: many(meetingParticipants),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [channels.createdById],
    references: [users.id],
  }),
  members: many(channelMembers),
  messages: many(messages),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
  channel: one(channels, {
    fields: [channelMembers.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [channelMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id],
    relationName: 'MessageReplies'
  }),
  replies: many(messages, { relationName: 'MessageReplies' }),
  reactions: many(reactions),
}));

export const directMessagesRelations = relations(directMessages, ({ one, many }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
    relationName: 'DMSender'
  }),
  receiver: one(users, {
    fields: [directMessages.receiverId],
    references: [users.id],
    relationName: 'DMReceiver'
  }),
  parent: one(directMessages, {
    fields: [directMessages.parentId],
    references: [directMessages.id],
    relationName: 'DMReplies'
  }),
  replies: many(directMessages, { relationName: 'DMReplies' }),
  reactions: many(dmReactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
  message: one(messages, {
    fields: [reactions.messageId],
    references: [messages.id],
  }),
}));

export const dmReactionsRelations = relations(dmReactions, ({ one }) => ({
  user: one(users, {
    fields: [dmReactions.userId],
    references: [users.id],
  }),
  directMessage: one(directMessages, {
    fields: [dmReactions.directMessageId],
    references: [directMessages.id],
  }),
}));
