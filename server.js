/* =========================================================
   KYŌKEN CLAN BACKEND
   ========================================================= */

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("libsql");
const { v2: cloudinary } = require("cloudinary");

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");


/* =========================================================
   APP
   ========================================================= */

const app = express();

// Render terminates HTTPS at its proxy. Trust the proxy so secure cookies work correctly.
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}


/* =========================================================
   CONFIGURATION
   ========================================================= */

const PORT =
    process.env.PORT || 3000;

const DISCORD_API =
    "https://discord.com/api";

const DISCORD_AUTHORIZE_URL =
    "https://discord.com/oauth2/authorize";

const DISCORD_CLIENT_ID =
    process.env.DISCORD_CLIENT_ID;

const DISCORD_CLIENT_SECRET =
    process.env.DISCORD_CLIENT_SECRET;

const DISCORD_BOT_TOKEN =
    process.env.DISCORD_BOT_TOKEN;

const DISCORD_GUILD_ID =
    process.env.DISCORD_GUILD_ID;

const SESSION_SECRET =
    process.env.SESSION_SECRET;

const DISCORD_REDIRECT_URI =
    process.env.DISCORD_REDIRECT_URI ||
    `http://localhost:${PORT}/auth/discord/callback`;


/* =========================================================
   APPLICATION SYSTEM CONFIGURATION
   ========================================================= */

const APPLICATION_CHANNEL_ID =
    "1543273898332659763";

const TRYOUT_APPROVAL_CHANNEL_ID =
    "1543654202926960710";

const TRYOUT_FAIL_LOG_CHANNEL_ID =
    "1543665985788321882";

const KYOKEN_SERVER_ID =
    "1533040213335478356";

const ANNOUNCEMENT_CHANNEL_ID =
    process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID ||
    "1533689020574597250";


/* =========================================================
   KYŌKEN OFFICER DISCORD PRESENCE CACHE
   ========================================================= */

const kyokenOfficerPresenceCache =
    new Map();


function normalizeDiscordPresence(
    status
) {

    if (
        status === "online" ||
        status === "idle" ||
        status === "dnd" ||
        status === "offline"
    ) {

        return status;

    }

    return "offline";

}


function cacheDiscordPresence(
    userId,
    status
) {

    if (!userId) {

        return;

    }

    kyokenOfficerPresenceCache.set(
        String(userId),
        normalizeDiscordPresence(status)
    );

}


async function initializeKyokenPresenceCache() {

    if (!discordClient.isReady()) {

        return false;

    }

    try {

        const guild =
            discordClient.guilds.cache.get(
                KYOKEN_SERVER_ID
            ) ||
            await discordClient.guilds.fetch(
                KYOKEN_SERVER_ID
            );

        if (!guild) {

            throw new Error(
                "Kyōken Discord server could not be found."
            );

        }

        /*
           Initial presence snapshot. Future changes are handled by
           presenceUpdate, so we do not need to repeatedly fetch the
           entire member list just to determine officer status.
        */
        const members =
            await guild.members.fetch({
                withPresences: true
            });

        members.forEach(
            function (member) {

                cacheDiscordPresence(
                    member.id,
                    member.presence?.status || "offline"
                );

            }
        );

        console.log(
            `Kyōken presence cache initialized for ${members.size} members.`
        );

        return true;

    } catch (error) {

        console.error(
            "Kyōken presence cache initialization failed:",
            error
        );

        return false;

    }

}


const TRYOUT_ROLE_ID =
    "1543506590601191516";

const MEMBER_ROLE_ID =
    "1543591807412207667";


/* =========================================================
   APPLICATION COOLDOWN
   ========================================================= */

const APPLICATION_COOLDOWN_MS =
    7 * 24 * 60 * 60 * 1000;


/*
   Developer accounts bypass the cooldown.

   Your Discord User ID:
   1477147585478267043
*/

const DEVELOPER_USER_IDS = [

    "1477147585478267043"

];


const APPLICATION_INVITE_MAX_USES =
    1;

const APPLICATION_INVITE_MAX_AGE =
    60 * 60 * 24;


/* =========================================================
   KYŌKEN EMBED COLORS
   ========================================================= */

const KYOKEN_EMBED_COLORS = {

    primary:
        0x9D1111,

    pending:
        0xFFD84D,

    accepted:
        0xD21B1B,

    rejected:
        0x450707,

    tryout:
        0xD21B1B

};


/* =========================================================
   TRY OUT FAILURE REASONS
   ========================================================= */

const TRYOUT_FAIL_REASONS = {

    DID_NOT_PASS:
        "❌ DID NOT PASS TRYOUT",

    CLAN_HOPPING_FALSE_INFO:
        "🔄 CLAN HOPPING / FALSE INFORMATION",

    NO_MIC:
        "🎤 NO WORKING MIC",

    OTHER:
        "🚫 OTHER"

};


/* =========================================================
   ENVIRONMENT CHECK
   ========================================================= */

const requiredEnvironment = {

    DISCORD_CLIENT_ID,

    DISCORD_CLIENT_SECRET,

    DISCORD_BOT_TOKEN,

    DISCORD_GUILD_ID,

    SESSION_SECRET

};


for (
    const [key, value]
    of Object.entries(
        requiredEnvironment
    )
) {

    if (!value) {

        console.warn(
            `WARNING: ${key} is missing from .env`
        );

    }

}


/* =========================================================
   DISCORD BOT
   ========================================================= */

const discordClient =
    new Client({

        intents: [

            GatewayIntentBits.Guilds,

            GatewayIntentBits.GuildMembers,

            GatewayIntentBits.GuildPresences

        ]

    });


/* =========================================================
   DISCORD PRESENCE UPDATE
   ========================================================= */

/*
   Register this listener only after discordClient has been
   initialized. This prevents a temporal-dead-zone error during
   server startup while keeping real-time presence detection.
*/
discordClient.on(
    "presenceUpdate",
    function (
        oldPresence,
        newPresence
    ) {

        if (
            !newPresence ||
            !newPresence.guild ||
            newPresence.guild.id !== KYOKEN_SERVER_ID
        ) {

            return;

        }

        cacheDiscordPresence(
            newPresence.userId,
            newPresence.status || "offline"
        );

    }
);


/* =========================================================
   KYŌKEN ROLE IDS
   ========================================================= */

const KYOKEN_ROLES = {

    leader:
        "1533687113487351951",

    viceleader:
        "1533687005832024205",

    secretary:
        "1533687577914380298",

    admins:
        "1533696257237975221",

    division1:
        "1533687696495743148",

    division2:
        "1533687836316925983",

    division3:
        "1533687911139119125",

    division4:
        "1533793002638676078",

    division5:
        "1533795938814918657"

};


/* =========================================================
   POSITION NAMES
   ========================================================= */

const KYOKEN_POSITION_NAMES = {

    leader:
        "LEADER",

    viceleader:
        "VICE LEADER",

    secretary:
        "SECRETARY",

    admins:
        "ADMINS",

    division1:
        "CAPTAIN",

    division2:
        "CAPTAIN",

    division3:
        "CAPTAIN",

    division4:
        "CAPTAIN",

    division5:
        "CAPTAIN"

};


/* =========================================================
   KYŌKEN PERMISSIONS
   ========================================================= */

const KYOKEN_PERMISSION_DEFAULTS = {
    leader: { editOwnProfile: true, manageApplications: true, manageAnnouncements: true, deleteAnnouncements: true, viewActivityLogs: true },
    viceleader: { editOwnProfile: true, manageApplications: true, manageAnnouncements: true, deleteAnnouncements: true, viewActivityLogs: true },
    secretary: { editOwnProfile: true, manageApplications: true, manageAnnouncements: true, deleteAnnouncements: true, viewActivityLogs: true },
    admins: { editOwnProfile: true, manageApplications: true, manageAnnouncements: true, deleteAnnouncements: true, viewActivityLogs: true },
    division1: { editOwnProfile: true, manageApplications: false, manageAnnouncements: false, deleteAnnouncements: false, viewActivityLogs: true },
    division2: { editOwnProfile: true, manageApplications: false, manageAnnouncements: false, deleteAnnouncements: false, viewActivityLogs: true },
    division3: { editOwnProfile: true, manageApplications: false, manageAnnouncements: false, deleteAnnouncements: false, viewActivityLogs: true },
    division4: { editOwnProfile: true, manageApplications: false, manageAnnouncements: false, deleteAnnouncements: false, viewActivityLogs: true },
    division5: { editOwnProfile: true, manageApplications: false, manageAnnouncements: false, deleteAnnouncements: false, viewActivityLogs: true }
};

const KYOKEN_PERMISSIONS = Object.fromEntries(
    Object.entries(KYOKEN_PERMISSION_DEFAULTS).map(([position, permissions]) => [position, { ...permissions }])
);


/* =========================================================
   ALLOWED FIGHTING STYLES
   ========================================================= */

const ALLOWED_FIGHTING_STYLES = [

    "Basic",
    "Slugger",
    "Muay Thai",
    "Karate",
    "Kickboxing",
    "Boxing",
    "Striker",
    "Capoeira",
    "Wrestling",
    "Kure",
    "Hakari",
    "Kyoushin Karate",
    "Ali",
    "WingChun",
    "CQC"

];


/* =========================================================
   DATABASE
   ========================================================= */

const useTurso =
    !!process.env.TURSO_DATABASE_URL &&
    !!process.env.TURSO_AUTH_TOKEN;

const databasePath = useTurso
    ? path.join(__dirname, ".kyoken-replica.db")
    : (
        process.env.DATABASE_PATH ||
        path.join(__dirname, "kyoken.db")
    );

const db = useTurso
    ? new Database(databasePath, {
        syncUrl: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    })
    : new Database(databasePath);

if (useTurso) {
    db.sync();
}


/* =========================================================
   PROFILE TABLE
   ========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (

        user_id TEXT PRIMARY KEY,

        display_name TEXT NOT NULL,

        main_fighting_style TEXT NOT NULL,

        secondary_fighting_style TEXT DEFAULT '',

        description TEXT DEFAULT '',

        profile_image TEXT DEFAULT NULL,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL

    )
`);


/* =========================================================
   APPLICATION TABLE
   ========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS applications (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        discord_user_id TEXT NOT NULL,

        discord_username TEXT NOT NULL,

        gender TEXT NOT NULL,

        age INTEGER NOT NULL,

        ign TEXT NOT NULL,

        main_style TEXT NOT NULL,

        secondary_style TEXT DEFAULT '',

        device TEXT NOT NULL,

        microphone TEXT NOT NULL DEFAULT 'No',

        past_gang TEXT NOT NULL,

        previous_clan TEXT DEFAULT '',

        reason TEXT DEFAULT '',

        status TEXT NOT NULL DEFAULT 'PENDING',

        reviewed_by TEXT DEFAULT '',

        reviewed_at TEXT DEFAULT NULL,

        created_at TEXT NOT NULL,

        application_message_id TEXT DEFAULT NULL,

        invite_code TEXT DEFAULT NULL,

        invite_url TEXT DEFAULT NULL,

        invite_expires_at TEXT DEFAULT NULL,

        joined_user_id TEXT DEFAULT NULL,

        joined_at TEXT DEFAULT NULL,

        tryout_reviewed_by TEXT DEFAULT NULL,

        tryout_reviewed_at TEXT DEFAULT NULL,

        tryout_fail_reason TEXT DEFAULT NULL

    )
`);


/* =========================================================
   ANNOUNCEMENTS TABLE
   ========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        discord_message_id TEXT DEFAULT NULL,

        author_user_id TEXT NOT NULL,

        author_username TEXT NOT NULL,

        title TEXT NOT NULL,

        content TEXT NOT NULL,

        category TEXT NOT NULL DEFAULT 'GENERAL',

        created_at TEXT NOT NULL,

        expires_at TEXT DEFAULT NULL,

        highlighted INTEGER NOT NULL DEFAULT 1

    )
`);

/* =========================================================
   STAFF PERMISSIONS + ACTIVITY LOG TABLES
   ========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS staff_permissions (
        position TEXT PRIMARY KEY,
        permissions_json TEXT NOT NULL,
        updated_by TEXT DEFAULT '',
        updated_at TEXT NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id TEXT NOT NULL,
        actor_username TEXT NOT NULL,
        actor_position TEXT DEFAULT '',
        action TEXT NOT NULL,
        target_type TEXT DEFAULT '',
        target_id TEXT DEFAULT '',
        details TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
`);

for (const [position, permissions] of Object.entries(KYOKEN_PERMISSION_DEFAULTS)) {
    const existing = db.prepare('SELECT position FROM staff_permissions WHERE position = ?').get(position);
    if (!existing) {
        db.prepare('INSERT INTO staff_permissions (position, permissions_json, updated_at) VALUES (?, ?, ?)').run(position, JSON.stringify(permissions), new Date().toISOString());
    }
}

function getKyokenPermissions(position) {
    const defaults = KYOKEN_PERMISSION_DEFAULTS[position] || {};
    const row = position ? db.prepare('SELECT permissions_json FROM staff_permissions WHERE position = ?').get(position) : null;
    if (!row) return { ...defaults };
    try { return { ...defaults, ...JSON.parse(row.permissions_json || '{}') }; } catch { return { ...defaults }; }
}

function logActivity(actor, action, targetType = '', targetId = '', details = '') {
    try {
        db.prepare(`INSERT INTO activity_logs (actor_user_id, actor_username, actor_position, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(actor?.userId || '', actor?.username || 'SYSTEM', actor?.position || '', action, targetType, String(targetId || ''), details, new Date().toISOString());
    } catch (error) {
        console.error('Kyōken activity log write failed:', error);
    }
}



/* =========================================================
   DATABASE MIGRATION
   ========================================================= */

function ensureColumn(
    table,
    column,
    definition
) {

    const columns =
        db
            .prepare(
                `PRAGMA table_info(${table})`
            )
            .all();


    const exists =
        columns.some(
            item =>
                item.name === column
        );


    if (!exists) {

        db.exec(
            `
            ALTER TABLE ${table}
            ADD COLUMN ${column} ${definition}
            `
        );

    }

}


const applicationColumns = [

    [
        "microphone",
        "TEXT NOT NULL DEFAULT 'No'"
    ],

    [
        "application_message_id",
        "TEXT DEFAULT NULL"
    ],

    [
        "invite_code",
        "TEXT DEFAULT NULL"
    ],

    [
        "invite_url",
        "TEXT DEFAULT NULL"
    ],

    [
        "invite_expires_at",
        "TEXT DEFAULT NULL"
    ],

    [
        "joined_user_id",
        "TEXT DEFAULT NULL"
    ],

    [
        "joined_at",
        "TEXT DEFAULT NULL"
    ],

    [
        "tryout_reviewed_by",
        "TEXT DEFAULT NULL"
    ],

    [
        "tryout_reviewed_at",
        "TEXT DEFAULT NULL"
    ],

    [
        "tryout_fail_reason",
        "TEXT DEFAULT NULL"
    ]

];

const announcementColumns = [

    [
        "category",
        "TEXT NOT NULL DEFAULT 'GENERAL'"
    ],

    [
        "expires_at",
        "TEXT DEFAULT NULL"
    ],

    [
        "highlighted",
        "INTEGER NOT NULL DEFAULT 1"
    ]

];

announcementColumns.forEach(
    function (
        [column, definition]
    ) {

        ensureColumn(
            "announcements",
            column,
            definition
        );

    }
);



