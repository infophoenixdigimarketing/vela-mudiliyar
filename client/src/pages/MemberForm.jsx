import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getMemberById, getAllMembers, saveMember, linkFamily } from '../lib/memberStore';

export default function MemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [duplicate, setDuplicate] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [familyQuery, setFamilyQuery] = useState('');
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    dob: '',
    sex: '',
    blood_group: '',
    occupation: '',
    relation_type: '',
    relation_name: '',
    residence_address: '',
    residence_phone: '',
    office_address: '',
    office_phone: '',
    area: '',
    pincode: '',
    membership_type: 'life',
    status: 'active',
    voucher_no: '',
    introduced_by: '',
    family_member_id: '',
    special_remarks: '',
    photo: '',
    signature: '',
  });

  useEffect(() => {
    setAllMembers(getAllMembers());
    if (id) {
      loadMember();
    }
  }, [id]);

  const loadMember = async () => {
    try {
      const data = getMemberById(id);
      if (!data) {
        setError('Member not found');
        return;
      }
      setMember(data);
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        dob: data.dob ? dayjs(data.dob).format('YYYY-MM-DD') : '',
        sex: data.sex || '',
        blood_group: data.blood_group || '',
        occupation: data.occupation || '',
        relation_type: data.relation_type || '',
        relation_name: data.relation_name || '',
        residence_address: data.residence_address || '',
        residence_phone: data.residence_phone || '',
        office_address: data.office_address || '',
        office_phone: data.office_phone || '',
        area: data.area || '',
        pincode: data.pincode || '',
        membership_type: data.membership_type || 'life',
        status: data.status || 'active',
        voucher_no: data.voucher_no || '',
        introduced_by: data.introduced_by || '',
        family_member_id: data.family_member_id || '',
        special_remarks: data.special_remarks || '',
        photo: data.photo || '',
        signature: data.signature || '',
      });
      if (data.family_member_id) {
        const fam = getMemberById(data.family_member_id);
        if (fam) setFamilyQuery(`${fam.full_name} (${fam.mva_id})`);
      }
    } catch (err) {
      setError('Failed to load member');
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicate = (phone) => {
    if (!phone || phone.length < 10) {
      setDuplicate(null);
      return;
    }
    const existing = getAllMembers().find(
      m => m.phone === phone && String(m.id) !== String(id)
    );
    setDuplicate(existing || null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (name === 'phone') {
      checkDuplicate(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let newMember = {
        ...(member || {}),
        ...form,
        id: id ? Number(id) : Date.now(),
        mva_id: member?.mva_id || `MVA-ID-${String(Math.floor(1000 + Math.random() * 9000))}`,
        card_issue_count: member?.card_issue_count || 0,
        // Any edit resets card approval — details changed, so re-verify
        card_status: 'draft',
        date_created: member?.date_created || new Date().toISOString(),
        date_updated: new Date().toISOString(),
      };

      // Two-way family link: connect this member's (new) MVA ID with the
      // selected existing member so both show in the same Families group.
      newMember = linkFamily(newMember, form.family_member_id);

      saveMember(newMember);
      navigate(`/members/${newMember.id}`);
    } catch (err) {
      setError('Failed to save member: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const areas = ['Ittigegudu', 'J P Nagar', 'Medar Block', 'New Bamboo Bazaar', 'Hunsur Town', 'Kuvempunagar'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const filteredFamilyMembers = familyQuery.trim()
    ? allMembers
        .filter(m => String(m.id) !== String(id))
        .filter(m =>
          m.full_name?.toLowerCase().includes(familyQuery.toLowerCase()) ||
          m.mva_id?.toLowerCase().includes(familyQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-navy">{id ? 'Edit Member' : 'Add New Member'}</h1>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {duplicate && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          ⚠️ A member with this phone number already exists: <strong>{duplicate.full_name}</strong>. Duplicate numbers are allowed if shared with family.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-8">
        {/* Personal Information */}
        <fieldset className="space-y-4">
          <h2 className="text-xl font-bold text-navy border-b pb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                name="age"
                value={form.dob ? new Date().getFullYear() - new Date(form.dob).getFullYear() : ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from DOB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Type</label>
              <select
                name="relation_type"
                value={form.relation_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">Select...</option>
                <option value="S/o">S/o (Son of)</option>
                <option value="W/o">W/o (Wife of)</option>
                <option value="D/o">D/o (Daughter of)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relation Name</label>
              <input
                type="text"
                name="relation_name"
                value={form.relation_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
              <select
                name="sex"
                value={form.sex}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">Select...</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
              <select
                name="blood_group"
                value={form.blood_group}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">Select...</option>
                {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
              <input
                type="text"
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>
        </fieldset>

        {/* Address Information */}
        <fieldset className="space-y-4">
          <h2 className="text-xl font-bold text-navy border-b pb-4">Address & Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
              <input
                type="tel"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
              <select
                name="area"
                value={form.area}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">Select...</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Residence Address</label>
              <textarea
                name="residence_address"
                value={form.residence_address}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office Address</label>
              <textarea
                name="office_address"
                value={form.office_address}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Residence Phone</label>
              <input
                type="tel"
                name="residence_phone"
                value={form.residence_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office Phone</label>
              <input
                type="tel"
                name="office_phone"
                value={form.office_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>
        </fieldset>

        {/* Additional Information */}
        <fieldset className="space-y-4">
          <h2 className="text-xl font-bold text-navy border-b pb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Introduced By</label>
              <input
                type="text"
                name="introduced_by"
                value={form.introduced_by}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                placeholder="Name of the person who introduced"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Family Member</label>
              <input
                type="text"
                value={familyQuery}
                onChange={(e) => {
                  setFamilyQuery(e.target.value);
                  setForm(prev => ({ ...prev, family_member_id: '' }));
                  setShowFamilyDropdown(true);
                }}
                onFocus={() => setShowFamilyDropdown(true)}
                onBlur={() => setTimeout(() => setShowFamilyDropdown(false), 150)}
                placeholder="Type name or MVA ID to search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
              {showFamilyDropdown && familyQuery.trim() && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredFamilyMembers.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">No matching members</div>
                  )}
                  {filteredFamilyMembers.map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onMouseDown={() => {
                        setForm(prev => ({ ...prev, family_member_id: m.id }));
                        setFamilyQuery(`${m.full_name} (${m.mva_id})`);
                        setShowFamilyDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-card-blue"
                    >
                      <span className="font-medium">{m.full_name}</span>
                      <span className="text-gray-500 ml-2 font-mono text-xs">{m.mva_id}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.family_member_id ? (
                <p className="text-xs text-green-600 mt-1">✓ Linked to family member</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Search and select an existing member to link as family</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Special Particulars / Remarks</label>
            <textarea
              name="special_remarks"
              value={form.special_remarks}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="Any special notes or remarks about the member"
            />
          </div>
        </fieldset>

        {/* Photo & Signature */}
        <fieldset className="space-y-4">
          <h2 className="text-xl font-bold text-navy border-b pb-4">Photo & Signature</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Member Photo</label>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setForm(prev => ({ ...prev, photo: event.target?.result }));
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
                accept="image/*"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
              {form.photo && <div className="text-xs text-green-600 mt-1">✓ Photo uploaded</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setForm(prev => ({ ...prev, signature: event.target?.result }));
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
                accept="image/*"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
              {form.signature && <div className="text-xs text-green-600 mt-1">✓ Signature uploaded</div>}
            </div>
          </div>
        </fieldset>

        {/* Membership */}
        <fieldset className="space-y-4">
          <h2 className="text-xl font-bold text-navy border-b pb-4">Membership</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                name="membership_type"
                value={form.membership_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="life">Life Member</option>
                <option value="annual">Annual Member</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="departed">Departed</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy text-white px-8 py-2 rounded-lg hover:bg-navy-deep transition font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Member'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-gray-300 px-8 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
