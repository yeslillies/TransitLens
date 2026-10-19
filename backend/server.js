const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend from the same server, so the app runs on one URL
app.use(express.static(process.env.FRONTEND_DIR || path.join(__dirname, "../frontend")));

// Database path
const db = new sqlite3.Database(
    process.env.DB_PATH || path.join(__dirname, "../transport.db"),
    (err) => {
        if (err) {
            console.error("Database connection failed:", err.message);
        } else {
            console.log("Connected to transport.db");
        }
    }
);

// =======================
// Helper: build date/time filter
// =======================
// Expects req.query.date as "YYYY-MM-DD" and req.query.time as "HH:MM".
// Filters rows where <column> is on that date, at or before that time.
// If NO date is provided at all, defaults to a rolling last-24-hours window
// so "live" pages (like the Dashboard) show recent data instead of a
// lifetime average that barely moves as new rows come in.
// Returns { clause, params } — clause starts with " AND ..." (or "" if no filters).
function buildDateTimeFilter(req, column) {
    const { date, time } = req.query;
    let clause = "";
    const params = [];

    if (date) {
        clause += ` AND date(${column}) = ?`;
        params.push(date);

        if (time) {
            clause += ` AND time(${column}) <= ?`;
            params.push(time.length === 5 ? time + ":00" : time); // normalize HH:MM -> HH:MM:00
        }
    } else {
        // No specific date picked -> default to rolling last 24 hours
        clause += ` AND ${column} >= datetime('now', '-1 day')`;
    }

    return { clause, params };
}

// =======================
// Health check (used by Docker and monitoring)
// =======================

app.get("/api/health", (req, res) => {
    db.get(`SELECT MAX(abruf_zeitpunkt) AS lastImport FROM API_Abruf WHERE status = 200`, (err, row) => {
        if (err) {
            return res.status(500).json({ status: "error", error: err.message });
        }
        res.json({ status: "ok", lastImport: row?.lastImport || null });
    });
});

// =======================
// Dashboard Stats
// =======================

app.get("/api/dashboard", (req, res) => {

    const result = {};
    const f1 = buildDateTimeFilter(req, "istzeit");

    db.get(`
        SELECT ROUND(AVG(verspaetung_sek)/60.0, 2) AS avgDelay
        FROM Abfahrt
        WHERE verspaetung_sek IS NOT NULL
        ${f1.clause}
    `, f1.params, (err, row) => {

        result.avgDelay = row?.avgDelay || 0;

        const f2 = buildDateTimeFilter(req, "a.istzeit");

        db.get(`
            SELECT
                l.name AS mostDelayedLine
            FROM Linie l
            JOIN Fahrt f ON l.linie_id = f.linie_id
            JOIN Abfahrt a ON f.fahrt_id = a.fahrt_id
            WHERE a.verspaetung_sek IS NOT NULL
            ${f2.clause}
            GROUP BY l.name
            ORDER BY AVG(a.verspaetung_sek) DESC
            LIMIT 1
        `, f2.params, (err, row) => {

            result.mostDelayedLine = row?.mostDelayedLine || "--";

            const f3 = buildDateTimeFilter(req, "a.istzeit");

            db.get(`
                SELECT
                    s.name AS mostActiveStation
                FROM Station s
                JOIN Abfahrt a ON s.station_id = a.station_id
                WHERE 1=1
                ${f3.clause}
                GROUP BY s.name
                ORDER BY COUNT(*) DESC
                LIMIT 1
            `, f3.params, (err, row) => {

                result.mostActiveStation = row?.mostActiveStation || "--";

                const f4 = buildDateTimeFilter(req, "istzeit");

                db.get(`
                    SELECT
                        strftime('%H:00', istzeit) AS peakTrafficHour
                    FROM Abfahrt
                    WHERE istzeit IS NOT NULL
                    ${f4.clause}
                    GROUP BY strftime('%H', istzeit)
                    ORDER BY COUNT(*) DESC
                    LIMIT 1
                `, f4.params, (err, row) => {

                    result.peakTrafficHour = row?.peakTrafficHour || "--";
                    result.asOf = new Date().toISOString();
                    console.log(result);
                    res.json(result);
                });
            });
        });
    });
});




// =======================
// Most Delayed Lines
// =======================

