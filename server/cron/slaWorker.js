// server/cron/slaWorker.js
const cron = require('node-cron');
const pool = require('../db');
const sendEmail = require('../utils/sendemail');

// HLD Concept: This worker runs completely independently of user requests.
// We schedule it to run at 1:00 AM every night.
// Cron syntax: '0 1 * * *' (Every day at 1:00 AM)

const startSLAWorker = () => {
    console.log("🤖 SLA Escalation Worker Initialized...");

    cron.schedule('0 1 * * *', async () => {
        console.log("⏳ Running Daily SLA Breach Scan...");
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Identify Breached Tickets
            // Join grievances with hostels to dynamically pull the correct sla_hours
            const breachedTicketsRes = await client.query(`
                SELECT 
                    g.grievance_id, g.ticket_id, g.title, g.escalation_level, g.hostel_id,
                    h.name AS hostel_name, h.sla_hours
                FROM grievances g
                JOIN hostels h ON g.hostel_id = h.hostel_id
                WHERE g.status IN ('Submitted', 'In Progress')
                AND g.updated_at < NOW() - (h.sla_hours || ' hours')::interval
                AND g.escalation_level < 3 -- Max escalation level
            `);

            const breachedTickets = breachedTicketsRes.rows;

            if (breachedTickets.length === 0) {
                console.log("✅ No SLA breaches found today.");
                await client.query('COMMIT');
                return;
            }

            console.log(`⚠️ Found ${breachedTickets.length} breached tickets. Initiating escalation...`);

            // 2. Process each breached ticket
            for (const ticket of breachedTickets) {
                const nextLevel = ticket.escalation_level + 1;

                // Update the ticket to the next escalation level
                await client.query(`
                    UPDATE grievances 
                    SET escalation_level = $1, status = 'Escalated', is_escalated = TRUE, updated_at = NOW() 
                    WHERE grievance_id = $2
                `, [nextLevel, ticket.grievance_id]);

                // Insert a system audit log into the timeline
                await client.query(`
                    INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment)
                    VALUES ($1, NULL, 'StatusChange', $2)
                `, [
                    ticket.grievance_id, 
                    `System Auto-Escalation: Ticket breached the ${ticket.sla_hours}-hour SLA. Escalated to Level ${nextLevel} authority.`
                ]);

                // 3. Find hostel wardens to notify
                const wardensRes = await client.query(`
                    SELECT u.email, u.full_name 
                    FROM users u
                    JOIN user_hostel_roles uhr ON u.user_id = uhr.user_id
                    JOIN roles r ON uhr.role_id = r.role_id
                    WHERE uhr.hostel_id = $1 AND r.role_name = 'nodal_officer'
                `, [ticket.hostel_id]);

                // Also notify super_admins (Chief Wardens) for Level 2+ escalations
                let authoritiesToNotify = [...wardensRes.rows];
                if (nextLevel >= 2) {
                    const adminsRes = await client.query(`
                        SELECT u.email, u.full_name 
                        FROM users u
                        JOIN user_hostel_roles uhr ON u.user_id = uhr.user_id
                        JOIN roles r ON uhr.role_id = r.role_id
                        WHERE r.role_name = 'super_admin'
                    `);
                    authoritiesToNotify = [...authoritiesToNotify, ...adminsRes.rows];
                }

                // 4. Fire off accountability emails
                for (const authority of authoritiesToNotify) {
                    const emailBody = `
                        <h2 style="color: #d9534f;">⚠️ Escalation Notice: SLA Breach</h2>
                        <p>Dear ${authority.full_name},</p>
                        <p>Ticket <b>#${ticket.ticket_id}</b> (${ticket.title}) in <b>${ticket.hostel_name}</b> has breached its resolution SLA.</p>
                        <p>In accordance with DTU Hostel Management SOPs, this ticket has been automatically escalated to Level ${nextLevel}.</p>
                        <p>Please log into the portal to review and resolve this issue immediately.</p>
                    `;
                    try {
                        await sendEmail({ 
                            to: authority.email, 
                            subject: `ESCALATION: Ticket #${ticket.ticket_id} SLA Breach`, 
                            html: emailBody 
                        });
                    } catch (emailErr) {
                        console.error(`Failed to email ${authority.email}:`, emailErr.message);
                    }
                }
            }

            await client.query('COMMIT');
            console.log("✅ Escalation batch processing complete.");

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ SLA Worker Error:", error.message);
        } finally {
            client.release();
        }
    });
};

module.exports = startSLAWorker;