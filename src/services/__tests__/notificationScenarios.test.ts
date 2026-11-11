import { describe, it, expect, beforeEach } from 'vitest';
import { sandboxBackend } from '../sandboxBackend';
import { deviceNotificationService } from '../deviceNotificationService';

describe('Notification Scenarios (User Requirements)', () => {
  beforeEach(() => {
    sandboxBackend.resetDemoData();
  });

  it('Scenario 1: User X adds expense with Y and Z -> Y and Z receive notification, X does not', () => {
    // 1. Setup 3 users: X (Divyansh), Y (Rahul), Z (Aman)
    const allUsers = sandboxBackend.getAllDemoUsers();
    const userX = allUsers.find(u => u.id === 'user_you')!; // Divyansh
    const userY = allUsers.find(u => u.id === 'user_rahul')!; // Rahul
    const userZ = allUsers.find(u => u.id === 'user_aman')!; // Aman

    expect(userX).toBeDefined();
    expect(userY).toBeDefined();
    expect(userZ).toBeDefined();

    // Ensure User X is authenticated
    sandboxBackend.switchActiveUser(userX.id);

    // Create a shared blend for X, Y, Z
    const blend = sandboxBackend.createBlend('Campus Commute Blend');
    sandboxBackend.addMemberToBlend(blend.id, userY.inviteCode);
    sandboxBackend.addMemberToBlend(blend.id, userZ.inviteCode);

    // Record initial notification count for Y and Z
    const initialYCount = sandboxBackend.getNotifications(userY.id).length;
    const initialZCount = sandboxBackend.getNotifications(userZ.id).length;
    const initialXCount = sandboxBackend.getNotifications(userX.id).length;

    // User X adds an expense split among X, Y, and Z (₹90 total, ₹30 each)
    const expense = sandboxBackend.createExpense(blend.id, {
      amountPaise: 9000,
      category: 'auto',
      description: 'Morning Auto to Metro',
      participantIds: [userX.id, userY.id, userZ.id],
      date: new Date().toISOString(),
    });

    expect(expense).toBeDefined();

    // Verification for User Y: Received real-time in-app notification with split share
    const notifsY = sandboxBackend.getNotifications(userY.id);
    expect(notifsY.length).toBe(initialYCount + 1);
    const notifY = notifsY[0];
    expect(notifY.type).toBe('expense_added');
    expect(notifY.title).toContain(userX.fullName);
    expect(notifY.message).toContain('Morning Auto to Metro');
    expect(notifY.message).toContain('₹30');
    expect(notifY.amountPaise).toBe(3000);

    // Verification for User Z: Received real-time in-app notification with split share
    const notifsZ = sandboxBackend.getNotifications(userZ.id);
    expect(notifsZ.length).toBe(initialZCount + 1);
    const notifZ = notifsZ[0];
    expect(notifZ.type).toBe('expense_added');
    expect(notifZ.title).toContain(userX.fullName);
    expect(notifZ.message).toContain('Morning Auto to Metro');
    expect(notifZ.message).toContain('₹30');
    expect(notifZ.amountPaise).toBe(3000);

    // Verification for User X: Payer does NOT receive self-notification
    const notifsX = sandboxBackend.getNotifications(userX.id);
    expect(notifsX.length).toBe(initialXCount);
  });

  it('Scenario 2: User X adds expense with only User Z -> User Z receives notification, User Y receives NO notification', () => {
    // 1. Setup 3 users: X (Divyansh), Y (Rahul), Z (Aman)
    const allUsers = sandboxBackend.getAllDemoUsers();
    const userX = allUsers.find(u => u.id === 'user_you')!;
    const userY = allUsers.find(u => u.id === 'user_rahul')!;
    const userZ = allUsers.find(u => u.id === 'user_aman')!;

    // Ensure User X is authenticated
    sandboxBackend.switchActiveUser(userX.id);

    // Create a shared blend with X, Y, Z
    const blend = sandboxBackend.createBlend('Late Night Cabs');
    sandboxBackend.addMemberToBlend(blend.id, userY.inviteCode);
    sandboxBackend.addMemberToBlend(blend.id, userZ.inviteCode);

    const initialYCount = sandboxBackend.getNotifications(userY.id).length;
    const initialZCount = sandboxBackend.getNotifications(userZ.id).length;

    // User X adds an expense split with ONLY User Z (₹100 total, ₹50 each)
    sandboxBackend.createExpense(blend.id, {
      amountPaise: 10000,
      category: 'cab',
      description: 'Shared Airport Cab',
      participantIds: [userX.id, userZ.id], // Note: userY is excluded!
      date: new Date().toISOString(),
    });

    // Verification for User Z: Received notification
    const notifsZ = sandboxBackend.getNotifications(userZ.id);
    expect(notifsZ.length).toBe(initialZCount + 1);
    expect(notifsZ[0].type).toBe('expense_added');
    expect(notifsZ[0].message).toContain('Shared Airport Cab');
    expect(notifsZ[0].amountPaise).toBe(5000);

    // Verification for User Y: User Y was NOT included, so User Y receives ZERO new notifications!
    const notifsY = sandboxBackend.getNotifications(userY.id);
    expect(notifsY.length).toBe(initialYCount);
  });

  it('Device notification service tracks permission state', () => {
    expect(deviceNotificationService).toBeDefined();

    deviceNotificationService.setPrompted();
    expect(deviceNotificationService.hasPrompted()).toBe(true);
  });
});
