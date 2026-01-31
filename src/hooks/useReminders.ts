import { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { checkReminderMigration, showMigrationWarning } from '../lib/reminderMigration';
import toast from 'react-hot-toast';
import type { Website } from '../types';

const REMINDER_INTERVAL_DAYS = 3;
const REMINDER_COOLDOWN_DAYS = 7; // Don't show same reminder for 7 days

interface UseRemindersResult {
  reminderWebsite: Website | null;
  showReminder: boolean;
  handleOpenWebsite: () => void;
  handleCheckLater: () => void;
  handleDismissReminder: () => void;
  getPendingReminders: () => Website[];
  pendingRemindersCount: number;
}

export const useReminders = (websites: Website[], userId: string | undefined, onDataUpdate?: () => void): UseRemindersResult => {
  const [reminderWebsite, setReminderWebsite] = useState<Website | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [migrationExists, setMigrationExists] = useState(false);

  // Get all pending reminders
  const getPendingReminders = (): Website[] => {
    if (!migrationExists) return [];

    const now = new Date();

    return websites.filter(website => {
      // Skip if reminders are dismissed for this website
      if (website.reminder_dismissed) return false;

      const createdAt = new Date(website.created_at);
      const daysSinceCreated = differenceInDays(now, createdAt);

      // Only show reminders for websites older than the interval
      if (daysSinceCreated < REMINDER_INTERVAL_DAYS) return false;

      // Check if we've shown a reminder recently
      if (website.last_reminded_at) {
        const lastReminded = new Date(website.last_reminded_at);
        const daysSinceLastReminder = differenceInDays(now, lastReminded);

        // Don't show again if within cooldown period
        if (daysSinceLastReminder < REMINDER_COOLDOWN_DAYS) return false;
      }

      return true;
    }).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const pendingRemindersCount = getPendingReminders().length;

  useEffect(() => {
    if (!userId || websites.length === 0) return;

    // Check migration first, then check for reminders
    checkMigrationAndReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websites, userId]);

  const checkMigrationAndReminders = async () => {
    if (!userId) return;

    if (!migrationChecked) {
      const migrationOk = await checkReminderMigration(userId);
      setMigrationExists(migrationOk);
      setMigrationChecked(true);

      if (!migrationOk) {
        console.warn(showMigrationWarning());
        return; // Don't check for reminders if migration is missing
      }
    }

    if (migrationExists) {
      checkForReminders();
    }
  };

  const checkForReminders = () => {
    // We'll keep this function for potential future use but won't auto-show reminders
    // Reminders will now be accessed through the sidebar instead
    console.log('Reminder system active - check sidebar for pending reminders');
  };

  const updateReminderTimestamp = async (websiteId: string) => {
    if (!migrationExists) {
      toast.error('Reminder feature requires database migration. Please contact support.');
      throw new Error('Migration not applied');
    }

    try {
      console.log('Updating reminder timestamp for website:', websiteId);

      // Use direct Supabase update since we have the client available
      const { data, error } = await supabase
        .from('websites')
        .update({
          last_reminded_at: new Date().toISOString()
        })
        .eq('id', websiteId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Supabase error updating reminder:', error);

        // Check if the column doesn't exist
        if (error.message.includes('column "last_reminded_at" of relation "websites" does not exist')) {
          console.warn('Reminder columns not found. Migration may not be applied yet.');
          toast.error('Reminder feature not yet available. Please contact support.');
        } else {
          toast.error('Failed to update reminder. Please try again.');
        }
        throw error;
      }

      console.log('Database update result:', data);

      // Refresh the website data
      if (onDataUpdate) {
        onDataUpdate();
      }

      console.log('Reminder timestamp updated successfully');
    } catch (error) {
      console.error('Failed to update reminder timestamp:', error);
      throw error;
    }
  };

  const dismissReminder = async (websiteId: string) => {
    if (!migrationExists) {
      toast.error('Reminder feature requires database migration. Please contact support.');
      throw new Error('Migration not applied');
    }

    try {
      console.log('Dismissing reminder for website:', websiteId);

      // Use direct Supabase update since we have the client available
      const { data, error } = await supabase
        .from('websites')
        .update({
          reminder_dismissed: true,
          last_reminded_at: new Date().toISOString()
        })
        .eq('id', websiteId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Supabase error dismissing reminder:', error);

        // Check if the columns don't exist
        if (error.message.includes('column "reminder_dismissed" of relation "websites" does not exist') ||
          error.message.includes('column "last_reminded_at" of relation "websites" does not exist')) {
          console.warn('Reminder columns not found. Migration may not be applied yet.');
          toast.error('Reminder feature not yet available. Please contact support.');
        } else {
          toast.error('Failed to dismiss reminder. Please try again.');
        }
        throw error;
      }

      console.log('Database update result:', data);

      // Refresh the website data
      if (onDataUpdate) {
        onDataUpdate();
      }

      console.log('Reminder dismissed successfully');
    } catch (error) {
      console.error('Failed to dismiss reminder:', error);
      throw error;
    }
  };

  const handleOpenWebsite = async () => {
    if (reminderWebsite) {
      try {
        // Open website in new tab
        window.open(reminderWebsite.url, '_blank');

        // Update reminder timestamp
        await updateReminderTimestamp(reminderWebsite.id);

        // Small delay to ensure database update completes
        setTimeout(() => {
          setShowReminder(false);
          setReminderWebsite(null);
        }, 100);
      } catch (error) {
        console.error('Error handling open website:', error);
        // Still close the modal even if update fails
        setShowReminder(false);
        setReminderWebsite(null);
      }
    }
  };

  const handleCheckLater = async () => {
    if (reminderWebsite) {
      try {
        // Update reminder timestamp so it won't show again for a while
        await updateReminderTimestamp(reminderWebsite.id);

        // Small delay to ensure database update completes
        setTimeout(() => {
          setShowReminder(false);
          setReminderWebsite(null);
        }, 100);
      } catch (error) {
        console.error('Error handling check later:', error);
        // Still close the modal even if update fails
        setShowReminder(false);
        setReminderWebsite(null);
      }
    }
  };

  const handleDismissReminder = async () => {
    if (reminderWebsite) {
      try {
        // Permanently dismiss reminders for this website
        await dismissReminder(reminderWebsite.id);

        // Small delay to ensure database update completes
        setTimeout(() => {
          setShowReminder(false);
          setReminderWebsite(null);
        }, 100);
      } catch (error) {
        console.error('Error handling dismiss reminder:', error);
        // Still close the modal even if update fails
        setShowReminder(false);
        setReminderWebsite(null);
      }
    }
  };

  return {
    reminderWebsite,
    showReminder,
    handleOpenWebsite,
    handleCheckLater,
    handleDismissReminder,
    getPendingReminders,
    pendingRemindersCount
  };
};