for (
    const [
        column,
        definition
    ]
    of applicationColumns
) {

    ensureColumn(
        "applications",
        column,
        definition
    );

}


/* =========================================================
   PROFILE DATABASE HELPERS
   ========================================================= */

function getProfile(
    userId
) {

    return db
        .prepare(`
            SELECT
                user_id,
                display_name,
                main_fighting_style,
                secondary_fighting_style,
                description,
                profile_image,
                created_at,
                updated_at
            FROM profiles
            WHERE user_id = ?
        `)
        .get(
            userId
        );

}


function createDefaultProfile(
    userId,
    displayName
) {

    const now =
        new Date().toISOString();


    db.prepare(`
        INSERT INTO profiles (
            user_id,
            display_name,
            main_fighting_style,
            secondary_fighting_style,
            description,
            profile_image,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(

        userId,
        displayName,
        "—",
        "",
        "",
        null,
        now,
        now

    );


    return getProfile(
        userId
    );

}


function updateProfile(
    userId,
    displayName,
    mainFightingStyle,
    secondaryFightingStyle,
    description,
    profileImage
) {

    const now =
        new Date().toISOString();


    db.prepare(`
        UPDATE profiles
        SET
            display_name = ?,
            main_fighting_style = ?,
            secondary_fighting_style = ?,
            description = ?,
            profile_image = ?,
            updated_at = ?
        WHERE user_id = ?
    `).run(

        displayName,
        mainFightingStyle,
        secondaryFightingStyle,
        description,
        profileImage,
        now,
        userId

    );


    return getProfile(
        userId
    );

}


/* =========================================================
   APPLICATION DATABASE HELPERS
   ========================================================= */

function getApplication(
    applicationId
) {

    return db
        .prepare(`
            SELECT *
            FROM applications
            WHERE id = ?
        `)
        .get(
            applicationId
        );

}


function updateApplicationStatus(
    applicationId,
    status,
    reviewerId,
    reviewedAt
) {

    db.prepare(`
        UPDATE applications
        SET
            status = ?,
            reviewed_by = ?,
            reviewed_at = ?
        WHERE id = ?
    `).run(

        status,
        reviewerId,
        reviewedAt,
        applicationId

    );


    return getApplication(
        applicationId
    );

}


/* =========================================================
   ACCOUNT APPLICATION RECORD
   ========================================================= */

function getApplicantAccountRecord(
    userId,
    currentApplicationId
) {

    const records =
        db
            .prepare(`
                SELECT
                    id,
                    status,
                    reason,
                    tryout_fail_reason
                FROM applications
                WHERE discord_user_id = ?
                AND id != ?
                ORDER BY id ASC
            `)
            .all(

                userId,
                currentApplicationId

            );


    if (
        records.length === 0
    ) {

        return "No previous application records.";

    }


    const lines = [];


    for (
        const record
        of records
    ) {

        let statusText =
            "⚪ " +
            record.status;


        if (
            record.status ===
            "PENDING"
        ) {

            statusText =
                "🟡 PENDING";

        }

        else if (
            record.status ===
            "ACCEPTED"
        ) {

            statusText =
                "🟢 ACCEPTED";

        }

        else if (
            record.status ===
            "REJECTED"
        ) {

            statusText =
                "🔴 REJECTED";

        }

        else if (
            record.status ===
            "TRYOUT"
        ) {

            statusText =
                "🟡 TRY OUT";

        }

        else if (
            record.status ===
            "APPROVED"
        ) {

            statusText =
                "🟢 TRY OUT PASSED";

        }

        else if (
            record.status ===
            "TRYOUT_FAILED"
        ) {

            statusText =
                "🔄 TRY OUT FAILED";

        }


        lines.push(

            `Application #${record.id} — ${statusText}`

        );


        let reasonText =
            null;


        if (
            record.status ===
                "TRYOUT_FAILED" &&
            record.tryout_fail_reason
        ) {

            reasonText =
                record.tryout_fail_reason;

        }

        else if (
            record.status ===
            "REJECTED"
        ) {

            reasonText =
                "APPLICATION REJECTED";

        }

        else if (
            record.reason
        ) {

            reasonText =
                record.reason;

        }


        if (
            reasonText
        ) {

            lines.push(

                `Reason: ${truncateDiscordText(reasonText, 1000)}`

            );

        }


        lines.push("");

    }


    return lines
        .join("\n")
        .trim();

}


/* =========================================================
   APPLICATION COOLDOWN HELPERS
   ========================================================= */

function isDeveloperUser(
    userId
) {

    return DEVELOPER_USER_IDS.includes(

        String(
            userId
        )

    );

}


function getApplicationCooldown(
    userId
) {

    if (
        isDeveloperUser(
            userId
        )
    ) {

        return {

            allowed:
                true,

            remainingMs:
                0,

            bypass:
                true

        };

    }


    const latestApplication =
        db
            .prepare(`
                SELECT
                    created_at
                FROM applications
                WHERE discord_user_id = ?
                ORDER BY id DESC
                LIMIT 1
            `)
            .get(
                userId
            );


    if (
        !latestApplication ||
        !latestApplication.created_at
    ) {

        return {

            allowed:
                true,

            remainingMs:
                0,

            bypass:
                false

        };

    }


    const submittedAt =
        new Date(
            latestApplication.created_at
        ).getTime();


    if (
        Number.isNaN(
            submittedAt
        )
    ) {

        return {

            allowed:
                true,

            remainingMs:
                0,

            bypass:
                false

        };

    }


    const nextAllowedTime =
        submittedAt +
        APPLICATION_COOLDOWN_MS;


    const remainingMs =
        nextAllowedTime -
        Date.now();


    if (
        remainingMs <= 0
    ) {

        return {

            allowed:
                true,

            remainingMs:
                0,

            bypass:
                false

        };

    }


    return {

        allowed:
            false,

        remainingMs:
            remainingMs,

        bypass:
            false

    };

}


function formatCooldown(
    milliseconds
) {

    const totalSeconds =
        Math.ceil(
            milliseconds /
            1000
        );


    const days =
        Math.floor(
            totalSeconds /
            86400
        );


    const hours =
        Math.floor(
            (
                totalSeconds %
                86400
            ) /
            3600
        );


    const minutes =
        Math.floor(
            (
                totalSeconds %
                3600
            ) /
            60
        );


    const seconds =
        totalSeconds %
        60;


    return `${days}d ${hours}h ${minutes}m ${seconds}s`;

}


/* =========================================================
   PROFILE UPLOAD DIRECTORY
   ========================================================= */

const uploadDirectory =
    process.env.UPLOADS_DIR ||
    path.join(
        __dirname,
        "uploads"
    );


if (
    !fs.existsSync(
        uploadDirectory
    )
) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive:
                true
        }
    );

}


/* =========================================================
   PROFILE IMAGE STORAGE
   ========================================================= */

const profileImageStorage =
    multer.diskStorage({

        destination(
            req,
            file,
            callback
        ) {

            callback(
                null,
                uploadDirectory
            );

        },


        filename(
            req,
            file,
            callback
        ) {

            const extensionMap = {

                "image/jpeg":
                    ".jpg",

                "image/png":
                    ".png",

                "image/webp":
                    ".webp"

            };


            const extension =
                extensionMap[
                    file.mimetype
                ];


            if (!extension) {

                return callback(

                    new Error(
                        "Unsupported image type."
                    )

                );

            }


            const userId =
                req.session?.discord?.id ||
                "unknown";


            const safeUserId =
                String(
                    userId
                ).replace(
                    /[^a-zA-Z0-9_-]/g,
                    ""
                );


            callback(

                null,

                `${safeUserId}-${Date.now()}${extension}`

            );

        }

    });


const profileUpload =
    multer({

        storage:
            profileImageStorage,

        limits: {

            fileSize:
                5 * 1024 * 1024,

            files:
                1

        },


        fileFilter(
            req,
            file,
            callback
        ) {

            const allowedTypes = [

                "image/jpeg",
                "image/png",
                "image/webp"

            ];


            if (
                allowedTypes.includes(
                    file.mimetype
                )
            ) {

                callback(
                    null,
                    true
                );

            } else {

                callback(

                    new Error(
                        "Only JPG, PNG, and WEBP images are allowed."
                    )

                );

            }

        }

    });


/* =========================================================
   EXPRESS SETUP
   ========================================================= */

app.use(
    express.json()
);


app.use(
    express.urlencoded({

        extended:
            true

    })
);


/* =========================================================
   SESSION
   ========================================================= */

app.use(
    session({

        secret:
            SESSION_SECRET,

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            secure:
                process.env.NODE_ENV === "production",

            sameSite:
                "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24

        }

    })
);


/* =========================================================
   KYŌKEN COMMAND PAGE PROTECTION
   ========================================================= */

app.get(
    "/command.html",
    async function (
        req,
        res,
        next
    ) {

        if (!req.session.discord) {

            return res.redirect("/auth/discord");

        }

        const roleIds =
            await getKyokenMemberRoles(
                req.session.discord.id
            );

        const position =
            getKyokenPosition(roleIds);

        if (!isKyokenHeadquartersPosition(position)) {

            return res
                .status(403)
                .send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>KYŌKEN COMMAND — ACCESS DENIED</title>
                        <style>
                            body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;font-family:Arial,sans-serif;text-align:center}
                            .box{max-width:520px;padding:42px;border:1px solid rgba(157,17,17,.5);background:#101010;box-shadow:0 0 40px rgba(157,17,17,.15)}
                            h1{color:#d21b1b;letter-spacing:4px}
                            p{color:#aaa;line-height:1.7}
                            a{color:#fff;text-decoration:none;border:1px solid #9d1111;padding:12px 20px;display:inline-block;margin-top:15px}
                        </style>
                    </head>
                    <body>
                        <div class="box">
                            <h1>ACCESS DENIED</h1>
                            <p>You are not authorized to access KYŌKEN COMMAND.</p>
                            <a href="/">RETURN HOME</a>
                        </div>
                    </body>
                    </html>
                `);

        }

        res.sendFile(
            path.join(__dirname, "command.html")
        );

    }
);


/* =========================================================
   KYŌKEN ANNOUNCEMENTS PAGE PROTECTION
   ========================================================= */

app.get(
    "/announcements.html",
    async function (req, res) {

        if (!req.session.discord) {
            return res.redirect("/auth/discord");
        }

        try {
            const roleIds = await getKyokenMemberRoles(req.session.discord.id);
            const position = getKyokenPosition(roleIds);

            if (!isKyokenHeadquartersPosition(position)) {
                return res.status(403).send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>KYŌKEN ANNOUNCEMENTS — ACCESS DENIED</title>
                        <style>
                            body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;font-family:Arial,sans-serif;text-align:center}
                            .box{max-width:520px;padding:42px;border:1px solid rgba(157,17,17,.5);background:#101010;box-shadow:0 0 40px rgba(157,17,17,.15)}
                            h1{color:#d21b1b;letter-spacing:4px}
                            p{color:#aaa;line-height:1.7}
                            a{color:#fff;text-decoration:none;border:1px solid #9d1111;padding:12px 20px;display:inline-block;margin-top:15px}
                        </style>
                    </head>
                    <body>
                        <div class="box">
                            <h1>ACCESS DENIED</h1>
                            <p>Only KYŌKEN Headquarters can access the announcement management system.</p>
                            <a href="/">RETURN HOME</a>
                        </div>
                    </body>
                    </html>
                `);
            }

            return res.sendFile(path.join(__dirname, "announcements.html"));

        } catch (error) {
            console.error("Kyōken announcements page access check failed:", error);
            return res.status(500).send("Unable to verify announcement access.");
        }
    }
);


/* =========================================================
   STATIC WEBSITE
   ========================================================= */

app.use(
    express.static(
        __dirname
    )
);


/* =========================================================
   PROFILE IMAGES
   ========================================================= */

app.use(
    "/uploads",
    express.static(
        uploadDirectory
    )
);


/* =========================================================
   DISCORD MEMBER ROLE LOOKUP
   ========================================================= */

async function getKyokenMemberRoles(
    userId
) {

    try {

        const response =
            await axios.get(

                `${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${userId}`,

                {

                    headers: {

                        Authorization:
                            `Bot ${DISCORD_BOT_TOKEN}`

                    }

                }

            );


        return response.data.roles || [];

    } catch (error) {

        console.error(

            "Discord role lookup failed:",

            error.response?.data ||
            error.message

        );


        return [];

    }

}


/* =========================================================
   DETERMINE KYŌKEN POSITION
   ========================================================= */

function getKyokenPosition(
    roleIds
) {

    const roleOrder = [

        [
            "leader",
            KYOKEN_ROLES.leader
        ],

        [
            "viceleader",
            KYOKEN_ROLES.viceleader
        ],

        [
            "secretary",
            KYOKEN_ROLES.secretary
        ],

        [
            "admins",
            KYOKEN_ROLES.admins
        ],

        [
            "division1",
            KYOKEN_ROLES.division1
        ],

        [
            "division2",
            KYOKEN_ROLES.division2
        ],

        [
            "division3",
            KYOKEN_ROLES.division3
        ],

        [
            "division4",
            KYOKEN_ROLES.division4
        ],

        [
            "division5",
            KYOKEN_ROLES.division5
        ]

    ];


    for (
        const [
            position,
            roleId
        ]
        of roleOrder
    ) {

        if (
            roleIds.includes(
                roleId
            )
        ) {

            return position;

        }

    }


    return null;

}


/* =========================================================
   POSITION NAME
   ========================================================= */

function getKyokenPositionName(
    position
) {

    return (

        KYOKEN_POSITION_NAMES[
            position
        ] ||

        null

    );

}


/* =========================================================
   HEADQUARTERS ACCESS
   ========================================================= */

function isKyokenHeadquartersPosition(
    position
) {

    return [
        "leader",
        "viceleader",
        "secretary",
        "admins"
    ].includes(position);

}

/* =========================================================
   DIVISION CAPTAIN ACCESS
   ========================================================= */

function isKyokenDivisionCaptainPosition(
    position
) {

    return [
        "division1",
        "division2",
        "division3",
        "division4",
        "division5"
    ].includes(position);

}


/* =========================================================
   REMOVE UPLOADED FILE
   ========================================================= */

function removeUploadedFile(
    file
) {

    if (
        !file?.path
    ) {

        return;

    }


    fs.unlink(

        file.path,

        error => {

            if (

                error &&
                error.code !==
                    "ENOENT"

            ) {

                console.error(

                    "Unable to delete uploaded file:",

                    error

                );

            }

        }

    );

}


/* =========================================================
   DISCORD LOGIN
   ========================================================= */

app.get(
    "/auth/discord",
    function (
        req,
        res
    ) {

        const requestedReturnTo =
            typeof req.query.returnTo === "string"
                ? req.query.returnTo
                : "/";

        const safeReturnTo =
            requestedReturnTo.startsWith("/") &&
            !requestedReturnTo.startsWith("//")
                ? requestedReturnTo
                : "/";

        req.session.loginReturnTo =
            safeReturnTo;

        const params =
            new URLSearchParams({

                client_id:
                    DISCORD_CLIENT_ID,

                response_type:
                    "code",

                redirect_uri:
                    DISCORD_REDIRECT_URI,

                scope:
                    "identify guilds"

            });


        res.redirect(

            `${DISCORD_AUTHORIZE_URL}?${params.toString()}`

        );

    }
);


/* =========================================================
   DISCORD CALLBACK
   ========================================================= */

app.get(
    "/auth/discord/callback",
    async function (
        req,
        res
    ) {

        const code =
            req.query.code;


        if (!code) {

            return res
                .status(400)
                .send(
                    "Discord authorization code is missing."
                );

        }


        try {

            const tokenResponse =
                await axios.post(

                    `${DISCORD_API}/oauth2/token`,

                    new URLSearchParams({

                        client_id:
                            DISCORD_CLIENT_ID,

                        client_secret:
                            DISCORD_CLIENT_SECRET,

                        grant_type:
                            "authorization_code",

                        code,

                        redirect_uri:
                            DISCORD_REDIRECT_URI

                    }).toString(),

                    {

                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded"

                        }

                    }

                );


            const accessToken =
                tokenResponse.data.access_token;


            const userResponse =
                await axios.get(

                    `${DISCORD_API}/users/@me`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`

                        }

                    }

                );


            const user =
                userResponse.data;


            const guildResponse =
                await axios.get(

                    `${DISCORD_API}/users/@me/guilds`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`

                        }

                    }

                );


            const guilds =
                guildResponse.data;


            const kyokenGuild =
                guilds.find(

                    guild =>

                        String(
                            guild.id
                        ) ===
                        String(
                            DISCORD_GUILD_ID
                        )

                );


            req.session.discord = {

                id:
                    user.id,

                username:
                    user.username,

                globalName:
                    user.global_name ||
                    null,

                avatar:
                    user.avatar ||
                    null,

                kyokenMember:
                    Boolean(
                        kyokenGuild
                    )

            };


            if (

                kyokenGuild &&

                !getProfile(
                    user.id
                )

            ) {

                createDefaultProfile(

                    user.id,

                    user.global_name ||
                    user.username

                );

            }


            const loginReturnTo =
                req.session.loginReturnTo ||
                "/";

            delete req.session.loginReturnTo;

            res.redirect(
                loginReturnTo
            );

        } catch (error) {

            console.error(

                "Discord OAuth error:",

                error.response?.data ||
                error.message

            );


            res
                .status(500)
                .send(
                    "Discord login failed."
                );

        }

    }
);


