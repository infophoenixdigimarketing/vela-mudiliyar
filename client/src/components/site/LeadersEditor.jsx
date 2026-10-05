import { useState, useEffect, useRef } from 'react';
import { Upload, Save, Plus, Trash2, ArrowUp, ArrowDown, ImageOff } from 'lucide-react';
import { getSitePage, saveSitePage, uploadSiteImage, readAsDataUrl, MAX_IMAGE_BYTES } from '../../lib/siteContent';
import { DEFAULT_LEADERS, DEFAULT_LEADERS_HEADING, DEFAULT_LEADERS_SUBTITLE } from '../../lib/siteDefaults';

const MAX_LEADERS = 60;

export default function LeadersEditor() {
  const [heading, setHeading] = useState(DEFAULT_LEADERS_HEADING);
  const [subtitle, setSubtitle] = useState(DEFAULT_LEADERS_SUBTITLE);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const keyCounter = useRef(0);

  const withKeys = (list) => list.map((l) => ({
    key: ++keyCounter.current,
    name: l.name || '',
    designation: l.designation || '',
    photo_url: l.photo_url || '',
    phone: l.phone || '',
    email: l.email || '',
    highlight: !!l.highlight,
    preview: '',
    dataUrl: '',
  }));

  useEffect(() => {
    let cancelled = false;
    getSitePage('leaders')
      .then((saved) => {
        if (cancelled) return;
        if (saved?.leaders?.length) {
          setHeading(saved.heading || '');
          setSubtitle(saved.subtitle || '');
          setLeaders(withKeys(saved.leaders));
        } else {
          setLeaders(withKeys(DEFAULT_LEADERS));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLeaders(withKeys(DEFAULT_LEADERS));
        setMessage({ type: 'error', text: 'Could not load saved content from the server.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateLeader = (key, patch) => {
    setLeaders((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLeader = () => {
    if (leaders.length >= MAX_LEADERS) {
      setMessage({ type: 'error', text: `Up to ${MAX_LEADERS} leaders allowed.` });
      return;
    }
    setLeaders((prev) => [...prev, ...withKeys([{ name: '', designation: '' }])]);
  };

  const removeLeader = (key) => setLeaders((prev) => prev.filter((l) => l.key !== key));

  const moveLeader = (index, direction) => {
    setLeaders((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleFile = async (key, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMessage({ type: 'error', text: 'Image must be 8 MB or smaller.' });
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      updateLeader(key, { preview: dataUrl, dataUrl });
      setMessage({ type: '', text: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const unnamed = leaders.findIndex((l) => !l.name.trim());
    if (unnamed !== -1) {
      setMessage({ type: 'error', text: `Leader ${unnamed + 1} needs a name — or remove them.` });
      return;
    }
    if (leaders.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one leader.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = [];
      for (const l of leaders) {
        let photoUrl = l.photo_url;
        if (l.dataUrl) {
          const uploaded = await uploadSiteImage(l.dataUrl);
          photoUrl = uploaded.url;
        }
        payload.push({
          name: l.name,
          designation: l.designation,
          photo_url: photoUrl,
          phone: l.phone,
          email: l.email,
          highlight: l.highlight,
        });
      }
      const saved = await saveSitePage('leaders', { heading, subtitle, leaders: payload });
      setLeaders(withKeys(saved.leaders));
      setMessage({ type: 'success', text: 'Saved. The Leaders page shows these changes on its next load.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">Loading saved content…</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-bold text-navy">Page heading</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input value={heading} onChange={(e) => setHeading(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
        </div>
      </div>

      {leaders.map((leader, index) => {
        const shownPhoto = leader.preview || leader.photo_url;
        return (
          <div key={leader.key} className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-navy">Leader {index + 1}</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveLeader(index, -1)} disabled={index === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" aria-label="Move leader up">
                  <ArrowUp size={16} />
                </button>
                <button type="button" onClick={() => moveLeader(index, 1)} disabled={index === leaders.length - 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" aria-label="Move leader down">
                  <ArrowDown size={16} />
                </button>
                <button type="button" onClick={() => removeLeader(leader.key)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium">
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              {shownPhoto ? (
                <img src={shownPhoto} alt={leader.name || 'Leader photo'}
                  className="w-40 h-40 rounded-lg border border-gray-200 object-cover bg-gray-50" />
              ) : (
                <div className="w-40 h-40 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                  <ImageOff size={28} />
                </div>
              )}
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-navy-deep transition text-sm font-medium">
                  <Upload size={16} /> {shownPhoto ? 'Replace photo' : 'Add photo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleFile(leader.key, e)} className="hidden" />
                </label>
                {shownPhoto && (
                  <button type="button"
                    onClick={() => updateLeader(leader.key, { photo_url: '', preview: '', dataUrl: '' })}
                    className="block text-sm text-red-600 hover:underline">
                    Remove photo
                  </button>
                )}
                <p className="text-xs text-gray-500">PNG, JPG or WebP, up to 8 MB.</p>
                {leader.preview && <p className="text-xs text-green">New photo — save to publish it.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input value={leader.name} onChange={(e) => updateLeader(leader.key, { name: e.target.value })}
                  placeholder="e.g. Sri V. Somu"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input value={leader.designation} onChange={(e) => updateLeader(leader.key, { designation: e.target.value })}
                  placeholder="e.g. Hon. President"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone (optional)</label>
                <input value={leader.phone} onChange={(e) => updateLeader(leader.key, { phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email (optional)</label>
                <input value={leader.email} onChange={(e) => updateLeader(leader.key, { email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={leader.highlight}
                onChange={(e) => updateLeader(leader.key, { highlight: e.target.checked })} />
              Highlight this leader (shows a coloured frame)
            </label>
          </div>
        );
      })}

      <button type="button" onClick={addLeader}
        className="w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-navy/40 text-navy rounded-lg py-4 hover:bg-navy/5 transition font-medium">
        <Plus size={18} /> Add leader
      </button>

      {message.text && (
        <p className={`text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green'}`}>{message.text}</p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 bg-navy text-white px-6 py-2 rounded-lg hover:bg-navy-deep transition disabled:opacity-50 font-medium">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
