const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');

const Book = require('./models/book');
const User = require('./models/user');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: 'librarysecret',
    resave: false,
    saveUninitialized: false
}));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/libraryDB');

// Multer setup for book cover uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Middleware to check login
function isLoggedIn(req, res, next) {
    if (req.session.userId) next();
    else res.redirect('/login');
}

// --- Auth routes ---

// Register
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await User.create({ username, password: hash });
        res.redirect('/login');
    } catch(err) {
        if(err.code === 11000) res.send("Username already exists");
        else res.send("Error: " + err.message);
    }
});

// Login
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if(user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            res.redirect('/');
        } else {
            res.send("Invalid credentials");
        }
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- Book routes ---

// Home - List books
app.get('/', isLoggedIn, async (req, res) => {
    try {
        const books = await Book.find();
        res.render('index', { books });
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Add Book Form
app.get('/add', isLoggedIn, (req, res) => res.render('addBook'));

// Add Book Action
app.post('/add', isLoggedIn, upload.single('cover'), async (req, res) => {
    try {
        const { title, author, year } = req.body;
        const cover = req.file ? '/uploads/' + req.file.filename : '';
        await Book.create({ title, author, year, cover });
        res.redirect('/');
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Edit Book Form
app.get('/edit/:id', isLoggedIn, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        res.render('editBook', { book });
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Update Book
app.post('/edit/:id', isLoggedIn, upload.single('cover'), async (req, res) => {
    try {
        const { title, author, year } = req.body;
        const updateData = { title, author, year };
        if(req.file) updateData.cover = '/uploads/' + req.file.filename;
        await Book.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/');
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Delete Book
app.get('/delete/:id', isLoggedIn, async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Issue Book
app.post('/issue/:id', isLoggedIn, async (req, res) => {
    try {
        const { user } = req.body;
        await Book.findByIdAndUpdate(req.params.id, { available: false, issuedTo: user });
        res.redirect('/');
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

// Return Book
app.get('/return/:id', isLoggedIn, async (req, res) => {
    try {
        await Book.findByIdAndUpdate(req.params.id, { available: true, issuedTo: "" });
        res.redirect('/');
    } catch(err) {
        res.send("Error: " + err.message);
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
