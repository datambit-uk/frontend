// Maintenance mode configuration
// Priority: Local Storage (manual override) > Environment Variable > Default (false)

const getInitialMaintenanceMode = () => {
  const storedValue = localStorage.getItem('MAINTENANCE_DISABLE_UPLOADS');
  if (storedValue !== null) {
    return storedValue === 'true';
  }
  return import.meta.env.VITE_DISABLE_UPLOADS === 'true' || false;
};

export const MAINTENANCE_MODE = {
  get isUploadDisabled() {
    return getInitialMaintenanceMode();
  },
  set isUploadDisabled(value: boolean) {
    localStorage.setItem('MAINTENANCE_DISABLE_UPLOADS', value.toString());
    // Trigger a storage event for other tabs/components
    window.dispatchEvent(new Event('storage'));
  },
  message: "Uploads are temporarily disabled while we perform a system update. Please try again in a few minutes."
};
