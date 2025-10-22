import { useState, useEffect, useCallback } from 'react';

interface Version {
  hash: string;
  buildTime: string;
  timestamp: number;
}

const STORAGE_KEY = 'app_version_seen';
const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to check for application updates
 * Compares current deployed version with the version user is running
 * Shows update notification when new deployment is detected
 */
export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [newVersion, setNewVersion] = useState<Version | null>(null);

  const checkForUpdates = useCallback(async () => {
    try {
      // Fetch the current deployed version
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-cache',
      });

      if (!response.ok) {
        console.warn('Failed to fetch version info');
        return;
      }

      const deployedVersion: Version = await response.json();

      // Get the version we last saw
      const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

      // First time checking - save current version and don't show update
      if (!lastSeenVersion) {
        localStorage.setItem(STORAGE_KEY, deployedVersion.hash);
        setCurrentVersion(deployedVersion);
        return;
      }

      // If versions differ, update is available
      if (lastSeenVersion !== deployedVersion.hash) {
        setCurrentVersion({ hash: lastSeenVersion, buildTime: '', timestamp: 0 });
        setNewVersion(deployedVersion);
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.warn('Error checking for updates:', error);
    }
  }, []);

  // Check for updates on mount and periodically
  useEffect(() => {
    checkForUpdates();

    // Set up periodic checking
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);

    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  const dismissUpdate = useCallback(() => {
    // Mark new version as seen without reloading
    if (newVersion) {
      localStorage.setItem(STORAGE_KEY, newVersion.hash);
      setUpdateAvailable(false);
    }
  }, [newVersion]);

  const applyUpdate = useCallback(() => {
    // Save new version and reload
    if (newVersion) {
      localStorage.setItem(STORAGE_KEY, newVersion.hash);

      // Clear caches and reload
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      // Hard reload to get fresh resources
      window.location.reload();
    }
  }, [newVersion]);

  return {
    updateAvailable,
    currentVersion,
    newVersion,
    dismissUpdate,
    applyUpdate,
  };
}