/* =========================================================
   CURRENT USER
   ========================================================= */

app.get(
    "/api/me",
    async function (
        req,
        res
    ) {

        if (
            !req.session.discord
        ) {

            return res.json({

                loggedIn:
                    false

            });

        }


        const user =
            req.session.discord;


        const roleIds =
            await getKyokenMemberRoles(
                user.id
            );


        const position =
            getKyokenPosition(
                roleIds
            );


        const permissions =
            getKyokenPermissions(position) || {

                editOwnProfile:
                    false,

                manageApplications:
                    false

            };


        res.json({

            loggedIn:
                true,

            user: {

                id:
                    user.id,

                username:
                    user.username,

                globalName:
                    user.globalName,

                avatar:
                    user.avatar,

                kyokenMember:
                    Boolean(
                        position
                    ),

                position:
                    position,

                positionName:
                    getKyokenPositionName(
                        position
                    ),

                permissions:
                    permissions

            }

        });

    }
);


/* =========================================================
   GET MY PROFILE
   ========================================================= */

app.get(
    "/api/profile/me",
    async function (
        req,
        res
    ) {

        if (
            !req.session.discord
        ) {

            return res
                .status(401)
                .json({

                    error:
                        "You must log in with Discord."

                });

        }


        const user =
            req.session.discord;


        const roleIds =
            await getKyokenMemberRoles(
                user.id
            );


        const position =
            getKyokenPosition(
                roleIds
            );


        if (
            !position
        ) {

            return res
                .status(403)
                .json({

                    error:
                        "Your Discord role is not connected to a Kyōken officer profile."

                });

        }


        const permissions =
            getKyokenPermissions(position) || {

                editOwnProfile:
                    false,

                manageApplications:
                    false

            };


        let profile =
            getProfile(
                user.id
            );


        if (
            !profile
        ) {

            profile =
                createDefaultProfile(

                    user.id,

                    user.globalName ||
                    user.username

                );

        }


        res.json({

            success:
                true,

            profile: {

                userId:
                    profile.user_id,

                displayName:
                    profile.display_name,

                fightingStyle:
                    profile.main_fighting_style,

                secondaryFightingStyle:
                    profile.secondary_fighting_style ||
                    "",

                description:
                    profile.description ||
                    "",

                profileImage:
                    profile.profile_image ||
                    null,

                discordUsername:
                    user.username,

                position:
                    position,

                positionName:
                    getKyokenPositionName(
                        position
                    ),

                permissions: {

                    editOwnProfile:
                        permissions.editOwnProfile,

                    manageApplications:
                        permissions.manageApplications

                }

            }

        });

    }
);


/* =========================================================
   UPDATE MY PROFILE
   ========================================================= */

app.post(
    "/api/profile/me",

    profileUpload.single(
        "profileImage"
    ),

    async function (
        req,
        res
    ) {

        if (
            !req.session.discord
        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(401)
                .json({

                    error:
                        "You must log in with Discord."

                });

        }


        const user =
            req.session.discord;


        const roleIds =
            await getKyokenMemberRoles(
                user.id
            );


        const position =
            getKyokenPosition(
                roleIds
            );


        const permissions =
            KYOKEN_PERMISSIONS[
                position
            ];


        if (

            !permissions ||
            !permissions.editOwnProfile

        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(403)
                .json({

                    error:
                        "You do not have permission to edit a Kyōken profile."

                });

        }


        const displayName =
            typeof req.body.displayName ===
                "string"

                ? req.body.displayName.trim()

                : "";


        const mainFightingStyle =
            typeof req.body.fightingStyle ===
                "string"

                ? req.body.fightingStyle.trim()

                : "";


        const secondaryFightingStyle =
            typeof req.body.secondaryFightingStyle ===
                "string"

                ? req.body.secondaryFightingStyle.trim()

                : "";


        const description =
            typeof req.body.description ===
                "string"

                ? req.body.description.trim()

                : "";


        if (
            !displayName
        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Display name cannot be empty."

                });

        }


        if (
            displayName.length >
            50
        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Display name cannot exceed 50 characters."

                });

        }


        if (
            !mainFightingStyle
        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Please select a main fighting style."

                });

        }


        if (

            !ALLOWED_FIGHTING_STYLES.includes(
                mainFightingStyle
            )

        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Invalid main fighting style."

                });

        }


        if (

            secondaryFightingStyle &&

            !ALLOWED_FIGHTING_STYLES.includes(
                secondaryFightingStyle
            )

        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Invalid secondary fighting style."

                });

        }


        if (

            secondaryFightingStyle &&

            mainFightingStyle ===
                secondaryFightingStyle

        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Main and secondary fighting styles cannot be the same."

                });

        }


        if (
            description.length >
            500
        ) {

            removeUploadedFile(
                req.file
            );


            return res
                .status(400)
                .json({

                    error:
                        "Description cannot exceed 500 characters."

                });

        }


        let profile =
            getProfile(
                user.id
            );


        if (
            !profile
        ) {

            profile =
                createDefaultProfile(

                    user.id,

                    user.globalName ||
                    user.username

                );

        }


        const oldImage =
            profile.profile_image ||
            null;


        let newProfileImage =
            oldImage;


        if (
            req.file
        ) {

            newProfileImage =
                `/uploads/${req.file.filename}`;

        }


        const updatedProfile =
            updateProfile(

                user.id,

                displayName,

                mainFightingStyle,

                secondaryFightingStyle,

                description,

                newProfileImage

            );


        if (

            req.file &&

            oldImage &&

            oldImage.startsWith(
                "/uploads/"
            )

        ) {

            const oldFilename =
                path.basename(
                    oldImage
                );


            const oldPath =
                path.join(
                    uploadDirectory,
                    oldFilename
                );


            const uploadRoot =
                path.resolve(
                    uploadDirectory
                );


            const resolvedOldPath =
                path.resolve(
                    oldPath
                );


            if (
                resolvedOldPath.startsWith(
                    uploadRoot +
                    path.sep
                )
            ) {

                fs.unlink(

                    resolvedOldPath,

                    error => {

                        if (

                            error &&

                            error.code !==
                                "ENOENT"

                        ) {

                            console.error(

                                "Unable to delete old profile image:",

                                error

                            );

                        }

                    }

                );

            }

        }


        logActivity({ userId: user.id, username: user.username, position }, 'UPDATED OWN PROFILE', 'PROFILE', user.id, 'Kyōken officer profile updated.');

        res.json({

            success:
                true,

            message:
                "Kyōken profile updated successfully.",

            profile: {

                userId:
                    updatedProfile.user_id,

                displayName:
                    updatedProfile.display_name,

                fightingStyle:
                    updatedProfile.main_fighting_style,

                secondaryFightingStyle:
                    updatedProfile.secondary_fighting_style ||
                    "",

                description:
                    updatedProfile.description ||
                    "",

                profileImage:
                    updatedProfile.profile_image ||
                    null,

                position:
                    position,

                positionName:
                    getKyokenPositionName(
                        position
                    )

            }

        });

    }
);


/* =========================================================
   PUBLIC OFFICER PROFILES
   ========================================================= */

app.get(
    "/api/officers",
    async function (
        req,
        res
    ) {

        try {

            const profiles =
                db
                    .prepare(`
                        SELECT
                            user_id,
                            display_name,
                            main_fighting_style,
                            secondary_fighting_style,
                            description,
                            profile_image
                        FROM profiles
                        ORDER BY updated_at DESC
                    `)
                    .all();


            const officers = [];


            /*
               Presence is maintained by the Discord Gateway. The
               initial snapshot is loaded once and subsequent changes
               arrive through presenceUpdate.
            */
            if (
                discordClient.isReady() &&
                kyokenOfficerPresenceCache.size === 0
            ) {

                await initializeKyokenPresenceCache();

            }


            for (
                const profile
                of profiles
            ) {

                const roleIds =
                    await getKyokenMemberRoles(
                        profile.user_id
                    );


                const position =
                    getKyokenPosition(
                        roleIds
                    );


                if (
                    !position
                ) {

                    continue;

                }


                /*
                   Discord presence values are: online, idle, dnd,
                   or offline. A missing presence is treated as offline,
                   which is also how Discord represents an invisible user.
                */
                const discordPresence =
                    kyokenOfficerPresenceCache.get(
                        String(profile.user_id)
                    ) ||
                    "offline";

                const isActive =
                    discordPresence === "online" ||
                    discordPresence === "idle" ||
                    discordPresence === "dnd";


                officers.push({

                    userId:
                        profile.user_id,

                    displayName:
                        profile.display_name,

                    position:
                        position,

                    positionName:
                        getKyokenPositionName(
                            position
                        ),

                    mainFightingStyle:
                        profile.main_fighting_style ||
                        "—",

                    secondaryFightingStyle:
                        profile.secondary_fighting_style ||
                        "",

                    description:
                        profile.description ||
                        "",

                    profileImage:
                        profile.profile_image ||
                        null,

                    status:
                        isActive
                            ? "ACTIVE"
                            : "OFFLINE",

                    discordPresence:
                        discordPresence

                });

            }


            res.json({

                success:
                    true,

                officers:
                    officers

            });

        } catch (error) {

            console.error(

                "Public officer profile error:",

                error

            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Unable to load officer profiles."

                });

        }

    }
);


/* =========================================================
   PUBLIC PLAYER COUNT CONFIGURATION
   ========================================================= */

const BOT_ROLE_ID =
    "1536884214689964162";


/* =========================================================
   FAST CACHED KYŌKEN PLAYER COUNT
   ========================================================= */

let kyokenPlayerCount =
    0;

let kyokenPlayerCountReady =
    false;

let kyokenPlayerCountPromise =
    null;


function isKyokenPlayer(
    member
) {

    if (
        !member ||
        !member.user
    ) {

        return false;

    }


    return (
        member.user.bot !== true &&
        !member.roles.cache.has(
            BOT_ROLE_ID
        )
    );

}


async function refreshKyokenPlayerCount() {

    if (
        !discordClient.isReady()
    ) {

        kyokenPlayerCountReady =
            false;

        return false;

    }


    try {

        const guild =
            await discordClient.guilds.fetch(
                KYOKEN_SERVER_ID
            );


        if (!guild) {

            throw new Error(
                "Kyōken Discord server could not be found."
            );

        }


        /*
           This is the ONLY full member fetch.

           After startup, the cached count is updated by
           guildMemberAdd, guildMemberRemove, and
           guildMemberUpdate events.
        */

        const members =
            await guild.members.fetch({
                withPresences: false
            });


        kyokenPlayerCount =
            members.filter(
                isKyokenPlayer
            ).size;


        kyokenPlayerCountReady =
            true;


        console.log(
            `Kyōken player count initialized: ${kyokenPlayerCount}`
        );


        return true;

    } catch (error) {

        console.error(
            "Kyōken player count initialization failed:",
            error
        );


        return false;

    }

}


function startKyokenPlayerCountCache() {

    /*
       Do not permanently cache a failed startup attempt.
       The frontend can request /api/server-stats before Discord
       finishes logging in. In that case refreshKyokenPlayerCount()
       returns false; the old implementation stored that false
       promise forever, so the counter could remain "-" even after
       Discord became ready.
    */
    if (
        !discordClient.isReady()
    ) {

        return Promise.resolve(false);

    }


    if (
        kyokenPlayerCountPromise
    ) {

        return kyokenPlayerCountPromise;

    }


    kyokenPlayerCountPromise =
        refreshKyokenPlayerCount();


    kyokenPlayerCountPromise =
        kyokenPlayerCountPromise.finally(
            function () {

                /*
                   Allow a later request to retry if Discord/member
                   fetching failed. A successful refresh is protected
                   by kyokenPlayerCountReady, so normal requests stay
                   instant.
                */
                kyokenPlayerCountPromise = null;

            }
        );


    return kyokenPlayerCountPromise;

}


/* =========================================================
   PLAYER COUNT — MEMBER JOIN
   ========================================================= */

discordClient.on(
    "guildMemberAdd",
    function (
        member
    ) {

        if (
            member.guild.id !==
            KYOKEN_SERVER_ID
        ) {

            return;

        }


        if (
            !kyokenPlayerCountReady
        ) {

            return;

        }


        if (
            isKyokenPlayer(
                member
            )
        ) {

            kyokenPlayerCount++;

            console.log(
                `Kyōken player joined. Player count: ${kyokenPlayerCount}`
            );

        }

    }
);


/* =========================================================
   PLAYER COUNT — MEMBER LEAVE
   ========================================================= */

discordClient.on(
    "guildMemberRemove",
    function (
        member
    ) {

        if (
            member.guild.id !==
            KYOKEN_SERVER_ID
        ) {

            return;

        }


        if (
            !kyokenPlayerCountReady
        ) {

            return;

        }


        if (
            isKyokenPlayer(
                member
            )
        ) {

            kyokenPlayerCount =
                Math.max(
                    0,
                    kyokenPlayerCount - 1
                );


            console.log(
                `Kyōken player left. Player count: ${kyokenPlayerCount}`
            );

        }

    }
);


/* =========================================================
   PLAYER COUNT — BOT ROLE / MEMBER UPDATE
   ========================================================= */

