const { sequelize, User, Camp, Patient, QueueEntry } = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedDev() {
    try {
        await sequelize.authenticate();

        // 1. Create Doctors
        const [doctor1] = await User.findOrCreate({
            where: { email: 'dr.smith@dental.com' },
            defaults: {
                name: 'Dr. John Smith',
                email: 'dr.smith@dental.com',
                password: 'password123',
                role: 'dentist',
                is_active: true
            }
        });
        const [doctor2] = await User.findOrCreate({
            where: { email: 'dr.jane@dental.com' },
            defaults: {
                name: 'Dr. Jane Doe',
                email: 'dr.jane@dental.com',
                password: 'password123',
                role: 'dentist',
                is_active: true
            }
        });
        console.log('✅ Doctors created');

        // 2. Create target Patient User for login
        const [patientUser] = await User.findOrCreate({
            where: { email: 'patient@gmail.com' },
            defaults: {
                name: 'Dev Patient',
                email: 'patient@gmail.com',
                password: 'patient123',
                role: 'patient',
                is_active: true
            }
        });
        console.log('✅ Patient login user created (patient@gmail.com / patient123)');

        // 3. Ensure a Camp exists
        let camp = await Camp.findOne({ where: { status: 'active' } });
        if (!camp) {
            camp = await Camp.create({
                name: 'Dev Test Camp',
                prefix: 'DEV',
                location: 'Main Center',
                organization: 'TechCorp',
                start_date: new Date(),
                end_date: new Date(Date.now() + 86400000 * 5),
                status: 'active'
            });
            console.log('✅ Created fallback Camp');
        }

        // 4. Create 5 Dummy Patients with 5-10 min wait times in the queue
        for (let i = 1; i <= 5; i++) {
            const pid = `DEV-${Date.now().toString().slice(-4)}-${i}`;
            const patient = await Patient.create({
                patient_id: pid,
                camp_id: camp.id,
                full_name: `Dummy Patient ${i}`,
                age: 30 + i,
                gender: i % 2 === 0 ? 'female' : 'male',
                phone: `987654321${i}`,
                organization: 'TechCorp',
                registered_at: new Date()
            });

            // Random wait time between 5 and 10 minutes past
            const waitMinutes = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
            const queuedAt = new Date(Date.now() - waitMinutes * 60000);

            await QueueEntry.create({
                patient_id: patient.id,
                camp_id: camp.id,
                status: 'pending',
                priority: 'normal',
                queued_at: queuedAt
            });
            console.log(`✅ Dummy Patient ${i} created with wait time ${waitMinutes} mins`);
        }

        console.log('🎉 Dev seeding complete.');
        process.exit(0);

    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seedDev();
