
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class AsteriskManager {
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
        codec TEXT DEFAULT 'g729',
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
                       VALUES ('192.168.1.100', 5060, 10000, 20000, 'g729', 'jericho.local', 0)`);
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

  async generateAsteriskConfig() {
    const config = await this.getSipConfig();
    const extensions = await this.getExtensions();

    // Generate sip.conf
    const sipConf = `[general]
context=default
allowoverlap=no
bindport=${config.sip_port || 5060}
bindaddr=${config.server_ip || '0.0.0.0'}
srvlookup=yes
disallow=all
allow=${config.codec || 'g729'}
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

${extensions.filter(ext => ext.enabled).map(ext => `
[${ext.number}]
type=friend
secret=${ext.secret}
host=dynamic
context=internal
canreinvite=no
disallow=all
allow=${config.codec || 'g729'}
allow=g711u
allow=g711a
dtmfmode=rfc2833
callerid=${ext.name} <${ext.number}>
mailbox=${ext.number}@default
`).join('\n')}
`;

    // Generate extensions.conf
    const extensionsConf = `[general]
static=yes
writeprotect=no
clearglobalvars=no

[globals]
CONSOLE=Console/dsp
IAXINFO=guest
TRUNK=DAHDI/g0
TRUNKMSD=1

[internal]
include => emergencies
include => local_extensions

[local_extensions]
${extensions.filter(ext => ext.enabled).map(ext => `
exten => ${ext.number},1,Dial(SIP/${ext.number},20)
exten => ${ext.number},n,Voicemail(${ext.number}@default,u)
exten => ${ext.number},n,Hangup()
`).join('\n')}

; Voicemail access
exten => *97,1,VoicemailMain(\${CALLERID(num)}@default)
exten => *97,n,Hangup()

[emergencies]
; Emergency numbers (South African)
exten => 10111,1,Dial(SIP/emergency_line,30)
exten => 10111,n,Hangup()

exten => 112,1,Dial(SIP/emergency_line,30)
exten => 112,n,Hangup()

exten => 10177,1,Dial(SIP/emergency_line,30)
exten => 10177,n,Hangup()

; Security alert extension
exten => 911,1,Set(CALLERID(name)=JERICHO SECURITY ALERT)
exten => 911,2,Dial(SIP/1001&SIP/1002,30)
exten => 911,3,Voicemail(security@default,b)
exten => 911,4,Hangup()

[default]
include => internal
`;

    return { sipConf, extensionsConf };
  }

  async writeAsteriskConfigs() {
    try {
      const { sipConf, extensionsConf } = await this.generateAsteriskConfig();
      
      // Write configuration files
      await fs.writeFile(path.join(this.asteriskConfigDir, 'sip.conf'), sipConf);
      await fs.writeFile(path.join(this.asteriskConfigDir, 'extensions.conf'), extensionsConf);
      
      console.log('Asterisk configuration files written successfully');
      return true;
    } catch (error) {
      console.error('Error writing Asterisk configs:', error);
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
      this.writeAsteriskConfigs().then(() => {
        // Start Asterisk daemon
        exec('sudo systemctl start asterisk', (error, stdout, stderr) => {
          if (error) {
            console.error('Error starting Asterisk:', error);
            reject(error);
            return;
          }
          
          this.asteriskRunning = true;
          console.log('Asterisk started successfully');
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

      this.writeAsteriskConfigs().then(() => {
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

module.exports = AsteriskManager;
