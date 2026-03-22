/**
 * Seed script: creates demo users, a camp, and 500 sample patients.
 * Run with: node src/seed.js
 */
const { sequelize, Camp, Patient, QueueEntry, User, Screening } = require('./models');
require('dotenv').config();

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Ananya', 'Aanya', 'Aadhya', 'Saanvi', 'Diya', 'Myra', 'Ira', 'Prisha', 'Anika', 'Riya',
    'Raj', 'Amit', 'Sanjay', 'Vikram', 'Rahul', 'Deepak', 'Suresh', 'Priya', 'Neha', 'Sunita',
    'Manoj', 'Kiran', 'Lakshmi', 'Pooja', 'Meera', 'Divya', 'Harsha', 'Rohan', 'Kavita', 'Sneha',
    'Nikhil', 'Ankita', 'Gaurav', 'Swati', 'Varun', 'Megha', 'Tushar', 'Pallavi', 'Yash', 'Nandini'];
const LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Nair', 'Joshi', 'Menon', 'Rao',
    'Iyer', 'Verma', 'Chopra', 'Bhatt', 'Desai', 'Pillai', 'Mishra', 'Das', 'Sen', 'Bose',
    'Agarwal', 'Arora', 'Saxena', 'Jain', 'Mehta', 'Chauhan', 'Tiwari', 'Yadav', 'Pandey', 'Dubey'];
const ORGS = ['TechCorp India', 'MediLife Hospital', 'Green Valley Apartments', 'InfoSys Campus', 'Steel Factory Workers', 'University of Delhi', 'Sunrise Apartments', 'Metro Mall Staff', 'City School Teachers', 'Bank of India Branch'];
const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT', 'Admin', 'Security', null];
const GENDERS = ['male', 'female', 'other'];

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPhone() { return `+91${randomInt(7000000000, 9999999999)}`; }

