const db = require('./db.js');
const dayjs = require('dayjs');

const firstNames = [
  'Rajesh', 'Kumar', 'Suresh', 'Ramesh', 'Anil', 'Vikram', 'Pradeep', 'Mahesh',
  'Arjun', 'Sampath', 'Naresh', 'Girish', 'Prakash', 'Venkat', 'Srinivas', 'Anand',
  'Harish', 'Mohan', 'Satish', 'Hari', 'Vijay', 'Ashok', 'Ravi', 'Kiran',
  'Rajkumar', 'Sandeep', 'Deepak', 'Vikas', 'Gopal', 'Bhavesh', 'Raman', 'Jagan',
  'Sanjay', 'Mani', 'Prakashraj', 'Devendra', 'Yogesh', 'Raghu', 'Rohit', 'Paresh'
];

const lastNames = [
  'Mudaliar', 'Sharma', 'Reddy', 'Singh', 'Patel', 'Gupta', 'Kumar', 'Verma',
  'Rao', 'Nair', 'Iyer', 'Menon', 'Pillai', 'Yadav', 'Trivedi', 'Pandey'
];

const areas = [
  'Ittigegudu', 'J P Nagar', 'Medar Block', 'New Bamboo Bazaar', 'Hunsur Town',
  'Kuvempunagar', 'Gokulam', 'Chamrajpet', 'Indiranagar', 'Sri Kanteerava'
];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const occupations = ['Business', 'Service', 'Retired', 'Farmer', 'Student', 'Professional'];
const relationTypes = ['S/o', 'W/o', 'D/o'];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateMembers() {
  const members = [];
  const used = new Set();

  for (let i = 1; i <= 60; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const mvaId = `MVA-ID-${String(i).padStart(3, '0')}`;

    let phone;
    if (i === 25 || i === 35) {
      // Duplicate phone for demo
      phone = '9999911111';
    } else if (i === 45 || i === 50 || i === 55) {
      // These will have missing DOB
      phone = `9999${String(90000 + i).padStart(5, '0')}`;
    } else {
      phone = `9999${String(90000 + i).padStart(5, '0')}`;
    }

    const dob = randomDate(new Date(1950, 0, 1), new Date(2004, 11, 31));
    const dobStr = dayjs(dob).format('YYYY-MM-DD');
    const hasDob = !(i === 45 || i === 50 || i === 55);

    let status = 'active';
    if (i > 48 && i <= 56) {
      if (i > 52) status = 'departed';
      else status = 'pending';
    }

    members.push({
      mva_id: mvaId,
      serial_no: i,
      full_name: `${firstName} ${lastName}`,
      relation_type: relationTypes[Math.floor(Math.random() * relationTypes.length)],
      relation_name: firstNames[Math.floor(Math.random() * firstNames.length)],
      dob: hasDob ? dobStr : null,
      dob_day: hasDob ? dob.getDate() : null,
      dob_month: hasDob ? dob.getMonth() + 1 : null,
      sex: Math.random() > 0.5 ? 'M' : 'F',
      blood_group: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
      occupation: occupations[Math.floor(Math.random() * occupations.length)],
      phone: phone,
      whatsapp: phone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      residence_address: `${Math.floor(Math.random() * 999) + 1}, Somewhere Street, ${areas[Math.floor(Math.random() * areas.length)]}`,
      residence_phone: phone,
      office_address: `Office ${i}, Business Park`,
      office_phone: phone,
      area: areas[Math.floor(Math.random() * areas.length)],
      pincode: '570010',
      membership_type: Math.random() > 0.2 ? 'life' : 'annual',
      status: status,
      voucher_no: `V${String(i).padStart(4, '0')}`,
      introduced_by: firstNames[Math.floor(Math.random() * firstNames.length)],
      special_remarks: Math.random() > 0.7 ? 'Special notes here' : '',
      date_of_membership: dayjs().subtract(Math.floor(Math.random() * 20), 'year').format('YYYY-MM-DD'),
      passed_by_committee_on: dayjs().subtract(Math.floor(Math.random() * 20), 'year').add(1, 'month').format('YYYY-MM-DD'),
      photo_path: null,
      card_issue_count: Math.floor(Math.random() * 3)
    });
  }

  return members;
}

function seedDatabase() {
  const members = generateMembers();

  const stmt = db.prepare(`
    INSERT INTO members (
      mva_id, serial_no, full_name, relation_type, relation_name, dob, dob_day, dob_month,
      sex, blood_group, occupation, phone, whatsapp, email, residence_address, residence_phone,
      office_address, office_phone, area, pincode, membership_type, status, voucher_no,
      introduced_by, special_remarks, date_of_membership, passed_by_committee_on, photo_path,
      card_issue_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertMany = db.transaction((members) => {
    for (const member of members) {
      stmt.run(
        member.mva_id, member.serial_no, member.full_name, member.relation_type,
        member.relation_name, member.dob, member.dob_day, member.dob_month,
        member.sex, member.blood_group, member.occupation, member.phone, member.whatsapp,
        member.email, member.residence_address, member.residence_phone,
        member.office_address, member.office_phone, member.area, member.pincode,
        member.membership_type, member.status, member.voucher_no,
        member.introduced_by, member.special_remarks, member.date_of_membership,
        member.passed_by_committee_on, member.photo_path, member.card_issue_count
      );
    }
  });

  insertMany(members);
  console.log('✓ Seeded database with 60 members');
}

// Check if members table is empty before seeding
const count = db.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt;
if (count === 0) {
  seedDatabase();
} else {
  console.log(`Database already has ${count} members, skipping seed`);
}
