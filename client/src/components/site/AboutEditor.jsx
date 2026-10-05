import { useState, useEffect, useRef } from 'react';
import { Upload, Save, Plus, Trash2, ArrowUp, ArrowDown, ImageOff } from 'lucide-react';
import { getSitePage, saveSitePage, uploadSiteImage, readAsDataUrl, MAX_IMAGE_BYTES } from '../../lib/siteContent';

const DEFAULT_IMAGE = '/mva-assets/gallery/agm97-crowd1.jpeg';

const DEFAULT_DESCRIPTION = `The Mysore Vellala Association was established in 1927 by Sowcar Sri V. K. Govindaraja Mudaliar, who served as its Founder President. A provisional committee of 20 members representing various localities of Mysore City was formed. Sri V. M. Punniakoti Mudaliar served as Vice President, Dr. A. J. Ram as Secretary, and Sri V. T. Arumuga Mudaliar as Joint Secretary.

The Mudaliars of Mysore have a distinguished history of serving the erstwhile Mysore State and contributing to its development. Members of the community served in prominent positions such as Palace Physicians, Contractors, Advisers, Engineers and Diwans.

Among the notable personalities was Dr. A. J. Ram, who served as the Palace Physician. Dr. Sir A. Ramaswamy Mudaliar served as the Diwan of Mysore. Many members of the community also made significant contributions to irrigation, engineering, healthcare and other professional fields.

The Association continues this proud legacy of service, unity and community development, as it approaches its 100th year (Centenary) in 2027.`;

const DEFAULT_SECTIONS = [
  {
    image_url: DEFAULT_IMAGE,
    image_alt: 'Members of Mysore Vellala Association gathered at the 97th Annual General Body Meeting',
    caption: '',
    description: DEFAULT_DESCRIPTION,
  },
];

const MAX_SECTIONS = 20;

export default function AboutEditor() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const keyCounter = useRef(0);

  const withKeys = (list) => list.map((s) => ({
    key: ++keyCounter.current,
    image_url: s.image_url || '',
    image_alt: s.image_alt || '',
    caption: s.caption || '',
    description: s.description || '',
    preview: '',
    dataUrl: '',
  }));

  useEffect(() => {
    let cancelled = false;
    getSitePage('about')
      .then((saved) => {
        if (cancelled) return;
        const list = saved?.sections?.length ? saved.sections : DEFAULT_SECTIONS;
        setSections(withKeys(list));
      })
      .catch(() => {
        if (cancelled) return;
        setSections(withKeys(DEFAULT_SECTIONS));
        setMessage({ type: 'error', text: 'Could not load saved content from the server.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateSection = (key, patch) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) {
      setMessage({ type: 'error', text: `Up to ${MAX_SECTIONS} sections allowed.` });
      return;
    }
    setSections((prev) => [...prev, ...withKeys([{ image_url: '', image_alt: '', caption: '', description: '' }])]);
  };

  const removeSection = (key) => setSections((prev) => prev.filter((s) => s.key !== key));

  const moveSection = (index, direction) => {
    setSections((prev) => {
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
      updateSection(key, { preview: dataUrl, dataUrl });
      setMessage({ type: '', text: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const empty = sections.findIndex((s) => !(s.preview || s.image_url) && !s.description.trim());
    if (empty !== -1) {
      setMessage({ type: 'error', text: `Section ${empty + 1} needs a photo or a description — or remove it.` });
      return;
    }
    if (sections.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one section.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = [];
      for (const s of sections) {
        let imageUrl = s.image_url;
        if (s.dataUrl) {
          const uploaded = await uploadSiteImage(s.dataUrl);
          imageUrl = uploaded.url;
        }
        payload.push({ image_url: imageUrl, image_alt: s.image_alt, caption: s.caption, description: s.description });
      }
      const saved = await saveSitePage('about', { sections: payload });
      setSections(withKeys(saved.sections));
      setMessage({ type: 'success', text: 'Saved. The public page shows these changes on its next load.' });
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
      {sections.map((section, index) => {
        const shownImage = section.preview || section.image_url;
        return (
          <div key={section.key} className="bg-white rounded-lg shadow p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-navy">Section {index + 1}</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" aria-label="Move section up">
                  <ArrowUp size={16} />
                </button>
                <button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" aria-label="Move section down">
                  <ArrowDown size={16} />
                </button>
                <button type="button" onClick={() => removeSection(section.key)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium">
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {shownImage ? (
                  <img src={shownImage} alt={section.image_alt || 'Section photo preview'}
                    className="w-full md:w-72 rounded-lg border border-gray-200 object-contain bg-gray-50" />
                ) : (
                  <div className="w-full md:w-72 h-40 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                    <ImageOff size={28} />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-navy-deep transition text-sm font-medium">
                    <Upload size={16} /> {shownImage ? 'Replace photo' : 'Add photo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleFile(section.key, e)} className="hidden" />
                  </label>
                  {shownImage && (
                    <button type="button"
                      onClick={() => updateSection(section.key, { image_url: '', preview: '', dataUrl: '' })}
                      className="block text-sm text-red-600 hover:underline">
                      Remove photo
                    </button>
                  )}
                  <p className="text-xs text-gray-500">PNG, JPG or WebP, up to 8 MB. Shown without cropping.</p>
                  {section.preview && <p className="text-xs text-green">New photo — save to publish it.</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo alt text (for accessibility)</label>
                <input value={section.image_alt}
                  onChange={(e) => updateSection(section.key, { image_alt: e.target.value })}
                  placeholder="Describes the photo for screen readers"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Caption (optional)</label>
                <input value={section.caption}
                  onChange={(e) => updateSection(section.key, { caption: e.target.value })}
                  placeholder="e.g. Members gathered for the 97th AGM, December 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea rows={shownImage ? 9 : 6} value={section.description}
                onChange={(e) => updateSection(section.key, { description: e.target.value })}
                placeholder="Write the text for this section"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy leading-relaxed" />
              <p className="text-xs text-gray-500 mt-1">
                Leave a blank line between paragraphs — each one appears as its own paragraph on the website.
              </p>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addSection}
        className="w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-navy/40 text-navy rounded-lg py-4 hover:bg-navy/5 transition font-medium">
        <Plus size={18} /> Add section
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
