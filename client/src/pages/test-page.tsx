import React from 'react';

const TestPage = () => {
  console.log("TestPage rendering...");
  
  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Test Page</h1>
        <p className="text-gray-600 mb-4">If you can see this, the React app is working!</p>
        <div className="space-y-2">
          <p><strong>Current Time:</strong> {new Date().toLocaleString()}</p>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>Window Size:</strong> {window.innerWidth} x {window.innerHeight}</p>
        </div>
        <button 
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => alert('Button clicked!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestPage;

