const express = require("express");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const { getColor } = require("./controllers/eventsController");

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Google Calendar API setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const scopes = ["https://www.googleapis.com/auth/calendar"];

// Route to initiate OAuth2 flow
app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// Callback route after user grants permission
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save tokens to a file or database for future use
    fs.writeFileSync("./tokens.json", JSON.stringify(tokens));

    // res.send("Authentication successful! You can now manage your calendar.");
    res.redirect("/events"); // Redirect to the events page
  } catch (error) {
    console.error("Error retrieving access token", error);
    res.status(500).send("Authentication failed");
  }
});

// Route to list events from Google Calendar
app.get("/events", async (req, res) => {
  console.log("fetching events");
  try {
    const tokens = JSON.parse(fs.readFileSync("./tokens.json"));

    if (!tokens) {
      return res.redirect("/auth/google"); // Redirect to the OAuth2 flow if no tokens are found
    }

    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get the start and end dates for the current month
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    ).toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfMonth,
      timeMax: endOfMonth,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    res.render("events", { events, getColor }); // Pass events and getColor function to the EJS template
  } catch (error) {
    console.error("Error fetching events", error.message);
    if (error.message === "No refresh token is set.") {
      return res.redirect("/auth/google"); // Redirect to the OAuth2 flow if the token is invalid
    }

    res.status(500).send(error.message);
  }
});

// Route to update an event in Google Calendar
app.post("/events/update", async (req, res) => {
  const { eventId, summary, start, end, allDay, color } = req.body;
  try {
    const tokens = JSON.parse(fs.readFileSync("./tokens.json"));
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const event = {
      summary,
      start: allDay
        ? { date: start }
        : { dateTime: new Date(start).toISOString() },
      end: allDay ? { date: end } : { dateTime: new Date(end).toISOString() },
      colorId:
        Object.keys(getColor).find((key) => getColor[key] === color) || null,
    };

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      resource: event,
    });

    res.json({ success: true, event: response.data });
  } catch (error) {
    console.error("Error updating event", error);
    res.status(500).send("Failed to update event");
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public"))); // Use path.join to properly create the path.

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", __dirname + "/views"); // Specify the views directory

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