discordClient.on(
    "guildMemberUpdate",
    function (
        oldMember,
        newMember
    ) {

        if (
            newMember.guild.id !==
            KYOKEN_SERVER_ID
        ) {

            return;

        }


        if (
            !kyokenPlayerCountReady
        ) {

            return;

        }


        const wasPlayer =
            isKyokenPlayer(
                oldMember
            );


        const isPlayer =
            isKyokenPlayer(
                newMember
            );


        if (
            wasPlayer ===
            isPlayer
        ) {

            return;

        }


        if (
            isPlayer
        ) {

            kyokenPlayerCount++;

        } else {

            kyokenPlayerCount =
                Math.max(
                    0,
                    kyokenPlayerCount - 1
                );

        }


        console.log(
            `Kyōken player status changed. Player count: ${kyokenPlayerCount}`
        );

    }
);


/* =========================================================
   PUBLIC KYŌKEN SERVER STATS
   ========================================================= */

app.get(
    "/api/server-stats",
    async function (
        req,
        res
    ) {

        try {

            /*
               If the cache has not initialized yet, initialize it
               once. Normal requests after that are instant.
            */

            if (
                !kyokenPlayerCountReady
            ) {

                const initialized =
                    await startKyokenPlayerCountCache();


                if (
                    !initialized
                ) {

                    return res
                        .status(503)
                        .json({

                            success:
                                false,

                            error:
                                "Player count is still initializing. Please try again shortly."

                        });

                }

            }


            const guild =
                discordClient.guilds.cache.get(
                    KYOKEN_SERVER_ID
                );


        return res.json({

                success:
                    true,

                members:
                    kyokenPlayerCount,

                guildId:
                    guild?.id ||
                    KYOKEN_SERVER_ID,

                guildName:
                    guild?.name ||
                    "KYŌKEN CLAN",

                updatedAt:
                    new Date().toISOString()

            });

        } catch (error) {

            console.error(
                "Kyōken server stats error:",
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Unable to retrieve Kyōken server statistics."

                });

        }

    }
);


/* =========================================================
   START PLAYER COUNT CACHE WHEN DISCORD IS READY
   ========================================================= */

discordClient.once(
    "clientReady",
    function () {

        startKyokenPlayerCountCache();

    }
);


/* =========================================================
   SUBMIT APPLICATION
   ========================================================= */

app.get(
    "/api/applications/mine",
    async function (req, res) {
        if (!req.session.discord) {
            return res.status(401).json({ success: false, error: "You must log in with Discord." });
        }
        try {
            const application = db.prepare(`
                SELECT id, status, invite_url, invite_expires_at, created_at, reviewed_at, tryout_reviewed_at, tryout_fail_reason
                FROM applications
                WHERE discord_user_id = ?
                ORDER BY id DESC LIMIT 1
            `).get(req.session.discord.id);
            return res.json({ success: true, application: application || null });
        } catch (error) {
            console.error("Kyōken applicant status lookup failed:", error);
            return res.status(500).json({ success: false, error: "Unable to retrieve application status." });
        }
    }
);


app.post(
    "/api/applications",
    async function (
        req,
        res
    ) {

        if (
            !req.session.discord
        ) {

            return res
                .status(401)
                .json({

                    error:
                        "You must log in with Discord before applying."

                });

        }


        const user =
            req.session.discord;


        /* =================================================
           APPLICATION COOLDOWN
           ================================================= */

        const cooldown =
            getApplicationCooldown(
                user.id
            );


        if (
            !cooldown.allowed
        ) {

            return res
                .status(429)
                .json({

                    success:
                        false,

                    cooldown:
                        true,

                    remainingMs:
                        cooldown.remainingMs,

                    error:
                        `You must wait ${formatCooldown(cooldown.remainingMs)} before submitting another Kyōken application.`

                });

        }


        /* =================================================
           READ APPLICATION DATA
           ================================================= */

        const gender =
            typeof req.body.gender ===
                "string"

                ? req.body.gender.trim()

                : "";


        const age =
            Number(
                req.body.age
            );


        const ign =
            typeof req.body.ign ===
                "string"

                ? req.body.ign.trim()

                : "";


        const mainStyle =
            typeof req.body.mainStyle ===
                "string"

                ? req.body.mainStyle.trim()

                : "";


        const secondaryStyle =
            typeof req.body.secondaryStyle ===
                "string"

                ? req.body.secondaryStyle.trim()

                : "";


        const device =
            typeof req.body.device ===
                "string"

                ? req.body.device.trim()

                : "";


        const microphone =
            typeof req.body.microphone ===
                "string"

                ? req.body.microphone.trim()

                : "";


        const pastGang =
            typeof req.body.pastGang ===
                "string"

                ? req.body.pastGang.trim()

                : "";


        const previousClan =
            typeof req.body.previousClan ===
                "string"

                ? req.body.previousClan.trim()

                : "";


        const reason =
            typeof req.body.reason ===
                "string"

                ? req.body.reason.trim()

                : "";


        const validGenders = [

            "Male",
            "Female",
            "Other"

        ];


        const validDevices = [

            "Mobile",
            "PC",
            "Console",
            "PC & Mobile"

        ];


        const validMicrophone = [

            "Yes",
            "No"

        ];


        const validPastGang = [

            "None",
            "Yes"

        ];


        /* =================================================
           VALIDATION
           ================================================= */

        if (
            !validGenders.includes(
                gender
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please select a valid gender."

                });

        }


        if (

            !Number.isInteger(
                age
            ) ||

            age < 13 ||

            age > 99

        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Age must be between 13 and 99."

                });

        }


        if (

            !ign ||

            ign.length >
                32

        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please enter a valid Roblox / Gakuran IGN."

                });

        }


        if (
            !ALLOWED_FIGHTING_STYLES.includes(
                mainStyle
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please select a valid main fighting style."

                });

        }


        if (

            secondaryStyle &&

            !ALLOWED_FIGHTING_STYLES.includes(
                secondaryStyle
            )

        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please select a valid secondary fighting style."

                });

        }


        if (

            secondaryStyle &&

            mainStyle ===
                secondaryStyle

        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Main and secondary fighting styles cannot be the same."

                });

        }


        if (
            !validDevices.includes(
                device
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please select a valid device."

                });

        }


        if (
            !validMicrophone.includes(
                microphone
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please select whether you have a working microphone."

                });

        }


        if (
            !validPastGang.includes(
                pastGang
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "Please select a valid previous clan option."

                });

        }


        if (
            pastGang ===
            "Yes"
        ) {

            if (

                !previousClan ||

                previousClan.length >
                    60

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Please provide your previous clan / gang name."

                    });

            }


            if (

                !reason ||

                reason.length >
                    500

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Please provide a valid reason for leaving."

                    });

            }

        }


        /* =================================================
           SAVE APPLICATION
           ================================================= */

        const createdAt =
            new Date().toISOString();


        const result =
            db
                .prepare(`
                    INSERT INTO applications (
                        discord_user_id,
                        discord_username,
                        gender,
                        age,
                        ign,
                        main_style,
                        secondary_style,
                        device,
                        microphone,
                        past_gang,
                        previous_clan,
                        reason,
                        status,
                        created_at
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'PENDING',
                        ?
                    )
                `)
                .run(

                    user.id,

                    user.username,

                    gender,

                    age,

                    ign,

                    mainStyle,

                    secondaryStyle,

                    device,

                    microphone,

                    pastGang,

                    pastGang === "Yes"
                        ? previousClan
                        : "",

                    pastGang === "Yes"
                        ? reason
                        : "",

                    createdAt

                );


        const applicationId =
            Number(
                result.lastInsertRowid
            );


        /* =================================================
           SEND APPLICATION TO DISCORD
           ================================================= */

        try {

            const messageId =
                await sendApplicationToDiscord(
                    applicationId
                );


            db.prepare(`
                UPDATE applications
                SET
                    application_message_id = ?
                WHERE id = ?
            `).run(

                messageId,

                applicationId

            );

        } catch (error) {

            console.error(

                "Unable to send application to Discord:",

                error

            );

        }


        res
            .status(201)
            .json({

                success:
                    true,

                message:
                    "Your Kyōken application has been submitted.",

                application: {

                    id:
                        applicationId,

                    status:
                        "PENDING",

                    createdAt:
                        createdAt

                }

            });

    }
);


/* =========================================================
   APPLICATION EMBED
   ========================================================= */

function buildApplicationEmbed(
    application,
    status = "🟡 PENDING"
) {

    let embedColor =
        KYOKEN_EMBED_COLORS.primary;


    if (
        status.includes(
            "PENDING"
        )
    ) {

        embedColor =
            KYOKEN_EMBED_COLORS.pending;

    }


    if (
        status.includes(
            "ACCEPTED"
        )
    ) {

        embedColor =
            KYOKEN_EMBED_COLORS.accepted;

    }


    if (
        status.includes(
            "REJECTED"
        )
    ) {

        embedColor =
            KYOKEN_EMBED_COLORS.rejected;

    }


    return new EmbedBuilder()

        .setColor(
            embedColor
        )

        .setTitle(
            "🐺 KYŌKEN CLAN — APPLICATION REVIEW"
        )

        .setDescription(

            `**Application #${application.id}**\n\n` +

            "Review the applicant's information carefully before making a decision."

        )

        .addFields(

            {

                name:
                    "◆ APPLICANT",

                value:
                    `<@${application.discord_user_id}>`,

                inline:
                    false

            },

            {

                name:
                    "◆ DISCORD",

                value:
                    application.discord_username ||
                    "Unknown",

                inline:
                    false

            },

            {

                name:
                    "◆ GENDER",

                value:
                    application.gender ||
                    "Unknown",

                inline:
                    false

            },

            {

                name:
                    "◆ AGE",

                value:
                    String(
                        application.age
                    ),

                inline:
                    false

            },

            {

                name:
                    "◆ ROBLOX / GAKURAN IGN",

                value:
                    truncateDiscordText(

                        application.ign,

                        1024

                    ),

                inline:
                    false

            },

            {

                name:
                    "◆ MAIN FIGHTING STYLE",

                value:
                    application.main_style ||
                    "Unknown",

                inline:
                    false

            },

            {

                name:
                    "◆ SECONDARY FIGHTING STYLE",

                value:
                    application.secondary_style ||
                    "None",

                inline:
                    false

            },

            {

                name:
                    "◆ DEVICE",

                value:
                    application.device ||
                    "Unknown",

                inline:
                    false

            },

            {

                name:
                    "◆ DO YOU HAVE A WORKING MICROPHONE?",

                value:
                    application.microphone ||
                    "Unknown",

                inline:
                    false

            },

            {

                name:
                    "◆ PREVIOUS CLAN / GANG",

                value:
                    application.past_gang ||
                    "None",

                inline:
                    false

            },

            {

                name:
                    "◆ PREVIOUS CLAN / GANG NAME",

                value:
                    application.previous_clan ||
                    "None",

                inline:
                    false

            },

            {

                name:
                    "◆ WHY DID YOU LEAVE?",

                value:
                    truncateDiscordText(

                        application.reason ||
                        "None",

                        1024

                    ),

                inline:
                    false

            },

            {

                name:
                    "◆ STATUS",

                value:
                    status,

                inline:
                    false

            },

            {

                name:
                    "◆ ACCOUNT RECORD",

                value:
                    truncateDiscordText(

                        getApplicantAccountRecord(

                            application.discord_user_id,

                            application.id

                        ),

                        1024

                    ),

                inline:
                    false

            }

        )

        .setFooter({

            text:
                "狂犬  •  KYŌKEN CLAN APPLICATION SYSTEM"

        })

        .setTimestamp(

            new Date(
                application.created_at
            )

        );

}


/* =========================================================
   SEND APPLICATION TO DISCORD
   ========================================================= */

async function sendApplicationToDiscord(
    applicationId
) {

    if (
        !discordClient.isReady()
    ) {

        throw new Error(
            "Discord bot is not ready."
        );

    }


    const application =
        getApplication(
            applicationId
        );


    if (
        !application
    ) {

        throw new Error(
            "Application not found."
        );

    }


    const channel =
        await discordClient.channels.fetch(
            APPLICATION_CHANNEL_ID
        );


    if (

        !channel ||

        !channel.isTextBased()

    ) {

        throw new Error(
            "Application channel could not be found."
        );

    }


    const buttons =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()

                    .setCustomId(
                        `kyoken_accept_${application.id}`
                    )

                    .setLabel(
                        "ACCEPT"
                    )

                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()

                    .setCustomId(
                        `kyoken_reject_${application.id}`
                    )

                    .setLabel(
                        "REJECT"
                    )

                    .setStyle(
                        ButtonStyle.Danger
                    )

            );


    const message =
        await channel.send({

            embeds: [

                buildApplicationEmbed(

                    application,

                    "🟡 PENDING"

                )

            ],

            components: [

                buttons

            ]

        });


    return message.id;

}


/* =========================================================
   TRUNCATE DISCORD TEXT
   ========================================================= */

function truncateDiscordText(
    value,
    maximumLength
) {

    const text =
        String(

            value ||
            ""

        );


    if (
        text.length <=
        maximumLength
    ) {

        return text;

    }


    return (

        text.substring(

            0,

            maximumLength - 3

        ) +

        "..."

    );

}


/* =========================================================
   APPLICATION MANAGEMENT PERMISSION
   ========================================================= */

async function canManageApplications(
    userId
) {

    const roleIds =
        await getKyokenMemberRoles(
            userId
        );


    const position =
        getKyokenPosition(
            roleIds
        );


    const permissions =
        getKyokenPermissions(position);


    return {

        allowed:
            Boolean(

                permissions &&

                permissions.manageApplications

            ),

        position:
            position

    };

}


/* =========================================================
   TRY OUT FAILURE SELECT MENU
   ========================================================= */

function buildTryoutFailureMenu(
    applicationId
) {

    const menu =
        new StringSelectMenuBuilder()

            .setCustomId(
                `kyoken_fail_reason_${applicationId}`
            )

            .setPlaceholder(
                "Select the reason for the failed TRY OUT"
            )

            .setMinValues(
                1
            )

            .setMaxValues(
                1
            )

            .addOptions(

                new StringSelectMenuOptionBuilder()

                    .setLabel(
                        "DID NOT PASS TRYOUT"
                    )

                    .setDescription(
                        "The applicant did not pass the required tryout."
                    )

                    .setValue(
                        "DID_NOT_PASS"
                    )

                    .setEmoji(
                        "❌"
                    ),

                new StringSelectMenuOptionBuilder()

                    .setLabel(
                        "CLAN HOPPING / FALSE INFORMATION"
                    )

                    .setDescription(
                        "Clan hopping and/or false or misleading information."
                    )

                    .setValue(
                        "CLAN_HOPPING_FALSE_INFO"
                    )

                    .setEmoji(
                        "🔄"
                    ),

                new StringSelectMenuOptionBuilder()

                    .setLabel(
                        "NO WORKING MIC"
                    )

                    .setDescription(
                        "The applicant cannot communicate through a working microphone."
                    )

                    .setValue(
                        "NO_MIC"
                    )

                    .setEmoji(
                        "🎤"
                    ),

                new StringSelectMenuOptionBuilder()

                    .setLabel(
                        "OTHER"
                    )

                    .setDescription(
                        "Another reason not listed above."
                    )

                    .setValue(
                        "OTHER"
                    )

                    .setEmoji(
                        "🚫"
                    )

            );


    return new ActionRowBuilder()
        .addComponents(
            menu
        );

}


/* =========================================================
   FAILURE REASON HELPER
   ========================================================= */

