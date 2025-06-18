
// Clear browser localStorage and sessionStorage for Jericho Security
// Run this in the browser console to reset all saved camera data

console.log("🧹 Clearing Jericho Security browser data...");

// List of localStorage keys used by Jericho
const jerischoKeys = [
  'jericho-camera-urls',
  'jericho-camera-names', 
  'jericho-stream-urls',
  'jericho-hikconnect-credentials',
  'jericho-sip-extensions',
  'jericho-user-profile',
  'jericho-settings'
];

// Clear specific Jericho localStorage items
let clearedCount = 0;
jerischoKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    clearedCount++;
    console.log(`✅ Cleared: ${key}`);
  }
});

// Clear camera resolution settings (pattern: camera-X-resolution)
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('camera-') && key.endsWith('-resolution')) {
    localStorage.removeItem(key);
    clearedCount++;
    console.log(`✅ Cleared: ${key}`);
  }
});

// Clear sessionStorage as well
sessionStorage.clear();
console.log("✅ Cleared sessionStorage");

console.log(`🎉 Cleared ${clearedCount} localStorage items and all sessionStorage`);
console.log("🔄 Please refresh the page to reset the application");

// Provide instructions
console.log(`
📋 Next steps:
1. Refresh the page (F5 or Ctrl+R)
2. Go to Settings > Stream Management
3. Add your camera RTSP URLs again
4. Test connections

🔧 If WebSocket issues persist, run on the server:
   sudo systemctl restart jericho-backend
   sudo systemctl reload apache2
`);
