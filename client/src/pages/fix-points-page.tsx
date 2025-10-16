import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-supabase-auth';

const FixPointsPage: React.FC = () => {
  const { user, getAccessToken } = useAuth();
  const [logs, setLogs] = useState<Array<{ message: string; type: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [...prev, { message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runFix = async () => {
    clearLogs();
    setIsRunning(true);
    addLog('🔧 Starting Points System Fix...', 'info');
    addLog('', 'info');

    try {
      // Get auth token
      const token = await getAccessToken();
      if (!token) {
        addLog('❌ ERROR: Could not get auth token', 'error');
        addLog('Please make sure you are logged in', 'warning');
        setIsRunning(false);
        return;
      }

      addLog('✅ Authentication successful', 'success');

      const baseUrl = '/.netlify/functions';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Step 1: Run migration
      addLog('', 'info');
      addLog('📦 Step 1: Running database migration...', 'info');

      const migrationResponse = await fetch(`${baseUrl}/run-migration-0011`, {
        method: 'POST',
        headers
      });

      if (!migrationResponse.ok) {
        const error = await migrationResponse.text();
        addLog(`❌ Migration failed: ${error}`, 'error');
        setIsRunning(false);
        return;
      }

      const migrationResult = await migrationResponse.json();
      addLog('✅ Migration completed!', 'success');
      addLog(`   Remaining duplicates: ${migrationResult.remainingDuplicates}`, 'info');

      // Step 2: Fix admin account
      addLog('', 'info');
      addLog('🔧 Step 2: Fixing your admin account...', 'info');

      const fixResponse = await fetch(`${baseUrl}/fix-duplicate-points-records`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          supabaseUserId: 'ba1a4039-521c-4634-9393-5333edbec807',
          dryRun: false
        })
      });

      if (!fixResponse.ok) {
        const error = await fixResponse.text();
        addLog(`❌ Fix failed: ${error}`, 'error');
        setIsRunning(false);
        return;
      }

      const fixResult = await fixResponse.json();
      addLog('✅ Admin account fixed!', 'success');
      addLog('', 'info');
      addLog('📊 Results:', 'info');
      addLog(`   Duplicates removed: ${fixResult.summary.duplicateRecords.recordsToDelete}`, 'success');
      addLog(`   Total orders: ${fixResult.summary.orders.total}`, 'info');
      addLog(`   Orders needing points: ${fixResult.summary.orders.withoutTransactions}`, 'warning');
      addLog(`   Missing points awarded: ${fixResult.summary.calculations.missingPoints}`, 'success');
      addLog(`   New points total: ${fixResult.summary.calculations.correctPoints}`, 'success');

      // Step 3: Verify
      addLog('', 'info');
      addLog('✅ Step 3: Verifying the fix...', 'info');

      const verifyResponse = await fetch(`${baseUrl}/diagnose-points-5999`);
      const verifyResult = await verifyResponse.json();

      const adminDiagnosis = verifyResult.diagnostics?.find((d: any) =>
        d.user.email === 'admin@favillasnypizza.com'
      );

      if (adminDiagnosis) {
        addLog('', 'info');
        addLog('📊 VERIFICATION RESULTS:', 'info');
        addLog(`   Current Points: ${adminDiagnosis.pointsRecord.currentPoints}`, 'success');
        addLog(`   Total Earned: ${adminDiagnosis.pointsRecord.totalEarned}`, 'info');
        addLog(`   Total Redeemed: ${adminDiagnosis.pointsRecord.totalRedeemed}`, 'info');
        addLog(`   Status: ${adminDiagnosis.diagnosis.issue}`, 'warning');

        if (adminDiagnosis.diagnosis.issue === 'NO_OBVIOUS_ISSUE') {
          addLog('', 'info');
          addLog('🎉 SUCCESS! Your points system is now working correctly!', 'success');
          addLog('', 'info');
          addLog('✅ What was fixed:', 'success');
          addLog('   • Removed all duplicate database records', 'success');
          addLog('   • Awarded points for all past orders', 'success');
          addLog('   • Added unique constraints to prevent future duplicates', 'success');
          addLog('   • Fixed all INSERT statements to use ON CONFLICT', 'success');
          addLog('', 'info');
          addLog('💡 Your customers will never experience this issue!', 'success');
        } else {
          addLog('', 'info');
          addLog('⚠️ There may still be an issue. Check the diagnosis above.', 'warning');
        }
      }

      addLog('', 'info');
      addLog('✨ Script completed!', 'info');

    } catch (error: any) {
      addLog('', 'info');
      addLog(`❌ ERROR: ${error.message}`, 'error');
      addLog('', 'info');
      addLog('If you see a 403 error, you may not have admin permissions.', 'warning');
      addLog('If you see a 401 error, your session expired. Please log in again.', 'warning');
    }

    setIsRunning(false);
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🔒 Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            You must be logged in as an admin to use this tool.
          </p>
          <Button
            onClick={() => window.location.href = '/auth'}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Points System Fix Tool</h1>
          <p className="text-gray-600 mb-6">
            This tool will fix the duplicate points records issue and restore your correct points balance.
          </p>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={runFix}
              disabled={isRunning}
              className="bg-[#d73a31] hover:bg-[#c02a21]"
            >
              {isRunning ? '⏳ Running...' : '🚀 Fix My Points System'}
            </Button>
            <Button
              onClick={clearLogs}
              disabled={isRunning}
              variant="outline"
            >
              Clear Log
            </Button>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 font-mono text-sm overflow-y-auto max-h-[600px]">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Fix My Points System" to start...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={getLogColor(log.type)}>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixPointsPage;