app.get("/api/lines", (req, res) => {

    const f = buildDateTimeFilter(req, "a.istzeit");

    db.all(`
        SELECT
            l.name,
            ROUND(AVG(a.verspaetung_sek)/60.0,2) AS avgDelay
        FROM Linie l
        JOIN Fahrt f
            ON l.linie_id = f.linie_id
        JOIN Abfahrt a
            ON f.fahrt_id = a.fahrt_id
        WHERE 1=1
        ${f.clause}
        GROUP BY l.name
        ORDER BY avgDelay DESC
        LIMIT 10
    `, f.params, (err, rows) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});

// =======================
// Most Delayed Stations
// =======================

app.get("/api/stations", (req, res) => {

    const f = buildDateTimeFilter(req, "a.istzeit");

    db.all(`
        SELECT
            s.name,
            ROUND(AVG(a.verspaetung_sek)/60.0,2) AS avgDelay
        FROM Station s
        JOIN Abfahrt a
            ON s.station_id = a.station_id
        WHERE 1=1
        ${f.clause}
        GROUP BY s.name
        ORDER BY avgDelay DESC
        LIMIT 10
    `, f.params, (err, rows) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});

// =====================================
// ALL STATIONS
// =====================================

app.get("/api/allstations", (req, res) => {

    db.all(`
        SELECT
            station_id,
            name
        FROM Station
        ORDER BY name
    `, (err, rows) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});


// =====================================
// DEPARTURES FOR ONE STATION
// =====================================

app.get("/api/station/:id", (req, res) => {

    const stationId = req.params.id;
    // Note: intentionally NOT using buildDateTimeFilter's rolling-24h default here.
    // This endpoint shows a station's most recent departures regardless of age
    // (e.g. sparse stations may only have data from a few days ago). If the
    // caller explicitly passes ?date=..., we still honor that.
    const { date, time } = req.query;
    let dateClause = "";
    const dateParams = [];
    if (date) {
        dateClause += " AND date(a.istzeit) = ?";
        dateParams.push(date);
        if (time) {
            dateClause += " AND time(a.istzeit) <= ?";
            dateParams.push(time.length === 5 ? time + ":00" : time);
        }
    }

    db.all(`
        SELECT
            l.name AS line,
            f.richtung AS direction,
            ROUND(COALESCE(a.verspaetung_sek, 0) / 60.0, 2) AS delay,
            CASE
                WHEN COALESCE(a.verspaetung_sek, 0) > 60 THEN 'delayed'
                ELSE 'on time'
            END AS status
        FROM Abfahrt a
        JOIN Fahrt f
            ON a.fahrt_id = f.fahrt_id
        JOIN Linie l
            ON f.linie_id = l.linie_id
        WHERE a.station_id = ?
        ${dateClause}
        ORDER BY a.istzeit DESC
        LIMIT 50
    `,
    [stationId, ...dateParams],
    (err, rows) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});

// =====================================
// 7-DAY DELAY TREND FOR ONE STATION
// =====================================

app.get("/api/station/:id/trend", (req, res) => {

    const stationId = req.params.id;

    db.all(`
        SELECT
            date(a.istzeit) AS day,
            ROUND(AVG(COALESCE(a.verspaetung_sek, 0)) / 60.0, 2) AS avgDelay
        FROM Abfahrt a
        WHERE a.station_id = ?
          AND a.istzeit >= datetime('now', '-7 days')
        GROUP BY date(a.istzeit)
        ORDER BY day ASC
    `,
    [stationId],
    (err, rows) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});

app.get("/api/delay-by-hour", (req, res) => {
  const f = buildDateTimeFilter(req, "istzeit");

  db.all(`
    SELECT
      strftime('%H:00', istzeit) AS hour,
      ROUND(AVG(verspaetung_sek) / 60.0, 2) AS avgDelay
    FROM Abfahrt
    WHERE istzeit IS NOT NULL
      AND verspaetung_sek IS NOT NULL
      ${f.clause}
    GROUP BY strftime('%H', istzeit)
    ORDER BY hour
  `, f.params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.get("/api/delay-distribution", (req, res) => {
  const f = buildDateTimeFilter(req, "istzeit");

  db.all(`
    SELECT
      CASE
        WHEN verspaetung_sek < 60 THEN 'On Time (< 1 min)'
        WHEN verspaetung_sek < 180 THEN 'Small Delay (1 - 3 min)'
        WHEN verspaetung_sek < 300 THEN 'Moderate Delay (3 - 5 min)'
        WHEN verspaetung_sek < 600 THEN 'Large Delay (5 - 10 min)'
        ELSE 'Severe Delay (> 10 min)'
      END AS category,
      ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM Abfahrt WHERE verspaetung_sek IS NOT NULL ${f.clause}), 1) AS percent
    FROM Abfahrt
    WHERE verspaetung_sek IS NOT NULL
    ${f.clause}
    GROUP BY category
  `, [...f.params, ...f.params], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});




// =======================
// Helper: build a period filter (today / week / month / all)
// =======================
// Used by the Lines page dropdown ("Last Week", etc.) — separate from
// buildDateTimeFilter since this is a relative range, not an exact date.
function buildPeriodFilter(req, column) {
    const period = (req.query.period || "week").toLowerCase();
    let clause = "";

    if (period === "today") {
        clause = ` AND date(${column}) = date('now')`;
    } else if (period === "week") {
        clause = ` AND ${column} >= datetime('now', '-7 days')`;
    } else if (period === "month") {
        clause = ` AND ${column} >= datetime('now', '-30 days')`;
    }
    // period === "all" -> no clause

    return clause;
}

app.get("/api/line-ranking", (req, res) => {

    const periodClause = buildPeriodFilter(req, "a.istzeit");

    let typeClause = "";
    const typeParams = [];
    const type = (req.query.type || "all").toLowerCase();
    if (type === "subway" || type === "suburban") {
        typeClause = " AND l.typ = ?";
        typeParams.push(type);
    }

    db.all(`
        SELECT
            l.name,
            l.typ AS type,
            ROUND(AVG(a.verspaetung_sek)/60.0,2) AS avgDelay,

            ROUND(
                100.0 *
                SUM(
                    CASE
                        WHEN a.verspaetung_sek <= 60
                        THEN 1
                        ELSE 0
                    END
                ) / COUNT(*),
                1
            ) AS punctuality

        FROM Linie l
        JOIN Fahrt f
            ON l.linie_id = f.linie_id
        JOIN Abfahrt a
            ON f.fahrt_id = a.fahrt_id
        WHERE 1=1
        ${periodClause}
        ${typeClause}
        GROUP BY l.name
        ORDER BY punctuality DESC
    `, typeParams, (err, rows) => {

        if(err){
            return res.status(500).json(err);
        }

        res.json(rows);

    });

});

// =======================
// Mode Stats (U-Bahn vs S-Bahn summary cards for Lines page)
// =======================

app.get("/api/mode-stats", (req, res) => {

    const periodClause = buildPeriodFilter(req, "a.istzeit");

    db.all(`
        SELECT
            l.typ AS type,
            ROUND(AVG(a.verspaetung_sek)/60.0, 2) AS avgDelay,
            ROUND(
                100.0 *
                SUM(CASE WHEN a.verspaetung_sek <= 60 THEN 1 ELSE 0 END)
                / COUNT(*),
                1
            ) AS punctuality
        FROM Linie l
        JOIN Fahrt f ON l.linie_id = f.linie_id
        JOIN Abfahrt a ON f.fahrt_id = a.fahrt_id
        WHERE 1=1
        ${periodClause}
        GROUP BY l.typ
    `, [], (err, rows) => {

        if (err) {
            return res.status(500).json(err);
        }

        const result = {
            ubahnPunctuality: null,
            sbahnPunctuality: null,
            ubahnAvgDelay: null,
            sbahnAvgDelay: null
        };

        rows.forEach(row => {
            if (row.type === "subway") {
                result.ubahnPunctuality = row.punctuality;
                result.ubahnAvgDelay = row.avgDelay;
            } else if (row.type === "suburban") {
                result.sbahnPunctuality = row.punctuality;
                result.sbahnAvgDelay = row.avgDelay;
            }
        });

        res.json(result);
    });

});

// =======================
// Punctuality by line and hour
// =======================

app.get("/api/line-hour-stats", (req, res) => {

    const line = req.query.line;
    const hour = Number(req.query.hour);

    if (!line || !Number.isInteger(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({
            error: "Valid line and hour are required."
        });
    }

    db.get(`
        SELECT
            l.name AS line,
            COUNT(*) AS departures,

            ROUND(
                AVG(a.verspaetung_sek) / 60.0,
                2
            ) AS avgDelay,

            ROUND(
                100.0 *
                SUM(
                    CASE
                        WHEN a.verspaetung_sek <= 60 THEN 1
                        ELSE 0
                    END
                ) / COUNT(*),
                1
            ) AS punctuality

        FROM Linie l
        JOIN Fahrt f
            ON l.linie_id = f.linie_id
        JOIN Abfahrt a
            ON f.fahrt_id = a.fahrt_id

        WHERE l.name = ?
          AND a.istzeit IS NOT NULL
          AND a.verspaetung_sek IS NOT NULL
          AND CAST(strftime('%H', a.istzeit) AS INTEGER) = ?

        GROUP BY l.name
    `, [line, hour], (err, row) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (!row) {
            return res.json({
                line,
                hour,
                departures: 0,
                avgDelay: null,
                punctuality: null
            });
        }

        res.json({
            ...row,
            hour
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
