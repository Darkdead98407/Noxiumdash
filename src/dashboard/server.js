const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const { Pool } = require('pg');
const config = require('../../config.json');

// Configuración de la conexión a la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Configuración de Passport Discord
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const BASE_URL = 'https://fbad2891-5a9d-421d-91d4-7e74da25f5d7-00-3hllxemm25m5u.kirk.replit.dev';

const strategy = new Strategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: `${BASE_URL}/auth/discord/callback`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    console.log('Autenticación exitosa para:', profile.username);
    profile.accessToken = accessToken;
    return done(null, profile);
});

passport.use(strategy);

// Configuración de Express
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de sesiones
app.use(session({
    secret: config.clientSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60000 * 60 * 24 // 24 horas
    },
    store: new (require('connect-pg-simple')(session))({
        pool,
        tableName: 'sessions'
    })
}));

app.use(passport.initialize());
app.use(passport.session());

// Ruta de prueba
app.get('/test', (req, res) => {
    res.send('Dashboard funcionando correctamente');
});

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// Rutas
app.get('/', (req, res) => {
    console.log('Acceso a página principal, usuario:', req.user?.username || 'no autenticado');
    res.render('home', {
        user: req.user,
        botGuilds: req.user ? req.user.guilds : []
    });
});

app.get('/login', (req, res) => {
    // Guardar la URL base en la sesión
    req.session.returnTo = BASE_URL;
    passport.authenticate('discord')(req, res);
});

app.get('/auth/discord/callback', 
    (req, res, next) => {
        console.log('Recibida solicitud de callback:', req.url);
        console.log('Headers:', req.headers);
        console.log('Query:', req.query);
        next();
    },
    passport.authenticate('discord', { 
        failureRedirect: '/',
        failureFlash: true
    }),
    (req, res) => {
        console.log('Autenticación completada para:', req.user.username);
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(returnTo);
    }
);

app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log('Acceso al dashboard por:', req.user.username);
    res.render('dashboard', {
        user: req.user,
        botGuilds: req.user.guilds
    });
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = app;