function getTryoutFailureReason(
    value
) {

    const reasons = {

        DID_NOT_PASS:
            TRYOUT_FAIL_REASONS.DID_NOT_PASS,

        CLAN_HOPPING_FALSE_INFO:
            TRYOUT_FAIL_REASONS.CLAN_HOPPING_FALSE_INFO,

        NO_MIC:
            TRYOUT_FAIL_REASONS.NO_MIC,

        OTHER:
            TRYOUT_FAIL_REASONS.OTHER

    };


    return (

        reasons[value] ||

        null

    );

}


/* =========================================================
   APPLICATION BUTTON / SELECT HANDLER
   ========================================================= */

discordClient.on(
    "interactionCreate",
    async function (
        interaction
    ) {

        /* =================================================
           FAILURE REASON SELECT MENU
           ================================================= */

        if (
            interaction.isStringSelectMenu()
        ) {

            const customId =
                interaction.customId;


            if (
                !customId.startsWith(
                    "kyoken_fail_reason_"
                )
            ) {

                return;

            }


            if (
                interaction.guildId !==
                KYOKEN_SERVER_ID
            ) {

                return interaction.reply({

                    content:
                        "This action is only available inside the Kyōken server.",

                    ephemeral:
                        true

                });

            }


            const applicationId =
                Number(

                    customId.replace(

                        "kyoken_fail_reason_",

                        ""

                    )

                );


            if (
                !Number.isInteger(
                    applicationId
                )
            ) {

                return interaction.reply({

                    content:
                        "Invalid application ID.",

                    ephemeral:
                        true

                });

            }


            const permission =
                await canManageApplications(

                    interaction.user.id

                );


            if (
                !permission.allowed
            ) {

                return interaction.reply({

                    content:
                        "You do not have permission to manage Kyōken applications.",

                    ephemeral:
                        true

                });

            }


            const application =
                getApplication(
                    applicationId
                );


            if (
                !application
            ) {

                return interaction.reply({

                    content:
                        "This application could not be found.",

                    ephemeral:
                        true

                });

            }


            if (
                application.status !==
                "TRYOUT"
            ) {

                return interaction.reply({

                    content:
                        "This applicant is no longer in the TRY OUT stage.",

                    ephemeral:
                        true

                });

            }


            const selectedReason =
                interaction.values[0];


            const failureReason =
                getTryoutFailureReason(
                    selectedReason
                );


            if (
                !failureReason
            ) {

                return interaction.reply({

                    content:
                        "Invalid TRY OUT failure reason.",

                    ephemeral:
                        true

                });

            }


            return handleTryoutFail(

                interaction,

                application,

                failureReason

            );

        }


        /* =================================================
           BUTTONS
           ================================================= */

        if (
            !interaction.isButton()
        ) {

            return;

        }


        const customId =
            interaction.customId;


        if (
            !customId.startsWith(
                "kyoken_"
            )
        ) {

            return;

        }


        if (
            interaction.guildId !==
            KYOKEN_SERVER_ID
        ) {

            return interaction.reply({

                content:
                    "This action is only available inside the Kyōken server.",

                ephemeral:
                    true

            });

        }


        const parts =
            customId.split(
                "_"
            );


        const action =
            parts[1];


        const applicationId =
            Number(
                parts[2]
            );


        if (
            !Number.isInteger(
                applicationId
            )
        ) {

            return interaction.reply({

                content:
                    "Invalid application ID.",

                ephemeral:
                    true

            });

        }


        const permission =
            await canManageApplications(
                interaction.user.id
            );


        if (
            !permission.allowed
        ) {

            return interaction.reply({

                content:
                    "You do not have permission to manage Kyōken applications.",

                ephemeral:
                    true

            });

        }


        const application =
            getApplication(
                applicationId
            );


        if (
            !application
        ) {

            return interaction.reply({

                content:
                    "This application could not be found.",

                ephemeral:
                    true

            });

        }


        /* =================================================
           FIRST APPROVAL
           ================================================= */

        if (

            action === "accept" ||

            action === "reject"

        ) {

            if (
                application.status !==
                "PENDING"
            ) {

                return interaction.reply({

                    content:
                        `This application is already ${application.status.toLowerCase()}.`,

                    ephemeral:
                        true

                });

            }


            if (
                action === "accept"
            ) {

                return handleApplicationAcceptance(

                    interaction,

                    application

                );

            }


            return handleApplicationRejection(

                interaction,

                application

            );

        }


        /* =================================================
           SECOND APPROVAL
           ================================================= */

        if (
            action === "pass"
        ) {

            if (
                application.status !==
                "TRYOUT"
            ) {

                return interaction.reply({

                    content:
                        "This applicant is not currently in the TRY OUT stage.",

                    ephemeral:
                        true

                });

            }


            return handleTryoutPass(

                interaction,

                application

            );

        }


        /* =================================================
           FAIL BUTTON
           ================================================= */

        if (
            action === "fail"
        ) {

            if (
                application.status !==
                "TRYOUT"
            ) {

                return interaction.reply({

                    content:
                        "This applicant is not currently in the TRY OUT stage.",

                    ephemeral:
                        true

                });

            }


            return interaction.reply({

                content:
                    "🐺 **KYŌKEN CLAN — TRY OUT FAILED**\n\nPlease select the reason for the applicant's failed TRY OUT.",

                components: [

                    buildTryoutFailureMenu(
                        application.id
                    )

                ],

                ephemeral:
                    true

            });

        }

    }
);


/* =========================================================
   ACCEPT APPLICATION
   ========================================================= */

async function handleApplicationAcceptance(
    interaction,
    application
) {

    try {

        await interaction.deferUpdate();


        const channel =
            await discordClient.channels.fetch(
                APPLICATION_CHANNEL_ID
            );


        if (

            !channel ||

            !channel.isTextBased()

        ) {

            throw new Error(
                "Application channel is unavailable."
            );

        }


        /* =================================================
           CREATE ONE-USE INVITE
           ================================================= */

        const invite =
            await channel.createInvite({

                maxUses:
                    APPLICATION_INVITE_MAX_USES,

                maxAge:
                    APPLICATION_INVITE_MAX_AGE,

                unique:
                    true,

                reason:
                    `Kyōken application #${application.id} accepted.`

            });


        const inviteExpiresAt =
            new Date(

                Date.now() +

                APPLICATION_INVITE_MAX_AGE *
                1000

            ).toISOString();


        const reviewedAt =
            new Date().toISOString();


        db.prepare(`
            UPDATE applications
            SET
                status = 'ACCEPTED',
                reviewed_by = ?,
                reviewed_at = ?,
                invite_code = ?,
                invite_url = ?,
                invite_expires_at = ?
            WHERE id = ?
        `).run(

            interaction.user.id,

            reviewedAt,

            invite.code,

            invite.url,

            inviteExpiresAt,

            application.id

        );


        /* =================================================
           TRY TO DM APPLICANT
           ================================================= */

        let dmSent =
            true;


        try {

            const applicant =
                await discordClient.users.fetch(

                    application.discord_user_id

                );


            await applicant.send({

                embeds: [

                    new EmbedBuilder()

                        .setColor(
                            KYOKEN_EMBED_COLORS.accepted
                        )

                        .setTitle(
                            "🐺 KYŌKEN CLAN — APPLICATION ACCEPTED"
                        )

                        .setDescription(
                            "Congratulations! Your application has passed the first approval."
                        )

                        .addFields(

                            {

                                name:
                                    "◆ YOUR PERSONAL INVITE",

                                value:
                                    invite.url,

                                inline:
                                    false

                            },

                            {

                                name:
                                    "◆ NEXT STEP",

                                value:
                                    "Join the Kyōken server and wait in the TRY OUT area for your verification interview.",

                                inline:
                                    false

                            },

                            {

                                name:
                                    "◆ INVITE LIMIT",

                                value:
                                    "1 use • Expires in 24 hours",

                                inline:
                                    false

                            }

                        )

                        .setFooter({

                            text:
                                "狂犬  •  KYŌKEN CLAN"

                        })

                        .setTimestamp()

                ]

            });

        } catch (error) {

            dmSent =
                false;


            console.error(

                "Unable to DM accepted applicant:",

                error

            );

        }


        /* =================================================
           UPDATE APPLICATION MESSAGE
           ================================================= */

        const updatedEmbed =
            buildApplicationEmbed(

                application,

                dmSent

                    ? "🟢 ACCEPTED"

                    : "🟢 ACCEPTED — DM FAILED"

            );


        updatedEmbed.addFields({

            name:
                "◆ INVITE",

            value:

                dmSent

                    ? "Personal one-use invite sent privately."

                    : "Personal one-use invite generated. Applicant can retrieve it from /invite.html after Discord login.",

            inline:
                false

        });


        await interaction.message.edit({

            embeds: [

                updatedEmbed

            ],

            components: []

        });


        await interaction.followUp({

            content:

                dmSent

                    ? `Application #${application.id} accepted. The applicant's personal one-use invite was sent by DM.`

                    : `Application #${application.id} accepted. The applicant's DM could not be sent. Their invite remains available through /invite.html after Discord login.`,

            ephemeral:
                true

        });

    } catch (error) {

        console.error(

            "Application acceptance failed:",

            error

        );


        if (
            interaction.deferred
        ) {

            return interaction.followUp({

                content:
                    "The application could not be accepted. Check the server console.",

                ephemeral:
                    true

            });

        }


        return interaction.reply({

            content:
                "The application could not be accepted.",

            ephemeral:
                true

        });

    }

}


/* =========================================================
   REJECT APPLICATION
   ========================================================= */

async function handleApplicationRejection(
    interaction,
    application
) {

    try {

        const reviewedAt =
            new Date().toISOString();


        updateApplicationStatus(

            application.id,

            "REJECTED",

            interaction.user.id,

            reviewedAt

        );


        const updatedEmbed =
            buildApplicationEmbed(

                application,

                "🔴 REJECTED"

            );


        updatedEmbed.addFields({

            name:
                "◆ REVIEWED BY",

            value:
                `<@${interaction.user.id}>`,

            inline:
                false

        });


        await interaction.update({

            embeds: [

                updatedEmbed

            ],

            components: []

        });


        /* =================================================
           TRY TO DM APPLICANT
           ================================================= */

        try {

            const applicant =
                await discordClient.users.fetch(

                    application.discord_user_id

                );


            await applicant.send({

                embeds: [

                    new EmbedBuilder()

                        .setColor(
                            KYOKEN_EMBED_COLORS.rejected
                        )

                        .setTitle(
                            "🐺 KYŌKEN CLAN — APPLICATION UPDATE"
                        )

                        .setDescription(
                            "Thank you for applying to Kyōken Clan."
                        )

                        .addFields({

                            name:
                                "◆ RESULT",

                            value:
                                "Unfortunately, your application was not accepted at this time.",

                            inline:
                                false

                        })

                        .setFooter({

                            text:
                                "狂犬  •  KYŌKEN CLAN"

                        })

                        .setTimestamp()

                ]

            });

        } catch (error) {

            console.error(

                "Unable to DM rejected applicant:",

                error

            );

        }

    } catch (error) {

        console.error(

            "Application rejection failed:",

            error

        );


        if (

            interaction.replied ||

            interaction.deferred

        ) {

            return interaction.followUp({

                content:
                    "The application could not be rejected.",

                ephemeral:
                    true

            });

        }


        return interaction.reply({

            content:
                "The application could not be rejected.",

            ephemeral:
                true

        });

    }

}


/* =========================================================
   AUTOMATIC TRY OUT ROLE
   ========================================================= */

discordClient.on(
    "guildMemberAdd",
    async function (
        member
    ) {

        try {

            if (
                member.guild.id !==
                KYOKEN_SERVER_ID
            ) {

                return;

            }


            /* =================================================
               FIND ACCEPTED APPLICATION
               ================================================= */

            const application =
                db
                    .prepare(`
                        SELECT *
                        FROM applications
                        WHERE discord_user_id = ?
                        AND status = 'ACCEPTED'
                        ORDER BY id DESC
                        LIMIT 1
                    `)
                    .get(
                        member.id
                    );


            if (
                !application
            ) {

                console.log(

                    `Member ${member.user.tag} joined Kyōken, but no accepted application was found.`

                );

                return;

            }


            /* =================================================
               FIND TRY OUT ROLE
               ================================================= */

            const tryoutRole =
                member.guild.roles.cache.get(
                    TRYOUT_ROLE_ID
                );


            if (
                !tryoutRole
            ) {

                throw new Error(

                    `TRY OUT role ${TRYOUT_ROLE_ID} could not be found.`

                );

            }


            /* =================================================
               ASSIGN TRY OUT ROLE
               ================================================= */

            await member.roles.add(

                tryoutRole,

                `Kyōken application #${application.id}`

            );


            /* =================================================
               UPDATE DATABASE
               ================================================= */

            const joinedAt =
                new Date().toISOString();


            db.prepare(`
                UPDATE applications
                SET
                    status = 'TRYOUT',
                    joined_user_id = ?,
                    joined_at = ?
                WHERE id = ?
            `).run(

                member.id,

                joinedAt,

                application.id

            );


            console.log(

                `✅ ${member.user.tag} joined Kyōken. TRY OUT role assigned for application #${application.id}.`

            );


            /* =================================================
               SEND SECOND APPROVAL
               ================================================= */

            await sendTryoutReview(

                application.id

            );

        } catch (error) {

            console.error(

                "Kyōken applicant join processing failed:",

                error

            );

        }

    }
);


/* =========================================================
   SEND TRY OUT REVIEW
   ========================================================= */

async function sendTryoutReview(
    applicationId
) {

    const application =
        getApplication(
            applicationId
        );


    if (
        !application
    ) {

        throw new Error(
            "Application not found."
        );

    }


    const channel =
        await discordClient.channels.fetch(
            TRYOUT_APPROVAL_CHANNEL_ID
        );


    if (

        !channel ||

        !channel.isTextBased()

    ) {

        throw new Error(
            "TRY OUT approval channel could not be found."
        );

    }


    const embed =
        new EmbedBuilder()

            .setColor(
                KYOKEN_EMBED_COLORS.tryout
            )

            .setTitle(
                "🐺 KYŌKEN CLAN — TRY OUT REVIEW"
            )

            .setDescription(

                `**Application #${application.id}**\n\n` +

                "The applicant has entered the second approval stage."

            )

            .addFields(

                {

                    name:
                        "◆ APPLICANT",

                    value:
                        `<@${application.discord_user_id}>`,

                    inline:
                        false

                },

                {

                    name:
                        "◆ DISCORD",

                    value:
                        application.discord_username ||
                        "Unknown",

                    inline:
                        false

                },

                {

                    name:
                        "◆ GENDER",

                    value:
                        application.gender ||
                        "Unknown",

                    inline:
                        false

                },

                {

                    name:
                        "◆ AGE",

                    value:
                        String(
                            application.age
                        ),

                    inline:
                        false

                },

                {

                    name:
                        "◆ ROBLOX / GAKURAN IGN",

                    value:
                        truncateDiscordText(

                            application.ign,

                            1024

                        ),

                    inline:
                        false

                },

                {

                    name:
                        "◆ MAIN FIGHTING STYLE",

                    value:
                        application.main_style ||
                        "Unknown",

                    inline:
                        false

                },

                {

                    name:
                        "◆ SECONDARY FIGHTING STYLE",

                    value:
                        application.secondary_style ||
                        "None",

                    inline:
                        false

                },

                {

                    name:
                        "◆ DEVICE",

                    value:
                        application.device ||
                        "Unknown",

                    inline:
                        false

                },

                {

                    name:
                        "◆ DO YOU HAVE A WORKING MICROPHONE?",

                    value:
                        application.microphone ||
                        "Unknown",

                    inline:
                        false

                },

                {

                    name:
                        "◆ PREVIOUS CLAN / GANG",

                    value:
                        application.past_gang ||
                        "None",

                    inline:
                        false

                },

                {

                    name:
                        "◆ PREVIOUS CLAN / GANG NAME",

                    value:
                        application.previous_clan ||
                        "None",

                    inline:
                        false

                },

                {

                    name:
                        "◆ WHY DID YOU LEAVE?",

                    value:
                        truncateDiscordText(

                            application.reason ||
                            "None",

                            1024

                        ),

                    inline:
                        false

                },

                {

                    name:
                        "◆ STATUS",

                    value:
                        "🟡 TRY OUT",

                    inline:
                        false

                },

                {

                    name:
                        "◆ ACCOUNT RECORD",

                    value:
                        truncateDiscordText(

                            getApplicantAccountRecord(

                                application.discord_user_id,

                                application.id

                            ),

                            1024

                        ),

                    inline:
                        false

                }

            )

            .setFooter({

                text:
                    "狂犬  •  KYŌKEN CLAN SECOND APPROVAL"

            })

            .setTimestamp();


    const buttons =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()

                    .setCustomId(
                        `kyoken_pass_${application.id}`
                    )

                    .setLabel(
                        "PASS TRYOUT"
                    )

                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()

                    .setCustomId(
                        `kyoken_fail_${application.id}`
                    )

                    .setLabel(
                        "FAIL TRYOUT"
                    )

                    .setStyle(
                        ButtonStyle.Danger
                    )

            );


    await channel.send({

        embeds: [

            embed

        ],

        components: [

            buttons

        ]

    });

}


