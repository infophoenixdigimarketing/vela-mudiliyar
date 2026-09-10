import dayjs from 'dayjs';

export default function IdCardTemplate({ member, type = 'life', scale = 1 }) {
  const memberType = type === 'life' ? 'Life Member' : 'Annual Member';
  const dob = member?.dob ? dayjs(member.dob).format('DD-MM-YYYY') : '—';

  // Outer box reserves exactly the scaled size, so previews never clip or leave gaps
  return (
    <div style={{ width: `${1280 * scale}px`, height: `${800 * scale}px`, overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative', width: '1280px', height: '800px', background: '#ffffff', overflow: 'hidden', fontFamily: "'Noto Sans', Verdana, sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,.25)' }}>

        {/* HEADER */}
        <div style={{ height: '300px', background: '#2f3084', borderBottom: '5px solid #c41e3a', display: 'flex', alignItems: 'center', padding: '0 34px 0 30px', boxSizing: 'border-box', gap: '20px' }}>
          <img src="/assets/seal.png" alt="MVA seal" style={{ width: '238px', height: '246px', flexShrink: 0, objectFit: 'contain' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', color: '#ffffff', textAlign: 'center' }}>
            <div style={{ fontSize: '38px', fontWeight: 600, letterSpacing: '.2px' }}>Mudaliar Sangham</div>
            <div style={{ fontSize: '57px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.5px', whiteSpace: 'nowrap', margin: '2px 0 8px' }}>Mysore Vellala Association®</div>
            <div style={{ fontFamily: "'Noto Sans Kannada', 'Noto Sans', sans-serif", fontSize: '48px', fontWeight: 700, lineHeight: 1.45, whiteSpace: 'nowrap' }}>ಮೈಸೂರು ವೆಲ್ಲಾಳ ಅಸೋಸಿಯೇಷನ್(ರಿ.)</div>
            <div style={{ fontSize: '26px', fontWeight: 600, marginTop: '8px', letterSpacing: '.2px' }}>#76, Manasara Road, Indiranagar, Ittigegudu, Mysuru - 570010</div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ position: 'relative', height: '437px', background: 'linear-gradient(180deg,#ffffff 0%,#f2f7fd 55%,#e6eff9 100%)', overflow: 'hidden' }}>
          {/* Faint round watermark seal behind details (square box keeps it round) */}
          <img src="/assets/seal.png" alt="" style={{ position: 'absolute', left: '450px', top: '25px', width: '380px', height: '380px', objectFit: 'contain', opacity: 0.1, filter: 'grayscale(1) brightness(1.2)' }} />

          {/* LEFT: photo + plain MVA-ID text (no box) */}
          <div style={{ position: 'absolute', left: '78px', top: '38px', width: '296px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '296px', height: '334px', border: '6px solid #2f3084', boxSizing: 'border-box', background: '#bfe3e6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {member?.photo ? (
                <img src={member.photo} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '96px' }}>{member?.sex === 'M' ? '👤' : '👩'}</div>
              )}
            </div>
            <div style={{ fontSize: '33px', fontWeight: 700, color: '#1a237e', letterSpacing: '.5px', marginTop: '6px' }}>{member?.mva_id || 'MVA-ID'}</div>
          </div>

          {/* RIGHT: details, signature flows below address */}
          <div style={{ position: 'absolute', left: '450px', top: '20px', right: '36px' }}>
            <div style={{ fontSize: '37px', fontWeight: 600, color: '#2e7d32', textAlign: 'left', paddingLeft: '110px', marginBottom: '8px' }}>{memberType}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '240px 26px 1fr', alignItems: 'start', fontSize: '34px', fontWeight: 700, color: '#1a237e', lineHeight: '44px' }}>
              <div>Name</div><div>:</div><div>{member?.full_name || '—'}</div>
              <div>DOB</div><div>:</div><div>{dob}</div>
              <div>Blood Group</div><div>:</div><div>{member?.blood_group || '—'}</div>
              <div>Contact</div><div>:</div><div>{member?.phone || '—'}</div>
              <div>Address</div><div>:</div><div style={{ wordBreak: 'break-word', lineHeight: 1.3 }}>{member?.residence_address || '—'}</div>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <img src="/assets/sign.png" alt="Signature" style={{ width: '180px', height: '65px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
              <div style={{ fontSize: '30px', fontWeight: 600, color: '#2e7d32', marginTop: '-2px' }}>Secretary</div>
            </div>
          </div>
        </div>

        {/* FOOTER BAND */}
        <div style={{ height: '58px', background: '#2f3084' }}></div>
      </div>
    </div>
  );
}