async function seed() {
    try {
        console.log('🌱 Starting seed process...');

        // Force sync to recreate tables
        await sequelize.sync({ force: true });
        console.log('✅ Database tables recreated');

        // Create users
        const admin = await User.create({
            name: 'Dr. Admin',
            email: 'admin@gmail.com',
            password: 'Admin@123',
            role: 'system_admin',
            phone: '+919876543210',
            camp_ids: [],
        });
        console.log('✅ Admin user created: admin@gmail.com / admin');

        const dentist1 = await User.create({
            name: 'Dr. Priya Sharma',
            email: 'dentist@gmail.com',
            password: 'dentist',
            role: 'dentist',
            phone: '+919876543211',
            camp_ids: [],
        });

        const dentist2 = await User.create({
            name: 'Dr. Rahul Patel',
            email: 'dentist2@dental.com',
            password: 'dentist123',
            role: 'dentist',
            phone: '+919876543212',
            camp_ids: [],
        });

        const campAdmin = await User.create({
            name: 'Camp Manager Anita',
            email: 'campadmin@dental.com',
            password: 'admin123',
            role: 'camp_admin',
            phone: '+919876543213',
            camp_ids: [],
        });

        console.log('✅ Dentist users created: dentist@gmail.com / dentist');

        // Create a demo camp
        const camp = await Camp.create({
            name: 'HealthFirst Dental Camp 2026',
            prefix: 'HF',
            location: 'TechCorp India, Bangalore - Building A, Ground Floor Health Center',
            organization: 'TechCorp India Pvt Ltd',
            start_date: '2026-03-07',
            end_date: '2026-03-09',
            status: 'active',
            contact_info: 'Dr. Admin - admin@dental.com | +919876543210',
        });

        // Create a second camp
        const camp2 = await Camp.create({
            name: 'SmileCare Community Camp',
            prefix: 'SC',
            location: 'Green Valley Apartments, Mumbai - Community Hall',
            organization: 'Green Valley Residents Association',
            start_date: '2026-03-10',
            end_date: '2026-03-10',
            status: 'active',
            contact_info: 'Community Health Team',
        });

        // Update user camp access
        const allCampIds = [camp.id, camp2.id];
        await admin.update({ camp_ids: allCampIds });
        await dentist1.update({ camp_ids: allCampIds });
        await dentist2.update({ camp_ids: allCampIds });
        await campAdmin.update({ camp_ids: allCampIds });

        console.log(`✅ Camps created: "${camp.name}" (${camp.prefix}) and "${camp2.name}" (${camp2.prefix})`);

        // Create 500 patients for primary camp
        console.log('📝 Creating 500 sample patients...');
        const patients = [];
        for (let i = 0; i < 500; i++) {
            const firstName = randomChoice(FIRST_NAMES);
            const lastName = randomChoice(LAST_NAMES);
            const fullName = `${firstName} ${lastName}`;
            const patientNumber = String(i + 1).padStart(4, '0');

            const patient = await Patient.create({
                patient_id: `HF-${patientNumber}`,
                camp_id: camp.id,
                full_name: fullName,
                age: randomInt(5, 85),
                gender: randomChoice(GENDERS),
                phone: randomPhone(),
                address: Math.random() > 0.6 ? `${randomInt(1, 999)}, ${randomChoice(['MG Road', 'Gandhi Market', 'Temple Street', 'Station Road'])}` : null,
                city: randomChoice(['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai']),
                registered_at: new Date(Date.now() - randomInt(0, 48 * 3600 * 1000)),
            });

            patients.push(patient);

            // Add to queue
            let status = 'pending';
            if (i < 100) status = 'screened';
            else if (i < 120) status = 'in_progress';

            await QueueEntry.create({
                patient_id: patient.id,
                camp_id: camp.id,
                status,
                priority: Math.random() > 0.9 ? 'urgent' : (Math.random() > 0.85 ? 'mobility_issues' : 'normal'),
                queued_at: patient.registered_at,
            });

            if (i % 100 === 0) console.log(`  ${i}/500 patients created...`);
        }

        // Update camp counter
        await camp.update({ patient_counter: 500 });

        // Create some completed screenings for first 100 patients
        console.log('🔬 Creating sample screenings for first 100 patients...');
        const treatments = ['Scaling', 'Filling', 'Extraction', 'RCT', 'Orthodontic consultation', 'Other'];

        for (let i = 0; i < 100; i++) {
            const patient = patients[i];
            const hygiene = randomChoice(['good', 'fair', 'poor']);
            const hasCaries = Math.random() > 0.5;
            const selectedTreatments = [];

            if (hasCaries || Math.random() > 0.6) {
                const numTreatments = randomInt(1, 3);
                for (let j = 0; j < numTreatments; j++) {
                    const t = randomChoice(treatments);
                    if (!selectedTreatments.includes(t)) selectedTreatments.push(t);
                }
            }

            await Screening.create({
                patient_id: patient.id,
                camp_id: camp.id,
                dentist_id: randomChoice([dentist1.id, dentist2.id]),
                oral_hygiene: hygiene,
                caries: hasCaries,
                gingivitis: Math.random() > 0.6,
                malocclusion: Math.random() > 0.8,
                other_findings: Math.random() > 0.7 ? randomChoice([
                    'Mild discoloration noted',
                    'Wisdom tooth partially erupted',
                    'Minor gum recession observed',
                    'Fluorosis stains on upper incisors',
                    'Missing lower molar (previously extracted)',
                ]) : null,
                treatments: selectedTreatments,
                draft: false,
                version: 1,
            });
        }

        // Create 50 patients for second camp
        for (let i = 0; i < 50; i++) {
            const firstName = randomChoice(FIRST_NAMES);
            const lastName = randomChoice(LAST_NAMES);
            const patientNumber = String(i + 1).padStart(4, '0');

            const patient = await Patient.create({
                patient_id: `SC-${patientNumber}`,
                camp_id: camp2.id,
                full_name: `${firstName} ${lastName}`,
                age: randomInt(5, 85),
                gender: randomChoice(GENDERS),
                phone: randomPhone(),
                address: `Apt ${randomChoice(['A', 'B', 'C'])}${randomInt(101, 520)}, Green Valley`,
                city: 'Mumbai',
                registered_at: new Date(),
            });

            await QueueEntry.create({
                patient_id: patient.id,
                camp_id: camp2.id,
                status: 'pending',
                priority: 'normal',
                queued_at: patient.registered_at,
            });
        }
        await camp2.update({ patient_counter: 50 });

        console.log('\n✅ Seed completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Demo Accounts:');
        console.log('   System Admin: admin@gmail.com / Admin@123');
        console.log('   Dentist 1:    dentist@gmail.com / dentist');
        console.log('   Dentist 2:    dentist2@dental.com / dentist123');
        console.log('   Camp Admin:   campadmin@dental.com / admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Camp 1: "${camp.name}" — 500 patients, 100 screened`);
        console.log(`📊 Camp 2: "${camp2.name}" — 50 patients`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