/* =========================================================
   PASS TRY OUT
   ========================================================= */

async function handleTryoutPass(
    interaction,
    application
) {

    try {

        await interaction.deferUpdate();


        const guild =
            await discordClient.guilds.fetch(
                KYOKEN_SERVER_ID
            );


        const member =
            await guild.members.fetch(
                application.discord_user_id
            ).catch(
                () => null
            );


        if (
            !member
        ) {

            throw new Error(
                "Applicant is no longer in the Kyōken server."
            );

        }


        const tryoutRole =
            guild.roles.cache.get(
                TRYOUT_ROLE_ID
            );


        const memberRole =
            guild.roles.cache.get(
                MEMBER_ROLE_ID
            );


        if (
            !memberRole
        ) {

            throw new Error(

                `MEMBER role ${MEMBER_ROLE_ID} could not be found.`

            );

        }


        /* =================================================
           ADD MEMBER ROLE
           ================================================= */

        await member.roles.add(

            memberRole,

            `Kyōken TRY OUT passed for application #${application.id}`

        );


        /* =================================================
           REMOVE TRY OUT ROLE
           ================================================= */

        if (

            tryoutRole &&

            member.roles.cache.has(
                TRYOUT_ROLE_ID
            )

        ) {

            await member.roles.remove(

                tryoutRole,

                `Kyōken TRY OUT passed for application #${application.id}`

            );

        }


        /* =================================================
           UPDATE DATABASE
           ================================================= */

        const reviewedAt =
            new Date().toISOString();


        db.prepare(`
            UPDATE applications
            SET
                status = 'APPROVED',
                tryout_reviewed_by = ?,
                tryout_reviewed_at = ?,
                tryout_fail_reason = NULL
            WHERE id = ?
        `).run(

            interaction.user.id,

            reviewedAt,

            application.id

        );


        /* =================================================
           UPDATE TRY OUT MESSAGE
           ================================================= */

        const embed =
            new EmbedBuilder()

                .setColor(
                    KYOKEN_EMBED_COLORS.accepted
                )

                .setTitle(
                    "🐺 KYŌKEN CLAN — TRY OUT PASSED"
                )

                .setDescription(

                    `**Application #${application.id}**`

                )

                .addFields(

                    {

                        name:
                            "◆ APPLICANT",

                        value:
                            `<@${application.discord_user_id}>`,

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ STATUS",

                        value:
                            "🟢 TRY OUT PASSED",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ REVIEWED BY",

                        value:
                            `<@${interaction.user.id}>`,

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ RESULT",

                        value:
                            "The applicant passed the Kyōken verification interview and has received MEMBER access.",

                        inline:
                            false

                    }

                )

                .setFooter({

                    text:
                        "狂犬  •  KYŌKEN CLAN SECOND APPROVAL"

                })

                .setTimestamp();


        await interaction.message.edit({

            embeds: [

                embed

            ],

            components: []

        });


        /* =================================================
           TRY TO DM APPROVED APPLICANT
           ================================================= */

        try {

            const applicant =
                await discordClient.users.fetch(

                    application.discord_user_id

                );


            await applicant.send({

                embeds: [

                    new EmbedBuilder()

                        .setColor(
                            KYOKEN_EMBED_COLORS.accepted
                        )

                        .setTitle(
                            "🐺 KYŌKEN CLAN — WELCOME"
                        )

                        .setDescription(
                            "Congratulations! You passed the Kyōken Clan TRY OUT."
                        )

                        .addFields({

                            name:
                                "◆ STATUS",

                            value:
                                "🟢 YOU ARE NOW AN OFFICIAL MEMBER.",

                            inline:
                                false

                        })

                        .setFooter({

                            text:
                                "狂犬  •  Welcome to Kyōken Clan."

                        })

                        .setTimestamp()

                ]

            });

        } catch (error) {

            console.error(

                "Unable to DM approved applicant:",

                error

            );

        }


        await interaction.followUp({

            content:

                `✅ ${member.user.tag} passed the TRY OUT and has been given MEMBER access.`,

            ephemeral:
                true

        });

    } catch (error) {

        console.error(

            "TRY OUT pass failed:",

            error

        );


        if (
            interaction.deferred
        ) {

            return interaction.followUp({

                content:
                    "The TRY OUT could not be approved. Check the server console.",

                ephemeral:
                    true

            });

        }


        return interaction.reply({

            content:
                "The TRY OUT could not be approved.",

            ephemeral:
                true

        });

    }

}


/* =========================================================
   FAIL TRY OUT
   ========================================================= */

async function handleTryoutFail(
    interaction,
    application,
    failureReason
) {

    /*
       TRY OUT FAIL is intentionally processed in independent stages.
       A failure to edit the original message, send the log, DM the
       applicant, or kick the member must NOT make the entire result fail.
       The database status is the source of truth.
    */

    try {

        await interaction.deferUpdate();

        const currentApplication =
            getApplication(
                application.id
            );

        if (
            !currentApplication ||
            currentApplication.status !== "TRYOUT"
        ) {

            return interaction.followUp({

                content:
                    "This applicant is no longer in the TRY OUT stage.",

                ephemeral:
                    true

            });

        }

        let member = null;

        try {

            const guild =
                await discordClient.guilds.fetch(
                    KYOKEN_SERVER_ID
                );

            member =
                await guild.members.fetch(
                    application.discord_user_id
                ).catch(
                    () => null
                );

        } catch (error) {

            console.error(
                "Unable to fetch failed TRY OUT applicant:",
                error
            );

        }

        /* =================================================
           UPDATE DATABASE — SOURCE OF TRUTH
           ================================================= */

        const reviewedAt =
            new Date().toISOString();

        db.prepare(`
            UPDATE applications
            SET
                status = 'TRYOUT_FAILED',
                tryout_reviewed_by = ?,
                tryout_reviewed_at = ?,
                tryout_fail_reason = ?
            WHERE id = ?
        `).run(

            interaction.user.id,
            reviewedAt,
            failureReason,
            application.id

        );

        /* =================================================
           REMOVE APPLICANT
           ================================================= */

        let kicked = false;

        if (member) {

            try {

                await member.kick(
                    `Kyōken TRY OUT failed: ${failureReason}`
                );

                kicked = true;

            } catch (error) {

                console.error(
                    "Unable to kick failed applicant:",
                    error
                );

            }

        }

        /* =================================================
           UPDATE TRY OUT MESSAGE
           ================================================= */

        const embed =
            new EmbedBuilder()

                .setColor(
                    KYOKEN_EMBED_COLORS.rejected
                )

                .setTitle(
                    "🐺 KYŌKEN CLAN — TRY OUT FAILED"
                )

                .setDescription(
                    `**Application #${application.id}**`
                )

                .addFields(

                    {
                        name:
                            "◆ APPLICANT",

                        value:
                            `<@${application.discord_user_id}>`,

                        inline:
                            false
                    },

                    {
                        name:
                            "◆ STATUS",

                        value:
                            "🔴 TRY OUT FAILED",

                        inline:
                            false
                    },

                    {
                        name:
                            "◆ FAILURE REASON",

                        value:
                            failureReason,

                        inline:
                            false
                    },

                    {
                        name:
                            "◆ REVIEWED BY",

                        value:
                            `<@${interaction.user.id}>`,

                        inline:
                            false
                    },

                    {
                        name:
                            "◆ RESULT",

                        value:
                            kicked
                                ? "The applicant failed the verification interview and was removed from the Kyōken server."
                                : "The applicant failed the verification interview. The bot was unable to remove them from the server.",

                        inline:
                            false
                    }

                )

                .setFooter({

                    text:
                        "狂犬  •  KYŌKEN CLAN SECOND APPROVAL"

                })

                .setTimestamp();

        try {

            if (
                interaction.message &&
                typeof interaction.message.edit === "function"
            ) {

                await interaction.message.edit({

                    embeds: [
                        embed
                    ],

                    components: []

                });

            }

        } catch (error) {

            console.error(
                "Unable to update TRY OUT fail message:",
                error
            );

        }

        /* =================================================
           TRY OUT FAIL LOG
           ================================================= */

        try {

            await sendTryoutFailLog(
                application,
                interaction.user.id,
                failureReason,
                kicked
            );

        } catch (error) {

            console.error(
                "TRY OUT fail log step failed:",
                error
            );

        }

        /* =================================================
           TRY TO DM FAILED APPLICANT
           ================================================= */

        try {

            const applicant =
                await discordClient.users.fetch(
                    application.discord_user_id
                );

            await applicant.send({

                embeds: [

                    new EmbedBuilder()

                        .setColor(
                            KYOKEN_EMBED_COLORS.rejected
                        )

                        .setTitle(
                            "🐺 KYŌKEN CLAN — TRY OUT RESULT"
                        )

                        .setDescription(
                            "Thank you for taking the Kyōken Clan TRY OUT."
                        )

                        .addFields(

                            {
                                name:
                                    "◆ RESULT",

                                value:
                                    "Unfortunately, you did not pass the verification interview.",

                                inline:
                                    false
                            },

                            {
                                name:
                                    "◆ DECISION",

                                value:
                                    failureReason,

                                inline:
                                    false
                            }

                        )

                        .setFooter({

                            text:
                                "狂犬  •  KYŌKEN CLAN"

                        })

                        .setTimestamp()

                ]

            });

        } catch (error) {

            console.error(
                "Unable to DM failed applicant:",
                error
            );

        }

        /*
           At this point the TRY OUT result has already been committed
           to the database. Always acknowledge the interaction.
        */

        try {

            return await interaction.followUp({

                content:

                    `❌ Application #${application.id} failed the TRY OUT.\nReason: ${failureReason}` +
                    (
                        kicked
                            ? "\nThe applicant has been removed from the server."
                            : "\n⚠️ The applicant could not be removed automatically."
                    ),

                ephemeral:
                    true

            });

        } catch (error) {

            console.error(
                "Unable to send TRY OUT fail confirmation:",
                error
            );

        }

    } catch (error) {

        console.error(
            "TRY OUT failure handling failed:",
            error
        );

        /*
           If the interaction was deferred, Discord requires a follow-up
           rather than a second reply.
        */

        if (
            interaction.deferred ||
            interaction.replied
        ) {

            try {

                return await interaction.followUp({

                    content:
                        "The TRY OUT result could not be processed. Check the server console.",

                    ephemeral:
                        true

                });

            } catch (followUpError) {

                console.error(
                    "Unable to send TRY OUT error follow-up:",
                    followUpError
                );

            }

            return;

        }

        return interaction.reply({

            content:
                "The TRY OUT result could not be processed.",

            ephemeral:
                true

        });

    }

}

/* =========================================================
   SEND TRY OUT FAIL LOG
   ========================================================= */

async function sendTryoutFailLog(
    application,
    reviewerId,
    failureReason,
    kicked
) {

    try {

        const channel =
            await discordClient.channels.fetch(

                TRYOUT_FAIL_LOG_CHANNEL_ID

            );


        if (

            !channel ||

            !channel.isTextBased()

        ) {

            throw new Error(

                "TRY OUT fail log channel could not be found."

            );

        }


        const logEmbed =
            new EmbedBuilder()

                .setColor(
                    KYOKEN_EMBED_COLORS.rejected
                )

                .setTitle(
                    "🐺 KYŌKEN CLAN — TRY OUT FAIL LOG"
                )

                .setDescription(

                    `**Application #${application.id}**`

                )

                .addFields(

                    {

                        name:
                            "◆ APPLICANT",

                        value:
                            `<@${application.discord_user_id}>`,

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ DISCORD",

                        value:
                            application.discord_username ||
                            "Unknown",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ ROBLOX / GAKURAN IGN",

                        value:
                            truncateDiscordText(

                                application.ign,

                                1024

                            ),

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ MAIN FIGHTING STYLE",

                        value:
                            application.main_style ||
                            "Unknown",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ SECONDARY FIGHTING STYLE",

                        value:
                            application.secondary_style ||
                            "None",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ DEVICE",

                        value:
                            application.device ||
                            "Unknown",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ MICROPHONE",

                        value:
                            application.microphone ||
                            "Unknown",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ FAILURE REASON",

                        value:
                            failureReason,

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ REVIEWED BY",

                        value:
                            `<@${reviewerId}>`,

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ ACTION",

                        value:

                            kicked

                                ? "🔴 APPLICANT REMOVED"

                                : "⚠️ APPLICANT COULD NOT BE REMOVED",

                        inline:
                            false

                    },

                    {

                        name:
                            "◆ FINAL STATUS",

                        value:
                            "🔴 TRY OUT FAILED",

                        inline:
                            false

                    }

                )

                .setFooter({

                    text:
                        "狂犬  •  KYŌKEN CLAN TRY OUT FAIL LOG"

                })

                .setTimestamp();


        await channel.send({

            embeds: [

                logEmbed

            ]

        });


        console.log(

            `📕 TRY OUT fail logged for application #${application.id}.`

        );

    } catch (error) {

        console.error(

            "Unable to send TRY OUT fail log:",

            error

        );

    }

}


/* =========================================================
   SECURE INVITE FALLBACK
   ========================================================= */

