import React from 'react';

import { NotificationStyles } from '../../styles/Styles';

interface SettingsNotificationsProps {
  readonly error: string | null;
  readonly success: string | null;
}

export const SettingsNotifications: React.FC<SettingsNotificationsProps> = ({ error, success }) => {
  return (
    <>
      {error && (
        <div className={NotificationStyles.error}>
          {error}
        </div>
      )}
      {success && (
        <div className={NotificationStyles.success}>
          {success}
        </div>
      )}
    </>
  );
};
