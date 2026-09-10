import { useState, useEffect } from 'react';
import { Upload, Download, Database, RefreshCw, MessageSquare } from 'lucide-react';
import { isServerConnected, syncFromServer } from '../lib/memberStore';
import { getSmsGatewaySettings, saveSmsGatewaySettings, topUpSmsCredits } from '../lib/announcements';

const BACKUP_KEYS = [
  'appMembers', 'memberOverrides', 'receipts',
  'departureRegister', 'printHistory', 'secretarySignature',
];

export default function AdminSettings() {
  const [secretarySignature, setSecretarySignature] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [serverOk, setServerOk] = useState(isServerConnected());
  const [syncing, setSyncing] = useState(false);

  const [smsGateway, setSmsGateway] = useState(null);
  const [smsForm, setSmsForm] = useState({
    label: '', url_template: '', method: 'GET', body_format: 'form', body_template: '', api_key: '', sender_id: '',
  });
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    loadSignature();
    loadSmsGateway();
  }, []);

  const loadSmsGateway = async () => {
    try {
      const cfg = await getSmsGatewaySettings();
      setSmsGateway(cfg);
      if (cfg) {
        setSmsForm({
          label: cfg.label || '',
          url_template: cfg.url_template || '',
          method: cfg.method || 'GET',
          body_format: cfg.body_format || 'form',
          body_template: cfg.body_template || '',
          api_key: '',
          sender_id: cfg.sender_id || '',
        });
      }
    } catch {
      // Server not reachable — SMS gateway config isn't available in offline/demo mode
    }
  };

  const handleSmsFormChange = (e) => {
    const { name, value } = e.target;
    setSmsForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSmsGateway = async (e) => {
    e.preventDefault();
    setSmsSaving(true);
    setSmsMessage('');
    try {
      await saveSmsGatewaySettings(smsForm);
      setSmsMessage('✓ SMS gateway settings saved');
      await loadSmsGateway();
    } catch (err) {
      setSmsMessage('⚠️ Failed to save: ' + err.message);
    } finally {
      setSmsSaving(false);
      setTimeout(() => setSmsMessage(''), 4000);
    }
  };

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount <= 0) return;
    try {
      await topUpSmsCredits(amount);
      setTopUpAmount('');
      setSmsMessage(`✓ Added ${amount} SMS credits`);
      await loadSmsGateway();
    } catch (err) {
      setSmsMessage('⚠️ Failed to add credits: ' + err.message);
    } finally {
      setTimeout(() => setSmsMessage(''), 4000);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const ok = await syncFromServer();
    setServerOk(ok);
    setSyncing(false);
    setMessage(ok ? '✓ Synced with server successfully' : '⚠️ Server not reachable — running in offline mode');
    setTimeout(() => setMessage(''), 4000);
  };

  const handleBackup = () => {
    const backup = { exported_at: new Date().toISOString(), version: 1 };
    BACKUP_KEYS.forEach(k => { backup[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MVA_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('✓ Backup file downloaded — keep it safe');
    setTimeout(() => setMessage(''), 4000);
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!backup.exported_at) throw new Error('Not a valid MVA backup file');
      if (!window.confirm(`Restore backup from ${backup.exported_at.slice(0, 10)}? Current local data will be replaced.`)) return;
      BACKUP_KEYS.forEach(k => {
        if (backup[k] != null) localStorage.setItem(k, backup[k]);
      });
      setMessage('✓ Backup restored — reloading...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setMessage('⚠️ Restore failed: ' + err.message);
    }
    e.target.value = '';
  };

  const loadSignature = () => {
    const stored = localStorage.getItem('secretarySignature');
    if (stored) {
      setSecretarySignature(stored);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        localStorage.setItem('secretarySignature', base64);
        setSecretarySignature(base64);
        setMessage('✓ Secretary signature uploaded successfully!');
        setTimeout(() => setMessage(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setMessage('Error uploading signature');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSignature = () => {
    if (secretarySignature) {
      const link = document.createElement('a');
      link.href = secretarySignature;
      link.download = 'secretary-signature.png';
      link.click();
    }
  };

  const handleRemoveSignature = () => {
    localStorage.removeItem('secretarySignature');
    setSecretarySignature(null);
    setMessage('Secretary signature removed');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Admin Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration and assets</p>
      </div>

      {/* Server Connection */}
      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-navy mb-4 flex items-center gap-2">
          <Database size={22} /> Server Connection
        </h2>
        <div className="flex items-center gap-3 mb-4">
          {serverOk ? (
            <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-full">
              ● Live — data saved to server database
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-2 rounded-full">
              ● Offline / demo mode — data stored in this browser only
            </span>
          )}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-deep transition disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          When the Hostinger API is deployed, the app connects automatically at login and every change is saved to the shared database.
        </p>
      </div>

      {/* SMS Gateway (Bulk Announcements) */}
      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-navy mb-4 flex items-center gap-2">
          <MessageSquare size={22} /> SMS Gateway (for Announcements)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect the bulk SMS API you've purchased a subscription/credit pack for. Once configured here,
          the Announcements page will use it automatically — no code changes needed. When credits run out,
          buy another pack from your provider and top up below.
        </p>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full ${
            (smsGateway?.credits || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
          }`}>
            {smsGateway ? `${smsGateway.credits || 0} SMS credits remaining` : 'No gateway configured yet'}
          </span>
          {smsGateway?.api_key_set && (
            <span className="text-xs text-gray-500 font-mono">API key: {smsGateway.api_key_preview}</span>
          )}
        </div>

        {smsGateway && (
          <div className="flex items-center gap-2 mb-6 pb-6 border-b">
            <input
              type="number"
              min="1"
              placeholder="e.g. 10000"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              onClick={handleTopUp}
              className="bg-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium text-sm"
            >
              Add Credits (after purchase)
            </button>
          </div>
        )}

        <form onSubmit={handleSaveSmsGateway} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider Name</label>
              <input
                type="text"
                name="label"
                value={smsForm.label}
                onChange={handleSmsFormChange}
                placeholder="e.g. MSG91, Fast2SMS, TextLocal"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HTTP Method</label>
              <select
                name="method"
                value={smsForm.method}
                onChange={handleSmsFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API URL *</label>
            <input
              type="text"
              name="url_template"
              value={smsForm.url_template}
              onChange={handleSmsFormChange}
              required
              placeholder="https://provider.com/api/send?authkey={api_key}&mobiles={phone}&message={message}&sender={sender_id}"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Copy this from your provider's docs, replacing their phone/message/key params with{' '}
              <code className="bg-gray-100 px-1 rounded">{'{phone}'}</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">{'{message}'}</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">{'{api_key}'}</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">{'{sender_id}'}</code>.
            </p>
          </div>

          {smsForm.method === 'POST' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Body Format</label>
                <select
                  name="body_format"
                  value={smsForm.body_format}
                  onChange={handleSmsFormChange}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="form">Form-encoded</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Body Template (optional)</label>
                <textarea
                  name="body_template"
                  value={smsForm.body_template}
                  onChange={handleSmsFormChange}
                  rows="2"
                  placeholder={smsForm.body_format === 'json'
                    ? '{"mobiles":"{phone}","authkey":"{api_key}","message":"{message}","sender":"{sender_id}"}'
                    : 'mobiles={phone}&authkey={api_key}&message={message}&sender={sender_id}'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank if your provider takes everything as URL query params (GET-style POST).</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key {smsGateway?.api_key_set && <span className="text-xs text-gray-400">(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                name="api_key"
                value={smsForm.api_key}
                onChange={handleSmsFormChange}
                placeholder={smsGateway?.api_key_preview || 'Your provider API key'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sender ID (optional)</label>
              <input
                type="text"
                name="sender_id"
                value={smsForm.sender_id}
                onChange={handleSmsFormChange}
                placeholder="e.g. MVAMSG"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={smsSaving}
            className="bg-navy text-white px-6 py-2.5 rounded-lg hover:bg-navy-deep transition font-medium disabled:opacity-50"
          >
            {smsSaving ? 'Saving...' : 'Save SMS Gateway'}
          </button>
        </form>

        {smsMessage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-sm font-medium">
            {smsMessage}
          </div>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-navy mb-4">Backup & Restore</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 bg-green text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition font-medium"
          >
            <Download size={18} /> Download Full Backup
          </button>
          <label className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition font-medium cursor-pointer">
            <Upload size={18} /> Restore from Backup
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Backup includes all members, receipts, departure register, print history and the secretary signature. Take a backup regularly.
        </p>
      </div>

      {/* Secretary Signature Management */}
      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-navy mb-6">Secretary Signature</h2>

        {/* Current Signature Preview */}
        {secretarySignature && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-4">Current Signature:</p>
            <img
              src={secretarySignature}
              alt="Secretary Signature"
              className="max-h-32 object-contain"
            />
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 mb-3 block">
              Upload New Secretary Signature (PNG, JPG, or transparent PNG)
            </span>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-center gap-2 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6 hover:bg-blue-100 transition cursor-pointer">
                <Upload size={20} className="text-blue-600" />
                <div className="text-center">
                  <p className="font-medium text-blue-900">
                    {uploading ? 'Uploading...' : 'Click to upload signature'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    PNG with transparent background recommended
                  </p>
                </div>
              </div>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        {secretarySignature && (
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              onClick={handleDownloadSignature}
              className="flex items-center gap-2 bg-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              <Download size={18} />
              Download Current
            </button>
            <button
              onClick={handleRemoveSignature}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Remove Signature
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
            {message}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-2">ℹ️ How this works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Upload a signature image (preferably PNG with transparent background)</li>
            <li>The signature will appear on all generated ID cards</li>
            <li>Change the signature anytime to update for new secretary</li>
            <li>Signature is stored locally in your browser</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
