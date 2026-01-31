import { supabase } from '../lib/supabase';

export const checkReminderMigration = async (userId: string): Promise<boolean> => {
  try {
    console.log('Checking if reminder columns exist...');

    // Try to select the reminder columns from a user's website (if any exist)
    const { error } = await supabase
      .from('websites')
      .select('id, last_reminded_at, reminder_dismissed')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Migration check failed:', error);

      // Check if the specific error is about missing columns
      if (error.message.includes('column "reminder_dismissed" of relation "websites" does not exist') ||
        error.message.includes('column "last_reminded_at" of relation "websites" does not exist')) {
        console.warn('Reminder columns not found - migration not applied');
        return false;
      }

      // Other errors might not be related to missing columns
      console.warn('Other database error, assuming migration exists:', error.message);
      return true;
    }

    console.log('Reminder columns exist and accessible');
    return true;
  } catch (error) {
    console.error('Migration check exception:', error);
    return false;
  }
};

export const showMigrationWarning = () => {
  const message = `
Reminder Feature Setup Required:

The reminder notification feature requires database migration. 

To enable reminders:
1. Apply the database migration in Supabase
2. Or contact your administrator

Migration file: supabase/migrations/20250907000000_add_reminder_fields.sql
  `.trim();

  console.warn(message);
  return message;
};