app.get(
    "/api/invite/me",
    async function (
        req,
        res
    ) {

        if (
            !req.session.discord
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error:
                        "You must log in with Discord."

                });

        }


        const user =
            req.session.discord;


        const application =
            db
                .prepare(`
                    SELECT
                        id,
                        discord_user_id,
                        status,
                        invite_code,
                        invite_url,
                        invite_expires_at,
                        joined_user_id,
                        joined_at
                    FROM applications
                    WHERE discord_user_id = ?
                    AND status = 'ACCEPTED'
                    ORDER BY id DESC
                    LIMIT 1
                `)
                .get(
                    user.id
                );


        if (
            !application
        ) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    error:
                        "You do not have an accepted Kyōken application with an unused invitation."

                });

        }


        if (

            !application.invite_url ||

            !application.invite_expires_at

        ) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    error:
                        "Your Kyōken invitation is not available."

                });

        }


        const expiration =
            new Date(

                application.invite_expires_at

            );


        if (
            Number.isNaN(
                expiration.getTime()
            )
        ) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        "Your invitation has an invalid expiration time."

                });

        }


        if (
            Date.now() >=
            expiration.getTime()
        ) {

            return res
                .status(410)
                .json({

                    success:
                        false,

                    error:
                        "Your Kyōken invitation has expired."

                });

        }


        if (
            application.joined_user_id
        ) {

            return res
                .status(410)
                .json({

                    success:
                        false,

                    error:
                        "This invitation has already been used."

                });

        }


        return res.json({

            success:
                true,

            applicationId:
                application.id,

            inviteUrl:
                application.invite_url,

            expiresAt:
                application.invite_expires_at

        });

    }
);


/* =========================================================
   KYŌKEN COMMAND ACCESS API
   ========================================================= */

app.get(
    "/api/command/access",
    async function (req, res) {

        if (!req.session.discord) {

            return res
                .status(401)
                .json({
                    loggedIn: false,
                    authorized: false
                });

        }

        const user = req.session.discord;
        const roleIds = await getKyokenMemberRoles(user.id);
        const position = getKyokenPosition(roleIds);

        /*
           MANAGEMENT SLIDE ACCESS
           ONLY these four Discord roles may see/use Management:
           LEADER, VICE LEADER, SECRETARY, ADMINS.

           Check the actual role IDs directly instead of relying only
           on a derived position value. Fail closed if the role lookup
           fails or the user has none of these roles.
        */
        const MANAGEMENT_ROLE_IDS = [
            KYOKEN_ROLES.leader,
            KYOKEN_ROLES.viceleader,
            KYOKEN_ROLES.secretary,
            KYOKEN_ROLES.admins
        ];

        const authorized =
            roleIds.some(function (roleId) {
                return MANAGEMENT_ROLE_IDS.includes(String(roleId));
            });

        const headquarters =
            authorized;

        return res.json({
            loggedIn: true,
            authorized: authorized,
            headquarters: headquarters,
            divisionCaptain: false,
            userId: user.id,
            username: user.username,
            position: position,
            positionName: getKyokenPositionName(position)
        });

    }
);



/* =========================================================
   ACTIVITY LOG API
   ========================================================= */

async function requireHeadquartersViewer(req, res) {
    if (!req.session.discord) {
        res.status(401).json({ success: false, error: 'You must log in with Discord.' });
        return null;
    }
    const roleIds = await getKyokenMemberRoles(req.session.discord.id);
    const position = getKyokenPosition(roleIds);
    if (!isKyokenHeadquartersPosition(position)) {
        res.status(403).json({ success: false, error: 'Headquarters access is required.' });
        return null;
    }
    return { userId: req.session.discord.id, username: req.session.discord.username, position, positionName: getKyokenPositionName(position) };
}

app.get('/api/command/activity', async function(req, res) {
    const viewer = await requireHeadquartersViewer(req, res);
    if (!viewer) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const action = String(req.query.action || '').trim();
    const actor = String(req.query.actor || '').trim();
    let sql = 'SELECT * FROM activity_logs';
    const params = [];
    const where = [];
    if (action) { where.push('action LIKE ?'); params.push(`%${action}%`); }
    if (actor) { where.push('(actor_username LIKE ? OR actor_user_id = ?)'); params.push(`%${actor}%`, actor); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY id DESC LIMIT ?'; params.push(limit);
    const logs = db.prepare(sql).all(...params);
    return res.json({ success:true, viewer, logs });
});

app.delete('/api/command/activity', async function(req, res) {
    const viewer = await requireHeadquartersViewer(req, res);
    if (!viewer) return;
    db.prepare('DELETE FROM activity_logs').run();
    logActivity(viewer, 'CLEARED ACTIVITY LOG', 'SYSTEM', '', 'All previous activity log entries were cleared.');
    return res.json({ success:true });
});

/* =========================================================
   KYŌKEN COMMAND APPLICATIONS API
   ========================================================= */

async function requireCommandViewer(req, res) {

    if (!req.session.discord) {
        res.status(401).json({
            success: false,
            error: "You must log in with Discord."
        });
        return null;
    }

    const roleIds = await getKyokenMemberRoles(req.session.discord.id);
    const position = getKyokenPosition(roleIds);

    if (!isKyokenHeadquartersPosition(position)) {
        res.status(403).json({
            success: false,
            error: "You are not authorized to access KYŌKEN COMMAND."
        });
        return null;
    }

    return {
        userId: req.session.discord.id,
        username: req.session.discord.username,
        position,
        positionName: getKyokenPositionName(position),
        canManage: Boolean(getKyokenPermissions(position)?.manageApplications)
    };
}

function getCommandApplicationsList(status) {

    const normalized = String(status || "ALL").toUpperCase();

    if (["PENDING", "ACCEPTED", "REJECTED", "TRYOUT", "TRYOUT_FAILED"].includes(normalized)) {
        return db.prepare(`
            SELECT * FROM applications
            WHERE status = ?
            ORDER BY id DESC
        `).all(normalized);
    }

    return db.prepare(`
        SELECT * FROM applications
        ORDER BY id DESC
    `).all();
}

function sanitizeApplicationForCommand(application) {
    if (!application) return null;

    return {
        id: Number(application.id),
        discordUserId: application.discord_user_id,
        discordUsername: application.discord_username,
        gender: application.gender,
        age: Number(application.age),
        ign: application.ign,
        mainStyle: application.main_style,
        secondaryStyle: application.secondary_style || "",
        device: application.device,
        microphone: application.microphone,
        pastGang: application.past_gang,
        previousClan: application.previous_clan || "",
        reason: application.reason || "",
        status: application.status,
        reviewedBy: application.reviewed_by || "",
        reviewedAt: application.reviewed_at || null,
        createdAt: application.created_at,
        joinedAt: application.joined_at || null,
        tryoutReviewedBy: application.tryout_reviewed_by || null,
        tryoutReviewedAt: application.tryout_reviewed_at || null,
        tryoutFailReason: application.tryout_fail_reason || null
    };
}

app.get("/api/command/applications", async function (req, res) {

    const viewer = await requireCommandViewer(req, res);
    if (!viewer) return;

    try {
        const applications = getCommandApplicationsList(req.query.status);
        const stats = db.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'TRYOUT' THEN 1 ELSE 0 END) AS tryout,
                SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN status = 'TRYOUT_FAILED' THEN 1 ELSE 0 END) AS tryoutFailed
            FROM applications
        `).get();

        return res.json({
            success: true,
            viewer,
            stats: {
                total: Number(stats?.total || 0),
                pending: Number(stats?.pending || 0),
                tryout: Number(stats?.tryout || 0),
                accepted: Number(stats?.accepted || 0),
                rejected: Number(stats?.rejected || 0),
                tryoutFailed: Number(stats?.tryoutFailed || 0)
            },
            applications: applications.map(sanitizeApplicationForCommand)
        });
    } catch (error) {
        console.error("Kyōken command applications load failed:", error);
        return res.status(500).json({
            success: false,
            error: "Unable to load Kyōken applications."
        });
    }
});

app.get("/api/command/applications/:id", async function (req, res) {

    const viewer = await requireCommandViewer(req, res);
    if (!viewer) return;

    const applicationId = Number(req.params.id);
    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ success: false, error: "Invalid application ID." });
    }

    const application = getApplication(applicationId);
    if (!application) {
        return res.status(404).json({ success: false, error: "Application not found." });
    }

    return res.json({
        success: true,
        viewer,
        application: sanitizeApplicationForCommand(application),
        accountRecord: getApplicantAccountRecord(application.discord_user_id, application.id)
    });
});

app.post("/api/command/applications/:id/action", async function (req, res) {

    const viewer = await requireCommandViewer(req, res);
    if (!viewer) return;

    if (!viewer.canManage) {
        return res.status(403).json({
            success: false,
            error: "Your KYŌKEN position can view applications but cannot manage them."
        });
    }

    const applicationId = Number(req.params.id);
    const action = String(req.body?.action || "").toLowerCase();

    if (!Number.isInteger(applicationId) || !["accept", "reject"].includes(action)) {
        return res.status(400).json({
            success: false,
            error: "Invalid application action."
        });
    }

    const application = getApplication(applicationId);
    if (!application) {
        return res.status(404).json({ success: false, error: "Application not found." });
    }

    if (application.status !== "PENDING") {
        return res.status(409).json({
            success: false,
            error: `This application is already ${String(application.status).toLowerCase()}.`
        });
    }

    try {
        if (action === "reject") {
            const updated = updateApplicationStatus(
                application.id,
                "REJECTED",
                viewer.userId,
                new Date().toISOString()
            );

            if (application.application_message_id) {
                try {
                    const channel = await discordClient.channels.fetch(APPLICATION_CHANNEL_ID);
                    const message = await channel?.messages?.fetch(application.application_message_id);
                    if (message) {
                        const embed = buildApplicationEmbed(updated, "🔴 REJECTED");
                        embed.addFields({
                            name: "◆ REVIEWED BY",
                            value: `<@${viewer.userId}>`,
                            inline: false
                        });
                        await message.edit({ embeds: [embed], components: [] });
                    }
                } catch (discordError) {
                    console.error("Kyōken command rejection Discord message update failed:", discordError);
                }
            }

            try {
                const applicant = await discordClient.users.fetch(application.discord_user_id);
                await applicant.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(KYOKEN_EMBED_COLORS.rejected)
                            .setTitle("🐺 KYŌKEN CLAN — APPLICATION UPDATE")
                            .setDescription("Thank you for applying to Kyōken Clan.")
                            .addFields({
                                name: "◆ RESULT",
                                value: "Unfortunately, your application was not accepted at this time.",
                                inline: false
                            })
                            .setFooter({ text: "狂犬  •  KYŌKEN CLAN" })
                            .setTimestamp()
                    ]
                });
            } catch (dmError) {
                console.error("Kyōken command rejection DM failed:", dmError);
            }

            logActivity(viewer, 'REJECTED APPLICATION', 'APPLICATION', application.id, `Application #${application.id} was rejected.`);
            return res.json({ success: true, application: sanitizeApplicationForCommand(updated) });
        }

        /* ACCEPT: mirror the existing Discord acceptance flow without requiring a Discord button interaction. */
        const channel = await discordClient.channels.fetch(APPLICATION_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
            throw new Error("Application channel is unavailable.");
        }

        const invite = await channel.createInvite({
            maxUses: APPLICATION_INVITE_MAX_USES,
            maxAge: APPLICATION_INVITE_MAX_AGE,
            unique: true,
            reason: `Kyōken application #${application.id} accepted from COMMAND.`
        });

        const inviteExpiresAt = new Date(
            Date.now() + APPLICATION_INVITE_MAX_AGE * 1000
        ).toISOString();

        const reviewedAt = new Date().toISOString();

        db.prepare(`
            UPDATE applications
            SET
                status = 'ACCEPTED',
                reviewed_by = ?,
                reviewed_at = ?,
                invite_code = ?,
                invite_url = ?,
                invite_expires_at = ?
            WHERE id = ?
        `).run(
            viewer.userId,
            reviewedAt,
            invite.code,
            invite.url,
            inviteExpiresAt,
            application.id
        );

        const updated = getApplication(application.id);
        let dmSent = true;

        try {
            const applicant = await discordClient.users.fetch(application.discord_user_id);
            await applicant.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(KYOKEN_EMBED_COLORS.accepted)
                        .setTitle("🐺 KYŌKEN CLAN — APPLICATION ACCEPTED")
                        .setDescription("Congratulations! Your Kyōken Clan application has been accepted.")
                        .addFields(
                            {
                                name: "◆ RESULT",
                                value: "🟢 ACCEPTED",
                                inline: false
                            },
                            {
                                name: "◆ NEXT STEP",
                                value: "Use your personal invitation below to join the Kyōken server. After joining, you will be placed in the TRY OUT stage.",
                                inline: false
                            },
                            {
                                name: "◆ PERSONAL INVITE",
                                value: invite.url,
                                inline: false
                            },
                            {
                                name: "◆ INVITE LIMIT",
                                value: "1 use • Expires in 24 hours",
                                inline: false
                            }
                        )
                        .setFooter({ text: "狂犬  •  KYŌKEN CLAN" })
                        .setTimestamp()
                ]
            });
        } catch (dmError) {
            dmSent = false;
            console.error("Kyōken command acceptance DM failed:", dmError);
        }

        if (application.application_message_id) {
            try {
                const message = await channel.messages.fetch(application.application_message_id);
                if (message) {
                    const embed = buildApplicationEmbed(
                        updated,
                        dmSent ? "🟢 ACCEPTED" : "🟢 ACCEPTED — DM FAILED"
                    );
                    embed.addFields({
                        name: "◆ INVITE",
                        value: dmSent
                            ? "Personal one-use invite sent privately."
                            : "Personal one-use invite generated. Applicant can retrieve it from /invite.html after Discord login.",
                        inline: false
                    });
                    await message.edit({ embeds: [embed], components: [] });
                }
            } catch (discordError) {
                console.error("Kyōken command acceptance Discord message update failed:", discordError);
            }
        }

        logActivity(viewer, 'ACCEPTED APPLICATION', 'APPLICATION', application.id, `Application #${application.id} was accepted.`);
        return res.json({
            success: true,
            dmSent,
            application: sanitizeApplicationForCommand(updated)
        });

    } catch (error) {
        console.error("Kyōken command application action failed:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "The application action could not be completed."
        });
    }
});


/* =========================================================
   KYŌKEN ANNOUNCEMENTS API
   ========================================================= */

app.get("/api/announcements", async function (req, res) {

    try {

        const now = new Date().toISOString();

        const announcements = db.prepare(`
            SELECT
                id,
                discord_message_id,
                author_user_id,
                author_username,
                title,
                content,
                category,
                created_at,
                expires_at,
                highlighted
            FROM announcements
            WHERE expires_at IS NULL OR expires_at > ?
            ORDER BY highlighted DESC, id DESC
            LIMIT 50
        `).all(now);

        return res.json({
            success: true,
            announcements
        });

    } catch (error) {

        console.error("Kyōken announcements load failed:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to load Kyōken announcements."
        });

    }

});


app.get("/api/announcements/public", function (req, res) {

    try {

        const now = new Date().toISOString();

        const announcements = db.prepare(`
            SELECT
                id,
                author_username,
                title,
                content,
                category,
                created_at,
                expires_at,
                highlighted
            FROM announcements
            WHERE (expires_at IS NULL OR expires_at > ?)
              AND highlighted = 1
            ORDER BY id DESC
            LIMIT 10
        `).all(now);

        return res.json({
            success: true,
            announcements
        });

    } catch (error) {

        console.error("Kyōken public announcements load failed:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to load public announcements."
        });

    }

});


