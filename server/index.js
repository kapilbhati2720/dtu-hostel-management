const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require("socket.io");
require('./db');

// --- BACKGROUND WORKERS ---

const startSLAWorker = require('./cron/slaWorker');
const startCleanupWorker = require('./cron/cleanupWorker');

const app = express();
const server = http.createServer(app); 
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5174",
  "https://dtu-hostel-management.vercel.app", // main Vercel URL
  process.env.CLIENT_URL
].filter(Boolean); // Removes undefined values

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Allow listed origins OR any Vercel preview branch deployment
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

const io = new Server(server, {
  cors: corsOptions
});

// Security Middleware (Helmet + Dynamic CORS + Rate Limit)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow images to load across ports
}));
app.use(cors(corsOptions));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                // 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use('/api/', limiter);

app.use(express.json());
app.use('/uploads', express.static('uploads'));

let onlineUsers = {};

// Define Routes and pass dependencies to them
const authRoutes = require('./routes/auth');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const grievancesRoutes = require('./routes/grievances')(io, onlineUsers);
const officerRoutes = require('./routes/officer')(io, onlineUsers);
const hostelsRoutes = require('./routes/hostels');
const leavesRoutes = require('./routes/leaves')(io, onlineUsers);
const announcementsRoutes = require('./routes/announcements')(io, onlineUsers);

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grievances', grievancesRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/hostels', hostelsRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/announcements', announcementsRoutes);

io.on('connection', (socket) => {
    socket.on('addUser', (userId, hostelId) => {
        onlineUsers[userId] = socket.id;
        // Join hostel-specific room for scoped announcements
        if (hostelId) {
            socket.join(`hostel_${hostelId}`);
        }
        console.log('Online users updated:', Object.keys(onlineUsers).length);
    });
    socket.on('disconnect', () => {
        for (let userId in onlineUsers) {
            if (onlineUsers[userId] === socket.id) {
                delete onlineUsers[userId];
                break;
            }
        }
    });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    
    // Initialize background engines ONLY after successful server boot
    startSLAWorker();
    startCleanupWorker();
});