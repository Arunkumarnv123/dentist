const { sequelize, User, Camp, DoctorSchedule } = require('./src/models');

async function addSchedules() {
    try {
        await sequelize.authenticate();
        const dentist1 = await User.findOne({ where: { email: 'dentist@gmail.com' } });
        const dentist2 = await User.findOne({ where: { email: 'dentist2@dental.com' } });
        const camp = await Camp.findOne({ where: { prefix: 'HF' } });

        if (!dentist1 || !camp) {
            console.log('Missing seeded data');
            process.exit(1);
        }

        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

        // Schedule for dentist 1 today
        await DoctorSchedule.create({
            doctor_id: dentist1.id,
            camp_id: camp.id,
            date: today,
            start_time: '09:00',
            end_time: '13:00',
            slot_duration_minutes: 10,
            is_available: true
        });

        // Schedule for dentist 1 tomorrow
        await DoctorSchedule.create({
            doctor_id: dentist1.id,
            camp_id: camp.id,
            date: tomorrow,
            start_time: '14:00',
            end_time: '18:00',
            slot_duration_minutes: 10,
            is_available: true
        });

        // Schedule for dentist 2 today
        if (dentist2) {
            await DoctorSchedule.create({
                doctor_id: dentist2.id,
                camp_id: camp.id,
                date: today,
                start_time: '10:00',
                end_time: '12:00',
                slot_duration_minutes: 15, // different length
                is_available: true
            });
        }

        // Create a sample patient user for testing
        const [patientUser, created] = await User.findOrCreate({
            where: { email: 'patient@dental.com' },
            defaults: {
                name: 'Test Patient',
                email: 'patient@dental.com',
                password: 'patient123',
                role: 'patient',
                is_active: true,
            }
        });
        if (created) {
            console.log('✅ Created sample patient user: patient@dental.com / patient123');
        } else {
            console.log('ℹ️  Patient user already exists.');
        }

        console.log('✅ Added schedules for today and tomorrow.');
        process.exit(0);
    } catch (err) {
        console.error('Error adding schedules:', err);
        process.exit(1);
    }
}

addSchedules();
