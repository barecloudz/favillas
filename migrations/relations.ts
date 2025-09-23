import { relations } from "drizzle-orm/relations";
import { menuItems, orderItems, orders, users, rewards, userRewards, choiceGroups, menuItemChoiceGroups, choiceItems, tipDistributions, categoryChoiceGroups, userPoints, pointsTransactions, userPointsRedemptions, employeeSchedules, timeClockEntries, scheduleAlerts, userVouchers, halfHalfSettings } from "./schema";

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	menuItem: one(menuItems, {
		fields: [orderItems.menuItemId],
		references: [menuItems.id]
	}),
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
}));

export const menuItemsRelations = relations(menuItems, ({many}) => ({
	orderItems: many(orderItems),
	menuItemChoiceGroups: many(menuItemChoiceGroups),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	user_refundedBy: one(users, {
		fields: [orders.refundedBy],
		references: [users.id],
		relationName: "orders_refundedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [orders.userId],
		references: [users.id],
		relationName: "orders_userId_users_id"
	}),
	tipDistributions: many(tipDistributions),
	pointsTransactions: many(pointsTransactions),
	userPointsRedemptions: many(userPointsRedemptions),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	orders_refundedBy: many(orders, {
		relationName: "orders_refundedBy_users_id"
	}),
	orders_userId: many(orders, {
		relationName: "orders_userId_users_id"
	}),
	userRewards: many(userRewards),
	user: one(users, {
		fields: [users.createdBy],
		references: [users.id],
		relationName: "users_createdBy_users_id"
	}),
	users: many(users, {
		relationName: "users_createdBy_users_id"
	}),
	tipDistributions: many(tipDistributions),
	userPoints_userId: many(userPoints, {
		relationName: "userPoints_userId_users_id"
	}),
	userPoints_userId: many(userPoints, {
		relationName: "userPoints_userId_users_id"
	}),
	pointsTransactions_userId: many(pointsTransactions, {
		relationName: "pointsTransactions_userId_users_id"
	}),
	pointsTransactions_userId: many(pointsTransactions, {
		relationName: "pointsTransactions_userId_users_id"
	}),
	userPointsRedemptions_userId: many(userPointsRedemptions, {
		relationName: "userPointsRedemptions_userId_users_id"
	}),
	userPointsRedemptions_userId: many(userPointsRedemptions, {
		relationName: "userPointsRedemptions_userId_users_id"
	}),
	employeeSchedules_createdBy: many(employeeSchedules, {
		relationName: "employeeSchedules_createdBy_users_id"
	}),
	employeeSchedules_employeeId: many(employeeSchedules, {
		relationName: "employeeSchedules_employeeId_users_id"
	}),
	timeClockEntries: many(timeClockEntries),
	scheduleAlerts: many(scheduleAlerts),
	userVouchers: many(userVouchers),
}));

export const userRewardsRelations = relations(userRewards, ({one}) => ({
	reward: one(rewards, {
		fields: [userRewards.rewardId],
		references: [rewards.id]
	}),
	user: one(users, {
		fields: [userRewards.userId],
		references: [users.id]
	}),
}));

export const rewardsRelations = relations(rewards, ({many}) => ({
	userRewards: many(userRewards),
	userPointsRedemptions: many(userPointsRedemptions),
}));

export const menuItemChoiceGroupsRelations = relations(menuItemChoiceGroups, ({one}) => ({
	choiceGroup: one(choiceGroups, {
		fields: [menuItemChoiceGroups.choiceGroupId],
		references: [choiceGroups.id]
	}),
	menuItem: one(menuItems, {
		fields: [menuItemChoiceGroups.menuItemId],
		references: [menuItems.id]
	}),
}));

export const choiceGroupsRelations = relations(choiceGroups, ({many}) => ({
	menuItemChoiceGroups: many(menuItemChoiceGroups),
	choiceItems: many(choiceItems),
	categoryChoiceGroups: many(categoryChoiceGroups),
	halfHalfSettings: many(halfHalfSettings),
}));

export const choiceItemsRelations = relations(choiceItems, ({one}) => ({
	choiceGroup: one(choiceGroups, {
		fields: [choiceItems.choiceGroupId],
		references: [choiceGroups.id]
	}),
}));

export const tipDistributionsRelations = relations(tipDistributions, ({one}) => ({
	user: one(users, {
		fields: [tipDistributions.employeeId],
		references: [users.id]
	}),
	order: one(orders, {
		fields: [tipDistributions.orderId],
		references: [orders.id]
	}),
}));

export const categoryChoiceGroupsRelations = relations(categoryChoiceGroups, ({one}) => ({
	choiceGroup: one(choiceGroups, {
		fields: [categoryChoiceGroups.choiceGroupId],
		references: [choiceGroups.id]
	}),
}));

export const userPointsRelations = relations(userPoints, ({one}) => ({
	user_userId: one(users, {
		fields: [userPoints.userId],
		references: [users.id],
		relationName: "userPoints_userId_users_id"
	}),
	user_userId: one(users, {
		fields: [userPoints.userId],
		references: [users.id],
		relationName: "userPoints_userId_users_id"
	}),
}));

export const pointsTransactionsRelations = relations(pointsTransactions, ({one}) => ({
	order: one(orders, {
		fields: [pointsTransactions.orderId],
		references: [orders.id]
	}),
	user_userId: one(users, {
		fields: [pointsTransactions.userId],
		references: [users.id],
		relationName: "pointsTransactions_userId_users_id"
	}),
	user_userId: one(users, {
		fields: [pointsTransactions.userId],
		references: [users.id],
		relationName: "pointsTransactions_userId_users_id"
	}),
}));

export const userPointsRedemptionsRelations = relations(userPointsRedemptions, ({one}) => ({
	order: one(orders, {
		fields: [userPointsRedemptions.orderId],
		references: [orders.id]
	}),
	reward: one(rewards, {
		fields: [userPointsRedemptions.rewardId],
		references: [rewards.id]
	}),
	user_userId: one(users, {
		fields: [userPointsRedemptions.userId],
		references: [users.id],
		relationName: "userPointsRedemptions_userId_users_id"
	}),
	user_userId: one(users, {
		fields: [userPointsRedemptions.userId],
		references: [users.id],
		relationName: "userPointsRedemptions_userId_users_id"
	}),
}));

export const employeeSchedulesRelations = relations(employeeSchedules, ({one}) => ({
	user_createdBy: one(users, {
		fields: [employeeSchedules.createdBy],
		references: [users.id],
		relationName: "employeeSchedules_createdBy_users_id"
	}),
	user_employeeId: one(users, {
		fields: [employeeSchedules.employeeId],
		references: [users.id],
		relationName: "employeeSchedules_employeeId_users_id"
	}),
}));

export const timeClockEntriesRelations = relations(timeClockEntries, ({one}) => ({
	user: one(users, {
		fields: [timeClockEntries.employeeId],
		references: [users.id]
	}),
}));

export const scheduleAlertsRelations = relations(scheduleAlerts, ({one}) => ({
	user: one(users, {
		fields: [scheduleAlerts.employeeId],
		references: [users.id]
	}),
}));

export const userVouchersRelations = relations(userVouchers, ({one}) => ({
	user: one(users, {
		fields: [userVouchers.userId],
		references: [users.id]
	}),
}));

export const halfHalfSettingsRelations = relations(halfHalfSettings, ({one}) => ({
	choiceGroup: one(choiceGroups, {
		fields: [halfHalfSettings.choiceGroupId],
		references: [choiceGroups.id]
	}),
}));