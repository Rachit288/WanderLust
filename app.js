if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
app.set("trust proxy", 1);
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const http = require("http");
const cors = require("cors");
const User = require("./models/user.js");

const socket = require('./socket.js');
const apiChatRouter = require("./routes/api/chat.js");
const apiReviewRouter = require("./routes/api/review.js");
const apiUserRouter = require("./routes/api/user.js");
const apiListingRouter = require("./routes/api/listing.js");
const apiBookingRouter = require("./routes/api/booking.js");
const apiNotificationRouter = require("./routes/api/notification.js");
const apiAiRouter = require("./routes/api/ai.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking.js");
const { initDB } = require("./db.js");
const reminderJob = require("./jobs/reminders.js");


const dbUrl = process.env.ATLASDB_URL;
const server = http.createServer(app);


main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

initDB().then(() => console.log("✅ DB ready"));
async function main() {
    await mongoose.connect(dbUrl);
};

// Middleware to make 'io' accessible in Controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

const corsOptions = {
    origin: [process.env.FRONTEND_URL, "http://localhost:3000"], // Allow your Next.js app
    credentials: true, // Allow cookies (Session/Auth) to pass through
    optionSuccessStatus: 200
};

app.use(cors(corsOptions));

const io = socket.init(server);
global.io = io;

app.post(
    '/api/v1/webhook',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
        req.rawBody = req.body; // Assign raw buffer to req.rawBody
        next();
    },
    require('./controllers/api/webhook').handleWebhook // Call the controller directly
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production" // Cookies only work over HTTPS
    }
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

reminderJob.startReminders(io);

app.use("/api/v1/listings", apiListingRouter);
app.use("/api/v1/users", apiUserRouter);
// Note: We mount this under listings because of mergeParams
app.use("/api/v1/listings/:id/reviews", apiReviewRouter);
app.use("/api/v1/bookings", apiBookingRouter);
app.use("/api/v1/chat", apiChatRouter);
app.use("/api/v1/notifications", apiNotificationRouter);
app.use("/api/v1/ai", apiAiRouter);

// app.use("/listings", listingRouter);
// app.use("/listings/:id/reviews", reviewRouter);
// app.use("/", userRouter);
// app.use("/bookings", bookingRouter);

app.use("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("Error.ejs", { message });
});

server.listen(8080, "0.0.0.0", () => {
    console.log("server is listening to port 8080");
});