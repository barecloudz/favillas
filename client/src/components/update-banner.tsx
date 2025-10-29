import { useUpdateCheck } from '@/hooks/use-update-check';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Update notification banner
 * Shows when a new deployment is detected
 * Allows user to reload and get the latest version
 */
export function UpdateBanner() {
  const { updateAvailable, dismissUpdate, applyUpdate } = useUpdateCheck();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 md:w-full md:max-w-md"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl border border-blue-500 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <RefreshCw className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Update Available</p>
                  <p className="text-xs text-blue-100">
                    A new version is ready. Reload to get the latest features and fixes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyUpdate}
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm flex-1 md:flex-none"
                >
                  Update Now
                </Button>

                <button
                  onClick={dismissUpdate}
                  className="p-1 hover:bg-blue-800 rounded transition-colors flex-shrink-0"
                  aria-label="Dismiss update notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
