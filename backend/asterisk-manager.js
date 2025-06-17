const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class FreePBXManager {
  constructor(db) {
    this.db = db;
    this.asteriskProcess = null;
    this.asteriskConfigDir = '/etc/asterisk';
    this.asteriskRunning = false;
    this.extensions = new Map();
    
    // Initialize database tables
    this.initializeTables();
  }

  initializeTables() {
    this.db.serialize(() => {
      // SIP extensions table
      this.db.run(`CREATE TABLE IF NOT EXISTS sip_extensions (
        id INTEGER PRIMARY KEY,
        number TEXT UNIQUE,
        name TEXT,
        secret TEXT,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // SIP configuration table
      this.db.run(`CREATE TABLE IF NOT EXISTS sip_config (
        id INTEGER PRIMARY KEY,
        server_ip TEXT,
        sip_port INTEGER DEFAULT 5060,
        rtp_start INTEGER DEFAULT 10000,
        rtp_end INTEGER DEFAULT 20000,
        codec TEXT DEFAULT 'gsm',
        realm TEXT DEFAULT 'jericho.local',
        enabled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Call logs table
      this.db.run(`CREATE TABLE IF NOT EXISTS call_logs (
        id INTEGER PRIMARY KEY,
        from_extension TEXT,
        to_number TEXT,
        start_time DATETIME,
        end_time DATETIME,
        duration INTEGER,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Insert default configuration if none exists
      this.db.get('SELECT COUNT(*) as count FROM sip_config', (err, row) => {
        if (!err && row.count === 0) {
          this.db.run(`INSERT INTO sip_config (server_ip, sip_port, rtp_start, rtp_end, codec, realm, enabled) 
                       VALUES ('192.168.1.100', 5060, 10000, 20000, 'gsm', 'jericho.local', 0)`);
        }
      });
    });
  }

  async getSipConfig() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM sip_config ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  async updateSipConfig(config) {
    return new Promise((resolve, reject) => {
      const { serverIp, sipPort, rtpPortStart, rtpPortEnd, codec, realm, enabled } = config;
      
      this.db.run(`UPDATE sip_config SET 
                   server_ip = ?, sip_port = ?, rtp_start = ?, rtp_end = ?, 
                   codec = ?, realm = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = (SELECT id FROM sip_config ORDER BY id DESC LIMIT 1)`,
        [serverIp, sipPort, rtpPortStart, rtpPortEnd, codec, realm, enabled ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...config });
        }
      );
    });
  }

  async getExtensions() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM sip_extensions ORDER BY number', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async createExtension(extension) {
    return new Promise((resolve, reject) => {
      const { number, name, secret, enabled } = extension;
      
      this.db.run('INSERT INTO sip_extensions (number, name, secret, enabled) VALUES (?, ?, ?, ?)',
        [number, name, secret, enabled ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...extension });
        }
      );
    });
  }

  async updateExtension(id, extension) {
    return new Promise((resolve, reject) => {
      const { number, name, secret, enabled } = extension;
      
      this.db.run(`UPDATE sip_extensions SET 
                   number = ?, name = ?, secret = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?`,
        [number, name, secret, enabled ? 1 : 0, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...extension });
        }
      );
    });
  }

  async deleteExtension(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sip_extensions WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes > 0 });
      });
    });
  }

  async getCallLogs(limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM call_logs ORDER BY start_time DESC LIMIT ?', [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async logCall(fromExtension, toNumber, startTime, endTime, status) {
    return new Promise((resolve, reject) => {
      const duration = endTime ? Math.floor((new Date(endTime) - new Date(startTime)) / 1000) : 0;
      
      this.db.run(`INSERT INTO call_logs (from_extension, to_number, start_time, end_time, duration, status) 
                   VALUES (?, ?, ?, ?, ?, ?)`,
        [fromExtension, toNumber, startTime, endTime, duration, status],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, fromExtension, toNumber, startTime, endTime, duration, status });
        }
      );
    });
  }

  async makeEmergencyCall(extension, emergencyNumber, message = 'Security Alert') {
    return new Promise((resolve, reject) => {
      if (!this.asteriskRunning) {
        reject(new Error('Asterisk is not running'));
        return;
      }

      // Originate call through Asterisk
      const command = `channel originate SIP/${extension} extension ${emergencyNumber}@emergencies`;
      
      exec(`sudo asterisk -rx "${command}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('Error making emergency call:', error);
          reject(error);
          return;
        }

        // Log the emergency call
        this.logCall(extension, emergencyNumber, new Date().toISOString(), null, 'emergency');
        
        console.log('Emergency call initiated:', stdout);
        resolve({ 
          status: 'initiated', 
          from: extension, 
          to: emergencyNumber,
          message: message,
          output: stdout 
        });
      });
    });
  }

  async generateFreePBXConfig() {
    const config = await this.getSipConfig();
    const extensions = await this.getExtensions();

    // Generate sip.conf for FreePBX compatibility
    const sipConf = `[general]
context=default
allowoverlap=no
bindport=${config.sip_port || 5060}
bindaddr=${config.server_ip || '0.0.0.0'}
srvlookup=yes
disallow=all
allow=${config.codec || 'gsm'}
allow=g711u
allow=g711a
dtmfmode=rfc2833
rtpstart=${config.rtp_start || 10000}
rtpend=${config.rtp_end || 20000}
rtcpinterval=5000
rtptimeout=60
rtpholdtimeout=300
defaultexpirey=120
registertimeout=20
registerattempts=0
realm=${config.realm || 'jericho.local'}
pedantic=yes
tos_sip=cs3
tos_audio=ef
tos_video=af41
maxexpiry=3600
minexpiry=60
defaultexpiry=120

; FreePBX Integration Settings
videosupport=yes
maxcallbitrate=384
callevents=no
alwaysauthreject=yes
g726nonstandard=yes
useragent=JERICHO-FreePBX
allowguest=no
allowsubscribe=no
subscribecontext=default

${extensions.filter(ext => ext.enabled).map(ext => `
[${ext.number}]
type=friend
secret=${ext.secret}
host=dynamic
context=from-internal
canreinvite=no
disallow=all
allow=${config.codec || 'gsm'}
allow=g711u
allow=g711a
dtmfmode=rfc2833
callerid=${ext.name} <${ext.number}>
mailbox=${ext.number}@device
permit=0.0.0.0/0.0.0.0
deny=0.0.0.0/0.0.0.0
qualify=yes
qualifyfreq=60
transport=udp
avpf=no
icesupport=no
directmedia=no
directmediaglare=no
directmediapermit=0.0.0.0/0.0.0.0
directmediadeny=0.0.0.0/0.0.0.0
encryption=no
`).join('\n')}
`;

    // Generate extensions.conf for FreePBX compatibility
    const extensionsConf = `[general]
static=yes
writeprotect=no
clearglobalvars=no

[globals]
CONSOLE=Console/dsp
IAXINFO=guest
TRUNK=DAHDI/g0
TRUNKMSD=1

[from-internal]
include => app-directory
include => app-disa
include => app-echo-test
include => app-speakextennum
include => app-speakingclock
include => parkedcalls
include => from-internal-custom
include => bad-number

; Internal extensions
${extensions.filter(ext => ext.enabled).map(ext => `
exten => ${ext.number},1,Macro(exten-vm,novm,${ext.number})
exten => ${ext.number},n,Hangup()
`).join('\n')}

; Voicemail access
exten => *97,1,Macro(vm,${CALLERID(num)})
exten => *97,n,Hangup()

; Emergency numbers
[app-emergency]
exten => 10111,1,Set(CALLERID(name)=JERICHO EMERGENCY)
exten => 10111,2,Dial(SIP/emergency_line,30)
exten => 10111,3,Hangup()

exten => 112,1,Set(CALLERID(name)=JERICHO EMERGENCY)
exten => 112,2,Dial(SIP/emergency_line,30)
exten => 112,3,Hangup()

exten => 10177,1,Set(CALLERID(name)=JERICHO EMERGENCY)
exten => 10177,2,Dial(SIP/emergency_line,30)
exten => 10177,3,Hangup()

; Security alert extension
exten => 911,1,Set(CALLERID(name)=JERICHO SECURITY ALERT)
exten => 911,2,Dial(SIP/1001&SIP/1002,30)
exten => 911,3,Voicemail(security@default,b)
exten => 911,4,Hangup()

[macro-exten-vm]
exten => s,1,Set(RingGroupMethod=${RRGROUPMETHOD})
exten => s,n,Set(__EXTTOCALL=${ARG2})
exten => s,n,Set(__PICKUPMARK=${EXTTOCALL})
exten => s,n,Set(__NODEST=${CALLERID(name)})
exten => s,n,Dial(SIP/${EXTTOCALL},20,tr)
exten => s,n,Goto(s-${DIALSTATUS},1)

exten => s-NOANSWER,1,Voicemail(${EXTTOCALL},u)
exten => s-NOANSWER,n,Hangup()

exten => s-BUSY,1,Voicemail(${EXTTOCALL},b)
exten => s-BUSY,n,Hangup()

exten => _s-.,1,Goto(s-NOANSWER,1)

[macro-vm]
exten => s,1,VoicemailMain(${ARG1})
exten => s,n,Hangup()

[bad-number]
exten => _X.,1,Playback(ss-noservice)
exten => _X.,n,SayAlpha(${EXTEN})
exten => _X.,n,Hangup()

[from-internal-custom]
; Custom dialplan entries

[app-directory]
exten => 411,1,Directory(default)
exten => 411,n,Hangup()

[app-disa]
exten => *62,1,DISA(no-password,from-internal)
exten => *62,n,Hangup()

[app-echo-test]
exten => *43,1,Answer()
exten => *43,n,Wait(1)
exten => *43,n,Playback(demo-echotest)
exten => *43,n,Echo()
exten => *43,n,Playback(demo-echodone)
exten => *43,n,Hangup()

[app-speakextennum]
exten => *60,1,SayDigits(${CALLERID(num)})
exten => *60,n,Hangup()

[app-speakingclock]
exten => *61,1,Answer()
exten => *61,n,Wait(1)
exten => *61,n,SayUnixTime()
exten => *61,n,Hangup()

[parkedcalls]
exten => 700,1,ParkedCall(701)
exten => 701,1,ParkedCall(701)
exten => 702,1,ParkedCall(702)
`;

    return { sipConf, extensionsConf };
  }

  async writeFreePBXConfigs() {
    try {
      const { sipConf, extensionsConf } = await this.generateFreePBXConfig();
      
      // Write configuration files
      await fs.writeFile(path.join(this.asteriskConfigDir, 'sip.conf'), sipConf);
      await fs.writeFile(path.join(this.asteriskConfigDir, 'extensions.conf'), extensionsConf);
      
      console.log('FreePBX configuration files written successfully');
      return true;
    } catch (error) {
      console.error('Error writing FreePBX configs:', error);
      throw error;
    }
  }

  async startAsterisk() {
    return new Promise((resolve, reject) => {
      if (this.asteriskRunning) {
        resolve({ status: 'already_running' });
        return;
      }

      // First, generate and write configs
      this.writeFreePBXConfigs().then(() => {
        // Start Asterisk daemon
        exec('sudo systemctl start asterisk', (error, stdout, stderr) => {
          if (error) {
            console.error('Error starting FreePBX:', error);
            reject(error);
            return;
          }
          
          this.asteriskRunning = true;
          console.log('FreePBX started successfully');
          resolve({ status: 'started', output: stdout });
        });
      }).catch(reject);
    });
  }

  async stopAsterisk() {
    return new Promise((resolve, reject) => {
      exec('sudo systemctl stop asterisk', (error, stdout, stderr) => {
        if (error) {
          console.error('Error stopping Asterisk:', error);
          reject(error);
          return;
        }
        
        this.asteriskRunning = false;
        console.log('Asterisk stopped successfully');
        resolve({ status: 'stopped', output: stdout });
      });
    });
  }

  async getAsteriskStatus() {
    return new Promise((resolve) => {
      exec('sudo systemctl is-active asterisk', (error, stdout, stderr) => {
        const isActive = stdout.trim() === 'active';
        this.asteriskRunning = isActive;
        
        resolve({
          running: isActive,
          status: stdout.trim(),
          uptime: isActive ? 'Unknown' : 'Stopped'
        });
      });
    });
  }

  async reloadAsterisk() {
    return new Promise((resolve, reject) => {
      if (!this.asteriskRunning) {
        reject(new Error('Asterisk is not running'));
        return;
      }

      this.writeFreePBXConfigs().then(() => {
        exec('sudo asterisk -rx "core reload"', (error, stdout, stderr) => {
          if (error) {
            console.error('Error reloading Asterisk:', error);
            reject(error);
            return;
          }
          
          console.log('Asterisk reloaded successfully');
          resolve({ status: 'reloaded', output: stdout });
        });
      }).catch(reject);
    });
  }

  async getSipPeers() {
    return new Promise((resolve) => {
      if (!this.asteriskRunning) {
        resolve([]);
        return;
      }

      exec('sudo asterisk -rx "sip show peers"', (error, stdout, stderr) => {
        if (error) {
          console.error('Error getting SIP peers:', error);
          resolve([]);
          return;
        }

        // Parse the output to extract peer information
        const lines = stdout.split('\n').slice(1, -2); // Remove header and footer
        const peers = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            return {
              name: parts[0],
              host: parts[1],
              dyn: parts[2] === 'D',
              forcerport: parts[3] === 'Y',
              acl: parts[4] === 'Y',
              port: parts[5] || '',
              status: parts[6] || 'Unknown'
            };
          }
          return null;
        }).filter(Boolean);

        resolve(peers);
      });
    });
  }
}

module.exports = FreePBXManager;