app.get("/api/announcements/mention-targets", async function (req, res) {

    const viewer = await requireCommandViewer(req, res);
    if (!viewer) return;

    if (!discordClient.isReady()) {
        return res.status(503).json({
            success: false,
            error: "The Discord bot is still connecting. Please try again in a moment."
        });
    }

    try {
        const guild =
            discordClient.guilds.cache.get(KYOKEN_SERVER_ID) ||
            await discordClient.guilds.fetch(KYOKEN_SERVER_ID);

        if (!guild) {
            throw new Error("Kyōken Discord server could not be found.");
        }

        const [roles, members, channels] = await Promise.all([
            guild.roles.fetch(),
            guild.members.fetch(),
            guild.channels.fetch()
        ]);

        const roleTargets = roles
            .filter(role => role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => ({
                id: role.id,
                name: role.name,
                type: "role",
                mentionable: role.mentionable
            }));

        const memberTargets = members
            .filter(member => !member.user.bot)
            .sort((a, b) => {
                const aName = (a.displayName || a.user.username || "").toLowerCase();
                const bName = (b.displayName || b.user.username || "").toLowerCase();
                return aName.localeCompare(bName);
            })
            .map(member => ({
                id: member.id,
                name: member.displayName || member.user.username,
                username: member.user.username,
                type: "user"
            }));

        const channelTargets = channels
            .filter(channel => channel && channel.isTextBased?.() && !channel.isThread?.())
            .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: "channel"
            }));

        return res.json({
            success: true,
            everyone: {
                id: guild.id,
                name: "@everyone",
                type: "everyone"
            },
            roles: roleTargets,
            members: memberTargets,
            channels: channelTargets
        });

    } catch (error) {
        console.error("Kyōken announcement mention targets load failed:", error);
        return res.status(500).json({
            success: false,
            error: "Unable to load Discord roles, members, and channels."
        });
    }

});


app.post("/api/announcements", async function (req, res) {

    const viewer = await requireCommandViewer(req, res);
    if (!viewer) return;
    if (!getKyokenPermissions(viewer.position).manageAnnouncements) {
        return res.status(403).json({ success:false, error:"You do not have permission to post announcements." });
    }

    if (!ANNOUNCEMENT_CHANNEL_ID) {
        return res.status(503).json({
            success: false,
            error: "The Discord announcement channel is not configured. Add DISCORD_ANNOUNCEMENT_CHANNEL_ID to your .env file."
        });
    }

    const title = String(req.body?.title || "").trim();
    const content = String(req.body?.content || "").trim();
    const duration = String(req.body?.duration || "24h").trim().toLowerCase();
    const mentionTargets = Array.isArray(req.body?.mentionTargets)
        ? req.body.mentionTargets
        : [];

    const durationMs = {
        "1h": 60 * 60 * 1000,
        "3h": 3 * 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "12h": 12 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000
    };

    const normalizedMentionTargets = mentionTargets
        .map(target => ({
            type: String(target?.type || "").trim().toLowerCase(),
            id: String(target?.id || "").trim()
        }))
        .filter(target =>
            ["user", "role", "everyone", "channel"].includes(target.type) &&
            /^\d{17,20}$/.test(target.id)
        );

    if (normalizedMentionTargets.some(target => target.type === "everyone" && target.id !== KYOKEN_SERVER_ID)) {
        return res.status(400).json({
            success: false,
            error: "Invalid @everyone mention target."
        });
    }

    if (!title || !content) {
        return res.status(400).json({
            success: false,
            error: "Announcement title and message are required."
        });
    }

    if (title.length > 120) {
        return res.status(400).json({
            success: false,
            error: "Announcement title cannot exceed 120 characters."
        });
    }

    // Discord normal messages are limited to 2000 characters.
    if ((title.length + content.length + 8) > 2000) {
        return res.status(400).json({
            success: false,
            error: "The Discord announcement is too long. Keep the title and message within 2000 characters combined."
        });
    }

    if (duration !== "never" && !durationMs[duration]) {
        return res.status(400).json({
            success: false,
            error: "Invalid announcement time limit."
        });
    }

    if (!discordClient.isReady()) {
        return res.status(503).json({
            success: false,
            error: "The Discord bot is still connecting. Please try again in a moment."
        });
    }

    try {

        const guild =
            discordClient.guilds.cache.get(KYOKEN_SERVER_ID) ||
            await discordClient.guilds.fetch(KYOKEN_SERVER_ID);

        if (!guild) {
            throw new Error("Kyōken Discord server could not be found.");
        }

        const channel = await discordClient.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);

        if (!channel || !channel.isTextBased()) {
            throw new Error("The configured announcement channel is unavailable or is not a text channel.");
        }

        // Validate every selected target against the current Discord server.
        const [roles, members, channels] = await Promise.all([
            guild.roles.fetch(),
            guild.members.fetch(),
            guild.channels.fetch()
        ]);

        const validTargets = normalizedMentionTargets.filter(target => {
            if (target.type === "everyone") return target.id === guild.id;
            if (target.type === "role") return roles.has(target.id);
            if (target.type === "user") {
                const member = members.get(target.id);
                return !!member && !member.user.bot;
            }
            if (target.type === "channel") return channels.has(target.id);
            return false;
        });

        const uniqueTargets = [];
        const seen = new Set();
        for (const target of validTargets) {
            const key = `${target.type}:${target.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTargets.push(target);
            }
        }

        // Convert the readable @name / #channel text entered in the editor into
        // Discord's real mention tokens. This keeps ONE clean normal Discord
        // message instead of a separate mention line + duplicated embed.
        let discordBody = content;
        const replacementTargets = [...uniqueTargets]
            .sort((a, b) => {
                const aObj = a.type === "role" ? roles.get(a.id) : a.type === "user" ? members.get(a.id) : a.type === "channel" ? channels.get(a.id) : null;
                const bObj = b.type === "role" ? roles.get(b.id) : b.type === "user" ? members.get(b.id) : b.type === "channel" ? channels.get(b.id) : null;
                const aName = a.type === "everyone" ? "everyone" : (aObj?.name || aObj?.displayName || aObj?.user?.username || "");
                const bName = b.type === "everyone" ? "everyone" : (bObj?.name || bObj?.displayName || bObj?.user?.username || "");
                return bName.length - aName.length;
            });

        for (const target of replacementTargets) {
            let readableName = "";
            let discordToken = "";

            if (target.type === "everyone") {
                readableName = "@everyone";
                discordToken = "@everyone";
            } else if (target.type === "role") {
                const role = roles.get(target.id);
                readableName = `@${role?.name || ""}`;
                discordToken = `<@&${target.id}>`;
            } else if (target.type === "user") {
                const member = members.get(target.id);
                readableName = `@${member?.displayName || member?.user?.username || ""}`;
                discordToken = `<@${target.id}>`;
            } else if (target.type === "channel") {
                const targetChannel = channels.get(target.id);
                readableName = `#${targetChannel?.name || ""}`;
                discordToken = `<#${target.id}>`;
            }

            if (readableName && discordToken && readableName !== "@") {
                discordBody = discordBody.split(readableName).join(discordToken);
            }
        }

        const createdAt = new Date();
        const expiresAt = duration === "never"
            ? null
            : new Date(createdAt.getTime() + durationMs[duration]).toISOString();

        const discordContent = `**📢 ${title}**\n\n${discordBody}`;

        const allowedUsers = uniqueTargets
            .filter(target => target.type === "user")
            .map(target => target.id);
        const allowedRoles = uniqueTargets
            .filter(target => target.type === "role")
            .map(target => target.id);
        const allowEveryone = uniqueTargets.some(target => target.type === "everyone");

        // ONE normal Discord message. No embed, no separate mention line,
        // therefore the announcement cannot visually double itself.
        const message = await channel.send({
            content: discordContent,
            allowedMentions: {
                parse: allowEveryone ? ["everyone"] : [],
                users: allowedUsers,
                roles: allowedRoles
            }
        });

        const result = db.prepare(`
            INSERT INTO announcements (
                discord_message_id,
                author_user_id,
                author_username,
                title,
                content,
                category,
                created_at,
                expires_at,
                highlighted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
            message.id,
            viewer.userId,
            viewer.username,
            title,
            content,
            "GENERAL",
            createdAt.toISOString(),
            expiresAt
        );

        const announcement = db.prepare(`
            SELECT
                id,
                discord_message_id,
                author_user_id,
                author_username,
                title,
                content,
                category,
                created_at,
                expires_at,
                highlighted
            FROM announcements
            WHERE id = ?
        `).get(Number(result.lastInsertRowid));

        logActivity(viewer, 'POSTED ANNOUNCEMENT', 'ANNOUNCEMENT', announcement.id, announcement.title);
        return res.status(201).json({
            success: true,
            announcement
        });

    } catch (error) {

        console.error("Kyōken announcement post failed:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Unable to post the announcement."
        });

    }

});


app.delete("/api/announcements/:id", async function (req, res) {

    const viewer = await requireCommandViewer(req, res);
    if (!viewer) return;
    if (!getKyokenPermissions(viewer.position).deleteAnnouncements) {
        return res.status(403).json({ success:false, error:"You do not have permission to delete announcements." });
    }

    const announcementId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(announcementId) || announcementId <= 0) {
        return res.status(400).json({
            success: false,
            error: "Invalid announcement ID."
        });
    }

    try {
        const announcement = db.prepare(`
            SELECT id, discord_message_id
            FROM announcements
            WHERE id = ?
        `).get(announcementId);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                error: "Announcement not found."
            });
        }

        // Delete only the website/database record.
        // The Discord announcement intentionally remains in the channel.
        db.prepare(`
            DELETE FROM announcements
            WHERE id = ?
        `).run(announcementId);

        logActivity(viewer, 'DELETED ANNOUNCEMENT', 'ANNOUNCEMENT', announcementId, 'Website announcement deleted; Discord message preserved.');
        return res.json({
            success: true,
            deletedId: announcementId,
            discordMessagePreserved: true
        });

    } catch (error) {
        console.error("Kyōken announcement delete failed:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to delete the website announcement."
        });
    }
});


/* =========================================================
   KYŌKEN COMMAND DATA API
   ========================================================= */

app.get(
    "/api/command/data",
    async function (req, res) {

        if (!req.session.discord) {

            return res
                .status(401)
                .json({
                    success: false,
                    error: "You must log in with Discord."
                });

        }

        try {

            const roleIds = await getKyokenMemberRoles(
                req.session.discord.id
            );

            const position = getKyokenPosition(roleIds);

            if (!isKyokenHeadquartersPosition(position)) {

                return res
                    .status(403)
                    .json({
                        success: false,
                        error: "You are not authorized to access KYŌKEN COMMAND."
                    });

            }

            if (!kyokenPlayerCountReady) {
                await startKyokenPlayerCountCache();
            }

            const applicationStats = db
                .prepare(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                        SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted,
                        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
                    FROM applications
                `)
                .get();

            const guild =
                discordClient.guilds.cache.get(KYOKEN_SERVER_ID);

            return res.json({
                success: true,
                refreshedAt: new Date().toISOString(),
                user: {
                    id: req.session.discord.id,
                    username: req.session.discord.username,
                    position: position,
                    positionName: getKyokenPositionName(position)
                },
                server: {
                    members: kyokenPlayerCountReady
                        ? kyokenPlayerCount
                        : null,
                    guildName: guild?.name || "KYŌKEN CLAN",
                    online: discordClient.isReady()
                },
                applications: {
                    total: Number(applicationStats?.total || 0),
                    pending: Number(applicationStats?.pending || 0),
                    accepted: Number(applicationStats?.accepted || 0),
                    rejected: Number(applicationStats?.rejected || 0)
                }
            });

        } catch (error) {

            console.error(
                "Kyōken command data error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error: "Unable to load KYŌKEN COMMAND data."
                });

        }

    }
);


/* =========================================================
   PERMISSIONS API
   ========================================================= */

app.get(
    "/api/permissions",
    async function (
        req,
        res
    ) {

        if (
            !req.session.discord
        ) {

            return res
                .status(401)
                .json({

                    loggedIn:
                        false

                });

        }


        const user =
            req.session.discord;


        const roleIds =
            await getKyokenMemberRoles(
                user.id
            );


        const position =
            getKyokenPosition(
                roleIds
            );


        const permissions =
            getKyokenPermissions(position) || {

                editOwnProfile:
                    false,

                manageApplications:
                    false

            };


        res.json({

            loggedIn:
                true,

            userId:
                user.id,

            position:
                position,

            positionName:
                getKyokenPositionName(
                    position
                ),

            permissions:
                permissions

        });

    }
);


/* =========================================================
   LOGOUT
   ========================================================= */

app.get(
    "/auth/logout",
    function (
        req,
        res
    ) {

        req.session.destroy(

            function () {

                res.redirect(
                    "/"
                );

            }

        );

    }
);


/* =========================================================
   STATUS
   ========================================================= */

app.get(
    "/api/status",
    function (
        req,
        res
    ) {

        res.json({

            online:
                true,

            message:
                "Kyōken Clan backend is running.",

            timestamp:
                new Date().toISOString(),

            database:
                databasePath,

            discordBot:
                discordClient.isReady()

        });

    }
);


/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(
    function (
        error,
        req,
        res,
        next
    ) {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Profile picture must be 5 MB or smaller."

                    });

            }


            return res
                .status(400)
                .json({

                    error:
                        error.message ||
                        "Profile upload failed."

                });

        }


        if (
            error
        ) {

            console.error(

                "Server error:",

                error

            );


            return res
                .status(400)
                .json({

                    error:
                        error.message ||
                        "Request failed."

                });

        }


        next();

    }
);


/* =========================================================
   DISCORD BOT READY
   ========================================================= */

discordClient.once(
    "clientReady",
    async function () {

        console.log(

            `Discord bot logged in as ${discordClient.user.tag}`

        );

        await initializeKyokenPresenceCache();

    }
);


/* =========================================================
   DISCORD BOT LOGIN
   ========================================================= */

if (
    DISCORD_BOT_TOKEN
) {

    discordClient
        .login(
            DISCORD_BOT_TOKEN
        )
        .catch(

            function (
                error
            ) {

                console.error(

                    "Discord bot login failed:",

                    error.message

                );

            }

        );

} else {

    console.warn(

        "DISCORD_BOT_TOKEN is missing. Discord bot will not start."

    );

}


/* =========================================================
   SAFE DATABASE SHUTDOWN
   ========================================================= */

function shutdown() {

    try {

        db.close();

    } catch (error) {

        console.error(

            "Database close error:",

            error

        );

    }


    process.exit(
        0
    );

}


process.on(
    "SIGINT",
    shutdown
);


process.on(
    "SIGTERM",
    shutdown
);


/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    function () {

        console.log(
            "======================================"
        );

        console.log(
            " KYŌKEN CLAN SERVER"
        );

        console.log(
            "======================================"
        );

        console.log(

            `Server running at: http://localhost:${PORT}`

        );

        console.log(

            `Discord callback: ${DISCORD_REDIRECT_URI}`

        );

        console.log(

            `Application channel: ${APPLICATION_CHANNEL_ID}`

        );

        console.log(

            `TRY OUT approval channel: ${TRYOUT_APPROVAL_CHANNEL_ID}`

        );

        console.log(

            `TRY OUT fail log channel: ${TRYOUT_FAIL_LOG_CHANNEL_ID}`

        );

        console.log(

            `TRY OUT role: ${TRYOUT_ROLE_ID}`

        );

        console.log(

            `MEMBER role: ${MEMBER_ROLE_ID}`

        );

        console.log(

            "Application cooldown: 7 days"

        );

        console.log(

            `Developer cooldown bypass: ${DEVELOPER_USER_IDS.length} account(s)`

        );

        console.log(

            `Profile uploads: ${uploadDirectory}`

        );

        console.log(

            `SQLite database: ${databasePath}`

        );

    }
);
