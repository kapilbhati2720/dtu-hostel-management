// server/cron/slaWorker.js
const cron = require('node-cron');
const pool = require('../db');
const sendEmail = require('../utils/sendemail');

// HLD Concept: This worker runs completely independently of user requests.
// We schedule it to run at 1:00 AM every night (or every hour in production).
// Cron syntax: '0 1 * * *' (Every day at 1:00 AM)
// For testing purposes, you can change it to '*/5 * * * *' (Every 5 minutes)

const startSLAWorker = () => {
    console.log("🤖 SLA Escalation Worker Initialized...");

    cron.schedule('0 1 * * *', async () => {
        console.log("⏳ Running Daily SLA Breach Scan...");
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Identify Breached Tickets
            // We join grievances with departments to dynamically pull the correct sla_hours (e.g., 72 hours for Engineering)
            const breachedTicketsRes = await client.query(`
                SELECT 
                    g.grievance_id, g.ticket_id, g.title, g.escalation_level, g.department_id,
                    d.name AS department_name, d.sla_hours
                FROM grievances g
                JOIN departments d ON g.department_id = d.department_id
                WHERE g.status IN ('Submitted', 'In Progress')
                AND g.updated_at < NOW() - (d.sla_hours || ' hours')::interval
                AND g.escalation_level < 3 -- Max escalation level based on DTU SOP
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

                // Update the ticket to the next escalation level and auto-change status
                await client.query(`
                    UPDATE grievances 
                    SET escalation_level = $1, status = 'Escalated', updated_at = NOW() 
                    WHERE grievance_id = $2
                `, [nextLevel, ticket.grievance_id]);

                // Insert a system audit log into the timeline so the student sees WHY it escalated
                await client.query(`
                    INSERT INTO grievance_updates (grievance_id, user_id, role, comment)
                    VALUES ($1, NULL, 'system', $2)
                `, [
                    ticket.grievance_id, 
                    `System Auto-Escalation: Ticket breached the ${ticket.sla_hours}-hour SLA. Escalated to Level ${nextLevel} authority.`
                ]);

                // 3. Find the new authority figure to notify (Based on our Hierarchy RBAC)
                const newAuthorityRes = await client.query(`
                    SELECT u.email, u.full_name 
                    FROM users u
                    JOIN user_department_roles udr ON u.user_id = udr.user_id
                    JOIN roles r ON udr.role_id = r.role_id
                    WHERE udr.department_id = $1 AND r.hierarchy_level = $2
                `, [ticket.department_id, nextLevel]);

                // 4. Fire off accountability emails
                for (const authority of newAuthorityRes.rows) {
                    const emailBody = `
                        <h2 style="color: #d9534f;">⚠️ Escalation Notice: SLA Breach</h2>
                        <p>Dear ${authority.full_name},</p>
                        <p>Ticket <b>#${ticket.ticket_id}</b> (${ticket.title}) in the ${ticket.department_name} department has breached its resolution SLA.</p>
                        <p>In accordance with DTU GRM SOPs, this ticket has been automatically escalated to your authority level (Level ${nextLevel}).</p>
                        <p>Please log into the portal to review and resolve this issue immediately.</p>
                    `;
                    await sendEmail({ 
                        to: authority.email, 
                        subject: `ESCALATION: Ticket #${ticket.ticket_id} SLA Breach`, 
                        html: emailBody 
                    });
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