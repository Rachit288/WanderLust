const booking = require("../models/booking");
const Listing = require("../models/listing");
const review = require("../models/review");
const User = require("../models/user");

module.exports.renderSignupForm = (req, res) => {
    res.render("./users/signup.ejs");
}

module.exports.signup = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        let registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Wanderlust!");
            res.redirect("/listings");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}

module.exports.renderLoginForm =  (req, res) => {
    res.render("./users/login.ejs");
}

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to Wanderlust!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
}

module.exports.renderDashboard = async (req, res) => {
    const userId = req.user._id;
    const myBookings = await booking.find({user: userId}).populate("listing");

    const myListings = await Listing.find({owner: userId});

    const bookingsOnMyListings = await booking.find({
        listing: {$in: myListings.map(l => l._id)}
    })
        .populate("user")
        .populate("listing");
    res.render("users/dashboard", {myBookings, bookingsOnMyListings, currUser: req.user});
}