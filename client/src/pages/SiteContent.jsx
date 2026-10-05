import { useState } from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import AboutEditor from '../components/site/AboutEditor';
import LeadersEditor from '../components/site/LeadersEditor';

const PAGES = [
  { key: 'about', label: 'About', path: '/about', Editor: AboutEditor },
  { key: 'leaders', label: 'Leaders', path: '/bearers', Editor: LeadersEditor },
];

export default function SiteContent() {
  const [selected, setSelected] = useState('about');
  const current = PAGES.find((p) => p.key === selected);
  const Editor = current.Editor;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy flex items-center gap-2">
          <Globe size={28} /> Brochure Website
        </h1>
        <p className="text-gray-600 mt-1">Edit the text, photos and people shown on the public website pages</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-4 h-fit">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Pages</p>
          <ul className="space-y-1">
            {PAGES.map((page) => (
              <li key={page.key}>
                <button
                  type="button"
                  onClick={() => setSelected(page.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selected === page.key ? 'bg-navy text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-2xl font-bold text-navy">{current.label} page</h2>
            <a
              href={current.path}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-navy hover:underline"
            >
              View public page <ExternalLink size={14} />
            </a>
          </div>
          <Editor key={selected} />
        </div>
      </div>
    </div>
  );
}
